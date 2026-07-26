import type { FastifyInstance } from 'fastify'
import { requireRole } from '../../plugins/requireRole'

export default async function adminDashboardRoutes(fastify: FastifyInstance) {
  await fastify.register(requireRole('ADMIN', 'EDITOR'))

  fastify.get('/', async (_request, reply) => {
    const [totalProducts, activeProducts, totalCategories, totalClicks30d] = await Promise.all([
      fastify.prisma.product.count(),
      fastify.prisma.product.count({ where: { active: true } }),
      fastify.prisma.category.count({ where: { active: true } }),
      fastify.prisma.productClick.count({
        where: { clickedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ])

    const topProducts = await fastify.prisma.product.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        _count: { select: { clicks: true } },
      },
      orderBy: { clicks: { _count: 'desc' } },
      take: 5,
    })

    reply.send({ totalProducts, activeProducts, totalCategories, totalClicks30d, topProducts })
  })
}
