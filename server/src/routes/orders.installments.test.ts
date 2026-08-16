import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'
import ordersRoutes from './orders'

const MOCK_PAYER_COSTS = [
  { installments: 1, installment_rate: 0, installment_amount: 100, total_amount: 100, recommended_message: '1x R$ 100,00 sem juros' },
  { installments: 2, installment_rate: 19.99, installment_amount: 59.99, total_amount: 119.98, recommended_message: '2x R$ 59,99' },
  { installments: 3, installment_rate: 24.99, installment_amount: 41.66, total_amount: 124.98, recommended_message: '3x R$ 41,66' },
]

async function makeApp(userId = 'u1') {
  const app = Fastify()
  app.decorate('prisma', {} as any)
  app.decorateRequest('userId', '')
  app.decorate('authenticate', async (req: any) => { req.userId = userId })
  await app.register(ordersRoutes)
  return app
}

describe('GET /installments', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('retorna payer_costs mapeados quando MP responde corretamente', async () => {
    const app = await makeApp()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ payment_method_id: 'visa', payer_costs: MOCK_PAYER_COSTS }],
    } as Response)

    const res = await app.inject({
      method: 'GET',
      url: '/installments?paymentMethodId=visa&amount=100',
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveLength(3)
    expect(body[0]).toEqual({
      installments: 1,
      rate: 0,
      installmentAmount: 100,
      totalAmount: 100,
      label: '1x R$ 100,00 sem juros',
    })
    expect(body[1].rate).toBe(19.99)
    await app.close()
  })

  it('retorna 400 quando paymentMethodId está ausente', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'GET', url: '/installments?amount=100' })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('retorna 400 quando amount está ausente', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'GET', url: '/installments?paymentMethodId=visa' })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('retorna 400 quando amount não é número válido', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'GET', url: '/installments?paymentMethodId=visa&amount=abc' })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('retorna array vazio quando MP devolve lista sem payer_costs', async () => {
    const app = await makeApp()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    const res = await app.inject({
      method: 'GET',
      url: '/installments?paymentMethodId=visa&amount=100',
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
    await app.close()
  })

  it('retorna 502 quando MP responde com erro', async () => {
    const app = await makeApp()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal error',
    } as Response)

    const res = await app.inject({
      method: 'GET',
      url: '/installments?paymentMethodId=visa&amount=100',
    })

    expect(res.statusCode).toBe(502)
    await app.close()
  })
})
