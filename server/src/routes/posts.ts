import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { emitNotification } from '../sse'

const createSchema = z.object({
  content: z.string().min(1),
  category: z.enum(['gestação', 'pós-parto', 'amamentação', 'saúde mental']),
  communityId: z.string().optional(),
  imageUrl: z.string().optional(),
})

const commentSchema = z.object({
  content: z.string().min(1),
})

export default async function postsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get<{ Querystring: { cursor?: string; limit?: string } }>(
    '/',
    async (request, reply) => {
      const limit = Math.min(Number(request.query.limit ?? 20), 50)
      const rows = await fastify.prisma.post.findMany({
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

  fastify.post('/', async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const post = await fastify.prisma.post.create({
      data: { ...body.data, authorId: request.userId },
      include: {
        author: { select: { id: true, name: true, username: true } },
        _count: { select: { likes: true, comments: true } },
      },
    })
    reply.status(201).send({ ...post, likedByCurrentUser: false })
  })

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const post = await fastify.prisma.post.findUnique({
      where: { id: request.params.id },
      include: {
        author: { select: { id: true, name: true, username: true } },
        _count: { select: { likes: true, comments: true, reposts: true } },
        likes: { where: { userId: request.userId }, select: { userId: true } },
        repostFrom: { include: { author: { select: { id: true, name: true, username: true } } } },
      },
    })
    if (!post) return reply.status(404).send({ error: 'Post not found' })
    const { likes, ...rest } = post
    reply.send({ ...rest, likedByCurrentUser: likes.length > 0 })
  })

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const post = await fastify.prisma.post.findUnique({ where: { id: request.params.id } })
    if (!post) return reply.status(404).send({ error: 'Post not found' })
    if (post.authorId !== request.userId) return reply.status(403).send({ error: 'Forbidden' })

    await fastify.prisma.post.delete({ where: { id: request.params.id } })
    reply.send({ ok: true })
  })

  fastify.post<{ Params: { id: string } }>('/:id/like', async (request, reply) => {
    await fastify.prisma.postLike.upsert({
      where: { userId_postId: { userId: request.userId, postId: request.params.id } },
      update: {},
      create: { userId: request.userId, postId: request.params.id },
    })

    const [post, actor] = await Promise.all([
      fastify.prisma.post.findUnique({
        where: { id: request.params.id },
        select: { authorId: true, content: true },
      }),
      fastify.prisma.user.findUnique({
        where: { id: request.userId },
        select: { name: true },
      }),
    ])

    if (post && post.authorId !== request.userId) {
      const actorName = actor?.name ?? 'Alguém'
      await fastify.prisma.notification.create({
        data: {
          type: 'like',
          text: `${actorName} curtiu sua publicação.`,
          recipientId: post.authorId,
          targetType: 'post',
          targetId: request.params.id,
          actorId: request.userId,
          actorName,
          postExcerpt: post.content.slice(0, 200),
        },
      })
      emitNotification(post.authorId)
    }

    reply.status(201).send({ ok: true })
  })

  fastify.delete<{ Params: { id: string } }>('/:id/like', async (request, reply) => {
    await fastify.prisma.postLike.deleteMany({
      where: { userId: request.userId, postId: request.params.id },
    })
    reply.send({ ok: true })
  })

  fastify.post<{ Params: { id: string } }>('/:id/repost', async (request, reply) => {
    const original = await fastify.prisma.post.findUnique({ where: { id: request.params.id } })
    if (!original) return reply.status(404).send({ error: 'Post not found' })

    const repost = await fastify.prisma.post.create({
      data: {
        content: original.content,
        category: original.category,
        authorId: request.userId,
        isRepost: true,
        repostFromId: original.id,
        communityId: original.communityId,
      },
      include: {
        author: { select: { id: true, name: true, username: true } },
        _count: { select: { likes: true, comments: true, reposts: true } },
        repostFrom: { include: { author: { select: { id: true, name: true, username: true } } } },
      },
    })
    reply.status(201).send({ ...repost, likedByCurrentUser: false })
  })

  fastify.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/:id/comments',
    async (request, reply) => {
      const limit = Math.min(Number(request.query.limit ?? 20), 50)
      const comments = await fastify.prisma.comment.findMany({
        where: { postId: request.params.id },
        take: limit + 1,
        ...(request.query.cursor ? { cursor: { id: request.query.cursor }, skip: 1 } : {}),
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      })
      const hasMore = comments.length > limit
      reply.send({ items: comments.slice(0, limit), hasMore })
    }
  )

  fastify.post<{ Params: { id: string } }>('/:id/comments', async (request, reply) => {
    const body = commentSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const comment = await fastify.prisma.comment.create({
      data: { content: body.data.content, authorId: request.userId, postId: request.params.id },
      include: { author: { select: { id: true, name: true } } },
    })

    const [post, actor] = await Promise.all([
      fastify.prisma.post.findUnique({
        where: { id: request.params.id },
        select: { authorId: true, content: true },
      }),
      fastify.prisma.user.findUnique({
        where: { id: request.userId },
        select: { name: true },
      }),
    ])

    if (post && post.authorId !== request.userId) {
      const actorName = actor?.name ?? 'Alguém'
      await fastify.prisma.notification.create({
        data: {
          type: 'comment',
          text: `${actorName} comentou na sua publicação.`,
          recipientId: post.authorId,
          targetType: 'post',
          targetId: request.params.id,
          actorId: request.userId,
          actorName,
          postExcerpt: post.content.slice(0, 200),
        },
      })
      emitNotification(post.authorId)
    }

    reply.status(201).send(comment)
  })
}
