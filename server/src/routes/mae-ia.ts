import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { buildSaraSystemPrompt, buildSaraContextBlock } from '../utils/sara-context'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

const chatBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(20),
})

export default async function maeIARoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // ── POST /mae-ia/chat — chat de texto com streaming SSE ──────────────────
  fastify.post<{ Body: { messages?: { role: 'user' | 'assistant'; content: string }[] } }>(
    '/chat',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request, reply) => {
      if (!OPENAI_API_KEY) {
        return reply.status(503).send({ error: 'Sara não configurada' })
      }

      const parsed = chatBodySchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ error: 'messages required' })
      }
      const { messages } = parsed.data

      const user = await fastify.prisma.user.findUnique({
        where: { id: request.userId },
        select: {
          name: true,
          babyName: true,
          babyAgeInDays: true,
          pregnancyStage: true,
          archetypeKey: true,
          mood: true,
          supportNetwork: true,
          goal: true,
          concern: true,
        },
      })

      if (!user) {
        return reply.status(404).send({ error: 'Usuária não encontrada' })
      }

      const systemPrompt = buildSaraSystemPrompt(user)

      // CORS headers — must be set on reply.raw directly (same as sse.ts)
      const origin = request.headers.origin
      const allowed = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
        .split(',').map((o) => o.trim())
      if (origin && (allowed.includes(origin) || ['capacitor://localhost', 'https://localhost', 'http://localhost'].includes(origin))) {
        reply.raw.setHeader('Access-Control-Allow-Origin', origin)
        reply.raw.setHeader('Access-Control-Allow-Credentials', 'true')
        reply.raw.setHeader('Vary', 'Origin')
      }

      reply.raw.setHeader('Content-Type', 'text/event-stream')
      reply.raw.setHeader('Cache-Control', 'no-cache')
      reply.raw.setHeader('Connection', 'keep-alive')
      reply.raw.setHeader('X-Accel-Buffering', 'no')
      reply.raw.flushHeaders()

      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            stream: true,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.map((m) => ({ role: m.role, content: m.content })),
            ],
          }),
        })

        if (!res.ok || !res.body) {
          throw new Error(`OpenAI error: ${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              const text = parsed.choices?.[0]?.delta?.content
              if (text && !reply.raw.destroyed) {
                reply.raw.write(`data: ${JSON.stringify({ text })}\n\n`)
              }
            } catch { /* incomplete frame */ }
          }
        }
      } catch (err) {
        fastify.log.error(`OpenAI stream error: ${err}`)
        reply.raw.write(`data: ${JSON.stringify({ error: 'Erro ao conectar com a Sara. Tente novamente.' })}\n\n`)
        reply.raw.end()
        return
      }

      reply.raw.write('data: [DONE]\n\n')
      reply.raw.end()
    }
  )

  // ── POST /mae-ia/token — ElevenLabs signed URL (voz) ────────────────────
  fastify.post('/token', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
      return reply.status(503).send({ error: 'MãeIA não configurada' })
    }

    const user = await fastify.prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        name: true,
        babyName: true,
        babyAgeInDays: true,
        pregnancyStage: true,
        archetypeKey: true,
        mood: true,
        supportNetwork: true,
        goal: true,
        concern: true,
      },
    })

    const contextBlock = user ? buildSaraContextBlock(user) : null

    // Try POST /v1/convai/conversations with context_override (returns signed_url directly)
    if (contextBlock) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10_000)
        const res = await fetch(
          'https://api.elevenlabs.io/v1/convai/conversations',
          {
            method: 'POST',
            headers: {
              'xi-api-key': ELEVENLABS_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              agent_id: ELEVENLABS_AGENT_ID,
              conversation_config_override: {
                agent: { prompt: { prompt: contextBlock } },
              },
            }),
            signal: controller.signal,
          }
        )
        clearTimeout(timeout)
        if (res.ok) {
          const data = (await res.json()) as { signed_url?: string }
          if (data.signed_url) {
            return reply.send({ signedUrl: data.signed_url })
          }
        }
        fastify.log.warn(`ElevenLabs conversations endpoint failed: ${res.status} — falling back to get_signed_url`)
      } catch (err) {
        fastify.log.warn(`ElevenLabs conversations fetch error: ${err} — falling back to get_signed_url`)
      }
    }

    // Fallback: original GET (no context_override)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    let res: Response
    try {
      res = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${ELEVENLABS_AGENT_ID}`,
        { headers: { 'xi-api-key': ELEVENLABS_API_KEY }, signal: controller.signal }
      )
    } catch (err) {
      fastify.log.error(`ElevenLabs fetch error: ${err}`)
      return reply.status(502).send({ error: 'Erro ao iniciar MãeIA' })
    } finally {
      clearTimeout(timeout)
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      fastify.log.error(`ElevenLabs error: ${res.status} ${body}`)
      return reply.status(502).send({ error: 'Erro ao iniciar MãeIA' })
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      fastify.log.error(`ElevenLabs non-JSON response: ${contentType}`)
      return reply.status(502).send({ error: 'Erro ao iniciar MãeIA' })
    }

    const { signed_url } = (await res.json()) as { signed_url: string }
    reply.send({ signedUrl: signed_url })
  })
}
