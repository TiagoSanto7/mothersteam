import type { FastifyInstance } from 'fastify'

export default async function notificationsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request, reply) => {
    const notifications = await fastify.prisma.notification.findMany({
      where: { recipientId: request.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const followActorIds = notifications
      .filter((n) => n.type === 'follow' && n.actorId)
      .map((n) => n.actorId!)

    const followingSet = new Set<string>()
    if (followActorIds.length > 0) {
      const follows = await fastify.prisma.follow.findMany({
        where: { followerId: request.userId, followingId: { in: followActorIds } },
        select: { followingId: true },
      })
      follows.forEach((f) => followingSet.add(f.followingId))
    }

    const enriched = notifications.map((n) => ({
      ...n,
      isFollowedByCurrentUser:
        n.type === 'follow' && n.actorId ? followingSet.has(n.actorId) : undefined,
    }))

    reply.send(enriched)
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

    await fastify.prisma.notification.update({
      where: { id: request.params.id },
      data: { read: true },
    })
    return reply.send({ ok: true })
  })
}
