import { describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'
import babyRoutes from './baby'

async function buildApp(findMany: ReturnType<typeof vi.fn>) {
  const app = Fastify()
  app.decorate('prisma', {
    babyEntry: { findMany },
  } as any)
  app.decorateRequest('userId', '')
  app.decorate('authenticate', async (request: any) => {
    request.userId = 'user-1'
  })
  await app.register(babyRoutes, { prefix: '/baby' })
  return app
}

describe('GET /baby', () => {
  it('sem intervalo, mantém a resposta antiga (50 mais recentes)', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const app = await buildApp(findMany)

    const response = await app.inject({ method: 'GET', url: '/baby' })

    expect(response.statusCode).toBe(200)
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    await app.close()
  })

  it('com from/to, filtra os registros do dia pedido', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const app = await buildApp(findMany)
    const from = '2026-09-17T03:00:00.000Z'
    const to = '2026-09-18T03:00:00.000Z'

    const response = await app.inject({
      method: 'GET',
      url: `/baby?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    })

    expect(response.statusCode).toBe(200)
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', createdAt: { gte: new Date(from), lt: new Date(to) } },
      orderBy: { createdAt: 'desc' },
    })
    await app.close()
  })

  it.each([
    ['só from', '/baby?from=2026-09-17T03:00:00.000Z'],
    ['data inválida', '/baby?from=ontem&to=hoje'],
    ['from depois de to', '/baby?from=2026-09-18T03:00:00.000Z&to=2026-09-17T03:00:00.000Z'],
  ])('responde 400 com intervalo inválido (%s)', async (_label, url) => {
    const findMany = vi.fn()
    const app = await buildApp(findMany)

    const response = await app.inject({ method: 'GET', url })

    expect(response.statusCode).toBe(400)
    expect(findMany).not.toHaveBeenCalled()
    await app.close()
  })
})
