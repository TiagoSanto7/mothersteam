import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import Fastify from 'fastify'
import postsRoutes from './posts'

// Integration tests for GET /posts?mode=following|foryou against the real database.
const prisma = new PrismaClient()
const tag = `modes${Date.now()}${Math.floor(Math.random() * 1e6)}`
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000)

type Item = { id: string; isSuggestion: boolean }

async function get(viewerId: string, url: string) {
  const app = Fastify()
  app.decorate('prisma', prisma)
  app.decorateRequest('userId', '')
  app.decorate('authenticate', async (req: any) => {
    req.userId = viewerId
  })
  await app.register(postsRoutes, { prefix: '/posts' })
  const res = await app.inject({ method: 'GET', url })
  await app.close()
  return res.json() as { items: Item[]; hasMore: boolean; nextCursor?: string }
}

/** Walks every page of a mode and returns all ids in order. */
async function walk(viewerId: string, mode: string, limit: number) {
  const seen: Item[] = []
  let cursor: string | undefined
  for (let i = 0; i < 200; i++) {
    const page = await get(viewerId, `/posts?mode=${mode}&limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`)
    seen.push(...page.items)
    if (!page.hasMore) break
    cursor = page.nextCursor
  }
  return seen
}

const users: Record<string, { id: string }> = {}
const posts: Record<string, string> = {}
let grupo: { id: string }
let privada: { id: string }

async function user(key: string, pregnancyStage = 'pregnant') {
  users[key] = await prisma.user.create({
    data: { email: `${key}.${tag}@t.com`, passwordHash: 'x', name: key, pregnancyStage },
  })
}

async function post(key: string, author: string, hours: number, extra: Record<string, unknown> = {}) {
  const p = await prisma.post.create({
    data: { content: `${key} ${tag}`, category: 'saúde mental', authorId: users[author].id, createdAt: hoursAgo(hours), ...extra },
  })
  posts[key] = p.id
}

const pick = (items: Item[]) => items.map((i) => i.id).filter((id) => Object.values(posts).includes(id))

beforeAll(async () => {
  await user('bia')
  await user('carla')
  await user('estranha')
  await prisma.follow.create({ data: { followerId: users.bia.id, followingId: users.carla.id } })
  grupo = await prisma.community.create({
    data: {
      name: `Grupo ${tag}`, description: 'x', category: 'gestação', colorKey: 'gold', creatorId: users.estranha.id,
      members: { create: [{ userId: users.estranha.id, role: 'owner' }, { userId: users.bia.id }] },
    },
  })
  privada = await prisma.community.create({
    data: {
      name: `Privada ${tag}`, description: 'x', category: 'gestação', colorKey: 'gold', isPrivate: true,
      creatorId: users.estranha.id, members: { create: { userId: users.estranha.id, role: 'owner' } },
    },
  })

  await post('biaPropria', 'bia', 2)
  await post('carlaSeguida', 'carla', 5)
  await post('noGrupoDela', 'estranha', 4, { communityId: grupo.id })
  await post('estranhaEmAlta', 'estranha', 1)
  await post('estranhaFria', 'estranha', 30)
  await post('privadaVazamento', 'estranha', 1, { communityId: privada.id })
  await post('antiga', 'estranha', 24 * 20) // outside the 14-day ranked window
  // Engagement for estranhaEmAlta: three comments.
  for (let i = 0; i < 3; i++) {
    await prisma.comment.create({ data: { content: 'uau', authorId: users.carla.id, postId: posts.estranhaEmAlta } })
  }
})

afterAll(async () => {
  const ids = Object.values(users).map((u) => u.id)
  await prisma.comment.deleteMany({ where: { authorId: { in: ids } } })
  await prisma.post.deleteMany({ where: { authorId: { in: ids } } })
  await prisma.community.deleteMany({ where: { id: { in: [grupo.id, privada.id] } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
  await prisma.$disconnect()
})

describe('GET /posts?mode=following (Seguindo)', () => {
  it('só a rede dela, em ordem cronológica, sem sugestões', async () => {
    const items = await walk(users.bia.id, 'following', 50)
    expect(pick(items)).toEqual([posts.biaPropria, posts.noGrupoDela, posts.carlaSeguida])
    expect(items.every((i) => !i.isSuggestion)).toBe(true)
  })

  it('pagina sem repetir', async () => {
    const items = await walk(users.bia.id, 'following', 1)
    expect(pick(items)).toEqual([posts.biaPropria, posts.noGrupoDela, posts.carlaSeguida])
    const all = items.map((i) => i.id)
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('GET /posts?mode=foryou (Para você)', () => {
  it('ranqueia: post em alta de fora da rede fica acima de post frio', async () => {
    // Walk every page: other recent posts in the database can push fixtures past page one.
    const order = pick(await walk(users.bia.id, 'foryou', 50))
    expect(order.indexOf(posts.estranhaEmAlta)).toBeLessThan(order.indexOf(posts.estranhaFria))
    expect(order.indexOf(posts.estranhaEmAlta)).toBeLessThan(order.indexOf(posts.carlaSeguida))
  })

  it('percorre tudo, incluindo posts antigos depois da janela, sem repetir e sem vazar privados', async () => {
    const items = await walk(users.bia.id, 'foryou', 3)
    const got = pick(items)
    for (const key of ['biaPropria', 'carlaSeguida', 'noGrupoDela', 'estranhaEmAlta', 'estranhaFria', 'antiga']) {
      expect(got).toContain(posts[key])
    }
    expect(got).not.toContain(posts.privadaVazamento)
    const all = items.map((i) => i.id)
    expect(new Set(all).size).toBe(all.length)
    // The 20-day-old post only comes after the ranked window.
    expect(got[got.length - 1]).toBe(posts.antiga)
  })

  it('mantém o selo de sugestão para quem está fora da rede', async () => {
    const byId = new Map((await walk(users.bia.id, 'foryou', 50)).map((i) => [i.id, i.isSuggestion]))
    expect(byId.get(posts.estranhaEmAlta)).toBe(true)
    expect(byId.get(posts.carlaSeguida)).toBe(false)
    expect(byId.get(posts.noGrupoDela)).toBe(false)
  })
})
