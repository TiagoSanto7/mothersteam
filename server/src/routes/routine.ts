import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const createSchema = z.object({
  time: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1),
  category: z.enum(['task', 'appointment', 'medication']),
  notes: z.string().max(300).optional(),
})

const updateSchema = z.object({
  done: z.boolean().optional(),
  title: z.string().min(1).optional(),
  time: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.enum(['task', 'appointment', 'medication']).optional(),
  notes: z.string().max(300).nullable().optional(),
})

export default async function routineRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get<{ Querystring: { date?: string; future?: string; limit?: string } }>('/', async (request, reply) => {
    const { date, future, limit } = request.query
    if (future === 'true') {
      // Returns upcoming entries (date >= today) sorted by date then time
      // Use local-date arithmetic (not toISOString which is UTC) so the cutoff
      // matches the server's local clock even when TZ offsets differ.
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const entries = await fastify.prisma.routineEntry.findMany({
        where: { userId: request.userId, date: { gte: today } },
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
        take: limit ? Math.min(parseInt(limit, 10), 100) : 50,
      })
      return reply.send(entries)
    }
    const where = { userId: request.userId, ...(date ? { date } : {}) }
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
