import type { FastifyInstance } from 'fastify'
import { Readable } from 'node:stream'

const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech'
const MAX_TEXT_LEN = 500

export default async function saraRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.post<{ Body: { text?: string } }>(
    '/tts',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const apiKey = process.env.ELEVENLABS_API_KEY
      const voiceId = process.env.ELEVENLABS_SARA_VOICE_ID
      if (!apiKey || !voiceId) {
        return reply.status(500).send({ error: 'TTS not configured' })
      }

      const text = request.body?.text?.trim()
      if (!text) return reply.status(400).send({ error: 'text required' })
      if (text.length > MAX_TEXT_LEN) {
        return reply.status(400).send({ error: 'text too long' })
      }

      const upstream = await fetch(`${ELEVENLABS_TTS_URL}/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.8 },
        }),
      })

      if (!upstream.ok || !upstream.body) {
        const detail = await upstream.text().catch(() => '')
        fastify.log.error({ status: upstream.status, detail }, 'ElevenLabs TTS failed')
        return reply.status(502).send({ error: 'TTS provider error' })
      }

      reply.type('audio/mpeg')
      return reply.send(Readable.fromWeb(upstream.body as never))
    }
  )
}
