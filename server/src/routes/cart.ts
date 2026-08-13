import type { FastifyInstance } from 'fastify'

const SHIPPING_TABLE: Record<string, { fee: number; days: number }> = {
  SP: { fee: 15.9,  days: 3 },
  RJ: { fee: 18.9,  days: 4 },
  MG: { fee: 18.9,  days: 4 },
  ES: { fee: 21.9,  days: 5 },
  PR: { fee: 18.9,  days: 4 },
  SC: { fee: 21.9,  days: 5 },
  RS: { fee: 21.9,  days: 5 },
  DF: { fee: 23.9,  days: 5 },
  GO: { fee: 23.9,  days: 6 },
  MT: { fee: 25.9,  days: 7 },
  MS: { fee: 25.9,  days: 7 },
  BA: { fee: 25.9,  days: 7 },
  PE: { fee: 27.9,  days: 8 },
  CE: { fee: 27.9,  days: 8 },
  MA: { fee: 29.9,  days: 9 },
  PA: { fee: 29.9,  days: 9 },
  AM: { fee: 35.9,  days: 12 },
}
const DEFAULT_SHIPPING = { fee: 29.9, days: 10 }

function getShipping(state: string) {
  return SHIPPING_TABLE[state.toUpperCase()] ?? DEFAULT_SHIPPING
}

async function buildCartResponse(fastify: FastifyInstance, userId: string) {
  const items = await fastify.prisma.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      ownProduct: {
        include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
      },
    },
  })
  const subtotal = items.reduce(
    (acc, item) => acc + Number(item.ownProduct.price) * item.quantity,
    0
  )
  return {
    items: items.map((i) => ({ ...i, ownProduct: { ...i.ownProduct, type: 'own' as const } })),
    subtotal: subtotal.toFixed(2),
    itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
  }
}

export default async function cartRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET / — cart with items and subtotal
  fastify.get('/', async (request, reply) => {
    reply.send(await buildCartResponse(fastify, request.userId))
  })

  // POST / — add item (upsert: increment if already exists)
  fastify.post<{ Body: { ownProductId: string; quantity: number } }>(
    '/',
    async (request, reply) => {
      const { ownProductId, quantity } = request.body
      if (!quantity || quantity < 1) return reply.status(422).send({ error: 'quantity must be ≥ 1' })

      const product = await fastify.prisma.ownProduct.findUnique({
        where: { id: ownProductId, active: true },
        select: { id: true, stock: true },
      })
      if (!product) return reply.status(404).send({ error: 'Product not found' })

      const existing = await fastify.prisma.cartItem.findUnique({
        where: { userId_ownProductId: { userId: request.userId, ownProductId } },
      })

      const newQty = Math.min((existing?.quantity ?? 0) + quantity, product.stock)
      if (newQty < 1) return reply.status(422).send({ error: 'Out of stock' })

      await fastify.prisma.cartItem.upsert({
        where: { userId_ownProductId: { userId: request.userId, ownProductId } },
        update: { quantity: newQty },
        create: { userId: request.userId, ownProductId, quantity },
      })

      reply.status(201).send(await buildCartResponse(fastify, request.userId))
    }
  )

  // PUT /:itemId — update quantity (quantity=0 removes the item)
  fastify.put<{ Params: { itemId: string }; Body: { quantity: number } }>(
    '/:itemId',
    async (request, reply) => {
      const { quantity } = request.body
      const item = await fastify.prisma.cartItem.findUnique({
        where: { id: request.params.itemId, userId: request.userId },
        include: { ownProduct: { select: { stock: true } } },
      })
      if (!item) return reply.status(404).send({ error: 'Not found' })

      if (quantity <= 0) {
        await fastify.prisma.cartItem.delete({ where: { id: item.id } })
      } else {
        const safeQty = Math.min(quantity, item.ownProduct.stock)
        await fastify.prisma.cartItem.update({ where: { id: item.id }, data: { quantity: safeQty } })
      }
      reply.send(await buildCartResponse(fastify, request.userId))
    }
  )

  // DELETE /:itemId — remove item
  fastify.delete<{ Params: { itemId: string } }>('/:itemId', async (request, reply) => {
    await fastify.prisma.cartItem.deleteMany({
      where: { id: request.params.itemId, userId: request.userId },
    })
    reply.send(await buildCartResponse(fastify, request.userId))
  })

  // POST /shipping — calculate shipping fee by addressId
  fastify.post<{ Body: { addressId: string } }>('/shipping', async (request, reply) => {
    const address = await fastify.prisma.address.findUnique({
      where: { id: request.body.addressId, userId: request.userId },
      select: { state: true },
    })
    if (!address) return reply.status(404).send({ error: 'Address not found' })
    const { fee, days } = getShipping(address.state)
    reply.send({ fee: fee.toFixed(2), estimatedDays: days })
  })
}
