import type { FastifyInstance } from 'fastify'

export default async function wishlistRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET / — affiliate-only wishlist
  fastify.get('/', async (request, reply) => {
    const items = await fastify.prisma.wishlistItem.findMany({
      where: { userId: request.userId, productId: { not: null } },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
        },
      },
    })

    const result = items.map((item) => ({
      type: 'affiliate' as const,
      product: item.product,
      savedAt: item.createdAt,
    }))

    reply.send({ items: result })
  })
}
