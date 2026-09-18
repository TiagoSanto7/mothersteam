import type { Prisma, PrismaClient } from '@prisma/client'

/**
 * Single source of truth for "can this user see this post?".
 *
 * A post is visible when it is outside any community, in a public community, in a private
 * community the viewer belongs to, or written by the viewer. Reposts carry the original's
 * communityId, so the same rule covers them. Every route that reads or interacts with posts
 * must go through here; a route with its own rule is how private posts leaked before (TIA-6).
 */
export function visiblePostWhere(viewerId: string): Prisma.PostWhereInput {
  return {
    OR: [
      { authorId: viewerId },
      { communityId: null },
      { community: { isPrivate: false } },
      { community: { members: { some: { userId: viewerId } } } },
    ],
  }
}

/**
 * Loads a post only if the viewer may see it. Returns null for both "does not exist" and
 * "not allowed", so callers answer 404 either way and never reveal that a private post exists.
 */
export function findVisiblePost<S extends Prisma.PostSelect>(
  prisma: PrismaClient,
  postId: string,
  viewerId: string,
  select: S,
) {
  return prisma.post.findFirst({
    where: { AND: [{ id: postId }, visiblePostWhere(viewerId)] },
    select,
  })
}

/** Whether the user may publish into a community: only members can post there. */
export async function canPostInCommunity(
  prisma: PrismaClient,
  communityId: string,
  userId: string,
): Promise<boolean> {
  const member = await prisma.communityMember.findUnique({
    where: { userId_communityId: { userId, communityId } },
    select: { userId: true },
  })
  return member !== null
}

/** Opaque, stable feed cursor: (createdAt, id) of the last item, newest-first order. */
export function encodeFeedCursor(post: { createdAt: Date; id: string }): string {
  return `${post.createdAt.toISOString()}_${post.id}`
}

/** Keyset condition for "strictly after this cursor" in (createdAt desc, id desc) order. */
export function afterFeedCursor(cursor: string | undefined): Prisma.PostWhereInput | null {
  if (!cursor) return null
  const sep = cursor.indexOf('_')
  if (sep <= 0) return null
  const createdAt = new Date(cursor.slice(0, sep))
  const id = cursor.slice(sep + 1)
  // An empty id is allowed: it means "strictly before createdAt" (used as a time boundary).
  if (Number.isNaN(createdAt.getTime())) return null
  return {
    OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }],
  }
}
