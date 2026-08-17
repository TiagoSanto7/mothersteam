import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { z } from 'zod'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

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
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional(),
  pregnancyStage: z.enum(['pregnant', 'postpartum']),
  pregnancyWeek: z.number().int().min(1).max(42).optional(),
  babyAgeInDays: z.number().int().min(0).optional(),
  babyName: z.string().optional(),
  motherBirthDate: z.string().optional(),
  babyBirthDate: z.string().optional(),
  expectedBirthDate: z.string().optional(),
  acceptedTerms: z.boolean().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const USER_SELECT = {
  id: true, email: true, name: true, username: true, babyName: true,
  pregnancyStage: true, pregnancyWeek: true, babyAgeInDays: true,
  onboardingDone: true, profileKey: true, archetypeKey: true,
  motherBirthDate: true, babyBirthDate: true, expectedBirthDate: true,
  role: true,
} as const

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { username: string } }>('/check-username', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { username } = request.query
    if (!username || !/^[a-z0-9_]{3,30}$/.test(username)) {
      return reply.status(400).send({ available: false, error: 'Invalid username format' })
    }
    const existing = await fastify.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    })
    reply.send({ available: !existing })
  })

  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const existing = await fastify.prisma.user.findUnique({ where: { email: body.data.email } })
    if (existing) return reply.status(409).send({ error: 'Email already registered' })

    if (body.data.username) {
      const usernameTaken = await fastify.prisma.user.findUnique({
        where: { username: body.data.username },
        select: { id: true },
      })
      if (usernameTaken) return reply.status(409).send({ error: 'Username already taken' })
    }

    const passwordHash = await bcrypt.hash(body.data.password, 12)
    const parseDate = (s?: string) => s ? new Date(s) : undefined

    const user = await fastify.prisma.user.create({
      data: {
        email: body.data.email,
        passwordHash,
        name: body.data.name,
        username: body.data.username,
        pregnancyStage: body.data.pregnancyStage,
        pregnancyWeek: body.data.pregnancyWeek,
        babyAgeInDays: body.data.babyAgeInDays,
        babyName: body.data.babyName,
        motherBirthDate: parseDate(body.data.motherBirthDate),
        babyBirthDate: parseDate(body.data.babyBirthDate),
        expectedBirthDate: parseDate(body.data.expectedBirthDate),
        termsAcceptedAt: body.data.acceptedTerms ? new Date() : undefined,
      },
      select: USER_SELECT,
    })

    const accessToken = signAccessToken(user.id)
    const refreshToken = signRefreshToken(user.id)
    await fastify.prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    })

    reply
      .setCookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS)
      .status(201)
      .send({ accessToken, refreshToken, user })
  })

  fastify.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const user = await fastify.prisma.user.findUnique({
      where: { email: body.data.email },
      select: { ...USER_SELECT, passwordHash: true },
    })
    if (!user) return reply.status(401).send({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(body.data.password, user.passwordHash)
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' })

    const accessToken = signAccessToken(user.id)
    const refreshToken = signRefreshToken(user.id)
    await fastify.prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    })

    const { passwordHash: _, ...safeUser } = user

    reply
      .setCookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS)
      .send({ accessToken, refreshToken, user: safeUser })
  })

  fastify.post('/logout', async (request, reply) => {
    const cookieToken = request.cookies[REFRESH_COOKIE]
    const bodyToken = (request.body as { refreshToken?: string } | null)?.refreshToken
    const token = cookieToken ?? bodyToken
    if (token) {
      await fastify.prisma.refreshToken.deleteMany({ where: { token } })
    }
    reply.clearCookie(REFRESH_COOKIE, { path: '/' }).send({ ok: true })
  })

  fastify.post('/refresh', async (request, reply) => {
    const cookieToken = request.cookies[REFRESH_COOKIE]
    const bodyToken = (request.body as { refreshToken?: string } | null)?.refreshToken
    const token = cookieToken ?? bodyToken

    if (!token) return reply.status(401).send({ error: 'No refresh token' })

    try {
      const { userId } = verifyRefreshToken(token)

      const stored = await fastify.prisma.refreshToken.findUnique({ where: { token } })
      if (!stored || stored.expiresAt < new Date()) {
        await fastify.prisma.refreshToken.deleteMany({ where: { token } })
        return reply.status(401).send({ error: 'Invalid refresh token' })
      }

      // Rotation: delete old, issue new
      const newRefreshToken = signRefreshToken(userId)
      await fastify.prisma.$transaction([
        fastify.prisma.refreshToken.delete({ where: { token } }),
        fastify.prisma.refreshToken.create({
          data: { token: newRefreshToken, userId, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        }),
      ])

      const accessToken = signAccessToken(userId)
      reply
        .setCookie(REFRESH_COOKIE, newRefreshToken, COOKIE_OPTS)
        .send({ accessToken, refreshToken: newRefreshToken })
    } catch {
      reply.status(401).send({ error: 'Invalid refresh token' })
    }
  })

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.userId },
      select: USER_SELECT,
    })
    if (!user) return reply.status(404).send({ error: 'User not found' })
    reply.send(user)
  })

  fastify.post('/forgot-password', {
    config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
  }, async (request, reply) => {
    const body = z.object({ email: z.string().email() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid email' })

    const user = await fastify.prisma.user.findUnique({ where: { email: body.data.email } })
    // Always 200 — don't leak whether the email exists
    if (!user) return reply.send({ ok: true })

    // Anti-bombing: skip if a valid token was issued within the last 5 minutes
    if (user.passwordResetExpires && user.passwordResetExpires > new Date(Date.now() + 55 * 60 * 1000)) {
      return reply.send({ ok: true })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await fastify.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    })

    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0]?.trim() ?? 'https://mothersteam.com'
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`

    await fastify.sendEmail(
      user.email,
      'Redefinição de senha — Mothers Team',
      `<p>Olá, ${escapeHtml(user.name)}!</p>
<p>Recebemos uma solicitação para redefinir sua senha.</p>
<p><a href="${resetUrl}" style="background:#C4956A;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block">Redefinir senha</a></p>
<p>O link expira em 1 hora. Se você não solicitou, ignore este e-mail.</p>
<p>— Mothers Team</p>`
    )

    reply.send({ ok: true })
  })

  fastify.post('/reset-password', async (request, reply) => {
    const body = z.object({
      token: z.string().min(1),
      password: z.string().min(8),
    }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    // Validate expiry before hashing (cheap check first)
    const user = await fastify.prisma.user.findUnique({
      where: { passwordResetToken: body.data.token },
      select: { id: true, passwordResetExpires: true },
    })

    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return reply.status(400).send({ error: 'Token inválido ou expirado' })
    }

    const passwordHash = await bcrypt.hash(body.data.password, 12)

    // Atomic: include token in where clause so concurrent requests can't both succeed (TOCTOU fix)
    const { count } = await fastify.prisma.user.updateMany({
      where: { id: user.id, passwordResetToken: body.data.token },
      data: { passwordHash, passwordResetToken: null, passwordResetExpires: null },
    })

    if (count === 0) {
      return reply.status(400).send({ error: 'Token inválido ou expirado' })
    }

    // Invalidate all existing sessions after password change
    await fastify.prisma.refreshToken.deleteMany({ where: { userId: user.id } })

    reply.send({ ok: true })
  })
}
