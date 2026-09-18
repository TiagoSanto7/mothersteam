import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import Fastify from 'fastify'
import postsRoutes from './posts'
import usersRoutes from './users'
import communitiesRoutes from './communities'

// Integration tests against the real database: the feed's correctness lives in the SQL
// (visibility + ordering + cursor), so mocking Prisma would test nothing.
const prisma = new PrismaClient()
const tag = `feed${Date.now()}${Math.floor(Math.random() * 1e6)}`

// Fixture posts are dated in the far future so they sit at the top of the feed,
// above whatever else is in the database.
const FUTURE = new Date('2099-01-01T12:00:00.000Z').getTime()
const at = (minutes: number) => new Date(FUTURE + minutes * 60_000)

async function app(viewerId: string) {
  const a = Fastify()
  a.decorate('prisma', prisma)
  a.decorateRequest('userId', '')
  a.decorate('authenticate', async (req: any) => {
    req.userId = viewerId
  })
  await a.register(postsRoutes, { prefix: '/posts' })
  await a.register(usersRoutes, { prefix: '/users' })
  await a.register(communitiesRoutes, { prefix: '/communities' })
  return a
}

const user = (name: string) =>
  prisma.user.create({
    data: { email: `${name}.${tag}@t.com`, passwordHash: 'x', name, pregnancyStage: 'pregnant' },
  })

let fernanda: { id: string }
let mariana: { id: string }
let estranha: { id: string }
let privada: { id: string }
let publica: { id: string }
const posts: Record<string, string> = {}

async function post(key: string, authorId: string, minutes: number, extra: Record<string, unknown> = {}) {
  const p = await prisma.post.create({
    data: { content: `${key} ${tag}`, category: 'gestação', authorId, createdAt: at(minutes), ...extra },
  })
  posts[key] = p.id
  return p
}

async function feed(viewerId: string, limit = 50) {
  const a = await app(viewerId)
  const res = await a.inject({ method: 'GET', url: `/posts?limit=${limit}` })
  await a.close()
  return res.json() as { items: { id: string; isSuggestion: boolean; isRepost: boolean }[]; hasMore: boolean; nextCursor?: string }
}

const ids = (items: { id: string }[]) => items.map((i) => i.id)
const fixtureIds = (items: { id: string }[]) => ids(items).filter((id) => Object.values(posts).includes(id))

beforeAll(async () => {
  fernanda = await user('Fernanda')
  mariana = await user('Mariana')
  estranha = await user('Estranha')

  // Fernanda follows Mariana: this is what used to push her into the "priority" feed mode
  // that dropped her own posts.
  await prisma.follow.create({ data: { followerId: fernanda.id, followingId: mariana.id } })

  privada = await prisma.community.create({
    data: {
      name: `Privada ${tag}`, description: 'x', category: 'gestação', colorKey: 'gold', isPrivate: true,
      creatorId: mariana.id, members: { create: { userId: mariana.id, role: 'owner' } },
    },
  })
  publica = await prisma.community.create({
    data: {
      name: `Publica ${tag}`, description: 'x', category: 'gestação', colorKey: 'gold',
      creatorId: estranha.id, members: { create: [{ userId: estranha.id, role: 'owner' }, { userId: fernanda.id }] },
    },
  })

  await post('fernandaGeral', fernanda.id, 10)
  await post('marianaGeral', mariana.id, 20)
  await post('marianaPrivada', mariana.id, 30, { communityId: privada.id })
  await post('estranhaGeral', estranha.id, 40)
  await post('estranhaNaPublica', estranha.id, 5, { communityId: publica.id })
  await post('repostDaMariana', mariana.id, 50, { isRepost: true, repostFromId: posts.estranhaGeral })
  await post('repostPrivado', estranha.id, 1, {
    isRepost: true, repostFromId: posts.marianaPrivada, communityId: privada.id,
  })
})

afterAll(async () => {
  const userIds = [fernanda.id, mariana.id, estranha.id]
  await prisma.comment.deleteMany({ where: { authorId: { in: userIds } } })
  await prisma.postLike.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.notification.deleteMany({ where: { recipientId: { in: userIds } } })
  await prisma.post.updateMany({ where: { authorId: { in: userIds } }, data: { repostFromId: null } })
  await prisma.post.deleteMany({ where: { authorId: { in: userIds } } })
  await prisma.community.deleteMany({ where: { id: { in: [privada.id, publica.id] } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  await prisma.$disconnect()
})

describe('GET /posts — feed', () => {
  it('TIA-6: mostra o próprio post mesmo seguindo alguém', async () => {
    const { items } = await feed(fernanda.id)
    const own = items.find((i) => i.id === posts.fernandaGeral)
    expect(own).toBeDefined()
    expect(own!.isSuggestion).toBe(false)
  })

  it('não vaza post de comunidade privada da qual ela não é membro (nem o repost dele)', async () => {
    const got = ids((await feed(fernanda.id)).items)
    expect(got).not.toContain(posts.marianaPrivada)
    expect(got).not.toContain(posts.repostPrivado)
  })

  it('membro da comunidade privada vê o post dela', async () => {
    const got = ids((await feed(mariana.id)).items)
    expect(got).toContain(posts.marianaPrivada)
  })

  it('uma linha do tempo única, do mais novo para o mais antigo, com sugestões misturadas por data', async () => {
    const { items } = await feed(fernanda.id)
    expect(fixtureIds(items)).toEqual([
      posts.repostDaMariana, // 50
      posts.estranhaGeral, // 40 (sugestão, mais nova que a Mariana)
      posts.marianaGeral, // 20
      posts.fernandaGeral, // 10
      posts.estranhaNaPublica, // 5 (comunidade dela)
    ])
  })

  it('marca como sugestão só quem está fora da rede dela', async () => {
    const byId = new Map((await feed(fernanda.id)).items.map((i) => [i.id, i.isSuggestion]))
    expect(byId.get(posts.estranhaGeral)).toBe(true)
    expect(byId.get(posts.marianaGeral)).toBe(false)
    expect(byId.get(posts.fernandaGeral)).toBe(false)
    expect(byId.get(posts.estranhaNaPublica)).toBe(false) // comunidade da qual ela é membro
  })

  it('reposts aparecem para todas, com ou sem seguir alguém', async () => {
    expect(ids((await feed(fernanda.id)).items)).toContain(posts.repostDaMariana)
    expect(ids((await feed(estranha.id)).items)).toContain(posts.repostDaMariana)
  })
})

describe('GET /posts — paginação por cursor', () => {
  const pageTag = `${tag}-page`
  let pageAuthor: { id: string }
  const created: string[] = []

  beforeAll(async () => {
    pageAuthor = await prisma.user.create({
      data: { email: `pager.${pageTag}@t.com`, passwordHash: 'x', name: 'Pager', pregnancyStage: 'pregnant' },
    })
    // 25 posts newer than every other fixture; three share a timestamp to exercise the id tie-break.
    for (let i = 0; i < 25; i++) {
      const minutes = 1000 + (i < 3 ? 0 : i)
      const p = await prisma.post.create({
        data: { content: `p${i} ${pageTag}`, category: 'gestação', authorId: pageAuthor.id, createdAt: at(minutes) },
      })
      created.push(p.id)
    }
  })

  afterAll(async () => {
    await prisma.post.deleteMany({ where: { authorId: pageAuthor.id } })
    await prisma.user.delete({ where: { id: pageAuthor.id } })
  })

  it('percorre todos os posts sem repetir nem pular, passando de 30 itens', async () => {
    const a = await app(fernanda.id)
    const seen: string[] = []
    let cursor: string | undefined
    for (let page = 0; page < 10; page++) {
      const res = await a.inject({ method: 'GET', url: `/posts?limit=10${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}` })
      const body = res.json()
      seen.push(...ids(body.items))
      if (!body.hasMore) break
      cursor = body.nextCursor
    }
    await a.close()

    expect(new Set(seen).size).toBe(seen.length)
    for (const id of [...created, posts.fernandaGeral, posts.marianaGeral, posts.estranhaNaPublica]) {
      expect(seen).toContain(id)
    }
    expect(seen.length).toBeGreaterThan(30)
  })
})

describe('política de visibilidade nas outras rotas', () => {
  it('perfil não mostra posts da pessoa em comunidade privada para quem não é membro', async () => {
    const a = await app(fernanda.id)
    const res = await a.inject({ method: 'GET', url: `/users/${mariana.id}/posts?limit=50` })
    await a.close()
    const got = ids(res.json().items)
    expect(got).toContain(posts.marianaGeral)
    expect(got).not.toContain(posts.marianaPrivada)
  })

  it('a própria autora vê os posts dela no perfil, inclusive os privados', async () => {
    const a = await app(mariana.id)
    const res = await a.inject({ method: 'GET', url: `/users/${mariana.id}/posts?limit=50` })
    await a.close()
    expect(ids(res.json().items)).toContain(posts.marianaPrivada)
  })

  it.each([
    ['abrir o post', 'GET', ''],
    ['listar comentários', 'GET', '/comments'],
    ['curtir', 'POST', '/like'],
    ['comentar', 'POST', '/comments'],
    ['repostar', 'POST', '/repost'],
  ])('post privado responde 404 para quem não é membro ao %s', async (_label, method, suffix) => {
    const a = await app(fernanda.id)
    const res = await a.inject({
      method: method as 'GET' | 'POST',
      url: `/posts/${posts.marianaPrivada}${suffix}`,
      ...(method === 'POST' ? { payload: { content: 'oi' } } : {}),
    })
    await a.close()
    expect(res.statusCode).toBe(404)
  })

  it('membro consegue abrir e comentar o post privado', async () => {
    const a = await app(mariana.id)
    expect((await a.inject({ method: 'GET', url: `/posts/${posts.marianaPrivada}` })).statusCode).toBe(200)
    expect(
      (await a.inject({ method: 'POST', url: `/posts/${posts.marianaPrivada}/comments`, payload: { content: 'oi' } })).statusCode,
    ).toBe(201)
    await a.close()
  })

  it('lista da comunidade privada fica vazia para quem não é membro', async () => {
    const a = await app(fernanda.id)
    const res = await a.inject({ method: 'GET', url: `/communities/${privada.id}/posts?limit=50` })
    await a.close()
    expect(ids(res.json().items)).not.toContain(posts.marianaPrivada)
  })

  it('só membros publicam dentro de uma comunidade', async () => {
    const a = await app(fernanda.id)
    const fora = await a.inject({
      method: 'POST', url: '/posts', payload: { content: `intrusa ${tag}`, category: 'gestação', communityId: privada.id },
    })
    const dentro = await a.inject({
      method: 'POST', url: '/posts', payload: { content: `membro ${tag}`, category: 'gestação', communityId: publica.id },
    })
    await a.close()
    expect(fora.statusCode).toBe(403)
    expect(dentro.statusCode).toBe(201)
  })
})

describe('GET /posts — compatibilidade com apps antigos', () => {
  it('aceita cursor no formato antigo (só o id do post)', async () => {
    const a = await app(fernanda.id)
    const res = await a.inject({ method: 'GET', url: `/posts?limit=50&cursor=${posts.marianaGeral}` })
    await a.close()
    const got = ids(res.json().items)
    // Only posts older than Mariana's (minute 20) come after that cursor.
    expect(got).toContain(posts.fernandaGeral)
    expect(got).not.toContain(posts.marianaGeral)
    expect(got).not.toContain(posts.estranhaGeral)
  })
})
