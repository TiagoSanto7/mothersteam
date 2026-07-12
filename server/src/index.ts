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
import searchRoutes from './routes/search'

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
await fastify.register(searchRoutes, { prefix: '/search' })

fastify.get('/health', async () => ({ status: 'ok' }))

try {
  await fastify.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
