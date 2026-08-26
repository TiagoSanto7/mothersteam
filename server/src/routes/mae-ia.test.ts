import { describe, it, expect, vi } from 'vitest'
import Fastify from 'fastify'
import maeIARoutes from './mae-ia'

// vi.hoisted runs before vi.mock hoisting, so mockCreate and env vars are set first
const { mockCreate } = vi.hoisted(() => {
  // Ensure the env var is present before the module-level const is read
  process.env.OPENAI_API_KEY = 'test-openai-key'
  const mockCreate = vi.fn()
  return { mockCreate }
})

// Mock OpenAI SDK
vi.mock('openai', () => {
  const mockStream = {
    [Symbol.asyncIterator]: async function* () {
      yield { choices: [{ delta: { content: 'Olá' } }] }
      yield { choices: [{ delta: { content: ', tudo bem?' } }] }
      yield { choices: [{ delta: { content: null } }] }
    },
  }
  mockCreate.mockResolvedValue(mockStream)
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
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
  // Mock prisma
  app.decorate('prisma', {
    user: { findUnique: vi.fn().mockResolvedValue(mockUser) },
  })
  // Mock authenticate
  app.decorate('authenticate', async (request: any) => {
    request.userId = 'user-1'
  })
  await app.register(maeIARoutes, { prefix: '/mae-ia' })
  return app
}

describe('POST /mae-ia/chat', () => {
  it('retorna SSE com tokens da OpenAI e termina com [DONE]', async () => {
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

  it('ignora chunks com delta.content null', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/mae-ia/chat',
      headers: { Authorization: 'Bearer fake-token' },
      payload: { messages: [{ role: 'user', content: 'Oi' }] },
    })
    expect(res.body).not.toContain('"text":null')
  })

  it('escreve frame de erro quando OpenAI falha e NÃO escreve [DONE]', async () => {
    mockCreate.mockRejectedValueOnce(new Error('OpenAI down'))
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
