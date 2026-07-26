import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

export function requireRole(...roles: string[]) {
  return fp(async function (fastify: FastifyInstance) {
    fastify.addHook('preHandler', fastify.authenticate)
    fastify.addHook('preHandler', async (request, reply) => {
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.userId },
        select: { role: true },
      })
      if (!user || !roles.includes(user.role)) {
        return reply.status(403).send({ error: 'Forbidden' })
      }
    })
  })
}
