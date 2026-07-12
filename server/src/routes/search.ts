import type { FastifyInstance } from 'fastify'

export default async function searchRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get<{ Querystring: { q?: string } }>('/', async (request, reply) => {
    const q = (request.query.q ?? '').trim()
    if (q.length < 2) return reply.send({ users: [], communities: [] })

    const [users, communities] = await Promise.all([
      fastify.prisma.user.findMany({
        where: { name: { contains: q } },
        select: { id: true, name: true, pregnancyStage: true },
        take: 10,
      }),
      fastify.prisma.community.findMany({
        where: { OR: [{ name: { contains: q } }, { description: { contains: q } }] },
        include: { _count: { select: { members: true } } },
        take: 10,
      }),
    ])

    reply.send({ users, communities })
  })
}
