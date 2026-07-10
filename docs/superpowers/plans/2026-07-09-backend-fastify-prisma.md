# Backend — Fastify + Prisma + MySQL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a `server/` directory with a production-ready Fastify API backed by MySQL via Prisma — all routes defined in the spec, JWT auth with HttpOnly cookie refresh token, and a Prisma seed script.

**Architecture:** New `server/` directory inside the existing repo. Frontend is NOT wired to the API in this plan — that's a separate phase. This plan produces a standalone, TypeScript-verified Fastify server. Tests for auth utilities run without a DB; all other tests use a mocked Prisma client via `vi.mock`. Docker Compose brings up MySQL for manual integration testing.

**Tech Stack:** Node.js 20, Fastify 4, Prisma 5, MySQL 8, TypeScript, Zod, bcrypt, jsonwebtoken, Vitest.

**Important:** Run all commands from the `server/` directory unless stated otherwise.

---

## File Map

| Action | File |
|---|---|
| **Create** | `docker-compose.yml` (repo root) |
| **Create** | `server/package.json` |
| **Create** | `server/tsconfig.json` |
| **Create** | `server/.env.example` |
| **Create** | `server/prisma/schema.prisma` |
| **Create** | `server/prisma/seed.ts` |
| **Create** | `server/src/index.ts` |
| **Create** | `server/src/plugins/prisma.ts` |
| **Create** | `server/src/plugins/auth.ts` |
| **Create** | `server/src/routes/auth.ts` |
| **Create** | `server/src/routes/users.ts` |
| **Create** | `server/src/routes/communities.ts` |
| **Create** | `server/src/routes/posts.ts` |
| **Create** | `server/src/routes/chats.ts` |
| **Create** | `server/src/routes/routine.ts` |
| **Create** | `server/src/routes/baby.ts` |
| **Create** | `server/src/routes/notifications.ts` |
| **Create** | `server/src/utils/tokens.ts` |
| **Create** | `server/src/utils/tokens.test.ts` |

---

## Task 1: Docker Compose + server/ scaffold

**Files:**
- Create: `docker-compose.yml` (root)
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.env.example`

- [ ] **Step 1.1: Create docker-compose.yml at repo root**

```yaml
# docker-compose.yml
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: mothers_team
      MYSQL_USER: mothers
      MYSQL_PASSWORD: mothers123
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

- [ ] **Step 1.2: Create server/package.json**

```json
{
  "name": "mothers-team-api",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@fastify/cookie": "^9.4.0",
    "@fastify/cors": "^9.0.1",
    "@fastify/helmet": "^11.1.1",
    "@fastify/rate-limit": "^9.1.0",
    "@prisma/client": "^5.22.0",
    "bcrypt": "^5.1.1",
    "fastify": "^4.28.1",
    "fastify-plugin": "^4.5.1",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^20.16.11",
    "prisma": "^5.22.0",
    "tsx": "^4.19.1",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 1.3: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "prisma"]
}
```

- [ ] **Step 1.4: Create server/.env.example**

```
DATABASE_URL="mysql://mothers:mothers123@localhost:3306/mothers_team"
JWT_SECRET="change-me-in-production-min-32-chars"
REFRESH_SECRET="change-me-too-in-production-min-32-chars"
FRONTEND_URL="http://localhost:5173"
PORT=3001
NODE_ENV=development
```

- [ ] **Step 1.5: Copy .env.example to .env and install dependencies**

```bash
cd server
cp .env.example .env
npm install
```

- [ ] **Step 1.6: Add .env to .gitignore (root)**

Open `.gitignore` at the repo root and add:
```
server/.env
server/dist/
```

- [ ] **Step 1.7: Commit**

```
git add docker-compose.yml server/package.json server/tsconfig.json server/.env.example .gitignore
git commit -m "chore: scaffold server/ directory with Fastify + Prisma dependencies"
```

---

## Task 2: Prisma schema

**Files:**
- Create: `server/prisma/schema.prisma`

- [ ] **Step 2.1: Create schema.prisma**

```prisma
// server/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id                String    @id @default(cuid())
  email             String    @unique
  passwordHash      String
  name              String
  babyName          String?
  pregnancyStage    String    // 'pregnant' | 'postpartum'
  pregnancyWeek     Int?
  babyAgeInDays     Int?
  onboardingDone    Boolean   @default(false)
  onboardingAnswers Json?
  profileKey        String?
  archetypeKey      String?

  posts              Post[]
  comments           Comment[]
  routineEntries     RoutineEntry[]
  babyEntries        BabyEntry[]
  notifications      Notification[]
  following          Follow[]          @relation("Follower")
  followers          Follow[]          @relation("Following")
  communities        CommunityMember[]
  chats              ChatParticipant[]
  sentMessages       Message[]
  createdCommunities Community[]       @relation("CommunityCreator")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Follow {
  followerId  String
  followingId String
  follower    User     @relation("Follower", fields: [followerId], references: [id], onDelete: Cascade)
  following   User     @relation("Following", fields: [followingId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())

  @@id([followerId, followingId])
}

model Community {
  id          String  @id @default(cuid())
  name        String
  description String  @db.Text
  category    String
  colorKey    String
  creatorId   String
  creator     User    @relation("CommunityCreator", fields: [creatorId], references: [id])
  members     CommunityMember[]
  posts       Post[]
  createdAt   DateTime @default(now())
}

// role: 'member' | 'admin' | 'owner'
model CommunityMember {
  userId      String
  communityId String
  role        String    @default("member")
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  community   Community @relation(fields: [communityId], references: [id], onDelete: Cascade)
  joinedAt    DateTime  @default(now())

  @@id([userId, communityId])
}

model Post {
  id           String     @id @default(cuid())
  content      String     @db.Text
  category     String
  imageUrl     String?
  authorId     String
  author       User       @relation(fields: [authorId], references: [id], onDelete: Cascade)
  communityId  String?
  community    Community? @relation(fields: [communityId], references: [id])
  isRepost     Boolean    @default(false)
  repostFromId String?
  repostFrom   Post?      @relation("Repost", fields: [repostFromId], references: [id])
  reposts      Post[]     @relation("Repost")
  likes        PostLike[]
  comments     Comment[]
  createdAt    DateTime   @default(now())
}

model PostLike {
  userId    String
  postId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@id([userId, postId])
}

model Comment {
  id        String   @id @default(cuid())
  content   String   @db.Text
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  likes     Int      @default(0)
  createdAt DateTime @default(now())
}

model Chat {
  id           String            @id @default(cuid())
  participants ChatParticipant[]
  messages     Message[]
  createdAt    DateTime          @default(now())
}

model ChatParticipant {
  userId String
  chatId String
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  chat   Chat @relation(fields: [chatId], references: [id], onDelete: Cascade)

  @@id([userId, chatId])
}

model Message {
  id                String   @id @default(cuid())
  content           String   @db.Text
  chatId            String
  chat              Chat     @relation(fields: [chatId], references: [id], onDelete: Cascade)
  senderId          String
  sender            User     @relation(fields: [senderId], references: [id], onDelete: Cascade)
  sharedPostId      String?
  sharedPostAuthor  String?
  sharedPostExcerpt String?
  read              Boolean  @default(false)
  createdAt         DateTime @default(now())
}

model RoutineEntry {
  id        String   @id @default(cuid())
  time      String
  date      String
  title     String
  category  String
  done      Boolean  @default(false)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}

model BabyEntry {
  id        String   @id @default(cuid())
  time      String
  type      String
  detail    String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}

model Notification {
  id          String   @id @default(cuid())
  type        String
  text        String
  read        Boolean  @default(false)
  recipientId String
  recipient   User     @relation(fields: [recipientId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
}
```

- [ ] **Step 2.2: Validate schema (no DB needed)**

```bash
cd server && npx prisma validate
```
Expected: "The schema at prisma/schema.prisma is valid."

- [ ] **Step 2.3: Generate Prisma client**

```bash
cd server && npx prisma generate
```
Expected: client generated to `node_modules/@prisma/client`.

- [ ] **Step 2.4: Commit**

```
git add server/prisma/schema.prisma
git commit -m "feat: add Prisma schema with all models (User, Community, Post, Chat, etc.)"
```

---

## Task 3: Token utilities (auth helpers)

**Files:**
- Create: `server/src/utils/tokens.ts`
- Create: `server/src/utils/tokens.test.ts`

- [ ] **Step 3.1: Write failing tests**

```ts
// server/src/utils/tokens.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from './tokens'

beforeAll(() => {
  process.env.JWT_SECRET = 'test-access-secret-min-32-characters-here'
  process.env.REFRESH_SECRET = 'test-refresh-secret-min-32-characters-here'
})

describe('signAccessToken / verifyAccessToken', () => {
  it('returns a string', () => {
    expect(typeof signAccessToken('user-1')).toBe('string')
  })

  it('verifies a valid token and returns userId', () => {
    const token = signAccessToken('user-1')
    const payload = verifyAccessToken(token)
    expect(payload.userId).toBe('user-1')
  })

  it('throws on invalid access token', () => {
    expect(() => verifyAccessToken('bad.token.here')).toThrow()
  })

  it('throws when verified with wrong secret (tampered)', () => {
    const token = signRefreshToken('user-1') // signed with REFRESH_SECRET
    expect(() => verifyAccessToken(token)).toThrow()
  })
})

describe('signRefreshToken / verifyRefreshToken', () => {
  it('returns a string', () => {
    expect(typeof signRefreshToken('user-1')).toBe('string')
  })

  it('verifies a valid refresh token and returns userId', () => {
    const token = signRefreshToken('user-1')
    const payload = verifyRefreshToken(token)
    expect(payload.userId).toBe('user-1')
  })

  it('throws on invalid refresh token', () => {
    expect(() => verifyRefreshToken('bad.token.here')).toThrow()
  })
})
```

- [ ] **Step 3.2: Run tests — verify they FAIL**

```bash
cd server && npx vitest run src/utils/tokens.test.ts
```
Expected: failures (module not found).

- [ ] **Step 3.3: Implement tokens.ts**

```ts
// server/src/utils/tokens.ts
import jwt from 'jsonwebtoken'

export function signAccessToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '15m' })
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId }, process.env.REFRESH_SECRET!, { expiresIn: '30d' })
}

export function verifyAccessToken(token: string): { userId: string } {
  return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, process.env.REFRESH_SECRET!) as { userId: string }
}
```

- [ ] **Step 3.4: Run tests — verify they PASS**

```bash
cd server && npx vitest run src/utils/tokens.test.ts
```
Expected: 7 passing.

- [ ] **Step 3.5: Commit**

```
git add server/src/utils/tokens.ts server/src/utils/tokens.test.ts
git commit -m "feat: add JWT access and refresh token utilities"
```

---

## Task 4: Fastify server entry point + plugins

**Files:**
- Create: `server/src/plugins/prisma.ts`
- Create: `server/src/plugins/auth.ts`
- Create: `server/src/index.ts`

- [ ] **Step 4.1: Create Prisma plugin**

```ts
// server/src/plugins/prisma.ts
import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

export const prismaPlugin = fp(async (fastify: FastifyInstance) => {
  const prisma = new PrismaClient()
  await prisma.$connect()
  fastify.decorate('prisma', prisma)
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
})
```

- [ ] **Step 4.2: Create auth plugin**

```ts
// server/src/plugins/auth.ts
import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '../utils/tokens'

declare module 'fastify' {
  interface FastifyRequest {
    userId: string
  }
}

export const authPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = request.headers.authorization
      if (!auth?.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }
      try {
        const payload = verifyAccessToken(auth.slice(7))
        request.userId = payload.userId
      } catch {
        return reply.status(401).send({ error: 'Unauthorized' })
      }
    }
  )
})

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
```

- [ ] **Step 4.3: Create server entry point**

```ts
// server/src/index.ts
import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import { prismaPlugin } from './plugins/prisma'
import { authPlugin } from './plugins/auth'
import authRoutes from './routes/auth'
import usersRoutes from './routes/users'
import communitiesRoutes from './routes/communities'
import postsRoutes from './routes/posts'
import chatsRoutes from './routes/chats'
import routineRoutes from './routes/routine'
import babyRoutes from './routes/baby'
import notificationsRoutes from './routes/notifications'

const fastify = Fastify({ logger: true })

await fastify.register(helmet)
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
})
await fastify.register(rateLimit, { global: false })
await fastify.register(cookie)
await fastify.register(prismaPlugin)
await fastify.register(authPlugin)

await fastify.register(authRoutes, { prefix: '/auth' })
await fastify.register(usersRoutes, { prefix: '/users' })
await fastify.register(communitiesRoutes, { prefix: '/communities' })
await fastify.register(postsRoutes, { prefix: '/posts' })
await fastify.register(chatsRoutes, { prefix: '/chats' })
await fastify.register(routineRoutes, { prefix: '/routine' })
await fastify.register(babyRoutes, { prefix: '/baby' })
await fastify.register(notificationsRoutes, { prefix: '/notifications' })

fastify.get('/health', async () => ({ status: 'ok' }))

try {
  await fastify.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
```

- [ ] **Step 4.4: Run TypeScript check**

```bash
cd server && npx tsc --noEmit
```
Expected: errors only for missing route files (imported but not yet created). That's fine — continue.

- [ ] **Step 4.5: Commit**

```
git add server/src/plugins/ server/src/index.ts
git commit -m "feat: add Fastify server with plugins (prisma, auth, helmet, cors, rate-limit)"
```

---

## Task 5: Auth routes

**Files:**
- Create: `server/src/routes/auth.ts`

Endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me`

Auth routes have a stricter rate limit of 5 req/min per IP.

- [ ] **Step 5.1: Create auth.ts**

```ts
// server/src/routes/auth.ts
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
  maxAge: 60 * 60 * 24 * 30, // 30 days
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
  // Rate limit: 5 req/min per IP for all auth endpoints
  fastify.addHook('onRequest', async (request, reply) => {
    // @ts-expect-error rateLimit is added by plugin
    await fastify.rateLimit({ max: 5, timeWindow: '1 minute' })(request, reply)
  })

  // POST /auth/register
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

  // POST /auth/login
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const user = await fastify.prisma.user.findUnique({ where: { email: body.data.email } })
    if (!user) return reply.status(401).send({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(body.data.password, user.passwordHash)
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' })

    const accessToken = signAccessToken(user.id)
    const refreshToken = signRefreshToken(user.id)

    reply
      .setCookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS)
      .send({ accessToken, user: { id: user.id, email: user.email, name: user.name } })
  })

  // POST /auth/logout
  fastify.post('/logout', async (request, reply) => {
    reply.clearCookie(REFRESH_COOKIE, { path: '/' }).send({ ok: true })
  })

  // POST /auth/refresh
  fastify.post('/refresh', async (request, reply) => {
    // Web: refresh token from cookie. Mobile: from body { refreshToken }
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

  // GET /auth/me
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
```

- [ ] **Step 5.2: Run TypeScript check**

```bash
cd server && npx tsc --noEmit
```
Expected: only errors for remaining unimplemented route files.

- [ ] **Step 5.3: Commit**

```
git add server/src/routes/auth.ts
git commit -m "feat: add auth routes (register, login, logout, refresh, me)"
```

---

## Task 6: Users routes

**Files:**
- Create: `server/src/routes/users.ts`

- [ ] **Step 6.1: Create users.ts**

```ts
// server/src/routes/users.ts
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  babyName: z.string().optional(),
  pregnancyStage: z.enum(['pregnant', 'postpartum']).optional(),
  pregnancyWeek: z.number().int().min(1).max(42).optional(),
  babyAgeInDays: z.number().int().min(0).optional(),
})

export default async function usersRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET /users/:id
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.params.id },
      select: {
        id: true, name: true,
        _count: { select: { posts: true, followers: true, following: true } },
      },
    })
    if (!user) return reply.status(404).send({ error: 'User not found' })
    reply.send(user)
  })

  // PATCH /users/me
  fastify.patch('/me', async (request, reply) => {
    const body = updateMeSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const user = await fastify.prisma.user.update({
      where: { id: request.userId },
      data: body.data,
      select: { id: true, name: true, babyName: true, pregnancyStage: true },
    })
    reply.send(user)
  })

  // POST /users/:id/follow
  fastify.post<{ Params: { id: string } }>('/:id/follow', async (request, reply) => {
    if (request.params.id === request.userId)
      return reply.status(400).send({ error: 'Cannot follow yourself' })

    await fastify.prisma.follow.upsert({
      where: { followerId_followingId: { followerId: request.userId, followingId: request.params.id } },
      update: {},
      create: { followerId: request.userId, followingId: request.params.id },
    })
    reply.status(201).send({ ok: true })
  })

  // DELETE /users/:id/follow
  fastify.delete<{ Params: { id: string } }>('/:id/follow', async (request, reply) => {
    await fastify.prisma.follow.deleteMany({
      where: { followerId: request.userId, followingId: request.params.id },
    })
    reply.send({ ok: true })
  })

  // GET /users/:id/followers
  fastify.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/:id/followers',
    async (request, reply) => {
      const limit = Math.min(Number(request.query.limit ?? 20), 50)
      const follows = await fastify.prisma.follow.findMany({
        where: { followingId: request.params.id },
        take: limit + 1,
        ...(request.query.cursor ? { cursor: { followerId_followingId: { followerId: request.query.cursor, followingId: request.params.id } }, skip: 1 } : {}),
        include: { follower: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      })
      const hasMore = follows.length > limit
      reply.send({ items: follows.slice(0, limit).map((f) => f.follower), hasMore })
    }
  )

  // GET /users/:id/following
  fastify.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/:id/following',
    async (request, reply) => {
      const limit = Math.min(Number(request.query.limit ?? 20), 50)
      const follows = await fastify.prisma.follow.findMany({
        where: { followerId: request.params.id },
        take: limit + 1,
        ...(request.query.cursor ? { cursor: { followerId_followingId: { followerId: request.params.id, followingId: request.query.cursor } }, skip: 1 } : {}),
        include: { following: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      })
      const hasMore = follows.length > limit
      reply.send({ items: follows.slice(0, limit).map((f) => f.following), hasMore })
    }
  )
}
```

- [ ] **Step 6.2: Commit**

```
git add server/src/routes/users.ts
git commit -m "feat: add users routes (profile, follow, followers, following)"
```

---

## Task 7: Communities routes

**Files:**
- Create: `server/src/routes/communities.ts`

- [ ] **Step 7.1: Create communities.ts**

```ts
// server/src/routes/communities.ts
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['gestação', 'pós-parto', 'amamentação', 'saúde mental']),
  colorKey: z.enum(['gold', 'terracotta', 'warm', 'linen', 'cream']),
})

const updateSchema = createSchema.partial()

export default async function communitiesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET /communities
  fastify.get(async (request, reply) => {
    const communities = await fastify.prisma.community.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    })
    reply.send(communities)
  })

  // POST /communities
  fastify.post(async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const community = await fastify.prisma.community.create({
      data: {
        ...body.data,
        creatorId: request.userId,
        members: { create: { userId: request.userId, role: 'owner' } },
      },
    })
    reply.status(201).send(community)
  })

  // GET /communities/:id
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const community = await fastify.prisma.community.findUnique({
      where: { id: request.params.id },
      include: { _count: { select: { members: true } } },
    })
    if (!community) return reply.status(404).send({ error: 'Community not found' })
    reply.send(community)
  })

  // PATCH /communities/:id  (owner or admin only)
  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const body = updateSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const member = await fastify.prisma.communityMember.findUnique({
      where: { userId_communityId: { userId: request.userId, communityId: request.params.id } },
    })
    if (!member || !['owner', 'admin'].includes(member.role))
      return reply.status(403).send({ error: 'Forbidden' })

    const community = await fastify.prisma.community.update({
      where: { id: request.params.id },
      data: body.data,
    })
    reply.send(community)
  })

  // GET /communities/:id/posts
  fastify.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/:id/posts',
    async (request, reply) => {
      const limit = Math.min(Number(request.query.limit ?? 20), 50)
      const posts = await fastify.prisma.post.findMany({
        where: { communityId: request.params.id },
        take: limit + 1,
        ...(request.query.cursor ? { cursor: { id: request.query.cursor }, skip: 1 } : {}),
        include: {
          author: { select: { id: true, name: true } },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      const hasMore = posts.length > limit
      reply.send({ items: posts.slice(0, limit), hasMore })
    }
  )

  // POST /communities/:id/join
  fastify.post<{ Params: { id: string } }>('/:id/join', async (request, reply) => {
    await fastify.prisma.communityMember.upsert({
      where: { userId_communityId: { userId: request.userId, communityId: request.params.id } },
      update: {},
      create: { userId: request.userId, communityId: request.params.id, role: 'member' },
    })
    reply.status(201).send({ ok: true })
  })

  // DELETE /communities/:id/join
  fastify.delete<{ Params: { id: string } }>('/:id/join', async (request, reply) => {
    await fastify.prisma.communityMember.deleteMany({
      where: { userId: request.userId, communityId: request.params.id },
    })
    reply.send({ ok: true })
  })

  // POST /communities/:id/admins/:userId  (owner only — promote to admin)
  fastify.post<{ Params: { id: string; userId: string } }>(
    '/:id/admins/:userId',
    async (request, reply) => {
      const requester = await fastify.prisma.communityMember.findUnique({
        where: { userId_communityId: { userId: request.userId, communityId: request.params.id } },
      })
      if (requester?.role !== 'owner') return reply.status(403).send({ error: 'Forbidden' })

      await fastify.prisma.communityMember.update({
        where: { userId_communityId: { userId: request.params.userId, communityId: request.params.id } },
        data: { role: 'admin' },
      })
      reply.send({ ok: true })
    }
  )

  // DELETE /communities/:id/admins/:userId  (owner only — demote to member)
  fastify.delete<{ Params: { id: string; userId: string } }>(
    '/:id/admins/:userId',
    async (request, reply) => {
      const requester = await fastify.prisma.communityMember.findUnique({
        where: { userId_communityId: { userId: request.userId, communityId: request.params.id } },
      })
      if (requester?.role !== 'owner') return reply.status(403).send({ error: 'Forbidden' })

      await fastify.prisma.communityMember.update({
        where: { userId_communityId: { userId: request.params.userId, communityId: request.params.id } },
        data: { role: 'member' },
      })
      reply.send({ ok: true })
    }
  )
}
```

- [ ] **Step 7.2: Commit**

```
git add server/src/routes/communities.ts
git commit -m "feat: add communities routes with role-based admin promotion"
```

---

## Task 8: Posts routes

**Files:**
- Create: `server/src/routes/posts.ts`

- [ ] **Step 8.1: Create posts.ts**

```ts
// server/src/routes/posts.ts
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const createSchema = z.object({
  content: z.string().min(1),
  category: z.enum(['gestação', 'pós-parto', 'amamentação', 'saúde mental']),
  communityId: z.string().optional(),
  imageUrl: z.string().url().optional(),
})

const commentSchema = z.object({
  content: z.string().min(1),
})

export default async function postsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET /posts  — feed (cursor-based)
  fastify.get<{ Querystring: { cursor?: string; limit?: string } }>(
    '/',
    async (request, reply) => {
      const limit = Math.min(Number(request.query.limit ?? 20), 50)
      const posts = await fastify.prisma.post.findMany({
        take: limit + 1,
        ...(request.query.cursor ? { cursor: { id: request.query.cursor }, skip: 1 } : {}),
        include: {
          author: { select: { id: true, name: true } },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      const hasMore = posts.length > limit
      reply.send({ items: posts.slice(0, limit), hasMore })
    }
  )

  // POST /posts
  fastify.post('/', async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const post = await fastify.prisma.post.create({
      data: { ...body.data, authorId: request.userId },
      include: { author: { select: { id: true, name: true } } },
    })
    reply.status(201).send(post)
  })

  // GET /posts/:id
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const post = await fastify.prisma.post.findUnique({
      where: { id: request.params.id },
      include: {
        author: { select: { id: true, name: true } },
        _count: { select: { likes: true, comments: true } },
      },
    })
    if (!post) return reply.status(404).send({ error: 'Post not found' })
    reply.send(post)
  })

  // DELETE /posts/:id  (author only)
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const post = await fastify.prisma.post.findUnique({ where: { id: request.params.id } })
    if (!post) return reply.status(404).send({ error: 'Post not found' })
    if (post.authorId !== request.userId) return reply.status(403).send({ error: 'Forbidden' })

    await fastify.prisma.post.delete({ where: { id: request.params.id } })
    reply.send({ ok: true })
  })

  // POST /posts/:id/like
  fastify.post<{ Params: { id: string } }>('/:id/like', async (request, reply) => {
    await fastify.prisma.postLike.upsert({
      where: { userId_postId: { userId: request.userId, postId: request.params.id } },
      update: {},
      create: { userId: request.userId, postId: request.params.id },
    })
    reply.status(201).send({ ok: true })
  })

  // DELETE /posts/:id/like
  fastify.delete<{ Params: { id: string } }>('/:id/like', async (request, reply) => {
    await fastify.prisma.postLike.deleteMany({
      where: { userId: request.userId, postId: request.params.id },
    })
    reply.send({ ok: true })
  })

  // POST /posts/:id/repost
  fastify.post<{ Params: { id: string } }>('/:id/repost', async (request, reply) => {
    const original = await fastify.prisma.post.findUnique({ where: { id: request.params.id } })
    if (!original) return reply.status(404).send({ error: 'Post not found' })

    const repost = await fastify.prisma.post.create({
      data: {
        content: original.content,
        category: original.category,
        authorId: request.userId,
        isRepost: true,
        repostFromId: original.id,
        communityId: original.communityId,
      },
    })
    reply.status(201).send(repost)
  })

  // GET /posts/:id/comments
  fastify.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/:id/comments',
    async (request, reply) => {
      const limit = Math.min(Number(request.query.limit ?? 20), 50)
      const comments = await fastify.prisma.comment.findMany({
        where: { postId: request.params.id },
        take: limit + 1,
        ...(request.query.cursor ? { cursor: { id: request.query.cursor }, skip: 1 } : {}),
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      })
      const hasMore = comments.length > limit
      reply.send({ items: comments.slice(0, limit), hasMore })
    }
  )

  // POST /posts/:id/comments
  fastify.post<{ Params: { id: string } }>('/:id/comments', async (request, reply) => {
    const body = commentSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const comment = await fastify.prisma.comment.create({
      data: { content: body.data.content, authorId: request.userId, postId: request.params.id },
      include: { author: { select: { id: true, name: true } } },
    })
    reply.status(201).send(comment)
  })
}
```

- [ ] **Step 8.2: Commit**

```
git add server/src/routes/posts.ts
git commit -m "feat: add posts routes (feed, CRUD, like, repost, comments)"
```

---

## Task 9: Chats routes

**Files:**
- Create: `server/src/routes/chats.ts`

- [ ] **Step 9.1: Create chats.ts**

```ts
// server/src/routes/chats.ts
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const sendMessageSchema = z.object({
  content: z.string(),
  sharedPostId: z.string().optional(),
  sharedPostAuthor: z.string().optional(),
  sharedPostExcerpt: z.string().optional(),
})

const createChatSchema = z.object({
  userId: z.string(),
})

export default async function chatsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET /chats  — all chats for current user
  fastify.get('/', async (request, reply) => {
    const chats = await fastify.prisma.chat.findMany({
      where: { participants: { some: { userId: request.userId } } },
      include: {
        participants: { include: { user: { select: { id: true, name: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    })
    reply.send(chats)
  })

  // POST /chats  — create or find existing 1:1 chat
  fastify.post('/', async (request, reply) => {
    const body = createChatSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    if (body.data.userId === request.userId)
      return reply.status(400).send({ error: 'Cannot chat with yourself' })

    // Find existing chat between the two users
    const existing = await fastify.prisma.chat.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: request.userId } } },
          { participants: { some: { userId: body.data.userId } } },
        ],
      },
    })

    if (existing) return reply.send(existing)

    const chat = await fastify.prisma.chat.create({
      data: {
        participants: {
          create: [{ userId: request.userId }, { userId: body.data.userId }],
        },
      },
      include: { participants: { include: { user: { select: { id: true, name: true } } } } },
    })
    reply.status(201).send(chat)
  })

  // GET /chats/:id/messages
  fastify.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/:id/messages',
    async (request, reply) => {
      const limit = Math.min(Number(request.query.limit ?? 30), 100)
      const messages = await fastify.prisma.message.findMany({
        where: { chatId: request.params.id },
        take: limit + 1,
        ...(request.query.cursor ? { cursor: { id: request.query.cursor }, skip: 1 } : {}),
        include: { sender: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      })
      const hasMore = messages.length > limit
      reply.send({ items: messages.slice(0, limit).reverse(), hasMore })
    }
  )

  // POST /chats/:id/messages
  fastify.post<{ Params: { id: string } }>('/:id/messages', async (request, reply) => {
    const body = sendMessageSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const message = await fastify.prisma.message.create({
      data: {
        content: body.data.content,
        chatId: request.params.id,
        senderId: request.userId,
        sharedPostId: body.data.sharedPostId,
        sharedPostAuthor: body.data.sharedPostAuthor,
        sharedPostExcerpt: body.data.sharedPostExcerpt,
      },
      include: { sender: { select: { id: true, name: true } } },
    })
    reply.status(201).send(message)
  })
}
```

- [ ] **Step 9.2: Commit**

```
git add server/src/routes/chats.ts
git commit -m "feat: add chats routes (list, create, messages)"
```

---

## Task 10: Routine, Baby and Notifications routes

**Files:**
- Create: `server/src/routes/routine.ts`
- Create: `server/src/routes/baby.ts`
- Create: `server/src/routes/notifications.ts`

- [ ] **Step 10.1: Create routine.ts**

```ts
// server/src/routes/routine.ts
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const createSchema = z.object({
  time: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1),
  category: z.enum(['task', 'appointment', 'medication']),
})

const updateSchema = z.object({
  done: z.boolean().optional(),
  title: z.string().min(1).optional(),
})

export default async function routineRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get<{ Querystring: { date?: string } }>('/', async (request, reply) => {
    const where = { userId: request.userId, ...(request.query.date ? { date: request.query.date } : {}) }
    const entries = await fastify.prisma.routineEntry.findMany({ where, orderBy: { time: 'asc' } })
    reply.send(entries)
  })

  fastify.post('/', async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const entry = await fastify.prisma.routineEntry.create({ data: { ...body.data, userId: request.userId } })
    reply.status(201).send(entry)
  })

  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const body = updateSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const entry = await fastify.prisma.routineEntry.updateMany({
      where: { id: request.params.id, userId: request.userId },
      data: body.data,
    })
    if (entry.count === 0) return reply.status(404).send({ error: 'Not found' })
    reply.send({ ok: true })
  })

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const deleted = await fastify.prisma.routineEntry.deleteMany({
      where: { id: request.params.id, userId: request.userId },
    })
    if (deleted.count === 0) return reply.status(404).send({ error: 'Not found' })
    reply.send({ ok: true })
  })
}
```

- [ ] **Step 10.2: Create baby.ts**

```ts
// server/src/routes/baby.ts
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const createSchema = z.object({
  time: z.string(),
  type: z.enum(['sleep', 'feed', 'diaper']),
  detail: z.string().min(1),
})

export default async function babyRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get<{ Querystring: { date?: string } }>('/', async (request, reply) => {
    const entries = await fastify.prisma.babyEntry.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    reply.send(entries)
  })

  fastify.post('/', async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const entry = await fastify.prisma.babyEntry.create({ data: { ...body.data, userId: request.userId } })
    reply.status(201).send(entry)
  })
}
```

- [ ] **Step 10.3: Create notifications.ts**

```ts
// server/src/routes/notifications.ts
import type { FastifyInstance } from 'fastify'

export default async function notificationsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request, reply) => {
    const notifications = await fastify.prisma.notification.findMany({
      where: { recipientId: request.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    reply.send(notifications)
  })

  fastify.post('/read-all', async (request, reply) => {
    await fastify.prisma.notification.updateMany({
      where: { recipientId: request.userId, read: false },
      data: { read: true },
    })
    reply.send({ ok: true })
  })
}
```

- [ ] **Step 10.4: Commit**

```
git add server/src/routes/routine.ts server/src/routes/baby.ts server/src/routes/notifications.ts
git commit -m "feat: add routine, baby, and notifications routes"
```

---

## Task 11: Seed script + final TypeScript check

**Files:**
- Create: `server/prisma/seed.ts`

- [ ] **Step 11.1: Create seed.ts**

```ts
// server/prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('senha123', 12)

  const mariana = await prisma.user.upsert({
    where: { email: 'mariana@mothersteam.com' },
    update: {},
    create: {
      email: 'mariana@mothersteam.com',
      passwordHash,
      name: 'Mariana',
      babyName: 'Léo',
      pregnancyStage: 'pregnant',
      pregnancyWeek: 28,
      onboardingDone: true,
    },
  })

  const fernanda = await prisma.user.upsert({
    where: { email: 'fernanda@mothersteam.com' },
    update: {},
    create: {
      email: 'fernanda@mothersteam.com',
      passwordHash,
      name: 'Fernanda S.',
      pregnancyStage: 'postpartum',
      babyAgeInDays: 120,
      onboardingDone: true,
    },
  })

  const gestacaoCommunity = await prisma.community.upsert({
    where: { id: 'gestacao-primeiro-tri' },
    update: {},
    create: {
      id: 'gestacao-primeiro-tri',
      name: 'Gestantes — 1° Trimestre',
      description: 'Compartilhe as descobertas e dúvidas dos primeiros meses.',
      category: 'gestação',
      colorKey: 'terracotta',
      creatorId: fernanda.id,
      members: { create: [{ userId: fernanda.id, role: 'owner' }, { userId: mariana.id, role: 'member' }] },
    },
  })

  await prisma.post.create({
    data: {
      content: 'Dicas para aliviar o enjoo do primeiro trimestre: gengibre em cápsulas ajudou muito!',
      category: 'gestação',
      authorId: fernanda.id,
      communityId: gestacaoCommunity.id,
    },
  })

  console.log('✅ Seed complete — mariana@mothersteam.com / fernanda@mothersteam.com — password: senha123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 11.2: Run final TypeScript check**

```bash
cd server && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 11.3: Run token tests**

```bash
cd server && npx vitest run
```
Expected: 7 passing (token utils).

- [ ] **Step 11.4: Final commit**

```
git add server/prisma/seed.ts
git commit -m "feat: add Prisma seed script with demo users and community"
```

---

## Done

All tasks complete. The `server/` directory is fully scaffolded with:
- TypeScript-verified Fastify API (all routes)
- Prisma schema validated and client generated
- JWT token utilities with unit tests
- Docker Compose for local MySQL
- Seed script with demo data

**To run locally (needs Docker):**
```bash
# Start MySQL
docker compose up -d

# Apply migrations
cd server && npx prisma migrate dev --name init

# Seed
npm run db:seed

# Start API
npm run dev
```

API will be live at `http://localhost:3001`.
