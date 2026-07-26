import type { FastifyInstance } from 'fastify'

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
    const nextCursor = items.length > 0 ? items[items.length - 1].id : undefined
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
}
