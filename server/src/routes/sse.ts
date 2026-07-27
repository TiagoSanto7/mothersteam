import type { FastifyInstance } from 'fastify'
import { verifyRefreshToken } from '../utils/tokens'
import { sseEmitter } from '../sse'

export default async function sseRoutes(fastify: FastifyInstance) {
  fastify.get('/sse', async (request, reply) => {
    const cookieToken = request.cookies['refresh_token']
    if (!cookieToken) return reply.status(401).send({ error: 'Unauthorized' })

    let userId: string
    try {
      const payload = verifyRefreshToken(cookieToken)
      userId = payload.userId
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    // Explicit CORS headers for SSE — @fastify/cors only sets them on reply (not reply.raw),
    // but we flush raw headers directly, so we must set them manually here.
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

    reply.raw.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

    const key = `user:${userId}`
    function onEvent(data: object) {
      if (!reply.raw.destroyed) {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
      }
    }
    sseEmitter.on(key, onEvent)

    const heartbeat = setInterval(() => {
      if (!reply.raw.destroyed) reply.raw.write(': heartbeat\n\n')
    }, 25000)

    await new Promise<void>((resolve) => {
      request.raw.on('close', resolve)
      request.raw.on('error', resolve)
    })

    sseEmitter.off(key, onEvent)
    clearInterval(heartbeat)
  })
}
