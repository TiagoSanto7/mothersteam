import type { FastifyInstance } from 'fastify'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { sendPush } from '../plugins/fcm'
import crypto from 'crypto'

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN ?? '',
})
const mpPayment = new Payment(mpClient)

const PUSH_MESSAGES: Record<string, { title: string; body: string }> = {
  PAID:      { title: 'Pedido pago! 🎉', body: 'Seu pedido foi confirmado e está sendo preparado.' },
  PREPARING: { title: 'Pedido em preparação 📦', body: 'Estamos separando os seus itens.' },
  SHIPPED:   { title: 'Pedido enviado 🚚', body: 'Seu pedido está a caminho!' },
  DELIVERED: { title: 'Pedido entregue ✅', body: 'Seu pedido foi entregue. Aproveite!' },
}

const SHIPPING_FEES: Record<string, number> = {
  SP: 15.9, RJ: 18.9, MG: 18.9, ES: 21.9, PR: 18.9, SC: 21.9, RS: 21.9,
  DF: 23.9, GO: 23.9, MT: 25.9, MS: 25.9, BA: 25.9, PE: 27.9, CE: 27.9,
  MA: 29.9, PA: 29.9, AM: 35.9,
}

export default async function ordersRoutes(fastify: FastifyInstance) {
  // POST / — create order + Mercado Pago [AUTH REQUIRED]
  fastify.post<{
    Body: {
      addressId: string
      paymentMethod: 'pix' | 'credit_card'
      cardToken?: string
      paymentMethodId?: string
      installments?: number
    }
  }>('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { addressId, paymentMethod, cardToken, paymentMethodId, installments } = request.body

    const [address, cartItems, user] = await Promise.all([
      fastify.prisma.address.findUnique({
        where: { id: addressId, userId: request.userId },
        select: { id: true, state: true },
      }),
      fastify.prisma.cartItem.findMany({
        where: { userId: request.userId },
        include: { ownProduct: { select: { id: true, name: true, price: true, stock: true } } },
      }),
      fastify.prisma.user.findUnique({
        where: { id: request.userId },
        select: { email: true, name: true },
      }),
    ])

    if (!address) return reply.status(404).send({ error: 'Address not found' })
    if (!cartItems.length) return reply.status(422).send({ error: 'Cart is empty' })
    if (!user) return reply.status(404).send({ error: 'User not found' })

    for (const item of cartItems) {
      if (item.ownProduct.stock < item.quantity) {
        return reply.status(422).send({ error: `Produto "${item.ownProduct.name}" sem estoque suficiente` })
      }
    }

    const shippingFee = SHIPPING_FEES[address.state.toUpperCase()] ?? 29.9
    const subtotal = cartItems.reduce(
      (acc, item) => acc + Number(item.ownProduct.price) * item.quantity,
      0
    )
    const total = Math.round((subtotal + shippingFee) * 100) / 100

    const order = await fastify.prisma.order.create({
      data: {
        userId: request.userId,
        status: 'PENDING',
        total,
        shippingFee,
        addressId,
        items: {
          create: cartItems.map((item) => ({
            ownProductId: item.ownProductId,
            quantity: item.quantity,
            priceAtPurchase: item.ownProduct.price,
          })),
        },
      },
    })

    try {
      if (paymentMethod === 'pix') {
        const mpResult = await mpPayment.create({
          body: {
            transaction_amount: total,
            description: `Pedido #MT-${order.id.slice(-6).toUpperCase()}`,
            payment_method_id: 'pix',
            payer: { email: user.email },
          },
        })

        const pixQrCode = mpResult.point_of_interaction?.transaction_data?.qr_code_base64 ?? null
        const pixCode = mpResult.point_of_interaction?.transaction_data?.qr_code ?? null

        await fastify.prisma.order.update({
          where: { id: order.id },
          data: {
            mercadoPagoPaymentId: String(mpResult.id),
            mercadoPagoPixQrCode: pixQrCode,
            mercadoPagoPixCode: pixCode,
          },
        })

        return reply.status(201).send({
          orderId: order.id,
          status: 'pending',
          pixQrCode,
          pixCode,
        })
      }

      if (!cardToken || !paymentMethodId) {
        return reply.status(422).send({ error: 'cardToken and paymentMethodId required for credit_card' })
      }

      const mpResult = await mpPayment.create({
        body: {
          transaction_amount: total,
          description: `Pedido #MT-${order.id.slice(-6).toUpperCase()}`,
          payment_method_id: paymentMethodId,
          installments: installments ?? 1,
          token: cardToken,
          payer: { email: user.email },
        },
      })

      const paid = mpResult.status === 'approved'
      if (paid) {
        await fastify.prisma.$transaction([
          fastify.prisma.order.update({
            where: { id: order.id },
            data: { mercadoPagoPaymentId: String(mpResult.id), status: 'PAID' },
          }),
          ...cartItems.map((item) =>
            fastify.prisma.ownProduct.updateMany({
              where: { id: item.ownProductId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            })
          ),
          fastify.prisma.cartItem.deleteMany({ where: { userId: request.userId } }),
        ])
      } else {
        await fastify.prisma.order.update({
          where: { id: order.id },
          data: { mercadoPagoPaymentId: String(mpResult.id), status: 'CANCELLED' },
        })
      }

      return reply.status(201).send({
        orderId: order.id,
        status: mpResult.status,
        statusDetail: mpResult.status_detail,
      })
    } catch (err) {
      await fastify.prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      })
      fastify.log.error(err)
      return reply.status(502).send({ error: 'Payment processing failed' })
    }
  })

  // GET / — list user's orders [AUTH REQUIRED]
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const orders = await fastify.prisma.order.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          take: 2,
          include: { ownProduct: { select: { id: true, name: true, images: true, price: true } } },
        },
      },
    })
    reply.send(orders)
  })

  // GET /:id — order detail [AUTH REQUIRED]
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const order = await fastify.prisma.order.findUnique({
        where: { id: request.params.id, userId: request.userId },
        include: {
          address: true,
          items: {
            include: { ownProduct: { select: { id: true, name: true, images: true, price: true } } },
          },
        },
      })
      if (!order) return reply.status(404).send({ error: 'Not found' })
      reply.send(order)
    }
  )

  // POST /webhook — Mercado Pago webhook [PUBLIC — validated by signature]
  fastify.post<{
    Headers: { 'x-signature'?: string; 'x-request-id'?: string }
    Body: { type: string; data: { id: string } }
  }>('/webhook', async (request, reply) => {
    const xSignature = request.headers['x-signature']
    const xRequestId = request.headers['x-request-id']
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET
    if (secret && xSignature && xRequestId) {
      const dataId = request.body?.data?.id
      const ts = xSignature.split(',').find((p) => p.startsWith('ts='))?.split('=')[1] ?? ''
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
      const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
      const v1 = xSignature.split(',').find((p) => p.startsWith('v1='))?.split('=')[1]
      if (hmac !== v1) {
        return reply.status(401).send({ error: 'Invalid signature' })
      }
    }

    if (request.body.type !== 'payment') return reply.status(200).send({ ok: true })

    const paymentId = String(request.body.data.id)
    const mpResult = await mpPayment.get({ id: Number(paymentId) })
    if (!mpResult) return reply.status(200).send({ ok: true })

    const order = await fastify.prisma.order.findFirst({
      where: { mercadoPagoPaymentId: paymentId },
      include: { user: { select: { fcmToken: true } } },
    })
    if (!order) return reply.status(200).send({ ok: true })

    let newStatus: string | null = null
    if (mpResult.status === 'approved' && order.status === 'PENDING') {
      newStatus = 'PAID'
    } else if (mpResult.status === 'cancelled') {
      newStatus = 'CANCELLED'
    }

    if (newStatus) {
      if (newStatus === 'PAID') {
        const items = await fastify.prisma.orderItem.findMany({ where: { orderId: order.id } })
        await fastify.prisma.$transaction([
          fastify.prisma.order.update({ where: { id: order.id }, data: { status: 'PAID' } }),
          ...items.map((item) =>
            fastify.prisma.ownProduct.updateMany({
              where: { id: item.ownProductId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            })
          ),
          fastify.prisma.cartItem.deleteMany({ where: { userId: order.userId } }),
        ])
      } else {
        await fastify.prisma.order.update({ where: { id: order.id }, data: { status: newStatus } })
      }

      const msg = PUSH_MESSAGES[newStatus]
      if (msg && order.user.fcmToken) {
        await sendPush(order.user.fcmToken, msg.title, msg.body)
      }
    }

    reply.status(200).send({ ok: true })
  })
}
