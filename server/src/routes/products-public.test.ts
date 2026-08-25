import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'
import Fastify from 'fastify'
import productsPublicRoutes from './products-public'

const prisma = new PrismaClient()

describe('GET /products/:id/comprar', () => {
  it('redirects to mercadoLivreUrl and logs click', async () => {
    const cat = await prisma.category.create({
      data: { name: 'Test', slug: `t-${Date.now()}`, icon: '🧪' },
    })
    const product = await prisma.product.create({
      data: {
        name: 'Produto Teste',
        description: 'x',
        price: '10.00',
        categoryId: cat.id,
        mercadoLivreUrl: 'https://produto.mercadolivre.com.br/MLB-123',
      },
    })

    const app = Fastify()
    app.decorate('prisma', prisma)
    app.decorateRequest('userId', '')
    app.decorate('authenticate', async () => {})
    await app.register(productsPublicRoutes)

    const res = await app.inject({ method: 'GET', url: `/${product.id}/comprar` })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('https://produto.mercadolivre.com.br/MLB-123')

    // cleanup
    await prisma.productClick.deleteMany({ where: { productId: product.id } })
    await prisma.product.delete({ where: { id: product.id } })
    await prisma.category.delete({ where: { id: cat.id } })
    await app.close()
  })

  it('returns 404 if product has no mercadoLivreUrl', async () => {
    const cat = await prisma.category.create({
      data: { name: 'Test', slug: `t2-${Date.now()}`, icon: '🧪' },
    })
    const product = await prisma.product.create({
      data: { name: 'Sem URL', description: 'x', price: '10.00', categoryId: cat.id },
    })

    const app = Fastify()
    app.decorate('prisma', prisma)
    app.decorateRequest('userId', '')
    app.decorate('authenticate', async () => {})
    await app.register(productsPublicRoutes)

    const res = await app.inject({ method: 'GET', url: `/${product.id}/comprar` })
    expect(res.statusCode).toBe(404)

    await prisma.product.delete({ where: { id: product.id } })
    await prisma.category.delete({ where: { id: cat.id } })
    await app.close()
  })
})
