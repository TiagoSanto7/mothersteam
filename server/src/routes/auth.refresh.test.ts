import { describe, expect, it, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import authRoutes from './auth'

vi.mock('../utils/tokens', () => ({
  signAccessToken: vi.fn(() => 'new-access-token'),
  signRefreshToken: vi.fn(() => 'new-refresh-token'),
  verifyRefreshToken: vi.fn(),
}))

import { verifyRefreshToken } from '../utils/tokens'
const mockVerifyRefreshToken = verifyRefreshToken as ReturnType<typeof vi.fn>

async function buildApp(mocks: {
  findUnique?: ReturnType<typeof vi.fn>
  deleteMany?: ReturnType<typeof vi.fn>
  transaction?: ReturnType<typeof vi.fn>
}) {
  const app = Fastify()
  await app.register(cookie)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.decorate('prisma', {
    refreshToken: {
      findUnique: mocks.findUnique ?? vi.fn(),
      deleteMany: mocks.deleteMany ?? vi.fn(),
      // A rota constrói as promises de delete/create eagerly pra passar pro
      // array do $transaction — precisam existir mesmo com $transaction mockado.
      delete: vi.fn(),
      create: vi.fn(),
    },
    $transaction: mocks.transaction ?? vi.fn(),
  } as any)
  app.decorateRequest('userId', '')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.decorate('authenticate', async (request: any) => { request.userId = 'user-1' })
  await app.register(authRoutes)
  return app
}

describe('POST /auth/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 401 quando o JWT é criptograficamente inválido — falha definitiva', async () => {
    mockVerifyRefreshToken.mockImplementationOnce(() => { throw new Error('jwt malformed') })
    const app = await buildApp({})

    const response = await app.inject({
      method: 'POST',
      url: '/refresh',
      payload: { refreshToken: 'bad-token' },
    })

    expect(response.statusCode).toBe(401)
    await app.close()
  })

  it('retorna 401 quando o token não existe (ou já expirou) no banco — falha definitiva', async () => {
    mockVerifyRefreshToken.mockReturnValueOnce({ userId: 'user-1' })
    const findUnique = vi.fn().mockResolvedValue(null)
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 })
    const app = await buildApp({ findUnique, deleteMany })

    const response = await app.inject({
      method: 'POST',
      url: '/refresh',
      payload: { refreshToken: 'stale-token' },
    })

    expect(response.statusCode).toBe(401)
    expect(deleteMany).toHaveBeenCalledWith({ where: { token: 'stale-token' } })
    await app.close()
  })

  it('rotaciona com sucesso e retorna o novo par de tokens', async () => {
    mockVerifyRefreshToken.mockReturnValueOnce({ userId: 'user-1' })
    const findUnique = vi.fn().mockResolvedValue({
      token: 'old-token',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    })
    const transaction = vi.fn().mockResolvedValue([{}, {}])
    const app = await buildApp({ findUnique, transaction })

    const response = await app.inject({
      method: 'POST',
      url: '/refresh',
      payload: { refreshToken: 'old-token' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' })
    expect(transaction).toHaveBeenCalledTimes(1)
    await app.close()
  })

  // A rotação é atômica ($transaction): um erro inesperado de banco antes de
  // ela commitar não é o mesmo tipo de falha que um token inválido — não deve
  // virar 401 (que o cliente trataria como "sessão encerrada, sem retry").
  // Precisa virar 500 pra que o cliente saiba que é seguro tentar de novo com
  // o mesmo refresh token, já que ele continua intacto no banco. A mensagem
  // do erro real não pode vazar na resposta (rota sem autenticação).
  it('não retorna 401 quando o banco falha de forma inesperada durante a rotação — falha transitória, sem vazar detalhe do erro', async () => {
    mockVerifyRefreshToken.mockReturnValueOnce({ userId: 'user-1' })
    const findUnique = vi.fn().mockResolvedValue({
      token: 'old-token',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    })
    const transaction = vi.fn().mockRejectedValue(new Error('connection string: postgres://internal-secret'))
    const app = await buildApp({ findUnique, transaction })

    const response = await app.inject({
      method: 'POST',
      url: '/refresh',
      payload: { refreshToken: 'old-token' },
    })

    expect(response.statusCode).not.toBe(401)
    expect(response.statusCode).toBe(500)
    expect(response.body).not.toContain('internal-secret')
    await app.close()
  })

  it('retorna 401 quando nenhum refresh token é enviado', async () => {
    const app = await buildApp({})

    const response = await app.inject({ method: 'POST', url: '/refresh', payload: {} })

    expect(response.statusCode).toBe(401)
    expect(mockVerifyRefreshToken).not.toHaveBeenCalled()
    await app.close()
  })
})
