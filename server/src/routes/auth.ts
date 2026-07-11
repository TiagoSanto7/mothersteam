import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens'

const REFRESH_COOKIE = 'refresh_token'
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  pregnancyStage: z.enum(['pregnant', 'postpartum']),
  pregnancyWeek: z.number().int().min(1).max(42).optional(),
  babyAgeInDays: z.number().int().min(0).optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const existing = await fastify.prisma.user.findUnique({ where: { email: body.data.email } })
    if (existing) return reply.status(409).send({ error: 'Email already registered' })

    const passwordHash = await bcrypt.hash(body.data.password, 12)
    const user = await fastify.prisma.user.create({
      data: {
        email: body.data.email,
        passwordHash,
        name: body.data.name,
        pregnancyStage: body.data.pregnancyStage,
        pregnancyWeek: body.data.pregnancyWeek,
        babyAgeInDays: body.data.babyAgeInDays,
      },
      select: { id: true, email: true, name: true },
    })

    const accessToken = signAccessToken(user.id)
    const refreshToken = signRefreshToken(user.id)

    reply
      .setCookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS)
      .status(201)
      .send({ accessToken, user })
  })

  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const user = await fastify.prisma.user.findUnique({
      where: { email: body.data.email },
      select: {
        id: true, email: true, name: true, passwordHash: true, babyName: true,
        pregnancyStage: true, pregnancyWeek: true, babyAgeInDays: true,
        onboardingDone: true, profileKey: true, archetypeKey: true,
      },
    })
    if (!user) return reply.status(401).send({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(body.data.password, user.passwordHash)
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' })

    const accessToken = signAccessToken(user.id)
    const refreshToken = signRefreshToken(user.id)

    const { passwordHash: _, ...safeUser } = user

    reply
      .setCookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS)
      .send({ accessToken, user: safeUser })
  })

  fastify.post('/logout', async (request, reply) => {
    reply.clearCookie(REFRESH_COOKIE, { path: '/' }).send({ ok: true })
  })

  fastify.post('/refresh', async (request, reply) => {
    const cookieToken = request.cookies[REFRESH_COOKIE]
    const bodyToken = (request.body as { refreshToken?: string } | null)?.refreshToken
    const token = cookieToken ?? bodyToken

    if (!token) return reply.status(401).send({ error: 'No refresh token' })

    try {
      const { userId } = verifyRefreshToken(token)
      const accessToken = signAccessToken(userId)
      reply.send({ accessToken })
    } catch {
      reply.status(401).send({ error: 'Invalid refresh token' })
    }
  })

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        id: true, email: true, name: true, babyName: true,
        pregnancyStage: true, pregnancyWeek: true, babyAgeInDays: true,
        onboardingDone: true, profileKey: true, archetypeKey: true,
      },
    })
    if (!user) return reply.status(404).send({ error: 'User not found' })
    reply.send(user)
  })
}
