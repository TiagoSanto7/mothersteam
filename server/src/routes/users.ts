import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { emitNotification } from '../sse'

const updateMeSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional().nullable(),
  babyName: z.string().max(80).optional().nullable(),
  bio: z.string().max(280).optional().nullable(),
  avatarUrl: z.string().max(500).optional().nullable(),
  pregnancyStage: z.enum(['pregnant', 'postpartum']).optional(),
  pregnancyWeek: z.number().int().min(1).max(42).optional().nullable(),
  babyAgeInDays: z.number().int().min(0).optional().nullable(),
  onboardingDone: z.boolean().optional(),
  versesPublic: z.boolean().optional(),
})

export default async function usersRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.params.id },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        avatarUrl: true,
        pregnancyStage: true,
        pregnancyWeek: true,
        babyAgeInDays: true,
        profileKey: true,
        archetypeKey: true,
        versesPublic: true,
        role: true,
        _count: { select: { posts: true, followers: true, following: true } },
      },
    })
    if (!user) return reply.status(404).send({ error: 'User not found' })

    const isSelf = user.id === request.userId
    let isFollowedByCurrentUser = false
    if (!isSelf) {
      const follow = await fastify.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: request.userId, followingId: user.id } },
      })
      isFollowedByCurrentUser = !!follow
    }

    reply.send({ ...user, isSelf, isFollowedByCurrentUser })
  })

  fastify.patch('/me', async (request, reply) => {
    const body = updateMeSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    if (body.data.username !== undefined && body.data.username !== null) {
      const taken = await fastify.prisma.user.findFirst({
        where: { username: body.data.username, id: { not: request.userId } },
        select: { id: true },
      })
      if (taken) return reply.status(409).send({ error: 'Username already taken' })
    }

    const user = await fastify.prisma.user.update({
      where: { id: request.userId },
      data: body.data,
      select: {
        id: true, name: true, username: true, babyName: true, bio: true,
        avatarUrl: true, pregnancyStage: true, pregnancyWeek: true, babyAgeInDays: true,
        versesPublic: true,
      },
    })
    reply.send(user)
  })

  fastify.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/:id/posts',
    async (request, reply) => {
      const limit = Math.min(Number(request.query.limit ?? 20), 50)
      const rows = await fastify.prisma.post.findMany({
        where: { authorId: request.params.id },
        take: limit + 1,
        ...(request.query.cursor ? { cursor: { id: request.query.cursor }, skip: 1 } : {}),
        include: {
          author: { select: { id: true, name: true, username: true } },
          _count: { select: { likes: true, comments: true, reposts: true } },
          likes: { where: { userId: request.userId }, select: { userId: true } },
          repostFrom: { include: { author: { select: { id: true, name: true, username: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      })
      const hasMore = rows.length > limit
      const items = rows.slice(0, limit).map(({ likes, ...post }) => ({
        ...post,
        likedByCurrentUser: likes.length > 0,
      }))
      const nextCursor = items.length > 0 ? items[items.length - 1].id : undefined
      reply.send({ items, hasMore, nextCursor })
    }
  )

  fastify.post<{ Params: { id: string } }>('/:id/follow', async (request, reply) => {
    if (request.params.id === request.userId)
      return reply.status(400).send({ error: 'Cannot follow yourself' })

    const existing = await fastify.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: request.userId, followingId: request.params.id } },
    })

    if (!existing) {
      await fastify.prisma.follow.create({
        data: { followerId: request.userId, followingId: request.params.id },
      })

      const actor = await fastify.prisma.user.findUnique({
        where: { id: request.userId },
        select: { name: true },
      })
      const actorName = actor?.name ?? 'Alguém'

      await fastify.prisma.notification.create({
        data: {
          type: 'follow',
          text: `${actorName} começou a te seguir.`,
          recipientId: request.params.id,
          targetType: 'user',
          targetId: request.userId,
          actorId: request.userId,
          actorName,
        },
      })
      emitNotification(request.params.id)
    }

    reply.status(201).send({ ok: true })
  })

  fastify.delete<{ Params: { id: string } }>('/:id/follow', async (request, reply) => {
    await fastify.prisma.follow.deleteMany({
      where: { followerId: request.userId, followingId: request.params.id },
    })
    reply.send({ ok: true })
  })

  fastify.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/:id/followers',
    async (request, reply) => {
      const limit = Math.min(Number(request.query.limit ?? 20), 50)
      const follows = await fastify.prisma.follow.findMany({
        where: { followingId: request.params.id },
        take: limit + 1,
        ...(request.query.cursor ? { cursor: { followerId_followingId: { followerId: request.query.cursor, followingId: request.params.id } }, skip: 1 } : {}),
        include: { follower: { select: { id: true, name: true, username: true } } },
        orderBy: { createdAt: 'desc' },
      })
      const hasMore = follows.length > limit
      const items = follows.slice(0, limit).map((f) => f.follower)

      const ids = items.map((i) => i.id)
      const myFollows = ids.length
        ? await fastify.prisma.follow.findMany({
            where: { followerId: request.userId, followingId: { in: ids } },
            select: { followingId: true },
          })
        : []
      const followingSet = new Set(myFollows.map((f) => f.followingId))
      const enriched = items.map((u) => ({
        ...u,
        isFollowedByCurrentUser: followingSet.has(u.id),
        isSelf: u.id === request.userId,
      }))
      reply.send({ items: enriched, hasMore })
    }
  )

  fastify.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/:id/following',
    async (request, reply) => {
      const limit = Math.min(Number(request.query.limit ?? 20), 50)
      const follows = await fastify.prisma.follow.findMany({
        where: { followerId: request.params.id },
        take: limit + 1,
        ...(request.query.cursor ? { cursor: { followerId_followingId: { followerId: request.params.id, followingId: request.query.cursor } }, skip: 1 } : {}),
        include: { following: { select: { id: true, name: true, username: true } } },
        orderBy: { createdAt: 'desc' },
      })
      const hasMore = follows.length > limit
      const items = follows.slice(0, limit).map((f) => f.following)

      const ids = items.map((i) => i.id)
      const myFollows = ids.length
        ? await fastify.prisma.follow.findMany({
            where: { followerId: request.userId, followingId: { in: ids } },
            select: { followingId: true },
          })
        : []
      const followingSet = new Set(myFollows.map((f) => f.followingId))
      const enriched = items.map((u) => ({
        ...u,
        isFollowedByCurrentUser: followingSet.has(u.id),
        isSelf: u.id === request.userId,
      }))
      reply.send({ items: enriched, hasMore })
    }
  )

  fastify.get<{ Querystring: { limit?: string; q?: string } }>('/', async (request, reply) => {
    const limit = Math.min(Number(request.query.limit ?? 10), 50)
    const q = request.query.q?.trim()

    if (q) {
      // Mention autocomplete: search by username or name prefix
      const users = await fastify.prisma.user.findMany({
        where: {
          id: { not: request.userId },
          OR: [
            { username: { contains: q } },
            { name: { contains: q } },
          ],
        },
        select: { id: true, name: true, username: true },
        take: limit,
      })
      return reply.send({ items: users.map((u) => ({ ...u, isFollowedByCurrentUser: false, isSelf: false })), hasMore: false })
    }

    const alreadyFollowing = await fastify.prisma.follow.findMany({
      where: { followerId: request.userId },
      select: { followingId: true },
    })
    const excludeIds = [request.userId, ...alreadyFollowing.map((f) => f.followingId)]

    const users = await fastify.prisma.user.findMany({
      where: { id: { notIn: excludeIds } },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        _count: { select: { followers: true } },
      },
      orderBy: { followers: { _count: 'desc' } },
      take: limit,
    })

    const items = users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      bio: u.bio,
      isFollowedByCurrentUser: false,
      isSelf: false,
    }))
    reply.send({ items, hasMore: false })
  })

  // Saved verses — own
  fastify.get('/me/verses', async (request, reply) => {
    const verses = await fastify.prisma.savedVerse.findMany({
      where: { userId: request.userId },
      select: { verseRef: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    reply.send(verses.map((v) => v.verseRef))
  })

  fastify.post<{ Body: { verseRef: string } }>('/me/verses', async (request, reply) => {
    const { verseRef } = request.body ?? {}
    if (!verseRef || typeof verseRef !== 'string') return reply.status(400).send({ error: 'verseRef required' })
    await fastify.prisma.savedVerse.upsert({
      where: { userId_verseRef: { userId: request.userId, verseRef } },
      create: { userId: request.userId, verseRef },
      update: {},
    })
    reply.status(201).send({ ok: true })
  })

  fastify.delete<{ Params: { ref: string } }>('/me/verses/:ref', async (request, reply) => {
    await fastify.prisma.savedVerse.deleteMany({
      where: { userId: request.userId, verseRef: request.params.ref },
    })
    reply.send({ ok: true })
  })

  // Saved verses — other user (only if versesPublic)
  fastify.get<{ Params: { id: string } }>('/:id/verses', async (request, reply) => {
    if (request.params.id === request.userId) {
      const verses = await fastify.prisma.savedVerse.findMany({
        where: { userId: request.userId },
        select: { verseRef: true },
        orderBy: { createdAt: 'asc' },
      })
      return reply.send(verses.map((v) => v.verseRef))
    }
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.params.id },
      select: { versesPublic: true },
    })
    if (!user) return reply.status(404).send({ error: 'User not found' })
    if (!user.versesPublic) return reply.status(403).send({ error: 'Verses are private' })
    const verses = await fastify.prisma.savedVerse.findMany({
      where: { userId: request.params.id },
      select: { verseRef: true },
      orderBy: { createdAt: 'asc' },
    })
    reply.send(verses.map((v) => v.verseRef))
  })
}
