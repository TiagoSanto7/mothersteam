import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '../utils/tokens'

declare module 'fastify' {
  interface FastifyRequest {
    userId: string
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export const authPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = request.headers.authorization
      if (!auth?.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }
      try {
        const payload = verifyAccessToken(auth.slice(7))
        request.userId = payload.userId
      } catch {
        return reply.status(401).send({ error: 'Unauthorized' })
      }
    }
  )
})
