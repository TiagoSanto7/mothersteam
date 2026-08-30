import { describe, it, expect, vi } from 'vitest'
import Fastify from 'fastify'
import maeIARoutes from './mae-ia'

const { mockSendMessageStream } = vi.hoisted(() => {
  process.env.GEMINI_API_KEY = 'test-gemini-key'
  const mockSendMessageStream = vi.fn()
  return { mockSendMessageStream }
})

vi.mock('@google/genai', () => {
  const mockStream = {
    [Symbol.asyncIterator]: async function* () {
      yield { text: 'Olá' }
      yield { text: ', tudo bem?' }
      yield { text: null }
    },
  }
  mockSendMessageStream.mockResolvedValue(mockStream)
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      chats: {
        create: vi.fn().mockReturnValue({
          sendMessageStream: mockSendMessageStream,
        }),
      },
    })),
  }
})

const mockUser = {
  name: 'Ana',
  babyName: 'Theo',
  babyAgeInDays: 30,
  pregnancyStage: 'pos-parto',
  archetypeKey: 'mãe-guerreira',
  mood: 'A',
  supportNetwork: 'B',
  goal: 'C',
  concern: 'B',
}

async function buildApp() {
  const app = Fastify()
  app.decorate('prisma', {
    user: { findUnique: vi.fn().mockResolvedValue(mockUser) },
  } as any)
  app.decorate('authenticate', async (request: any) => {
    request.userId = 'user-1'
  })
  await app.register(maeIARoutes, { prefix: '/mae-ia' })
  return app
}

describe('POST /mae-ia/chat', () => {
  it('retorna SSE com tokens do Gemini e termina com [DONE]', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/mae-ia/chat',
      headers: { Authorization: 'Bearer fake-token' },
      payload: { messages: [{ role: 'user', content: 'Olá' }] },
    })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/event-stream/)
    expect(res.body).toContain('data: {"text":"Olá"}')
    expect(res.body).toContain('data: {"text":", tudo bem?"}')
    expect(res.body).toContain('data: [DONE]')
  })

  it('retorna 400 se messages estiver ausente', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/mae-ia/chat',
      headers: { Authorization: 'Bearer fake-token' },
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })

  it('ignora chunks com text null', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/mae-ia/chat',
      headers: { Authorization: 'Bearer fake-token' },
      payload: { messages: [{ role: 'user', content: 'Oi' }] },
    })
    expect(res.body).not.toContain('"text":null')
  })

  it('escreve frame de erro quando Gemini falha e NÃO escreve [DONE]', async () => {
    mockSendMessageStream.mockRejectedValueOnce(new Error('Gemini down'))
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/mae-ia/chat',
      headers: { Authorization: 'Bearer fake-token' },
      payload: { messages: [{ role: 'user', content: 'Oi' }] },
    })
    expect(res.body).toContain('"error"')
    expect(res.body).not.toContain('[DONE]')
  })
})
