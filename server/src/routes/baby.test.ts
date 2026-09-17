import { describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'
import babyRoutes from './baby'

type Mocks = Partial<Record<'findMany' | 'updateMany' | 'deleteMany', ReturnType<typeof vi.fn>>>

async function buildApp(findManyOrMocks: ReturnType<typeof vi.fn> | Mocks) {
  const babyEntry = typeof findManyOrMocks === 'function' ? { findMany: findManyOrMocks } : findManyOrMocks
  const app = Fastify()
  app.decorate('prisma', { babyEntry } as any)
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

describe('PATCH /baby/:id', () => {
  it('atualiza horário, detalhe e data do registro da própria usuária', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const app = await buildApp({ updateMany })
    const createdAt = '2026-09-17T10:30:00.000Z'

    const response = await app.inject({
      method: 'PATCH',
      url: '/baby/entry-1',
      payload: { time: '07:30', detail: 'Coco', createdAt },
    })

    expect(response.statusCode).toBe(200)
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'entry-1', userId: 'user-1' },
      data: { time: '07:30', detail: 'Coco', createdAt: new Date(createdAt) },
    })
    await app.close()
  })

  it('responde 404 quando o registro não é da usuária', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 })
    const app = await buildApp({ updateMany })

    const response = await app.inject({ method: 'PATCH', url: '/baby/de-outra', payload: { detail: 'Xixi' } })

    expect(response.statusCode).toBe(404)
    await app.close()
  })

  it.each([
    ['corpo vazio', {}],
    ['horário inválido', { time: '25:00' }],
    ['detalhe vazio', { detail: '' }],
  ])('responde 400 com %s', async (_label, payload) => {
    const updateMany = vi.fn()
    const app = await buildApp({ updateMany })

    const response = await app.inject({ method: 'PATCH', url: '/baby/entry-1', payload })

    expect(response.statusCode).toBe(400)
    expect(updateMany).not.toHaveBeenCalled()
    await app.close()
  })
})

describe('DELETE /baby/:id', () => {
  it('exclui só o registro da própria usuária', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 })
    const app = await buildApp({ deleteMany })

    const response = await app.inject({ method: 'DELETE', url: '/baby/entry-1' })

    expect(response.statusCode).toBe(200)
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: 'entry-1', userId: 'user-1' } })
    await app.close()
  })

  it('responde 404 quando o registro não existe ou é de outra usuária', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 })
    const app = await buildApp({ deleteMany })

    const response = await app.inject({ method: 'DELETE', url: '/baby/de-outra' })

    expect(response.statusCode).toBe(404)
    await app.close()
  })
})
