import { describe, it, expect, beforeAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import authRoutes from './auth'

const prisma = new PrismaClient()

beforeAll(() => {
  // register handler signs a JWT — ensure secrets exist even if .env isn't loaded
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-access-secret-min-32-characters-here'
  process.env.REFRESH_SECRET = process.env.REFRESH_SECRET ?? 'test-refresh-secret-min-32-characters-here'
})

async function buildApp() {
  const app = Fastify()
  app.decorate('prisma', prisma)
  app.decorateRequest('userId', '')
  app.decorate('authenticate', async () => {})
  // /forgot-password uses fastify.sendEmail — stub it so app can boot even though we don't hit that route
  app.decorate('sendEmail', async () => {})
  await app.register(cookie)
  await app.register(authRoutes)
  return app
}

describe('POST /register — new fields', () => {
  it('accepts babies[], otherChildren[], mood/support/goal/concern and persists them', async () => {
    const app = await buildApp()
    const email = `test-babies-${Date.now()}@t.com`
    const res = await app.inject({
      method: 'POST',
      url: '/register',
      payload: {
        email,
        password: 'password123',
        name: 'Ana',
        pregnancyStage: 'postpartum',
        babyBirthDate: '2026-08-01',
        acceptedTerms: true,
        hasMultiples: true,
        babies: [
          { name: 'Sofia', birthDate: '2026-08-01' },
          { name: 'Alice', birthDate: '2026-08-01' },
        ],
        otherChildren: [{ name: 'Pedro', birthDate: '2023-05-14' }],
        mood: 'B',
        supportNetwork: 'A',
        goal: 'C',
        concern: 'B',
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.user.babies).toHaveLength(2)
    const names = body.user.babies.map((b: { name: string }) => b.name).sort()
    expect(names).toEqual(['Alice', 'Sofia'])
    expect(body.user.otherChildren).toHaveLength(1)
    expect(body.user.otherChildren[0].name).toBe('Pedro')
    expect(body.user.mood).toBe('B')
    expect(body.user.hasMultiples).toBe(true)
    // profile computed server-side because all 4 signals present
    expect(body.user.profileKey).toBeTruthy()
    expect(body.user.archetypeKey).toBeTruthy()

    // cleanup
    const created = await prisma.user.findUnique({ where: { email } })
    if (created) {
      await prisma.baby.deleteMany({ where: { userId: created.id } })
      await prisma.otherChild.deleteMany({ where: { userId: created.id } })
      await prisma.refreshToken.deleteMany({ where: { userId: created.id } })
      await prisma.user.delete({ where: { id: created.id } })
    }
    await app.close()
  })

  it('remains backwards-compatible when new fields are absent', async () => {
    const app = await buildApp()
    const email = `test-compat-${Date.now()}@t.com`
    const res = await app.inject({
      method: 'POST',
      url: '/register',
      payload: {
        email,
        password: 'password123',
        name: 'Julia',
        pregnancyStage: 'pregnant',
        pregnancyWeek: 20,
        acceptedTerms: true,
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.user.babies).toEqual([])
    expect(body.user.otherChildren).toEqual([])
    expect(body.user.mood).toBeNull()
    expect(body.user.hasMultiples).toBe(false)
    // profile NOT computed — no signals
    expect(body.user.profileKey).toBeNull()

    // cleanup
    const created = await prisma.user.findUnique({ where: { email } })
    if (created) {
      await prisma.refreshToken.deleteMany({ where: { userId: created.id } })
      await prisma.user.delete({ where: { id: created.id } })
    }
    await app.close()
  })
})
