import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const createSchema = z.object({
  time: z.string(),
  type: z.enum(['sleep', 'feed', 'diaper']),
  detail: z.string().min(1),
})

export default async function babyRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get<{ Querystring: { date?: string } }>('/', async (request, reply) => {
    const entries = await fastify.prisma.babyEntry.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
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
