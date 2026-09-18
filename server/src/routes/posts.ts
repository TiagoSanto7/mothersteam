import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { emitNotification } from '../sse'
import { sendPush } from '../plugins/fcm'
import {
  afterFeedCursor,
  canPostInCommunity,
  encodeFeedCursor,
  findVisiblePost,
  visiblePostWhere,
} from '../lib/postVisibility'

const createSchema = z.object({
  content: z.string().min(1),
  category: z.enum(['gestação', 'pós-parto', 'amamentação', 'saúde mental']),
  communityId: z.string().optional(),
  imageUrl: z.string().optional(),
})

const commentSchema = z.object({
  content: z.string().min(1),
  parentId: z.string().optional(),
})

const NOT_FOUND = { error: 'Post not found' }

async function findCommentInPost(
  prisma: FastifyInstance['prisma'],
  commentId: string,
  postId: string,
  select: { id: true; authorId?: true; content?: true },
) {
  return prisma.comment.findFirst({
    where: { id: commentId, postId },
    select,
  })
}

export default async function postsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // Feed: one reverse-chronological timeline of every post the viewer may see — her own,
  // people she follows, her communities and public posts — paged by a stable (createdAt, id)
  // cursor. Posts outside her network are flagged isSuggestion instead of queried apart.
  fastify.get<{ Querystring: { cursor?: string; limit?: string } }>(
    '/',
    async (request, reply) => {
      const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 50)

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
      const followingIds = new Set(following.map((f) => f.followingId))
      const communityIds = new Set(memberships.map((m) => m.communityId))

      // Older app builds page with a bare post id; translate it to the (createdAt, id) cursor.
      let cursor = request.query.cursor
      if (cursor && !cursor.includes('_')) {
        const anchor = await fastify.prisma.post.findUnique({ where: { id: cursor }, select: { id: true, createdAt: true } })
        cursor = anchor ? encodeFeedCursor(anchor) : undefined
      }
      const after = afterFeedCursor(cursor)
      const rows = await fastify.prisma.post.findMany({
        where: { AND: [visiblePostWhere(request.userId), ...(after ? [after] : [])] },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        include: {
          author: { select: { id: true, name: true, username: true, archetypeKey: true, avatarUrl: true, role: true } },
          community: { select: { name: true } },
          _count: { select: { likes: true, comments: true, reposts: true } },
          likes: { where: { userId: request.userId }, select: { userId: true } },
          repostFrom: { include: { author: { select: { id: true, name: true, username: true, archetypeKey: true, avatarUrl: true, role: true } } } },
        },
      })

      const hasMore = rows.length > limit
      const page = rows.slice(0, limit)
      const items = page.map(({ likes, community, ...post }) => ({
        ...post,
        communityName: community?.name ?? null,
        likedByCurrentUser: likes.length > 0,
        isSuggestion:
          post.authorId !== request.userId &&
          !followingIds.has(post.authorId) &&
          !(post.communityId !== null && communityIds.has(post.communityId)),
      }))
      const last = page[page.length - 1]
      reply.send({ items, hasMore, nextCursor: hasMore && last ? encodeFeedCursor(last) : undefined })
    }
  )

  fastify.post('/', async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    if (body.data.communityId && !(await canPostInCommunity(fastify.prisma, body.data.communityId, request.userId))) {
      return reply.status(403).send({ error: 'Só membros podem publicar nesta comunidade' })
    }

    const created = await fastify.prisma.post.create({
      data: { ...body.data, authorId: request.userId },
      include: {
        author: { select: { id: true, name: true, username: true, archetypeKey: true, avatarUrl: true, role: true } },
        community: { select: { name: true } },
        _count: { select: { likes: true, comments: true, reposts: true } },
      },
    })
    // Same shape as a feed item, so the app can drop it straight into the timeline.
    const { community, ...post } = created

    // Notify @mentioned users (fire-and-forget — don't delay the response)
    const handles = [...body.data.content.matchAll(/@([a-z0-9_]+)/gi)].map((m) => m[1].toLowerCase())
    if (handles.length > 0) {
      fastify.prisma.user.findMany({
        where: { username: { in: handles }, id: { not: request.userId } },
        select: { id: true, fcmToken: true },
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
          if (u.fcmToken) {
            sendPush(u.fcmToken, 'Você foi mencionada 📣', `${actorName} citou você em uma publicação.`).catch(() => {})
          }
        }
      }).catch(() => {})
    }

    reply.status(201).send({ ...post, communityName: community?.name ?? null, likedByCurrentUser: false, isSuggestion: false })
  })

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const post = await fastify.prisma.post.findFirst({
      where: { AND: [{ id: request.params.id }, visiblePostWhere(request.userId)] },
      include: {
        author: { select: { id: true, name: true, username: true, archetypeKey: true, avatarUrl: true, role: true } },
        _count: { select: { likes: true, comments: true, reposts: true } },
        likes: { where: { userId: request.userId }, select: { userId: true } },
        repostFrom: { include: { author: { select: { id: true, name: true, username: true, archetypeKey: true, avatarUrl: true, role: true } } } },
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
    if (!(await findVisiblePost(fastify.prisma, request.params.id, request.userId, { id: true }))) {
      return reply.status(404).send(NOT_FOUND)
    }
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

      const recipient = await fastify.prisma.user.findUnique({ where: { id: post.authorId }, select: { fcmToken: true } })
      if (recipient?.fcmToken) {
        sendPush(recipient.fcmToken, 'Nova curtida 💛', `${actorName} curtiu sua publicação.`).catch(() => {})
      }
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
      if (!(await findVisiblePost(fastify.prisma, request.params.id, request.userId, { id: true }))) {
        return reply.status(404).send(NOT_FOUND)
      }
      // Verify comment exists and belongs to the given post; guards against
      // clients constructing arbitrary commentIds against unrelated posts.
      const comment = await findCommentInPost(fastify.prisma, request.params.commentId, request.params.id, { id: true, authorId: true, content: true })
      if (!comment) return reply.status(404).send({ error: 'Comment not found' })

      // Transaction: idempotent upsert + counter increment only when actually inserted
      const { inserted, likes } = await fastify.prisma.$transaction(async (tx) => {
        const existing = await tx.commentLike.findUnique({
          where: { userId_commentId: { userId: request.userId, commentId: comment.id } },
        })
        if (existing) {
          const current = await tx.comment.findUnique({ where: { id: comment.id }, select: { likes: true } })
          return { inserted: false, likes: current?.likes ?? 0 }
        }
        await tx.commentLike.create({
          data: { userId: request.userId, commentId: comment.id },
        })
        const updated = await tx.comment.update({
          where: { id: comment.id },
          data: { likes: { increment: 1 } },
          select: { likes: true },
        })
        return { inserted: true, likes: updated.likes }
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

        const commentRecipient = await fastify.prisma.user.findUnique({ where: { id: comment.authorId }, select: { fcmToken: true } })
        if (commentRecipient?.fcmToken) {
          sendPush(commentRecipient.fcmToken, 'Nova curtida 💛', `${actorName} curtiu seu comentário.`).catch(() => {})
        }
      }

      reply.status(201).send({
        id: comment.id,
        likes,
        likedByCurrentUser: true,
      })
    }
  )

  fastify.delete<{ Params: { id: string; commentId: string } }>(
    '/:id/comments/:commentId/like',
    async (request, reply) => {
      const comment = await findCommentInPost(fastify.prisma, request.params.commentId, request.params.id, { id: true })
      if (!comment) return reply.status(404).send({ error: 'Comment not found' })

      // Transaction: idempotent delete + counter decrement only when actually removed
      const likes = await fastify.prisma.$transaction(async (tx) => {
        const existing = await tx.commentLike.findUnique({
          where: { userId_commentId: { userId: request.userId, commentId: comment.id } },
        })
        if (!existing) {
          const current = await tx.comment.findUnique({ where: { id: comment.id }, select: { likes: true } })
          return current?.likes ?? 0
        }
        await tx.commentLike.delete({
          where: { userId_commentId: { userId: request.userId, commentId: comment.id } },
        })
        // Guard against negative counters if a stray write got out of sync
        await tx.comment.updateMany({
          where: { id: comment.id, likes: { gt: 0 } },
          data: { likes: { decrement: 1 } },
        })
        const updated = await tx.comment.findUnique({ where: { id: comment.id }, select: { likes: true } })
        return updated?.likes ?? 0
      })

      reply.send({
        id: comment.id,
        likes,
        likedByCurrentUser: false,
      })
    }
  )

  fastify.post<{ Params: { id: string } }>('/:id/repost', async (request, reply) => {
    const original = await findVisiblePost(fastify.prisma, request.params.id, request.userId, {
      id: true,
      content: true,
      category: true,
      communityId: true,
    })
    if (!original) return reply.status(404).send(NOT_FOUND)

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
        author: { select: { id: true, name: true, username: true, archetypeKey: true, avatarUrl: true, role: true } },
        _count: { select: { likes: true, comments: true, reposts: true } },
        repostFrom: { include: { author: { select: { id: true, name: true, username: true, archetypeKey: true, avatarUrl: true, role: true } } } },
      },
    })
    reply.status(201).send({ ...repost, likedByCurrentUser: false })
  })

  fastify.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/:id/comments',
    async (request, reply) => {
      if (!(await findVisiblePost(fastify.prisma, request.params.id, request.userId, { id: true }))) {
        return reply.status(404).send(NOT_FOUND)
      }
      const limit = Math.min(Number(request.query.limit ?? 20), 50)
      const comments = await fastify.prisma.comment.findMany({
        where: { postId: request.params.id, parentId: null },
        take: limit + 1,
        ...(request.query.cursor ? { cursor: { id: request.query.cursor }, skip: 1 } : {}),
        include: {
          author: { select: { id: true, name: true, archetypeKey: true, avatarUrl: true } },
          likedBy: { where: { userId: request.userId }, select: { userId: true } },
          replies: {
            include: {
              author: { select: { id: true, name: true, archetypeKey: true, avatarUrl: true } },
              likedBy: { where: { userId: request.userId }, select: { userId: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      })
      const hasMore = comments.length > limit
      const items = comments.slice(0, limit).map(({ likedBy, replies, ...rest }) => ({
        ...rest,
        likedByCurrentUser: likedBy.length > 0,
        replies: replies.map(({ likedBy: rLikedBy, ...r }) => ({
          ...r,
          likedByCurrentUser: rLikedBy.length > 0,
        })),
      }))
      reply.send({ items, hasMore })
    }
  )

  fastify.post<{ Params: { id: string } }>('/:id/comments', async (request, reply) => {
    const body = commentSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    if (!(await findVisiblePost(fastify.prisma, request.params.id, request.userId, { id: true }))) {
      return reply.status(404).send(NOT_FOUND)
    }

    const comment = await fastify.prisma.comment.create({
      data: {
        content: body.data.content,
        authorId: request.userId,
        postId: request.params.id,
        ...(body.data.parentId ? { parentId: body.data.parentId } : {}),
      },
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

      const postRecipient = await fastify.prisma.user.findUnique({ where: { id: post.authorId }, select: { fcmToken: true } })
      if (postRecipient?.fcmToken) {
        sendPush(postRecipient.fcmToken, 'Novo comentário 💬', `${actorName} comentou na sua publicação.`).catch(() => {})
      }
    }

    // Notify @mentioned users in the comment (fire-and-forget)
    const commentHandles = [...body.data.content.matchAll(/@([a-z0-9_]+)/gi)].map((m) => m[1].toLowerCase())
    if (commentHandles.length > 0) {
      const excludeIds = [request.userId, ...(post ? [post.authorId] : [])]
      fastify.prisma.user.findMany({
        where: { username: { in: commentHandles }, id: { notIn: excludeIds } },
        select: { id: true, fcmToken: true },
      }).then(async (mentionedUsers) => {
        if (mentionedUsers.length === 0) return
        const actorName = actor?.name ?? 'Alguém'
        for (const u of mentionedUsers) {
          await fastify.prisma.notification.create({
            data: {
              type: 'mention',
              text: `${actorName} citou você em um comentário.`,
              recipientId: u.id,
              targetType: 'post',
              targetId: request.params.id,
              actorId: request.userId,
              actorName,
              postExcerpt: body.data.content.slice(0, 200),
            },
          })
          emitNotification(u.id)
          if (u.fcmToken) {
            sendPush(u.fcmToken, 'Você foi mencionada 📣', `${actorName} citou você em um comentário.`).catch(() => {})
          }
        }
      }).catch(() => {})
    }

    reply.status(201).send(comment)
  })
}
