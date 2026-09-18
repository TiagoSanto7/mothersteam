import { describe, expect, it } from 'vitest'
import {
  decodeForYouCursor,
  encodeForYouCursor,
  phaseCategoriesFor,
  afterRankedCursor,
  rankPosts,
  rankWithScores,
  scorePost,
  type RankablePost,
  type ViewerContext,
} from './feedRanking'

const NOW = new Date('2026-09-18T12:00:00.000Z')
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000)

const post = (id: string, extra: Partial<RankablePost> = {}): RankablePost => ({
  id,
  authorId: 'stranger',
  communityId: null,
  category: 'saúde mental',
  createdAt: hoursAgo(3),
  _count: { likes: 0, comments: 0, reposts: 0 },
  ...extra,
})

const ctx: ViewerContext = {
  viewerId: 'me',
  followingIds: new Set(['friend']),
  communityIds: new Set(['my-group']),
  phaseCategories: new Set(['gestação']),
}

describe('scorePost', () => {
  it('mais engajamento sobe, com comentários pesando mais que curtidas', () => {
    const base = scorePost(post('a'), ctx, NOW)
    const liked = scorePost(post('b', { _count: { likes: 2, comments: 0, reposts: 0 } }), ctx, NOW)
    const commented = scorePost(post('c', { _count: { likes: 0, comments: 2, reposts: 0 } }), ctx, NOW)
    expect(liked).toBeGreaterThan(base)
    expect(commented).toBeGreaterThan(liked)
  })

  it('posts mais antigos perdem força', () => {
    expect(scorePost(post('new', { createdAt: hoursAgo(1) }), ctx, NOW)).toBeGreaterThan(
      scorePost(post('old', { createdAt: hoursAgo(30) }), ctx, NOW),
    )
  })

  it('quem ela segue, as comunidades dela e a fase dela ganham bônus', () => {
    const base = scorePost(post('a'), ctx, NOW)
    expect(scorePost(post('f', { authorId: 'friend' }), ctx, NOW)).toBeGreaterThan(base)
    expect(scorePost(post('g', { communityId: 'my-group' }), ctx, NOW)).toBeGreaterThan(base)
    expect(scorePost(post('p', { category: 'gestação' }), ctx, NOW)).toBeGreaterThan(base)
  })

  it('não dá bônus de "seguindo" para os próprios posts', () => {
    const me = { ...ctx, followingIds: new Set(['me']) }
    expect(scorePost(post('own', { authorId: 'me' }), me, NOW)).toBe(scorePost(post('x'), me, NOW))
  })
})

describe('rankPosts', () => {
  it('ordena por pontuação e desempata pelo mais novo, de forma determinística', () => {
    const popular = post('popular', { _count: { likes: 20, comments: 5, reposts: 1 }, createdAt: hoursAgo(10) })
    const tieA = post('tie-a', { createdAt: hoursAgo(5) })
    const tieB = post('tie-b', { createdAt: hoursAgo(5) })
    const order = rankPosts([tieA, popular, tieB], ctx, NOW).map((p) => p.id)
    expect(order[0]).toBe('popular')
    expect(order.slice(1)).toEqual(['tie-b', 'tie-a'])
    expect(rankPosts([tieB, tieA, popular], ctx, NOW).map((p) => p.id)).toEqual(order)
  })
})

describe('afterRankedCursor', () => {
  it('continua depois do último item visto mesmo se um item anterior for apagado', () => {
    const posts = ['a', 'b', 'c', 'd'].map((id, i) => post(id, { createdAt: hoursAgo(i + 1) }))
    const ranked = rankWithScores(posts, ctx, NOW)
    const last = ranked[1]
    const cursor = { score: last.score, createdAt: last.post.createdAt.getTime(), id: last.post.id }

    // 'a' (already shown) is deleted before the next page is requested.
    const withoutA = rankWithScores(posts.filter((p) => p.id !== 'a'), ctx, NOW)
    expect(afterRankedCursor(withoutA, cursor).map((r) => r.post.id)).toEqual(
      ranked.slice(2).map((r) => r.post.id),
    )
  })
})

describe('phaseCategoriesFor', () => {
  it('grávida → gestação; depois do parto → pós-parto e amamentação', () => {
    expect([...phaseCategoriesFor('pregnant')]).toEqual(['gestação'])
    expect([...phaseCategoriesFor('postpartum')].sort()).toEqual(['amamentação', 'pós-parto'])
    expect(phaseCategoriesFor(null).size).toBe(0)
  })
})

describe('cursor do "Para você"', () => {
  it('ida e volta dos dois tipos', () => {
    const asOf = new Date('2026-09-18T12:00:00.000Z')
    const ranked = { kind: 'ranked' as const, asOf, score: 0.0123456789, createdAt: 1789640000000, id: 'cmu1abc' }
    expect(decodeForYouCursor(encodeForYouCursor(ranked))).toEqual(ranked)
    expect(decodeForYouCursor(encodeForYouCursor({ kind: 'older', before: '2026-09-04T12:00:00.000Z_abc' }))).toEqual({
      kind: 'older',
      before: '2026-09-04T12:00:00.000Z_abc',
    })
  })

  it('rejeita cursor inválido', () => {
    expect(decodeForYouCursor('r~xyz~1~2~id')).toBeNull()
    expect(decodeForYouCursor('r~1~2~3')).toBeNull()
    expect(decodeForYouCursor('lixo')).toBeNull()
    expect(decodeForYouCursor(undefined)).toBeNull()
  })
})
