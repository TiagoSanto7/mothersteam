import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import staticPlugin from '@fastify/static'
import { join } from 'path'
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
import { uploadsRoutes } from './routes/uploads'
import sseRoutes from './routes/sse'
import adminDashboardRoutes from './routes/admin/dashboard'
import adminProductsRoutes from './routes/admin/products'
import adminCategoriesRoutes from './routes/admin/categories'
import adminAnalyticsRoutes from './routes/admin/analytics'
import publicProductsRoutes from './routes/products-public'
import saraRoutes from './routes/sara'

const fastify = Fastify({ logger: true })

await fastify.register(helmet)
// CORS aceita múltiplos origins via FRONTEND_URL (comma-separated).
// Precisamos disso pra o mesmo backend servir web dev, web deploy e o Capacitor
// APK (cujo origin no Android é http://localhost ou https://localhost).
const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

await fastify.register(cors, {
  origin: (origin, cb) => {
    // Sem origin (requests server-to-server, curl) — libera.
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    // Capacitor Android: capacitor://localhost e https://localhost.
    // Capacitor iOS: capacitor://localhost.
    if (origin === 'capacitor://localhost' || origin === 'https://localhost' || origin === 'http://localhost') {
      return cb(null, true)
    }
    return cb(new Error(`CORS blocked: ${origin}`), false)
  },
  credentials: true,
})
await fastify.register(rateLimit, { global: false })
await fastify.register(cookie)
await fastify.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } })
await fastify.register(staticPlugin, {
  root: join(process.cwd(), 'uploads'),
  prefix: '/uploads/',
})
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
await fastify.register(uploadsRoutes)
await fastify.register(sseRoutes)
await fastify.register(adminDashboardRoutes, { prefix: '/admin/dashboard' })
await fastify.register(adminProductsRoutes, { prefix: '/admin/products' })
await fastify.register(adminCategoriesRoutes, { prefix: '/admin/categories' })
await fastify.register(adminAnalyticsRoutes, { prefix: '/admin/analytics' })
await fastify.register(publicProductsRoutes, { prefix: '/products' })
await fastify.register(saraRoutes, { prefix: '/sara' })

fastify.get('/health', async () => ({ status: 'ok' }))

try {
  await fastify.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
