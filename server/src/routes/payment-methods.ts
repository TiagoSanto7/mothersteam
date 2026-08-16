import type { FastifyInstance } from 'fastify'
import { MercadoPagoConfig, CustomerCard } from 'mercadopago'

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN ?? '',
})
const mpCustomerCard = new CustomerCard(mpClient)

export default async function paymentMethodsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request, reply) => {
    const methods = await fastify.prisma.paymentMethod.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        mpCardId: true,
        brand: true,
        lastFour: true,
        holderName: true,
        expirationMonth: true,
        expirationYear: true,
      },
    })
    reply.send(methods)
  })

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const method = await fastify.prisma.paymentMethod.findUnique({
      where: { id: request.params.id, userId: request.userId },
    })
    if (!method) return reply.status(404).send({ error: 'Not found' })

    try {
      await mpCustomerCard.remove({ customerId: method.mpCustomerId, cardId: method.mpCardId })
    } catch (err) {
      fastify.log.warn({ err, cardId: method.mpCardId }, 'MP card removal failed — removing locally anyway')
    }

    await fastify.prisma.paymentMethod.delete({ where: { id: method.id } })
    reply.send({ ok: true })
  })
}
