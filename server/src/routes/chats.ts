import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { emitMessage } from '../sse'

const sendMessageSchema = z.object({
  content: z.string(),
  sharedPostId: z.string().optional(),
  sharedPostAuthor: z.string().optional(),
  sharedPostExcerpt: z.string().optional(),
})

const createChatSchema = z.object({
  userId: z.string(),
})

export default async function chatsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request, reply) => {
    const chats = await fastify.prisma.chat.findMany({
      where: { participants: { some: { userId: request.userId } } },
      include: {
        participants: { include: { user: { select: { id: true, name: true, archetypeKey: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    })
    reply.send(chats)
  })

  fastify.post('/', async (request, reply) => {
    const body = createChatSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    if (body.data.userId === request.userId)
      return reply.status(400).send({ error: 'Cannot chat with yourself' })

    const existing = await fastify.prisma.chat.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: request.userId } } },
          { participants: { some: { userId: body.data.userId } } },
        ],
      },
    })

    if (existing) return reply.send({ ...existing, messages: [] })

    const chat = await fastify.prisma.chat.create({
      data: {
        participants: {
          create: [{ userId: request.userId }, { userId: body.data.userId }],
        },
      },
      include: { participants: { include: { user: { select: { id: true, name: true, archetypeKey: true } } } } },
    })
    reply.status(201).send({ ...chat, messages: [] })
  })

  fastify.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/:id/messages',
    async (request, reply) => {
      const isMember = await fastify.prisma.chatParticipant.findUnique({
        where: { userId_chatId: { userId: request.userId, chatId: request.params.id } },
      })
      if (!isMember) return reply.status(403).send({ error: 'Forbidden' })

      const limit = Math.min(Number(request.query.limit ?? 30), 100)
      const messages = await fastify.prisma.message.findMany({
        where: { chatId: request.params.id },
        take: limit + 1,
        ...(request.query.cursor ? { cursor: { id: request.query.cursor }, skip: 1 } : {}),
        include: { sender: { select: { id: true, name: true, archetypeKey: true } } },
        orderBy: { createdAt: 'desc' },
      })
      const hasMore = messages.length > limit
      reply.send({ items: messages.slice(0, limit).reverse(), hasMore })
    }
  )

  fastify.post<{ Params: { id: string } }>('/:id/messages', async (request, reply) => {
    const isMember = await fastify.prisma.chatParticipant.findUnique({
      where: { userId_chatId: { userId: request.userId, chatId: request.params.id } },
    })
    if (!isMember) return reply.status(403).send({ error: 'Forbidden' })

    const body = sendMessageSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const message = await fastify.prisma.message.create({
      data: {
        content: body.data.content,
        chatId: request.params.id,
        senderId: request.userId,
        sharedPostId: body.data.sharedPostId,
        sharedPostAuthor: body.data.sharedPostAuthor,
        sharedPostExcerpt: body.data.sharedPostExcerpt,
      },
      include: { sender: { select: { id: true, name: true, archetypeKey: true } } },
    })

    // Notify all OTHER participants via SSE
    const chat = await fastify.prisma.chat.findUnique({
      where: { id: request.params.id },
      select: { participants: { select: { userId: true } } },
    })
    if (chat) {
      for (const p of chat.participants) {
        if (p.userId !== request.userId) {
          emitMessage(p.userId, request.params.id)
        }
      }
    }

    reply.status(201).send(message)
  })

  fastify.post<{ Params: { id: string } }>('/:id/read', async (request, reply) => {
    const isMember = await fastify.prisma.chatParticipant.findUnique({
      where: { userId_chatId: { userId: request.userId, chatId: request.params.id } },
    })
    if (!isMember) return reply.status(403).send({ error: 'Forbidden' })

    await fastify.prisma.message.updateMany({
      where: {
        chatId: request.params.id,
        senderId: { not: request.userId },
        read: false,
      },
      data: { read: true },
    })
    reply.send({ ok: true })
  })
}
