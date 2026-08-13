import type { FastifyInstance } from 'fastify'

export default async function addressesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET / — list user's addresses
  fastify.get('/', async (request, reply) => {
    const addresses = await fastify.prisma.address.findMany({
      where: { userId: request.userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })
    reply.send(addresses)
  })

  // POST / — create address
  fastify.post<{
    Body: {
      recipientName: string
      street: string
      number: string
      complement?: string
      neighborhood: string
      city: string
      state: string
      zipCode: string
      isDefault?: boolean
    }
  }>('/', async (request, reply) => {
    const { recipientName, street, number, complement, neighborhood, city, state, zipCode, isDefault } = request.body

    if (isDefault) {
      await fastify.prisma.address.updateMany({
        where: { userId: request.userId },
        data: { isDefault: false },
      })
    }

    const count = await fastify.prisma.address.count({ where: { userId: request.userId } })
    const address = await fastify.prisma.address.create({
      data: {
        userId: request.userId,
        recipientName,
        street,
        number,
        complement: complement ?? null,
        neighborhood,
        city,
        state: state.toUpperCase().slice(0, 2),
        zipCode: zipCode.replace(/\D/g, '').slice(0, 8),
        isDefault: isDefault ?? count === 0,
      },
    })
    reply.status(201).send(address)
  })

  // PUT /:id — update address
  fastify.put<{
    Params: { id: string }
    Body: {
      recipientName?: string
      street?: string
      number?: string
      complement?: string
      neighborhood?: string
      city?: string
      state?: string
      zipCode?: string
    }
  }>('/:id', async (request, reply) => {
    const address = await fastify.prisma.address.findUnique({
      where: { id: request.params.id, userId: request.userId },
    })
    if (!address) return reply.status(404).send({ error: 'Not found' })

    const { state, zipCode, ...rest } = request.body
    const updated = await fastify.prisma.address.update({
      where: { id: address.id },
      data: {
        ...rest,
        ...(state ? { state: state.toUpperCase().slice(0, 2) } : {}),
        ...(zipCode ? { zipCode: zipCode.replace(/\D/g, '').slice(0, 8) } : {}),
      },
    })
    reply.send(updated)
  })

  // DELETE /:id — delete address
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await fastify.prisma.address.deleteMany({
      where: { id: request.params.id, userId: request.userId },
    })
    reply.status(204).send()
  })

  // PUT /:id/default — set as default address
  fastify.put<{ Params: { id: string } }>('/:id/default', async (request, reply) => {
    const address = await fastify.prisma.address.findUnique({
      where: { id: request.params.id, userId: request.userId },
      select: { id: true },
    })
    if (!address) return reply.status(404).send({ error: 'Not found' })

    await fastify.prisma.address.updateMany({
      where: { userId: request.userId },
      data: { isDefault: false },
    })
    const updated = await fastify.prisma.address.update({
      where: { id: address.id },
      data: { isDefault: true },
    })
    reply.send(updated)
  })
}
