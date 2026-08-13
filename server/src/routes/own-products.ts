import type { FastifyInstance } from 'fastify'

export default async function ownProductsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET / — list own products (cursor paginated)
  fastify.get<{
    Querystring: { categoryId?: string; featured?: string; limit?: string; cursor?: string }
  }>('/', async (request, reply) => {
    const limit = Math.min(Number(request.query.limit ?? 20), 50)
    const where = {
      active: true,
      ...(request.query.categoryId ? { categoryId: request.query.categoryId } : {}),
      ...(request.query.featured === 'true' ? { featured: true } : {}),
    }
    const rows = await fastify.prisma.ownProduct.findMany({
      where,
      take: limit + 1,
      ...(request.query.cursor ? { cursor: { id: request.query.cursor }, skip: 1 } : {}),
      include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    })
    const hasMore = rows.length > limit
    const items = rows.slice(0, limit).map((p) => ({ ...p, type: 'own' as const }))
    const nextCursor = items.length > 0 ? items[items.length - 1].id : undefined
    reply.send({ items, hasMore, nextCursor })
  })

  // GET /:id — detail with reviewsSummary, 3 reviews, inWishlist, related
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const product = await fastify.prisma.ownProduct.findUnique({
      where: { id: request.params.id, active: true },
      include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
    })
    if (!product) return reply.status(404).send({ error: 'Not found' })

    const userId = request.userId

    const [reviews, aggregate, inWishlistRow, related, distribution] = await Promise.all([
      fastify.prisma.review.findMany({
        where: { ownProductId: product.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      fastify.prisma.review.aggregate({
        where: { ownProductId: product.id },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      fastify.prisma.wishlistItem.findUnique({
        where: { userId_ownProductId: { userId, ownProductId: product.id } },
        select: { id: true },
      }),
      fastify.prisma.ownProduct.findMany({
        where: { categoryId: product.categoryId, active: true, id: { not: product.id } },
        take: 10,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
      }),
      fastify.prisma.review.groupBy({
        by: ['rating'],
        where: { ownProductId: product.id },
        _count: { rating: true },
      }),
    ])

    const dist = Object.fromEntries(
      [1, 2, 3, 4, 5].map((r) => [r, distribution.find((d) => d.rating === r)?._count.rating ?? 0])
    )

    reply.send({
      ...product,
      type: 'own',
      reviewsSummary: {
        average: aggregate._avg.rating ?? 0,
        count: aggregate._count.rating,
        distribution: dist,
      },
      reviews,
      inWishlist: !!inWishlistRow,
      related: related.map((p) => ({ ...p, type: 'own' as const })),
    })
  })

  // POST /:id/wishlist — toggle wishlist for own product
  fastify.post<{ Params: { id: string } }>('/:id/wishlist', async (request, reply) => {
    const product = await fastify.prisma.ownProduct.findUnique({
      where: { id: request.params.id },
      select: { id: true },
    })
    if (!product) return reply.status(404).send({ error: 'Not found' })

    const existing = await fastify.prisma.wishlistItem.findUnique({
      where: { userId_ownProductId: { userId: request.userId, ownProductId: product.id } },
    })
    if (existing) {
      await fastify.prisma.wishlistItem.delete({ where: { id: existing.id } })
      reply.send({ inWishlist: false })
    } else {
      await fastify.prisma.wishlistItem.create({
        data: { userId: request.userId, ownProductId: product.id },
      })
      reply.send({ inWishlist: true })
    }
  })

  // GET /:id/reviews — paginated reviews
  fastify.get<{
    Params: { id: string }
    Querystring: { page?: string; limit?: string }
  }>('/:id/reviews', async (request, reply) => {
    const page = Math.max(1, Number(request.query.page ?? 1))
    const limit = Math.min(Number(request.query.limit ?? 20), 50)
    const skip = (page - 1) * limit

    const [items, total, aggregate, distribution] = await Promise.all([
      fastify.prisma.review.findMany({
        where: { ownProductId: request.params.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      fastify.prisma.review.count({ where: { ownProductId: request.params.id } }),
      fastify.prisma.review.aggregate({
        where: { ownProductId: request.params.id },
        _avg: { rating: true },
      }),
      fastify.prisma.review.groupBy({
        by: ['rating'],
        where: { ownProductId: request.params.id },
        _count: { rating: true },
      }),
    ])

    const dist = Object.fromEntries(
      [1, 2, 3, 4, 5].map((r) => [r, distribution.find((d) => d.rating === r)?._count.rating ?? 0])
    )

    reply.send({ items, total, average: aggregate._avg.rating ?? 0, distribution: dist })
  })

  // POST /:id/reviews — upsert review for own product
  fastify.post<{
    Params: { id: string }
    Body: { rating: number; text?: string }
  }>('/:id/reviews', async (request, reply) => {
    const { rating, text } = request.body
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return reply.status(422).send({ error: 'rating must be 1–5' })
    }

    const product = await fastify.prisma.ownProduct.findUnique({
      where: { id: request.params.id },
      select: { id: true },
    })
    if (!product) return reply.status(404).send({ error: 'Not found' })

    const hasOrder = await fastify.prisma.orderItem.findFirst({
      where: { ownProductId: product.id, order: { userId: request.userId, status: 'DELIVERED' } },
      select: { id: true },
    })

    const review = await fastify.prisma.review.upsert({
      where: { userId_ownProductId: { userId: request.userId, ownProductId: product.id } },
      update: { rating, text: text ?? null, verifiedPurchase: !!hasOrder },
      create: {
        rating,
        text: text ?? null,
        verifiedPurchase: !!hasOrder,
        userId: request.userId,
        ownProductId: product.id,
      },
    })
    reply.status(201).send(review)
  })
}
