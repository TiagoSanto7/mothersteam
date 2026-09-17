import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const createSchema = z.object({
  time: z.string(),
  type: z.enum(['sleep', 'feed', 'diaper']),
  detail: z.string().min(1),
})

// Day window computed by the client in the user's local timezone (from inclusive, to exclusive).
const rangeSchema = z
  .object({
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }),
  })
  .refine((r) => new Date(r.from) < new Date(r.to), { message: 'from must be before to' })

export default async function babyRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get<{ Querystring: { from?: string; to?: string } }>('/', async (request, reply) => {
    const { from, to } = request.query
    // Without a range, keep the legacy response so already-installed app builds keep working.
    if (from === undefined && to === undefined) {
      const entries = await fastify.prisma.babyEntry.findMany({
        where: { userId: request.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return reply.send(entries)
    }

    const range = rangeSchema.safeParse({ from, to })
    if (!range.success) return reply.status(400).send({ error: range.error.flatten() })
    const entries = await fastify.prisma.babyEntry.findMany({
      where: {
        userId: request.userId,
        createdAt: { gte: new Date(range.data.from), lt: new Date(range.data.to) },
      },
      orderBy: { createdAt: 'desc' },
    })
    reply.send(entries)
  })

  fastify.post('/', async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const entry = await fastify.prisma.babyEntry.create({ data: { ...body.data, userId: request.userId } })
    reply.status(201).send(entry)
  })
}
