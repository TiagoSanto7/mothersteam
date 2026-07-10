import type { FastifyInstance } from 'fastify'

export default async function notificationsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request, reply) => {
    const notifications = await fastify.prisma.notification.findMany({
      where: { recipientId: request.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    reply.send(notifications)
  })

  fastify.post('/read-all', async (request, reply) => {
    await fastify.prisma.notification.updateMany({
      where: { recipientId: request.userId, read: false },
      data: { read: true },
    })
    reply.send({ ok: true })
  })
}
