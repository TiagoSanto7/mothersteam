import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireRole } from '../../plugins/requireRole'

const VALID_PHASES = [
  'trimester1',
  'trimester2',
  'trimester3',
  'postpartum_0_30',
  'postpartum_31_180',
  'postpartum_181_365',
] as const

const productSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000),
  price: z.number().positive(),
  affiliateUrl: z.string().url().optional().nullable(),
  images: z.array(z.string().url()).max(10).optional(),
  phases: z.array(z.enum(VALID_PHASES)).optional(),
  stock: z.number().int().min(0).optional().nullable(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  categoryId: z.string(),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  categoryId: z.string().optional(),
  active: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  q: z.string().optional(),
})

export default async function adminProductsRoutes(fastify: FastifyInstance) {
  await fastify.register(requireRole('ADMIN', 'EDITOR'))

  // List products
  fastify.get<{ Querystring: z.infer<typeof listQuerySchema> }>('/', async (request, reply) => {
    const query = listQuerySchema.safeParse(request.query)
    if (!query.success) return reply.status(400).send({ error: query.error.flatten() })

    const { page, limit, categoryId, active, featured, q } = query.data
    const skip = (page - 1) * limit

    const where = {
      ...(categoryId ? { categoryId } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(featured !== undefined ? { featured } : {}),
      ...(q ? { name: { contains: q } } : {}),
    }

    const [items, total] = await Promise.all([
      fastify.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { clicks: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      fastify.prisma.product.count({ where }),
    ])

    reply.send({ items, total, page, limit, totalPages: Math.ceil(total / limit) })
  })

  // Get single product
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const product = await fastify.prisma.product.findUnique({
      where: { id: request.params.id },
      include: { category: true, _count: { select: { clicks: true } } },
    })
    if (!product) return reply.status(404).send({ error: 'Product not found' })
    reply.send(product)
  })

  // Create product
  fastify.post('/', async (request, reply) => {
    const body = productSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const catExists = await fastify.prisma.category.findUnique({ where: { id: body.data.categoryId } })
    if (!catExists) return reply.status(400).send({ error: 'Category not found' })

    const product = await fastify.prisma.product.create({
      data: {
        ...body.data,
        images: body.data.images ?? [],
        phases: body.data.phases ?? [],
      },
      include: { category: true },
    })
    reply.status(201).send(product)
  })

  // Update product
  fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const body = productSchema.partial().safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    if (body.data.categoryId) {
      const catExists = await fastify.prisma.category.findUnique({ where: { id: body.data.categoryId } })
      if (!catExists) return reply.status(400).send({ error: 'Category not found' })
    }

    try {
      const updateData: Record<string, unknown> = { ...body.data }
      // images and phases are already arrays — Prisma handles Json serialization

      const product = await fastify.prisma.product.update({
        where: { id: request.params.id },
        data: updateData,
        include: { category: true },
      })
      reply.send(product)
    } catch {
      reply.status(404).send({ error: 'Product not found' })
    }
  })

  // Delete product (soft delete)
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      await fastify.prisma.product.update({
        where: { id: request.params.id },
        data: { active: false },
      })
      reply.status(204).send()
    } catch {
      reply.status(404).send({ error: 'Product not found' })
    }
  })

  // Bulk import — POST /admin/products/bulk
  const bulkRowSchema = z.object({
    nome: z.string().min(1).max(200),
    descricao: z.string().max(2000).optional().default(''),
    preco: z.number({ invalid_type_error: 'valor inválido' }).positive(),
    categoria_slug: z.string().min(1),
    url_afiliado: z.string().url('deve começar com http').optional().or(z.literal('')).transform(v => v || null),
    fases: z.string().optional().transform(v =>
      v ? v.split(',').map(s => s.trim()).filter(Boolean) : []
    ),
    estoque: z.number().int().min(0).optional().nullable(),
    destaque: z.string().optional().transform(v => v?.toLowerCase() === 'sim'),
  })

  fastify.post('/bulk', async (request, reply) => {
    const body = request.body as { products?: unknown[] }
    if (!Array.isArray(body?.products)) {
      return reply.status(400).send({ error: 'Campo "products" deve ser um array' })
    }
    if (body.products.length > 500) {
      return reply.status(400).send({ error: 'Máximo de 500 produtos por import' })
    }

    // Busca todas as categorias de uma vez para resolver slugs
    const allCategories = await fastify.prisma.category.findMany({
      select: { id: true, slug: true },
    })
    const categoryBySlug = new Map(allCategories.map(c => [c.slug, c.id]))

    const toCreate: {
      name: string; description: string; price: number; affiliateUrl: string | null;
      phases: string[]; stock: number | null; featured: boolean;
      images: string[]; active: boolean; categoryId: string;
    }[] = []

    const errors: { row: number; field: string; message: string }[] = []

    for (let i = 0; i < body.products.length; i++) {
      const row = i + 2 // row 1 = header, row 2 = first data row
      const parsed = bulkRowSchema.safeParse(body.products[i])

      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0]
        errors.push({
          row,
          field: firstIssue.path.join('.') || 'desconhecido',
          message: firstIssue.message,
        })
        continue
      }

      const categoryId = categoryBySlug.get(parsed.data.categoria_slug)
      if (!categoryId) {
        errors.push({ row, field: 'categoria_slug', message: `"${parsed.data.categoria_slug}" não encontrada` })
        continue
      }

      const validPhases = [
        'trimester1', 'trimester2', 'trimester3',
        'postpartum_0_30', 'postpartum_31_180', 'postpartum_181_365',
      ]
      const invalidPhase = parsed.data.fases.find(p => !validPhases.includes(p))
      if (invalidPhase) {
        errors.push({ row, field: 'fases', message: `fase inválida: "${invalidPhase}"` })
        continue
      }

      toCreate.push({
        name: parsed.data.nome,
        description: parsed.data.descricao,
        price: parsed.data.preco,
        affiliateUrl: parsed.data.url_afiliado ?? null,
        phases: parsed.data.fases,
        stock: parsed.data.estoque ?? null,
        featured: parsed.data.destaque,
        images: [],
        active: true,
        categoryId,
      })
    }

    if (toCreate.length > 0) {
      await fastify.prisma.product.createMany({ data: toCreate })
    }

    reply.status(201).send({ created: toCreate.length, errors })
  })
}
