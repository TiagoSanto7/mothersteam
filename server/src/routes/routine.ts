import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const createSchema = z.object({
  time: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1),
  category: z.enum(['task', 'appointment', 'medication']),
})

const updateSchema = z.object({
  done: z.boolean().optional(),
  title: z.string().min(1).optional(),
})

export default async function routineRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get<{ Querystring: { date?: string } }>('/', async (request, reply) => {
    const where = { userId: request.userId, ...(request.query.date ? { date: request.query.date } : {}) }
    const entries = await fastify.prisma.routineEntry.findMany({ where, orderBy: { time: 'asc' } })
    reply.send(entries)
  })

  fastify.post('/', async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const entry = await fastify.prisma.routineEntry.create({ data: { ...body.data, userId: request.userId } })
    reply.status(201).send(entry)
  })

  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const body = updateSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const entry = await fastify.prisma.routineEntry.updateMany({
      where: { id: request.params.id, userId: request.userId },
      data: body.data,
    })
    if (entry.count === 0) return reply.status(404).send({ error: 'Not found' })
    reply.send({ ok: true })
  })

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const deleted = await fastify.prisma.routineEntry.deleteMany({
      where: { id: request.params.id, userId: request.userId },
    })
    if (deleted.count === 0) return reply.status(404).send({ error: 'Not found' })
    reply.send({ ok: true })
  })
}
