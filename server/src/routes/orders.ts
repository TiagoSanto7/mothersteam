import type { FastifyInstance } from 'fastify'
import { MercadoPagoConfig, Payment, Customer, CustomerCard } from 'mercadopago'
import { sendPush } from '../plugins/fcm'
import crypto from 'crypto'

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN ?? '',
})
const mpPayment = new Payment(mpClient)
const mpCustomer = new Customer(mpClient)
const mpCustomerCard = new CustomerCard(mpClient)

async function saveCardForUser(
  fastify: FastifyInstance,
  userId: string,
  userEmail: string,
  cardToken: string
): Promise<void> {
  try {
    let mpCustomerId = (await fastify.prisma.user.findUnique({
      where: { id: userId },
      select: { mpCustomerId: true },
    }))?.mpCustomerId ?? null

    if (!mpCustomerId) {
      const c = await mpCustomer.create({ body: { email: userEmail } })
      mpCustomerId = String(c.id)
      await fastify.prisma.user.update({ where: { id: userId }, data: { mpCustomerId } })
    }

    const card = await mpCustomerCard.create({ customerId: mpCustomerId, body: { token: cardToken } })
    const mpCardId = String(card.id)

    // Idempotency — skip if this card is already saved
    const exists = await fastify.prisma.paymentMethod.findUnique({ where: { mpCardId } })
    if (exists) return

    await fastify.prisma.paymentMethod.create({
      data: {
        userId,
        mpCustomerId,
        mpCardId,
        brand: card.payment_method?.id ?? '',
        lastFour: String(card.last_four_digits ?? ''),
        holderName: (card as any).cardholder?.name ?? '',
        expirationMonth: card.expiration_month ?? 0,
        expirationYear: card.expiration_year ?? 0,
      },
    })
  } catch (err) {
    fastify.log.warn({ err, userId }, 'saveCardForUser failed — payment still processed')
  }
}

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
      saveCard?: boolean
    }
  }>('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { addressId, paymentMethod, cardToken, paymentMethodId, installments, saveCard } = request.body

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

      const mpStatus = mpResult.status
      const paid = mpStatus === 'approved'
      const inProcess = mpStatus === 'in_process' || mpStatus === 'pending'

      if (paid) {
        await fastify.prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { mercadoPagoPaymentId: String(mpResult.id), status: 'PAID' },
          })
          const stockResults = await Promise.all(
            cartItems.map((item) =>
              tx.ownProduct.updateMany({
                where: { id: item.ownProductId, stock: { gte: item.quantity } },
                data: { stock: { decrement: item.quantity } },
              })
            )
          )
          if (stockResults.some((r) => r.count === 0)) {
            fastify.log.error({ orderId: order.id }, 'concurrent stock depletion on credit card payment')
          }
          await tx.cartItem.deleteMany({ where: { userId: request.userId } })
        })
        if (saveCard && cardToken) {
          await saveCardForUser(fastify, request.userId, user.email, cardToken)
        }
      } else if (!inProcess) {
        // Only cancel on explicit rejection — in_process/pending waits for webhook
        await fastify.prisma.order.update({
          where: { id: order.id },
          data: { mercadoPagoPaymentId: String(mpResult.id), status: 'CANCELLED' },
        })
      } else {
        await fastify.prisma.order.update({
          where: { id: order.id },
          data: { mercadoPagoPaymentId: String(mpResult.id) },
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
    if (!secret) return reply.status(401).send({ error: 'Webhook not configured' })
    if (!xSignature || !xRequestId) return reply.status(401).send({ error: 'Missing signature' })

    const dataId = request.body?.data?.id
    const ts = xSignature.split(',').find((p) => p.startsWith('ts='))?.split('=')[1] ?? ''
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
    const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
    const v1 = xSignature.split(',').find((p) => p.startsWith('v1='))?.split('=')[1]
    if (hmac !== v1) {
      return reply.status(401).send({ error: 'Invalid signature' })
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
        const processed = await fastify.prisma.$transaction(async (tx) => {
          const { count } = await tx.order.updateMany({
            where: { id: order.id, status: 'PENDING' },
            data: { status: 'PAID' },
          })
          if (count === 0) return false
          await Promise.all([
            ...items.map((item) =>
              tx.ownProduct.updateMany({
                where: { id: item.ownProductId, stock: { gte: item.quantity } },
                data: { stock: { decrement: item.quantity } },
              })
            ),
            tx.cartItem.deleteMany({ where: { userId: order.userId } }),
          ])
          return true
        })
        if (!processed) return reply.status(200).send({ ok: true })
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

  // GET /installments — opções reais de parcelamento via MP [AUTH REQUIRED]
  fastify.get<{
    Querystring: { paymentMethodId?: string; amount?: string }
  }>('/installments', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { paymentMethodId, amount } = request.query
    if (!paymentMethodId || !amount) {
      return reply.status(400).send({ error: 'paymentMethodId and amount are required' })
    }
    const numAmount = Number(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return reply.status(400).send({ error: 'amount must be a positive number' })
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? ''
    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payment_methods/installments?payment_method_id=${encodeURIComponent(paymentMethodId)}&amount=${numAmount}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!mpRes.ok) {
      fastify.log.error({ status: mpRes.status }, 'MP installments API error')
      return reply.status(502).send({ error: 'Failed to fetch installment options' })
    }

    type MPInstallmentRow = {
      payer_costs?: Array<{
        installments: number
        installment_rate: number
        installment_amount: number
        total_amount: number
        recommended_message: string
      }>
    }
    const data = (await mpRes.json()) as MPInstallmentRow[]
    const payerCosts = data[0]?.payer_costs ?? []

    reply.send(payerCosts.map((pc) => ({
      installments: pc.installments,
      rate: pc.installment_rate,
      installmentAmount: pc.installment_amount,
      totalAmount: pc.total_amount,
      label: pc.recommended_message,
    })))
  })
}
