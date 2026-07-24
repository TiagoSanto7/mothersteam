import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireRole } from '../../plugins/requireRole'

const categorySchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  icon: z.string().max(10).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export default async function adminCategoriesRoutes(fastify: FastifyInstance) {
  await fastify.register(requireRole('ADMIN', 'EDITOR'))

  // List all categories
  fastify.get('/', async (_request, reply) => {
    const categories = await fastify.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    })
    reply.send(categories)
  })

  // Create category
  fastify.post('/', async (request, reply) => {
    const body = categorySchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const existing = await fastify.prisma.category.findUnique({ where: { slug: body.data.slug } })
    if (existing) return reply.status(409).send({ error: 'Slug already in use' })

    const category = await fastify.prisma.category.create({ data: body.data })
    reply.status(201).send(category)
  })

  // Update category
  fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const body = categorySchema.partial().safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    try {
      const category = await fastify.prisma.category.update({
        where: { id: request.params.id },
        data: body.data,
      })
      reply.send(category)
    } catch {
      reply.status(404).send({ error: 'Category not found' })
    }
  })

  // Delete category (soft delete — set active: false)
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      await fastify.prisma.category.update({
        where: { id: request.params.id },
        data: { active: false },
      })
      reply.status(204).send()
    } catch {
      reply.status(404).send({ error: 'Category not found' })
    }
  })
}
