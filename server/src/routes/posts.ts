import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
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
import { RANKING, afterRankedCursor, decodeForYouCursor, encodeForYouCursor, phaseCategoriesFor, rankWithScores } from '../lib/feedRanking'

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

  // Feed. Three modes, all limited to posts the viewer may see (postVisibility):
  // - no mode (legacy, installed app builds): every visible post, newest first;
  // - mode=following ("Seguindo"): only her network — own posts, people she follows, her communities;
  // - mode=foryou ("Para você"): recent posts ranked by feedRanking, then older ones chronologically.
  // Chronological pages use a stable (createdAt, id) cursor; posts outside her network are
  // flagged isSuggestion.
  fastify.get<{ Querystring: { cursor?: string; limit?: string; mode?: string } }>(
    '/',
    async (request, reply) => {
      const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 50)
      const mode = request.query.mode === 'following' || request.query.mode === 'foryou' ? request.query.mode : null
      const viewerId = request.userId

      const [following, memberships, viewer] = await Promise.all([
        fastify.prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } }),
        fastify.prisma.communityMember.findMany({ where: { userId: viewerId }, select: { communityId: true } }),
        mode === 'foryou'
          ? fastify.prisma.user.findUnique({ where: { id: viewerId }, select: { pregnancyStage: true } })
          : Promise.resolve(null),
      ])
      const followingIds = new Set(following.map((f) => f.followingId))
      const communityIds = new Set(memberships.map((m) => m.communityId))

      const include = {
        author: { select: { id: true, name: true, username: true, archetypeKey: true, avatarUrl: true, role: true } },
        community: { select: { name: true } },
        _count: { select: { likes: true, comments: true, reposts: true } },
        likes: { where: { userId: viewerId }, select: { userId: true } },
        repostFrom: { include: { author: { select: { id: true, name: true, username: true, archetypeKey: true, avatarUrl: true, role: true } } } },
      } as const
      type Row = Prisma.PostGetPayload<{ include: typeof include }>
      const toItem = ({ likes, community, ...post }: Row) => ({
        ...post,
        communityName: community?.name ?? null,
        likedByCurrentUser: likes.length > 0,
        isSuggestion:
          post.authorId !== viewerId &&
          !followingIds.has(post.authorId) &&
          !(post.communityId !== null && communityIds.has(post.communityId)),
      })

      const networkWhere: Prisma.PostWhereInput = {
        OR: [
          { authorId: viewerId },
          ...(followingIds.size > 0 ? [{ authorId: { in: [...followingIds] } }] : []),
          ...(communityIds.size > 0 ? [{ communityId: { in: [...communityIds] } }] : []),
        ],
      }

      /** One chronological page below `cursor` (a (createdAt, id) cursor), within `scope`. */
      async function chronological(scope: Prisma.PostWhereInput[], cursor: string | undefined) {
        const after = afterFeedCursor(cursor)
        const rows = await fastify.prisma.post.findMany({
          where: { AND: [visiblePostWhere(viewerId), ...scope, ...(after ? [after] : [])] },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit + 1,
          include,
        })
        const page = rows.slice(0, limit)
        const last = page[page.length - 1]
        return { page, hasMore: rows.length > limit, next: last ? encodeFeedCursor(last) : undefined }
      }

      if (mode === 'foryou') {
        const decoded = decodeForYouCursor(request.query.cursor)
        if (decoded?.kind === 'older') {
          const { page, hasMore, next } = await chronological([], decoded.before)
          return reply.send({
            items: page.map(toItem),
            hasMore,
            nextCursor: hasMore && next ? encodeForYouCursor({ kind: 'older', before: next }) : undefined,
          })
        }

        // Ranked window: every page re-ranks the same frozen snapshot, so the order holds.
        const asOf = decoded?.asOf ?? new Date()
        const windowStart = new Date(asOf.getTime() - RANKING.WINDOW_DAYS * 86_400_000)
        const candidates = await fastify.prisma.post.findMany({
          where: { AND: [visiblePostWhere(viewerId), { createdAt: { gte: windowStart, lte: asOf } }] },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: RANKING.MAX_CANDIDATES,
          select: {
            id: true, authorId: true, communityId: true, category: true, createdAt: true,
            _count: { select: { likes: true, comments: true, reposts: true } },
          },
        })
        const allRanked = rankWithScores(
          candidates,
          { viewerId, followingIds, communityIds, phaseCategories: phaseCategoriesFor(viewer?.pregnancyStage) },
          asOf,
        )
        const remaining = decoded ? afterRankedCursor(allRanked, decoded) : allRanked
        const pageRanked = remaining.slice(0, limit)
        const pageIds = pageRanked.map((r) => r.post.id)
        const rows = pageIds.length ? await fastify.prisma.post.findMany({ where: { id: { in: pageIds } }, include }) : []
        const byId = new Map(rows.map((r) => [r.id, r]))
        const items = pageIds.map((id) => byId.get(id)).filter((r): r is Row => r !== undefined).map(toItem)

        const lastRanked = pageRanked[pageRanked.length - 1]
        if (remaining.length > limit && lastRanked) {
          return reply.send({
            items,
            hasMore: true,
            nextCursor: encodeForYouCursor({
              kind: 'ranked',
              asOf,
              score: lastRanked.score,
              createdAt: lastRanked.post.createdAt.getTime(),
              id: lastRanked.post.id,
            }),
          })
        }
        // Window exhausted: continue with everything older than the ranked candidates.
        const oldest = candidates[candidates.length - 1]
        const boundary =
          candidates.length >= RANKING.MAX_CANDIDATES && oldest
            ? encodeFeedCursor(oldest)
            : encodeFeedCursor({ createdAt: windowStart, id: '' })
        const olderWhere = afterFeedCursor(boundary)
        const olderExists = olderWhere
          ? await fastify.prisma.post.findFirst({
              where: { AND: [visiblePostWhere(viewerId), olderWhere] },
              select: { id: true },
            })
          : null
        return reply.send({
          items,
          hasMore: olderExists !== null,
          nextCursor: olderExists ? encodeForYouCursor({ kind: 'older', before: boundary }) : undefined,
        })
      }

      // Legacy / "Seguindo": chronological. Older app builds page with a bare post id; translate it.
      let cursor = request.query.cursor
      if (cursor && !cursor.includes('_')) {
        const anchor = await fastify.prisma.post.findUnique({ where: { id: cursor }, select: { id: true, createdAt: true } })
        cursor = anchor ? encodeFeedCursor(anchor) : undefined
      }
      const { page, hasMore, next } = await chronological(mode === 'following' ? [networkWhere] : [], cursor)
      reply.send({ items: page.map(toItem), hasMore, nextCursor: hasMore ? next : undefined })
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
