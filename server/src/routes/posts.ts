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

      const [following, memberships] = await Promise.all([
        fastify.prisma.follow.findMany({
          where: { followerId: request.userId },
          select: { followingId: true },
        }),
        fastify.prisma.communityMember.findMany({
          where: { userId: request.userId },
          select: { communityId: true },
        }),
      ])
      const followingIds = following.map((f) => f.followingId)
      const communityIds = memberships.map((m) => m.communityId)

      const postInclude = {
        author: { select: { id: true, name: true, username: true, archetypeKey: true, avatarUrl: true } },
        community: { select: { name: true } },
        _count: { select: { likes: true, comments: true, reposts: true } },
        likes: { where: { userId: request.userId }, select: { userId: true } },
        repostFrom: { include: { author: { select: { id: true, name: true, username: true, archetypeKey: true, avatarUrl: true } } } },
      } as const

      function mapRow<T extends { likes: { userId: string }[]; community: { name: string } | null }>(
        isSuggestion: boolean,
      ) {
        return ({ likes, community, ...post }: T) => ({
          ...post,
          communityName: community?.name ?? null,
          likedByCurrentUser: likes.length > 0,
          isSuggestion,
        })
      }

      const hasPriority = followingIds.length > 0 || communityIds.length > 0

      if (hasPriority) {
        const [priorityRows, suggestionRows] = await Promise.all([
          fastify.prisma.post.findMany({
            where: {
              isRepost: false,
              OR: [
                { authorId: { in: followingIds } },
                ...(communityIds.length > 0 ? [{ communityId: { in: communityIds } }] : []),
              ],
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: postInclude,
          }),
          fastify.prisma.post.findMany({
            where: {
              isRepost: false,
              authorId: { notIn: [...followingIds, request.userId] },
              ...(communityIds.length > 0 ? { communityId: { notIn: communityIds } } : {}),
              OR: [{ communityId: null }, { community: { isPrivate: false } }],
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: postInclude,
          }),
        ])

        const items = [
          ...priorityRows.map(mapRow(false)),
          ...suggestionRows.map(mapRow(true)),
        ]
        reply.send({ items, hasMore: false })
      } else {
        const rows = await fastify.prisma.post.findMany({
          where: {
            OR: [
              { communityId: null },
              { community: { isPrivate: false } },
            ],
          },
          take: limit + 1,
          ...(request.query.cursor ? { cursor: { id: request.query.cursor }, skip: 1 } : {}),
          include: postInclude,
          orderBy: { createdAt: 'desc' },
        })
        const hasMore = rows.length > limit
        const items = rows.slice(0, limit).map(mapRow(false))
        const nextCursor = items.length > 0 ? items[items.length - 1].id : undefined
        reply.send({ items, hasMore, nextCursor })
      }
    }
  )

  fastify.post('/', async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const post = await fastify.prisma.post.create({
      data: { ...body.data, authorId: request.userId },
      include: {
        author: { select: { id: true, name: true, username: true, archetypeKey: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    })

    // Notify @mentioned users (fire-and-forget — don't delay the response)
    const handles = [...body.data.content.matchAll(/@([a-z0-9_]+)/gi)].map((m) => m[1].toLowerCase())
    if (handles.length > 0) {
      fastify.prisma.user.findMany({
        where: { username: { in: handles }, id: { not: request.userId } },
        select: { id: true },
      }).then(async (mentioned) => {
        if (mentioned.length === 0) return
        const actor = await fastify.prisma.user.findUnique({ where: { id: request.userId }, select: { name: true } })
        const actorName = actor?.name ?? 'Alguém'
        for (const u of mentioned) {
          await fastify.prisma.notification.create({
            data: {
              type: 'mention',
              text: `${actorName} citou você em uma publicação.`,
              recipientId: u.id,
              targetType: 'post',
              targetId: post.id,
              actorId: request.userId,
              actorName,
              postExcerpt: body.data.content.slice(0, 200),
            },
          })
          emitNotification(u.id)
        }
      }).catch(() => {})
    }

    reply.status(201).send({ ...post, likedByCurrentUser: false })
  })

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const post = await fastify.prisma.post.findUnique({
      where: { id: request.params.id },
      include: {
        author: { select: { id: true, name: true, username: true, archetypeKey: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true, reposts: true } },
        likes: { where: { userId: request.userId }, select: { userId: true } },
        repostFrom: { include: { author: { select: { id: true, name: true, username: true, archetypeKey: true, avatarUrl: true } } } },
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

  fastify.post<{ Params: { id: string; commentId: string } }>(
    '/:id/comments/:commentId/like',
    async (request, reply) => {
      // Verify comment exists and belongs to the given post; guards against
      // clients constructing arbitrary commentIds against unrelated posts.
      const comment = await fastify.prisma.comment.findFirst({
        where: { id: request.params.commentId, postId: request.params.id },
        select: { id: true, authorId: true, content: true },
      })
      if (!comment) return reply.status(404).send({ error: 'Comment not found' })

      // Transaction: idempotent upsert + counter increment only when actually inserted
      const inserted = await fastify.prisma.$transaction(async (tx) => {
        const existing = await tx.commentLike.findUnique({
          where: { userId_commentId: { userId: request.userId, commentId: comment.id } },
        })
        if (existing) return false
        await tx.commentLike.create({
          data: { userId: request.userId, commentId: comment.id },
        })
        await tx.comment.update({
          where: { id: comment.id },
          data: { likes: { increment: 1 } },
        })
        return true
      })

      // Read the up-to-date counter after the transaction
      const updated = await fastify.prisma.comment.findUnique({
        where: { id: comment.id },
        select: { likes: true },
      })

      // Notify only on first like (not on retry) and not for self-likes
      if (inserted && comment.authorId !== request.userId) {
        const actor = await fastify.prisma.user.findUnique({
          where: { id: request.userId },
          select: { name: true },
        })
        const actorName = actor?.name ?? 'Alguém'
        await fastify.prisma.notification.create({
          data: {
            type: 'like',
            text: `${actorName} curtiu seu comentário.`,
            recipientId: comment.authorId,
            targetType: 'comment',
            targetId: comment.id,
            actorId: request.userId,
            actorName,
            postExcerpt: comment.content.slice(0, 200),
          },
        })
        emitNotification(comment.authorId)
      }

      reply.status(201).send({
        id: comment.id,
        likes: updated?.likes ?? 0,
        likedByCurrentUser: true,
      })
    }
  )

  fastify.delete<{ Params: { id: string; commentId: string } }>(
    '/:id/comments/:commentId/like',
    async (request, reply) => {
      const comment = await fastify.prisma.comment.findFirst({
        where: { id: request.params.commentId, postId: request.params.id },
        select: { id: true },
      })
      if (!comment) return reply.status(404).send({ error: 'Comment not found' })

      // Transaction: idempotent delete + counter decrement only when actually removed
      await fastify.prisma.$transaction(async (tx) => {
        const existing = await tx.commentLike.findUnique({
          where: { userId_commentId: { userId: request.userId, commentId: comment.id } },
        })
        if (!existing) return
        await tx.commentLike.delete({
          where: { userId_commentId: { userId: request.userId, commentId: comment.id } },
        })
        // Guard against negative counters if a stray write got out of sync
        await tx.comment.updateMany({
          where: { id: comment.id, likes: { gt: 0 } },
          data: { likes: { decrement: 1 } },
        })
      })

      const updated = await fastify.prisma.comment.findUnique({
        where: { id: comment.id },
        select: { likes: true },
      })
      reply.send({
        id: comment.id,
        likes: updated?.likes ?? 0,
        likedByCurrentUser: false,
      })
    }
  )

  fastify.post<{ Params: { id: string } }>('/:id/repost', async (request, reply) => {
    const original = await fastify.prisma.post.findUnique({ where: { id: request.params.id } })
    if (!original) return reply.status(404).send({ error: 'Post not found' })

    // Optional quote comment — if provided this becomes a "quote repost"
    const quoteSchema = z.object({ content: z.string().optional() })
    const parsed = quoteSchema.safeParse(request.body)
    const quoteContent = (parsed.success ? parsed.data.content?.trim() : undefined) ?? ''

    const repost = await fastify.prisma.post.create({
      data: {
        content: quoteContent || original.content,
        category: original.category,
        authorId: request.userId,
        isRepost: true,
        repostFromId: original.id,
        communityId: original.communityId,
      },
      include: {
        author: { select: { id: true, name: true, username: true, archetypeKey: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true, reposts: true } },
        repostFrom: { include: { author: { select: { id: true, name: true, username: true, archetypeKey: true, avatarUrl: true } } } },
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
        include: { author: { select: { id: true, name: true, archetypeKey: true, avatarUrl: true } } },
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
      include: { author: { select: { id: true, name: true, archetypeKey: true } } },
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
