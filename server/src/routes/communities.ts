import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['gestação', 'pós-parto', 'amamentação', 'saúde mental']),
  colorKey: z.enum(['gold', 'terracotta', 'warm', 'linen', 'cream']),
})

const updateSchema = createSchema.partial()

export default async function communitiesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get<{ Querystring: { includeMember?: string } }>(
    '/',
    async (request, reply) => {
      const includeMember = request.query.includeMember === '1'
      const communities = await fastify.prisma.community.findMany({
        include: {
          _count: { select: { members: true } },
          ...(includeMember
            ? { members: { where: { userId: request.userId }, select: { userId: true } } }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
      })
      if (!includeMember) return reply.send(communities)
      reply.send(
        communities.map(({ members, ...c }: any) => ({ ...c, isMember: members.length > 0 }))
      )
    }
  )

  fastify.post('/', async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const community = await fastify.prisma.community.create({
      data: {
        ...body.data,
        creatorId: request.userId,
        members: { create: { userId: request.userId, role: 'owner' } },
      },
    })
    reply.status(201).send(community)
  })

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const community = await fastify.prisma.community.findUnique({
      where: { id: request.params.id },
      include: {
        _count: { select: { members: true } },
        members: { where: { userId: request.userId }, select: { role: true } },
      },
    })
    if (!community) return reply.status(404).send({ error: 'Community not found' })
    const { members, ...rest } = community
    const isMember = members.length > 0
    const role = members[0]?.role ?? null
    reply.send({ ...rest, isMember, role })
  })

  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const body = updateSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const member = await fastify.prisma.communityMember.findUnique({
      where: { userId_communityId: { userId: request.userId, communityId: request.params.id } },
    })
    if (!member || !['owner', 'admin'].includes(member.role))
      return reply.status(403).send({ error: 'Forbidden' })

    const community = await fastify.prisma.community.update({
      where: { id: request.params.id },
      data: body.data,
    })
    reply.send(community)
  })

  fastify.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/:id/posts',
    async (request, reply) => {
      const limit = Math.min(Number(request.query.limit ?? 20), 50)
      const rows = await fastify.prisma.post.findMany({
        where: { communityId: request.params.id },
        take: limit + 1,
        ...(request.query.cursor ? { cursor: { id: request.query.cursor }, skip: 1 } : {}),
        include: {
          author: { select: { id: true, name: true } },
          _count: { select: { likes: true, comments: true } },
          likes: { where: { userId: request.userId }, select: { userId: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      const hasMore = rows.length > limit
      const items = rows.slice(0, limit).map(({ likes, ...post }) => ({
        ...post,
        likedByCurrentUser: likes.length > 0,
      }))
      reply.send({ items, hasMore })
    }
  )

  fastify.post<{ Params: { id: string } }>('/:id/join', async (request, reply) => {
    await fastify.prisma.communityMember.upsert({
      where: { userId_communityId: { userId: request.userId, communityId: request.params.id } },
      update: {},
      create: { userId: request.userId, communityId: request.params.id, role: 'member' },
    })
    reply.status(201).send({ ok: true })
  })

  fastify.delete<{ Params: { id: string } }>('/:id/join', async (request, reply) => {
    await fastify.prisma.communityMember.deleteMany({
      where: { userId: request.userId, communityId: request.params.id },
    })
    reply.send({ ok: true })
  })

  fastify.post<{ Params: { id: string; userId: string } }>(
    '/:id/admins/:userId',
    async (request, reply) => {
      const requester = await fastify.prisma.communityMember.findUnique({
        where: { userId_communityId: { userId: request.userId, communityId: request.params.id } },
      })
      if (requester?.role !== 'owner') return reply.status(403).send({ error: 'Forbidden' })

      await fastify.prisma.communityMember.update({
        where: { userId_communityId: { userId: request.params.userId, communityId: request.params.id } },
        data: { role: 'admin' },
      })
      reply.send({ ok: true })
    }
  )

  fastify.delete<{ Params: { id: string; userId: string } }>(
    '/:id/admins/:userId',
    async (request, reply) => {
      const requester = await fastify.prisma.communityMember.findUnique({
        where: { userId_communityId: { userId: request.userId, communityId: request.params.id } },
      })
      if (requester?.role !== 'owner') return reply.status(403).send({ error: 'Forbidden' })

      await fastify.prisma.communityMember.update({
        where: { userId_communityId: { userId: request.params.userId, communityId: request.params.id } },
        data: { role: 'member' },
      })
      reply.send({ ok: true })
    }
  )
}
