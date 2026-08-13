import type { FastifyInstance } from 'fastify'

export default async function wishlistRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET / — unified wishlist (affiliate + own products)
  fastify.get('/', async (request, reply) => {
    const items = await fastify.prisma.wishlistItem.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
        },
        ownProduct: {
          include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
        },
      },
    })

    const result = items.map((item) => ({
      type: item.productId ? ('affiliate' as const) : ('own' as const),
      product: item.productId ? item.product : item.ownProduct,
      savedAt: item.createdAt,
    }))

    reply.send({ items: result })
  })
}
