import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'
import Fastify from 'fastify'
import usersRoutes from './users'

const prisma = new PrismaClient()

describe('GET /me — new profile fields', () => {
  it('returns babies, otherChildren, and profile signals when present', async () => {
    const user = await prisma.user.create({
      data: {
        email: `me-test-${Date.now()}@t.com`,
        passwordHash: 'x',
        name: 'Ana',
        pregnancyStage: 'postpartum',
        hasMultiples: true,
        mood: 'B',
        supportNetwork: 'A',
        goal: 'C',
        concern: 'B',
        babies: { create: [{ name: 'Sofia' }, { name: 'Alice' }] },
        otherChildren: { create: [{ name: 'Pedro', birthDate: new Date('2023-05-14') }] },
      },
    })

    const app = Fastify()
    app.decorate('prisma', prisma)
    app.decorateRequest('userId', '')
    app.decorate('authenticate', async (req: any) => { req.userId = user.id })
    await app.register(usersRoutes)

    const res = await app.inject({ method: 'GET', url: '/me' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.babies).toHaveLength(2)
    expect(body.babies[0].name).toBe('Sofia')
    expect(body.otherChildren).toHaveLength(1)
    expect(body.otherChildren[0].name).toBe('Pedro')
    expect(body.mood).toBe('B')
    expect(body.hasMultiples).toBe(true)

    // cleanup
    await prisma.baby.deleteMany({ where: { userId: user.id } })
    await prisma.otherChild.deleteMany({ where: { userId: user.id } })
    await prisma.user.delete({ where: { id: user.id } })
    await app.close()
  })
})

describe('GET /users/:id/posts', () => {
  it('returns paginated posts for the given author with likedByCurrentUser', async () => {
    const author = await prisma.user.create({
      data: { email: `t${Date.now()}@t.com`, passwordHash: 'x', name: 'Autora', pregnancyStage: 'pregnant' },
    })
    const viewer = await prisma.user.create({
      data: { email: `v${Date.now()}@t.com`, passwordHash: 'x', name: 'Viewer', pregnancyStage: 'pregnant' },
    })
    const post = await prisma.post.create({
      data: { content: 'hi', category: 'gestação', authorId: author.id },
    })
    await prisma.postLike.create({ data: { userId: viewer.id, postId: post.id } })

    const app = Fastify()
    app.decorate('prisma', prisma)
    app.decorateRequest('userId', '')
    app.decorate('authenticate', async (req: any) => { req.userId = viewer.id })
    await app.register(usersRoutes)

    const res = await app.inject({ method: 'GET', url: `/${author.id}/posts` })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.items).toHaveLength(1)
    expect(body.items[0].likedByCurrentUser).toBe(true)

    await prisma.postLike.deleteMany({ where: { postId: post.id } })
    await prisma.post.delete({ where: { id: post.id } })
    await prisma.user.deleteMany({ where: { id: { in: [author.id, viewer.id] } } })
    await app.close()
  })
})
