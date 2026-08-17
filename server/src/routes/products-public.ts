import type { FastifyInstance } from 'fastify'

const VALID_PHASES = new Set([
  'trimester1', 'trimester2', 'trimester3',
  'postpartum_0_30', 'postpartum_31_180', 'postpartum_181_365',
])

export default async function publicProductsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.post<{ Params: { id: string } }>('/:id/click', async (request, reply) => {
    const product = await fastify.prisma.product.findUnique({
      where: { id: request.params.id, active: true },
      select: { id: true },
    })
    if (!product) return reply.status(404).send({ error: 'Not found' })
    await fastify.prisma.productClick.create({
      data: { productId: request.params.id, userId: request.userId },
    })
    reply.status(204).send()
  })

  // GET public products list (for the shopping screen)
  fastify.get<{
    Querystring: { categoryId?: string; phase?: string; featured?: string; limit?: string; cursor?: string }
  }>('/', async (request, reply) => {
    const limit = Math.min(Number(request.query.limit ?? 20), 50)
    if (request.query.phase && !VALID_PHASES.has(request.query.phase)) {
      return reply.status(400).send({ error: 'Invalid phase' })
    }
    const where = {
      active: true,
      ...(request.query.categoryId ? { categoryId: request.query.categoryId } : {}),
      ...(request.query.featured === 'true' ? { featured: true } : {}),
      ...(request.query.phase ? { phases: { string_contains: `"${request.query.phase}"` } } : {}),
    }
    const rows = await fastify.prisma.product.findMany({
      where,
      take: limit + 1,
      ...(request.query.cursor ? { cursor: { id: request.query.cursor }, skip: 1 } : {}),
      include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    })
    const hasMore = rows.length > limit
    const items = rows.slice(0, limit)
    const nextCursor = hasMore ? items[items.length - 1].id : undefined
    reply.send({ items, hasMore, nextCursor })
  })

  // GET public categories
  fastify.get('/categories', async (_request, reply) => {
    const categories = await fastify.prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, icon: true },
    })
    reply.send(categories)
  })

  // GET /:id — product detail with reviewsSummary, recent reviews, inWishlist, related
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const product = await fastify.prisma.product.findUnique({
      where: { id: request.params.id, active: true },
      include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
    })
    if (!product) return reply.status(404).send({ error: 'Not found' })

    const userId = request.userId

    const [reviews, aggregate, inWishlistRow, related, distribution] = await Promise.all([
      fastify.prisma.review.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      fastify.prisma.review.aggregate({
        where: { productId: product.id },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      fastify.prisma.wishlistItem.findUnique({
        where: { userId_productId: { userId, productId: product.id } },
        select: { id: true },
      }),
      fastify.prisma.product.findMany({
        where: { categoryId: product.categoryId, active: true, id: { not: product.id } },
        take: 10,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
      }),
      fastify.prisma.review.groupBy({
        by: ['rating'],
        where: { productId: product.id },
        _count: { rating: true },
      }),
    ])

    const dist = Object.fromEntries(
      [1, 2, 3, 4, 5].map((r) => [r, distribution.find((d) => d.rating === r)?._count.rating ?? 0])
    )

    reply.send({
      ...product,
      type: 'affiliate',
      reviewsSummary: {
        average: aggregate._avg.rating ?? 0,
        count: aggregate._count.rating,
        distribution: dist,
      },
      reviews,
      inWishlist: !!inWishlistRow,
      related: related.map((r) => ({ ...r, type: 'affiliate' as const })),
    })
  })

  // GET /:id/go — register click and return affiliate URL
  fastify.get<{ Params: { id: string } }>('/:id/go', async (request, reply) => {
    const product = await fastify.prisma.product.findUnique({
      where: { id: request.params.id, active: true },
      select: { id: true, affiliateUrl: true },
    })
    if (!product) return reply.status(404).send({ error: 'Not found' })
    if (!product.affiliateUrl) return reply.status(422).send({ error: 'No affiliate URL' })
    if (!product.affiliateUrl.startsWith('https://')) return reply.status(422).send({ error: 'No affiliate link' })

    await fastify.prisma.productClick.create({
      data: { productId: product.id, userId: request.userId },
    })
    reply.send({ url: product.affiliateUrl })
  })

  // POST /:id/wishlist — toggle wishlist for affiliate product
  fastify.post<{ Params: { id: string } }>('/:id/wishlist', async (request, reply) => {
    const product = await fastify.prisma.product.findUnique({
      where: { id: request.params.id, active: true },
      select: { id: true },
    })
    if (!product) return reply.status(404).send({ error: 'Not found' })

    const existing = await fastify.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: request.userId, productId: product.id } },
    })
    if (existing) {
      await fastify.prisma.wishlistItem.delete({ where: { id: existing.id } })
      reply.send({ inWishlist: false })
    } else {
      await fastify.prisma.wishlistItem.create({
        data: { userId: request.userId, productId: product.id },
      })
      reply.send({ inWishlist: true })
    }
  })

  // GET /:id/reviews — paginated reviews list
  fastify.get<{
    Params: { id: string }
    Querystring: { page?: string; limit?: string }
  }>('/:id/reviews', async (request, reply) => {
    const page = Math.max(1, Number(request.query.page ?? 1))
    const limit = Math.min(Number(request.query.limit ?? 20), 50)
    const skip = (page - 1) * limit

    const [items, total, aggregate, distribution] = await Promise.all([
      fastify.prisma.review.findMany({
        where: { productId: request.params.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      fastify.prisma.review.count({ where: { productId: request.params.id } }),
      fastify.prisma.review.aggregate({
        where: { productId: request.params.id },
        _avg: { rating: true },
      }),
      fastify.prisma.review.groupBy({
        by: ['rating'],
        where: { productId: request.params.id },
        _count: { rating: true },
      }),
    ])

    const dist = Object.fromEntries(
      [1, 2, 3, 4, 5].map((r) => [r, distribution.find((d) => d.rating === r)?._count.rating ?? 0])
    )

    reply.send({ items, total, average: aggregate._avg.rating ?? 0, distribution: dist })
  })

  // POST /:id/reviews — upsert review (create or update)
  fastify.post<{
    Params: { id: string }
    Body: { rating: number; text?: string }
  }>('/:id/reviews', async (request, reply) => {
    const { rating, text } = request.body
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return reply.status(422).send({ error: 'rating must be 1–5' })
    }
    const product = await fastify.prisma.product.findUnique({
      where: { id: request.params.id },
      select: { id: true },
    })
    if (!product) return reply.status(404).send({ error: 'Not found' })

    const hasClick = await fastify.prisma.productClick.findFirst({
      where: { productId: product.id, userId: request.userId },
      select: { id: true },
    })

    const review = await fastify.prisma.review.upsert({
      where: { userId_productId: { userId: request.userId, productId: product.id } },
      update: { rating, text: text ?? null, verifiedPurchase: !!hasClick },
      create: {
        rating,
        text: text ?? null,
        verifiedPurchase: !!hasClick,
        userId: request.userId,
        productId: product.id,
      },
    })
    reply.status(201).send(review)
  })
}
