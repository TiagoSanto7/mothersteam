/**
 * "Para você" ranking: a transparent heuristic, tuned by the constants below.
 *
 *   score = (1 + engagement)^ENGAGEMENT_EXP × affinity / (ageHours + AGE_OFFSET)^GRAVITY
 *
 * - engagement: likes + 2×comments + 2×reposts (conversation weighs more than a tap).
 * - affinity: 1 plus bonuses for her network and for posts in her pregnancy phase.
 * - gravity: older posts sink, like Hacker News; AGE_OFFSET keeps brand-new posts from
 *   dominating purely by being seconds old.
 */

export const RANKING = {
  WINDOW_DAYS: 14,
  MAX_CANDIDATES: 300,
  ENGAGEMENT_EXP: 0.8,
  GRAVITY: 1.5,
  AGE_OFFSET: 2,
  BONUS_FOLLOWING: 1.0,
  BONUS_COMMUNITY: 0.6,
  BONUS_PHASE: 0.4,
} as const

export interface RankablePost {
  id: string
  authorId: string
  communityId: string | null
  category: string
  createdAt: Date
  _count: { likes: number; comments: number; reposts: number }
}

export interface ViewerContext {
  viewerId: string
  followingIds: ReadonlySet<string>
  communityIds: ReadonlySet<string>
  /** Post categories matching her current phase, e.g. gestação while pregnant. */
  phaseCategories: ReadonlySet<string>
}

/** Categories that match where she is: pregnant → gestação; after birth → pós-parto, amamentação. */
export function phaseCategoriesFor(pregnancyStage: string | null | undefined): Set<string> {
  if (pregnancyStage === 'pregnant') return new Set(['gestação'])
  if (pregnancyStage) return new Set(['pós-parto', 'amamentação'])
  return new Set()
}

export function scorePost(post: RankablePost, ctx: ViewerContext, now: Date): number {
  const { likes, comments, reposts } = post._count
  const engagement = likes + 2 * comments + 2 * reposts

  let affinity = 1
  if (post.authorId !== ctx.viewerId && ctx.followingIds.has(post.authorId)) affinity += RANKING.BONUS_FOLLOWING
  if (post.communityId !== null && ctx.communityIds.has(post.communityId)) affinity += RANKING.BONUS_COMMUNITY
  if (ctx.phaseCategories.has(post.category)) affinity += RANKING.BONUS_PHASE

  const ageHours = Math.max(0, (now.getTime() - post.createdAt.getTime()) / 3_600_000)
  return (
    (Math.pow(1 + engagement, RANKING.ENGAGEMENT_EXP) * affinity) /
    Math.pow(ageHours + RANKING.AGE_OFFSET, RANKING.GRAVITY)
  )
}

export interface Ranked<T> {
  post: T
  score: number
}

/** Total order of ranked items: highest score first, then newest, then id. */
function compareRanked(a: { score: number; createdAt: number; id: string }, b: { score: number; createdAt: number; id: string }) {
  return b.score - a.score || b.createdAt - a.createdAt || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)
}

/** Highest score first; ties broken by newest, then id, so the order is fully deterministic. */
export function rankWithScores<T extends RankablePost>(posts: readonly T[], ctx: ViewerContext, now: Date): Ranked<T>[] {
  return posts
    .map((post) => ({ post, score: scorePost(post, ctx, now) }))
    .sort((a, b) =>
      compareRanked(
        { score: a.score, createdAt: a.post.createdAt.getTime(), id: a.post.id },
        { score: b.score, createdAt: b.post.createdAt.getTime(), id: b.post.id },
      ),
    )
}

export function rankPosts<T extends RankablePost>(posts: readonly T[], ctx: ViewerContext, now: Date): T[] {
  return rankWithScores(posts, ctx, now).map((r) => r.post)
}

/** Items strictly after the cursor's (score, createdAt, id) position in the ranked order. */
export function afterRankedCursor<T extends RankablePost>(
  ranked: readonly Ranked<T>[],
  cursor: { score: number; createdAt: number; id: string },
): Ranked<T>[] {
  return ranked.filter(
    (r) => compareRanked(cursor, { score: r.score, createdAt: r.post.createdAt.getTime(), id: r.post.id }) < 0,
  )
}

/**
 * "Para você" cursor. A ranked page must not shift while she scrolls, so the first page freezes
 * the moment it was ranked (asOf); later pages re-rank that same snapshot and continue strictly
 * after the last item seen (score, createdAt, id) — a keyset, so posts deleted or added meanwhile
 * never make the next page skip or repeat items. Once the ranked window runs out, the feed
 * continues chronologically below the window.
 */
export type ForYouCursor =
  | { kind: 'ranked'; asOf: Date; score: number; createdAt: number; id: string }
  | { kind: 'older'; before: string }

export function encodeForYouCursor(c: ForYouCursor): string {
  return c.kind === 'ranked' ? ['r', c.asOf.getTime(), c.score, c.createdAt, c.id].join('~') : `o~${c.before}`
}

export function decodeForYouCursor(raw: string | undefined): ForYouCursor | null {
  if (!raw) return null
  const parts = raw.split('~')
  if (parts[0] === 'r' && parts.length === 5) {
    const [, asOf, score, createdAt, id] = parts
    const at = Number(asOf)
    const sc = Number(score)
    const ca = Number(createdAt)
    if (!Number.isFinite(at) || !Number.isFinite(sc) || !Number.isFinite(ca) || !id) return null
    return { kind: 'ranked', asOf: new Date(at), score: sc, createdAt: ca, id }
  }
  if (parts[0] === 'o' && raw.length > 2) return { kind: 'older', before: raw.slice(2) }
  return null
}
