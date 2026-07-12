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

  fastify.post<{ Params: { id: string } }>('/:id/read', async (request, reply) => {
    const notification = await fastify.prisma.notification.findUnique({
      where: { id: request.params.id },
    })
    if (!notification) return reply.status(404).send({ error: 'Not found' })
    if (notification.recipientId !== request.userId) return reply.status(403).send({ error: 'Forbidden' })

    const updated = await fastify.prisma.notification.update({
      where: { id: request.params.id },
      data: { read: true },
    })
    return reply.send(updated)
  })
}
