import type { FastifyInstance } from 'fastify'
import { requireRole } from '../../plugins/requireRole'

export default async function adminAnalyticsRoutes(fastify: FastifyInstance) {
  await fastify.register(requireRole('ADMIN', 'EDITOR'))

  fastify.get<{ Querystring: { days?: string } }>('/clicks', async (request, reply) => {
    const days = Math.min(Number(request.query.days ?? 30), 90)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const clicks = await fastify.prisma.productClick.groupBy({
      by: ['productId'],
      where: { clickedAt: { gte: since } },
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: 20,
    })

    const productIds = clicks.map((c) => c.productId)
    const products = productIds.length
      ? await fastify.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true },
        })
      : []

    const nameMap = new Map(products.map((p) => [p.id, p.name]))

    reply.send(
      clicks.map((c) => ({
        productId: c.productId,
        productName: nameMap.get(c.productId) ?? 'Desconhecido',
        clicks: c._count.productId,
      }))
    )
  })
}
