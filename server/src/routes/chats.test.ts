import { describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'
import chatsRoutes from './chats'

vi.mock('../sse', () => ({ emitMessage: vi.fn() }))

async function buildApp(mocks: {
  chatParticipant?: ReturnType<typeof vi.fn>
  messageCreate?: ReturnType<typeof vi.fn>
  chatFindUnique?: ReturnType<typeof vi.fn>
}) {
  const app = Fastify()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.decorate('prisma', {
    chatParticipant: { findUnique: mocks.chatParticipant ?? vi.fn().mockResolvedValue({ userId: 'user-1', chatId: 'chat-1' }) },
    message: { create: mocks.messageCreate ?? vi.fn() },
    chat: { findUnique: mocks.chatFindUnique ?? vi.fn().mockResolvedValue({ participants: [] }) },
  } as any)
  app.decorateRequest('userId', '')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.decorate('authenticate', async (request: any) => { request.userId = 'user-1' })
  await app.register(chatsRoutes, { prefix: '/chats' })
  return app
}

describe('POST /chats/:id/messages — referência de resposta', () => {
  it('persiste replyToId, replyToSenderName e replyToExcerpt', async () => {
    const messageCreate = vi.fn().mockResolvedValue({
      id: 'm2', content: 'oi', chatId: 'chat-1', senderId: 'user-1',
      replyToId: 'm1', replyToSenderName: 'Ana', replyToExcerpt: 'mensagem original',
      sender: { id: 'user-1', name: 'você' },
    })
    const app = await buildApp({ messageCreate })

    const response = await app.inject({
      method: 'POST',
      url: '/chats/chat-1/messages',
      payload: { content: 'oi', replyToId: 'm1', replyToSenderName: 'Ana', replyToExcerpt: 'mensagem original' },
    })

    expect(response.statusCode).toBe(201)
    expect(messageCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        replyToId: 'm1',
        replyToSenderName: 'Ana',
        replyToExcerpt: 'mensagem original',
      }),
    }))
    await app.close()
  })

  it('não quebra quando a mensagem não é resposta a nada', async () => {
    const messageCreate = vi.fn().mockResolvedValue({
      id: 'm1', content: 'oi', chatId: 'chat-1', senderId: 'user-1',
      sender: { id: 'user-1', name: 'você' },
    })
    const app = await buildApp({ messageCreate })

    const response = await app.inject({
      method: 'POST',
      url: '/chats/chat-1/messages',
      payload: { content: 'oi' },
    })

    expect(response.statusCode).toBe(201)
    await app.close()
  })
})
