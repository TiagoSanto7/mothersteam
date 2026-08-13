// server/src/routes/admin/orders.ts
import type { FastifyInstance } from 'fastify'
import { requireRole } from '../../plugins/requireRole'
import { sendPush } from '../../plugins/fcm'

const VALID_ORDER_STATUSES = ['PENDING', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const
const PUSH_MESSAGES: Record<string, { title: string; body: string }> = {
  PAID:      { title: 'Pedido pago! 🎉', body: 'Seu pedido foi confirmado e está sendo preparado.' },
  PREPARING: { title: 'Pedido em preparação 📦', body: 'Estamos separando os seus itens.' },
  SHIPPED:   { title: 'Pedido enviado 🚚', body: 'Seu pedido está a caminho!' },
  DELIVERED: { title: 'Pedido entregue ✅', body: 'Seu pedido foi entregue. Aproveite!' },
}

export default async function adminOrdersRoutes(fastify: FastifyInstance) {
  await fastify.register(requireRole('ADMIN', 'EDITOR'))

  // GET / — list all orders with optional status filter
  fastify.get<{ Querystring: { status?: string; page?: string; limit?: string } }>(
    '/',
    async (request, reply) => {
      const page = Math.max(1, Number(request.query.page ?? 1))
      const limit = Math.min(Number(request.query.limit ?? 20), 100)
      const skip = (page - 1) * limit
      const where = request.query.status ? { status: request.query.status } : {}

      const [items, total] = await Promise.all([
        fastify.prisma.order.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            address: { select: { city: true, state: true } },
            items: {
              take: 2,
              include: { ownProduct: { select: { id: true, name: true } } },
            },
          },
        }),
        fastify.prisma.order.count({ where }),
      ])

      reply.send({ items, total, page, limit, totalPages: Math.ceil(total / limit) })
    }
  )

  // PUT /:id/status — update order status + fire push notification
  fastify.put<{ Params: { id: string }; Body: { status: string; trackingCode?: string } }>(
    '/:id/status',
    async (request, reply) => {
      const { status, trackingCode } = request.body
      if (!(VALID_ORDER_STATUSES as readonly string[]).includes(status)) {
        return reply.status(422).send({ error: `Invalid status. Valid: ${VALID_ORDER_STATUSES.join(', ')}` })
      }

      try {
        const order = await fastify.prisma.order.update({
          where: { id: request.params.id },
          data: {
            status,
            ...(trackingCode ? { trackingCode } : {}),
          },
          include: { user: { select: { fcmToken: true } } },
        })

        const msg = PUSH_MESSAGES[status]
        if (msg && order.user.fcmToken) {
          await sendPush(order.user.fcmToken, msg.title, msg.body)
        }

        reply.send(order)
      } catch (err: any) {
        if (err?.code === 'P2025') return reply.status(404).send({ error: 'Order not found' })
        throw err
      }
    }
  )
}
