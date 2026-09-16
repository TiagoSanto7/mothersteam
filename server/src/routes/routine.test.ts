import { describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'
import routineRoutes from './routine'

const categories = ['task', 'appointment', 'medication'] as const

async function buildApp(updateMany: ReturnType<typeof vi.fn>) {
  const app = Fastify()
  app.decorate('prisma', {
    routineEntry: { updateMany },
  } as any)
  app.decorateRequest('userId', '')
  app.decorate('authenticate', async (request: any) => {
    request.userId = 'user-1'
  })
  await app.register(routineRoutes, { prefix: '/routine' })
  return app
}

describe('PATCH /routine/:id', () => {
  it.each(categories)('envia a observação ao Prisma ao editar um lembrete de %s', async (category) => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const app = await buildApp(updateMany)

    const response = await app.inject({
      method: 'PATCH',
      url: '/routine/entry-1',
      payload: {
        title: 'Lembrete editado',
        time: '09:30',
        date: '2026-09-15',
        category,
        notes: 'teste',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'entry-1', userId: 'user-1' },
      data: {
        title: 'Lembrete editado',
        time: '09:30',
        date: '2026-09-15',
        category,
        notes: 'teste',
      },
    })

    await app.close()
  })

  it('envia null ao Prisma quando a observação é removida', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const app = await buildApp(updateMany)

    const response = await app.inject({
      method: 'PATCH',
      url: '/routine/entry-1',
      payload: { notes: null },
    })

    expect(response.statusCode).toBe(200)
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'entry-1', userId: 'user-1' },
      data: { notes: null },
    })

    await app.close()
  })
})
