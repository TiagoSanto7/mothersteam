// server/src/routes/admin/own-products.ts
import type { FastifyInstance } from 'fastify'
import { requireRole } from '../../plugins/requireRole'

export default async function adminOwnProductsRoutes(fastify: FastifyInstance) {
  await fastify.register(requireRole('ADMIN', 'EDITOR'))

  // GET / — list own products (admin, all, paginated)
  fastify.get<{ Querystring: { page?: string; limit?: string; search?: string } }>(
    '/',
    async (request, reply) => {
      const page = Math.max(1, Number(request.query.page ?? 1))
      const limit = Math.min(Number(request.query.limit ?? 20), 100)
      const skip = (page - 1) * limit
      const search = request.query.search?.trim()

      const where = search ? { name: { contains: search } } : {}

      const [items, total] = await Promise.all([
        fastify.prisma.ownProduct.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { category: { select: { id: true, name: true, slug: true } } },
        }),
        fastify.prisma.ownProduct.count({ where }),
      ])

      reply.send({ items, total, page, limit, totalPages: Math.ceil(total / limit) })
    }
  )

  // POST / — create own product
  fastify.post<{
    Body: {
      name: string
      description: string
      price: number
      images?: string[]
      stock?: number
      sku?: string
      featured?: boolean
      active?: boolean
      categoryId: string
    }
  }>('/', async (request, reply) => {
    const { name, description, price, images, stock, sku, featured, active, categoryId } = request.body
    const product = await fastify.prisma.ownProduct.create({
      data: {
        name,
        description,
        price: Math.round(price * 100) / 100,
        images: images ?? [],
        stock: stock ?? 0,
        sku: sku ?? null,
        featured: featured ?? false,
        active: active ?? true,
        categoryId,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    })
    reply.status(201).send(product)
  })

  // PUT /:id — update own product
  fastify.put<{
    Params: { id: string }
    Body: {
      name?: string
      description?: string
      price?: number
      images?: string[]
      stock?: number
      sku?: string
      featured?: boolean
      active?: boolean
      categoryId?: string
    }
  }>('/:id', async (request, reply) => {
    const { price, ...rest } = request.body
    const product = await fastify.prisma.ownProduct.update({
      where: { id: request.params.id },
      data: {
        ...rest,
        ...(price !== undefined ? { price: Math.round(price * 100) / 100 } : {}),
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    })
    reply.send(product)
  })

  // DELETE /:id — delete own product
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await fastify.prisma.ownProduct.delete({ where: { id: request.params.id } })
    reply.status(204).send()
  })
}
