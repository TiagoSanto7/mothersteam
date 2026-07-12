import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'
import Fastify from 'fastify'
import searchRoutes from './search'

const prisma = new PrismaClient()

describe('GET /search', () => {
  it('returns users and communities matching query', async () => {
    const stamp = Date.now()
    const user = await prisma.user.create({
      data: { email: `u${stamp}@t.com`, passwordHash: 'x', name: `Julia${stamp}`, pregnancyStage: 'pregnant' },
    })
    const community = await prisma.community.create({
      data: { name: `Gestantes${stamp}`, description: 'x', category: 'gestação', colorKey: 'gold', creatorId: user.id },
    })

    const app = Fastify()
    app.decorate('prisma', prisma)
    app.decorateRequest('userId', '')
    app.decorate('authenticate', async (req: any) => { req.userId = user.id })
    await app.register(searchRoutes)

    const res = await app.inject({ method: 'GET', url: `/?q=${stamp}` })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.users.some((u: any) => u.id === user.id)).toBe(true)
    expect(body.communities.some((c: any) => c.id === community.id)).toBe(true)

    await prisma.community.delete({ where: { id: community.id } })
    await prisma.user.delete({ where: { id: user.id } })
    await app.close()
  })

  it('returns empty arrays for query shorter than 2 chars', async () => {
    const app = Fastify()
    app.decorate('prisma', prisma)
    app.decorateRequest('userId', '')
    app.decorate('authenticate', async (req: any) => { req.userId = 'x' })
    await app.register(searchRoutes)

    const res = await app.inject({ method: 'GET', url: '/?q=a' })
    const body = res.json()
    expect(body.users).toEqual([])
    expect(body.communities).toEqual([])
    await app.close()
  })
})
