import type { FastifyInstance } from 'fastify'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID

export default async function maeIARoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.post('/token', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (_request, reply) => {
    if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
      return reply.status(503).send({ error: 'MãeIA não configurada' })
    }

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
