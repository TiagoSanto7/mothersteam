# Shopping — Plano 1: DB + Backend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar todos os novos models Prisma e todas as rotas backend necessárias para o sistema de shopping completo (detalhe, reviews, wishlist, carrinho, checkout, pedidos).

**Architecture:** Fastify + Prisma + MySQL. Rotas autenticadas usam `fastify.addHook('preHandler', fastify.authenticate)`. Status do pedido é `String` (sem enum Prisma). Mercado Pago no backend; frontend só tokeniza cartão. FCM via firebase-admin.

**Tech Stack:** Fastify, Prisma, MySQL, mercadopago (npm), firebase-admin (npm), Zod

---

## File Structure

- Modify: `server/prisma/schema.prisma`
- Modify: `server/src/routes/products-public.ts`
- Create: `server/src/routes/own-products.ts`
- Create: `server/src/routes/wishlist.ts`
- Create: `server/src/routes/cart.ts`
- Create: `server/src/routes/addresses.ts`
- Create: `server/src/routes/orders.ts`
- Create: `server/src/plugins/fcm.ts`
- Create: `server/src/routes/admin/own-products.ts`
- Create: `server/src/routes/admin/orders.ts`
- Modify: `server/src/index.ts`

---

### Task 1: Atualizar schema.prisma — novos models e campos

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Adicionar `fcmToken` ao model User e as novas relações**

Adicionar no bloco `model User { ... }`, após o campo `updatedAt`:

```prisma
  fcmToken   String?
  reviews    Review[]
  wishlistItems WishlistItem[]
  cartItems  CartItem[]
  orders     Order[]
  addresses  Address[]
```

- [ ] **Step 2: Adicionar relações ao model Product**

Adicionar ao bloco `model Product { ... }`, após `clicks ProductClick[]`:

```prisma
  reviews      Review[]
  wishlistItems WishlistItem[]
```

- [ ] **Step 3: Adicionar relação ao model Category**

Adicionar ao bloco `model Category { ... }`, após `products Product[]`:

```prisma
  ownProducts OwnProduct[]
```

- [ ] **Step 4: Adicionar os 7 novos models ao final do schema**

```prisma
model OwnProduct {
  id          String   @id @default(cuid())
  name        String   @db.VarChar(200)
  description String   @db.Text
  price       Decimal  @db.Decimal(10, 2)
  images      Json     @default("[]")
  stock       Int      @default(0)
  sku         String?  @db.VarChar(100)
  featured    Boolean  @default(false)
  active      Boolean  @default(true)
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  reviews     Review[]
  wishlistItems WishlistItem[]
  cartItems   CartItem[]
  orderItems  OrderItem[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Review {
  id               String      @id @default(cuid())
  rating           Int
  text             String?     @db.VarChar(500)
  verifiedPurchase Boolean     @default(false)
  userId           String
  user             User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId        String?
  product          Product?    @relation(fields: [productId], references: [id], onDelete: Cascade)
  ownProductId     String?
  ownProduct       OwnProduct? @relation(fields: [ownProductId], references: [id], onDelete: Cascade)
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  @@unique([userId, productId])
  @@unique([userId, ownProductId])
}

model WishlistItem {
  id           String      @id @default(cuid())
  userId       String
  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId    String?
  product      Product?    @relation(fields: [productId], references: [id], onDelete: Cascade)
  ownProductId String?
  ownProduct   OwnProduct? @relation(fields: [ownProductId], references: [id], onDelete: Cascade)
  createdAt    DateTime    @default(now())

  @@unique([userId, productId])
  @@unique([userId, ownProductId])
}

model CartItem {
  id           String     @id @default(cuid())
  userId       String
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  ownProductId String
  ownProduct   OwnProduct @relation(fields: [ownProductId], references: [id], onDelete: Cascade)
  quantity     Int        @default(1)
  createdAt    DateTime   @default(now())

  @@unique([userId, ownProductId])
}

model Order {
  id                   String      @id @default(cuid())
  userId               String
  user                 User        @relation(fields: [userId], references: [id])
  status               String      @default("PENDING")
  total                Decimal     @db.Decimal(10, 2)
  shippingFee          Decimal     @db.Decimal(10, 2)
  mercadoPagoPaymentId String?
  mercadoPagoPixQrCode String?     @db.VarChar(500)
  mercadoPagoPixCode   String?     @db.Text
  trackingCode         String?     @db.VarChar(100)
  addressId            String
  address              Address     @relation(fields: [addressId], references: [id])
  items                OrderItem[]
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt
}

model OrderItem {
  id              String     @id @default(cuid())
  orderId         String
  order           Order      @relation(fields: [orderId], references: [id], onDelete: Cascade)
  ownProductId    String
  ownProduct      OwnProduct @relation(fields: [ownProductId], references: [id])
  quantity        Int
  priceAtPurchase Decimal    @db.Decimal(10, 2)
}

model Address {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipientName String   @db.VarChar(100)
  street        String   @db.VarChar(200)
  number        String   @db.VarChar(20)
  complement    String?  @db.VarChar(100)
  neighborhood  String   @db.VarChar(100)
  city          String   @db.VarChar(100)
  state         String   @db.Char(2)
  zipCode       String   @db.Char(8)
  isDefault     Boolean  @default(false)
  orders        Order[]
  createdAt     DateTime @default(now())
}
```

- [ ] **Step 5: Aplicar o schema no banco de dados**

No VPS, dentro do diretório do servidor:
```bash
cd /opt/mothersteam/server
npx prisma db push
```

Localmente (dev):
```bash
cd server
npx prisma db push
```

Esperado: `✓ Your database is now in sync with your Prisma schema.`

- [ ] **Step 6: Regenerar o Prisma Client**

```bash
npx prisma generate
```

- [ ] **Step 7: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat(db): add OwnProduct, Review, WishlistItem, CartItem, Order, OrderItem, Address + fcmToken on User"
```

---

### Task 2: Instalar pacotes backend

**Files:** `server/package.json`

- [ ] **Step 1: Instalar dependências**

```bash
cd server
npm install mercadopago firebase-admin
npm install --save-dev @types/firebase-admin
```

- [ ] **Step 2: Verificar instalação**

```bash
node -e "require('mercadopago'); require('firebase-admin'); console.log('ok')"
```

Esperado: `ok`

- [ ] **Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore(server): install mercadopago and firebase-admin"
```

---

### Task 3: Plugin FCM para notificações push

**Files:**
- Create: `server/src/plugins/fcm.ts`

- [ ] **Step 1: Criar o plugin FCM**

```typescript
// server/src/plugins/fcm.ts
import admin from 'firebase-admin'

let initialized = false

function initFirebase() {
  if (initialized || admin.apps.length) return
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[fcm] Firebase env vars not set — push notifications disabled')
    return
  }
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  })
  initialized = true
}

export async function sendPush(fcmToken: string, title: string, body: string): Promise<void> {
  initFirebase()
  if (!initialized && !admin.apps.length) return
  try {
    await admin.messaging().send({ token: fcmToken, notification: { title, body } })
  } catch (err) {
    console.error('[fcm] send error:', err)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/plugins/fcm.ts
git commit -m "feat(server): FCM push notification helper"
```

---

### Task 4: Modificar products-public.ts — detalhe, redirect, wishlist e reviews

**Files:**
- Modify: `server/src/routes/products-public.ts`

O arquivo atual tem 3 rotas. Adicionar após a rota `GET /categories`:

- [ ] **Step 1: Adicionar `GET /:id` — detalhe do produto afiliado**

Adicionar ao final do arquivo (antes do fechamento da função):

```typescript
  // GET /:id — product detail with reviews summary, 3 recent reviews, inWishlist, related
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const product = await fastify.prisma.product.findUnique({
      where: { id: request.params.id, active: true },
      include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
    })
    if (!product) return reply.status(404).send({ error: 'Not found' })

    const userId = request.userId

    const [reviews, aggregate, inWishlistRow, related, distribution] = await Promise.all([
      fastify.prisma.review.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      fastify.prisma.review.aggregate({
        where: { productId: product.id },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      fastify.prisma.wishlistItem.findUnique({
        where: { userId_productId: { userId, productId: product.id } },
        select: { id: true },
      }),
      fastify.prisma.product.findMany({
        where: { categoryId: product.categoryId, active: true, id: { not: product.id } },
        take: 10,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
      }),
      fastify.prisma.review.groupBy({
        by: ['rating'],
        where: { productId: product.id },
        _count: { rating: true },
      }),
    ])

    const dist = Object.fromEntries(
      [1, 2, 3, 4, 5].map((r) => [r, distribution.find((d) => d.rating === r)?._count.rating ?? 0])
    )

    reply.send({
      ...product,
      type: 'affiliate',
      reviewsSummary: {
        average: aggregate._avg.rating ?? 0,
        count: aggregate._count.rating,
        distribution: dist,
      },
      reviews,
      inWishlist: !!inWishlistRow,
      related,
    })
  })

  // GET /:id/go — register click, return affiliate URL (backend decides redirect)
  fastify.get<{ Params: { id: string } }>('/:id/go', async (request, reply) => {
    const product = await fastify.prisma.product.findUnique({
      where: { id: request.params.id, active: true },
      select: { id: true, affiliateUrl: true },
    })
    if (!product) return reply.status(404).send({ error: 'Not found' })
    if (!product.affiliateUrl) return reply.status(422).send({ error: 'No affiliate URL' })

    await fastify.prisma.productClick.create({
      data: { productId: product.id, userId: request.userId },
    })
    reply.send({ url: product.affiliateUrl })
  })

  // POST /:id/wishlist — toggle wishlist for affiliate product
  fastify.post<{ Params: { id: string } }>('/:id/wishlist', async (request, reply) => {
    const product = await fastify.prisma.product.findUnique({
      where: { id: request.params.id, active: true },
      select: { id: true },
    })
    if (!product) return reply.status(404).send({ error: 'Not found' })

    const existing = await fastify.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: request.userId, productId: product.id } },
    })
    if (existing) {
      await fastify.prisma.wishlistItem.delete({ where: { id: existing.id } })
      reply.send({ inWishlist: false })
    } else {
      await fastify.prisma.wishlistItem.create({
        data: { userId: request.userId, productId: product.id },
      })
      reply.send({ inWishlist: true })
    }
  })

  // GET /:id/reviews — paginated reviews list
  fastify.get<{
    Params: { id: string }
    Querystring: { page?: string; limit?: string }
  }>('/:id/reviews', async (request, reply) => {
    const page = Math.max(1, Number(request.query.page ?? 1))
    const limit = Math.min(Number(request.query.limit ?? 20), 50)
    const skip = (page - 1) * limit

    const [items, total, aggregate, distribution] = await Promise.all([
      fastify.prisma.review.findMany({
        where: { productId: request.params.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      fastify.prisma.review.count({ where: { productId: request.params.id } }),
      fastify.prisma.review.aggregate({
        where: { productId: request.params.id },
        _avg: { rating: true },
      }),
      fastify.prisma.review.groupBy({
        by: ['rating'],
        where: { productId: request.params.id },
        _count: { rating: true },
      }),
    ])

    const dist = Object.fromEntries(
      [1, 2, 3, 4, 5].map((r) => [r, distribution.find((d) => d.rating === r)?._count.rating ?? 0])
    )

    reply.send({ items, total, average: aggregate._avg.rating ?? 0, distribution: dist })
  })

  // POST /:id/reviews — upsert review for affiliate product
  fastify.post<{
    Params: { id: string }
    Body: { rating: number; text?: string }
  }>('/:id/reviews', async (request, reply) => {
    const { rating, text } = request.body
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return reply.status(422).send({ error: 'rating must be 1–5' })
    }
    const product = await fastify.prisma.product.findUnique({
      where: { id: request.params.id },
      select: { id: true },
    })
    if (!product) return reply.status(404).send({ error: 'Not found' })

    const hasClick = await fastify.prisma.productClick.findFirst({
      where: { productId: product.id, userId: request.userId },
      select: { id: true },
    })

    const review = await fastify.prisma.review.upsert({
      where: { userId_productId: { userId: request.userId, productId: product.id } },
      update: { rating, text: text ?? null, verifiedPurchase: !!hasClick },
      create: {
        rating,
        text: text ?? null,
        verifiedPurchase: !!hasClick,
        userId: request.userId,
        productId: product.id,
      },
    })
    reply.status(201).send(review)
  })
```

- [ ] **Step 2: Remover a mutação de click direto no ShoppingScreen (a ser feita no Plano 2)**

Nada a fazer aqui — o `/products/:id/click` ainda existe e funciona. O Plano 2 vai trocar a chamada do frontend para usar `/:id/go`.

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/products-public.ts
git commit -m "feat(products): add GET /:id, GET /:id/go, POST /:id/wishlist, GET|POST /:id/reviews"
```

---

### Task 5: Criar own-products.ts — produtos próprios públicos

**Files:**
- Create: `server/src/routes/own-products.ts`

- [ ] **Step 1: Criar o arquivo completo**

```typescript
// server/src/routes/own-products.ts
import type { FastifyInstance } from 'fastify'

export default async function ownProductsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET / — list own products (cursor paginated)
  fastify.get<{
    Querystring: { categoryId?: string; phase?: string; featured?: string; limit?: string; cursor?: string }
  }>('/', async (request, reply) => {
    const limit = Math.min(Number(request.query.limit ?? 20), 50)
    const where = {
      active: true,
      ...(request.query.categoryId ? { categoryId: request.query.categoryId } : {}),
      ...(request.query.featured === 'true' ? { featured: true } : {}),
    }
    const rows = await fastify.prisma.ownProduct.findMany({
      where,
      take: limit + 1,
      ...(request.query.cursor ? { cursor: { id: request.query.cursor }, skip: 1 } : {}),
      include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    })
    const hasMore = rows.length > limit
    const items = rows.slice(0, limit).map((p) => ({ ...p, type: 'own' as const }))
    const nextCursor = items.length > 0 ? items[items.length - 1].id : undefined
    reply.send({ items, hasMore, nextCursor })
  })

  // GET /:id — detail with reviewsSummary, 3 reviews, inWishlist, related
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const product = await fastify.prisma.ownProduct.findUnique({
      where: { id: request.params.id, active: true },
      include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
    })
    if (!product) return reply.status(404).send({ error: 'Not found' })

    const userId = request.userId

    const [reviews, aggregate, inWishlistRow, related, distribution] = await Promise.all([
      fastify.prisma.review.findMany({
        where: { ownProductId: product.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      fastify.prisma.review.aggregate({
        where: { ownProductId: product.id },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      fastify.prisma.wishlistItem.findUnique({
        where: { userId_ownProductId: { userId, ownProductId: product.id } },
        select: { id: true },
      }),
      fastify.prisma.ownProduct.findMany({
        where: { categoryId: product.categoryId, active: true, id: { not: product.id } },
        take: 10,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
      }),
      fastify.prisma.review.groupBy({
        by: ['rating'],
        where: { ownProductId: product.id },
        _count: { rating: true },
      }),
    ])

    const dist = Object.fromEntries(
      [1, 2, 3, 4, 5].map((r) => [r, distribution.find((d) => d.rating === r)?._count.rating ?? 0])
    )

    reply.send({
      ...product,
      type: 'own',
      reviewsSummary: {
        average: aggregate._avg.rating ?? 0,
        count: aggregate._count.rating,
        distribution: dist,
      },
      reviews,
      inWishlist: !!inWishlistRow,
      related: related.map((p) => ({ ...p, type: 'own' as const })),
    })
  })

  // POST /:id/wishlist — toggle wishlist for own product
  fastify.post<{ Params: { id: string } }>('/:id/wishlist', async (request, reply) => {
    const product = await fastify.prisma.ownProduct.findUnique({
      where: { id: request.params.id },
      select: { id: true },
    })
    if (!product) return reply.status(404).send({ error: 'Not found' })

    const existing = await fastify.prisma.wishlistItem.findUnique({
      where: { userId_ownProductId: { userId: request.userId, ownProductId: product.id } },
    })
    if (existing) {
      await fastify.prisma.wishlistItem.delete({ where: { id: existing.id } })
      reply.send({ inWishlist: false })
    } else {
      await fastify.prisma.wishlistItem.create({
        data: { userId: request.userId, ownProductId: product.id },
      })
      reply.send({ inWishlist: true })
    }
  })

  // GET /:id/reviews — paginated reviews
  fastify.get<{
    Params: { id: string }
    Querystring: { page?: string; limit?: string }
  }>('/:id/reviews', async (request, reply) => {
    const page = Math.max(1, Number(request.query.page ?? 1))
    const limit = Math.min(Number(request.query.limit ?? 20), 50)
    const skip = (page - 1) * limit

    const [items, total, aggregate, distribution] = await Promise.all([
      fastify.prisma.review.findMany({
        where: { ownProductId: request.params.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      fastify.prisma.review.count({ where: { ownProductId: request.params.id } }),
      fastify.prisma.review.aggregate({
        where: { ownProductId: request.params.id },
        _avg: { rating: true },
      }),
      fastify.prisma.review.groupBy({
        by: ['rating'],
        where: { ownProductId: request.params.id },
        _count: { rating: true },
      }),
    ])

    const dist = Object.fromEntries(
      [1, 2, 3, 4, 5].map((r) => [r, distribution.find((d) => d.rating === r)?._count.rating ?? 0])
    )

    reply.send({ items, total, average: aggregate._avg.rating ?? 0, distribution: dist })
  })

  // POST /:id/reviews — upsert review for own product
  fastify.post<{
    Params: { id: string }
    Body: { rating: number; text?: string }
  }>('/:id/reviews', async (request, reply) => {
    const { rating, text } = request.body
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return reply.status(422).send({ error: 'rating must be 1–5' })
    }

    const product = await fastify.prisma.ownProduct.findUnique({
      where: { id: request.params.id },
      select: { id: true },
    })
    if (!product) return reply.status(404).send({ error: 'Not found' })

    const hasOrder = await fastify.prisma.orderItem.findFirst({
      where: { ownProductId: product.id, order: { userId: request.userId, status: 'DELIVERED' } },
      select: { id: true },
    })

    const review = await fastify.prisma.review.upsert({
      where: { userId_ownProductId: { userId: request.userId, ownProductId: product.id } },
      update: { rating, text: text ?? null, verifiedPurchase: !!hasOrder },
      create: {
        rating,
        text: text ?? null,
        verifiedPurchase: !!hasOrder,
        userId: request.userId,
        ownProductId: product.id,
      },
    })
    reply.status(201).send(review)
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/own-products.ts
git commit -m "feat(own-products): public routes — list, detail, wishlist, reviews"
```

---

### Task 6: Criar wishlist.ts — wishlist unificada

**Files:**
- Create: `server/src/routes/wishlist.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// server/src/routes/wishlist.ts
import type { FastifyInstance } from 'fastify'

export default async function wishlistRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET / — unified wishlist (affiliate + own)
  fastify.get('/', async (request, reply) => {
    const items = await fastify.prisma.wishlistItem.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
        },
        ownProduct: {
          include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
        },
      },
    })

    const result = items.map((item) => ({
      type: item.productId ? ('affiliate' as const) : ('own' as const),
      product: item.productId ? item.product : item.ownProduct,
      savedAt: item.createdAt,
    }))

    reply.send({ items: result })
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/wishlist.ts
git commit -m "feat(wishlist): unified wishlist route GET /wishlist"
```

---

### Task 7: Criar cart.ts — carrinho de compras

**Files:**
- Create: `server/src/routes/cart.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// server/src/routes/cart.ts
import type { FastifyInstance } from 'fastify'

// Tabela de frete por estado (R$ e dias úteis)
const SHIPPING_TABLE: Record<string, { fee: number; days: number }> = {
  SP: { fee: 15.9,  days: 3 },
  RJ: { fee: 18.9,  days: 4 },
  MG: { fee: 18.9,  days: 4 },
  ES: { fee: 21.9,  days: 5 },
  PR: { fee: 18.9,  days: 4 },
  SC: { fee: 21.9,  days: 5 },
  RS: { fee: 21.9,  days: 5 },
  DF: { fee: 23.9,  days: 5 },
  GO: { fee: 23.9,  days: 6 },
  MT: { fee: 25.9,  days: 7 },
  MS: { fee: 25.9,  days: 7 },
  BA: { fee: 25.9,  days: 7 },
  PE: { fee: 27.9,  days: 8 },
  CE: { fee: 27.9,  days: 8 },
  MA: { fee: 29.9,  days: 9 },
  PA: { fee: 29.9,  days: 9 },
  AM: { fee: 35.9,  days: 12 },
}
const DEFAULT_SHIPPING = { fee: 29.9, days: 10 }

function getShipping(state: string) {
  return SHIPPING_TABLE[state.toUpperCase()] ?? DEFAULT_SHIPPING
}

async function buildCartResponse(fastify: FastifyInstance, userId: string) {
  const items = await fastify.prisma.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      ownProduct: {
        include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
      },
    },
  })
  const subtotal = items.reduce(
    (acc, item) => acc + Number(item.ownProduct.price) * item.quantity,
    0
  )
  return {
    items: items.map((i) => ({ ...i, ownProduct: { ...i.ownProduct, type: 'own' as const } })),
    subtotal: subtotal.toFixed(2),
    itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
  }
}

export default async function cartRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET / — cart with items and subtotal
  fastify.get('/', async (request, reply) => {
    reply.send(await buildCartResponse(fastify, request.userId))
  })

  // POST / — add item (upsert: increment if already exists)
  fastify.post<{ Body: { ownProductId: string; quantity: number } }>(
    '/',
    async (request, reply) => {
      const { ownProductId, quantity } = request.body
      if (!quantity || quantity < 1) return reply.status(422).send({ error: 'quantity must be ≥ 1' })

      const product = await fastify.prisma.ownProduct.findUnique({
        where: { id: ownProductId, active: true },
        select: { id: true, stock: true },
      })
      if (!product) return reply.status(404).send({ error: 'Product not found' })

      const existing = await fastify.prisma.cartItem.findUnique({
        where: { userId_ownProductId: { userId: request.userId, ownProductId } },
      })

      const newQty = Math.min((existing?.quantity ?? 0) + quantity, product.stock)
      if (newQty < 1) return reply.status(422).send({ error: 'Out of stock' })

      await fastify.prisma.cartItem.upsert({
        where: { userId_ownProductId: { userId: request.userId, ownProductId } },
        update: { quantity: newQty },
        create: { userId: request.userId, ownProductId, quantity },
      })

      reply.status(201).send(await buildCartResponse(fastify, request.userId))
    }
  )

  // PUT /:itemId — update quantity (quantity=0 removes the item)
  fastify.put<{ Params: { itemId: string }; Body: { quantity: number } }>(
    '/:itemId',
    async (request, reply) => {
      const { quantity } = request.body
      const item = await fastify.prisma.cartItem.findUnique({
        where: { id: request.params.itemId, userId: request.userId },
        include: { ownProduct: { select: { stock: true } } },
      })
      if (!item) return reply.status(404).send({ error: 'Not found' })

      if (quantity <= 0) {
        await fastify.prisma.cartItem.delete({ where: { id: item.id } })
      } else {
        const safeQty = Math.min(quantity, item.ownProduct.stock)
        await fastify.prisma.cartItem.update({ where: { id: item.id }, data: { quantity: safeQty } })
      }
      reply.send(await buildCartResponse(fastify, request.userId))
    }
  )

  // DELETE /:itemId — remove item
  fastify.delete<{ Params: { itemId: string } }>('/:itemId', async (request, reply) => {
    await fastify.prisma.cartItem.deleteMany({
      where: { id: request.params.itemId, userId: request.userId },
    })
    reply.send(await buildCartResponse(fastify, request.userId))
  })

  // POST /shipping — calculate shipping fee by addressId
  fastify.post<{ Body: { addressId: string } }>('/shipping', async (request, reply) => {
    const address = await fastify.prisma.address.findUnique({
      where: { id: request.body.addressId, userId: request.userId },
      select: { state: true },
    })
    if (!address) return reply.status(404).send({ error: 'Address not found' })
    const { fee, days } = getShipping(address.state)
    reply.send({ fee: fee.toFixed(2), estimatedDays: days })
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/cart.ts
git commit -m "feat(cart): GET, POST, PUT/:itemId, DELETE/:itemId, POST/shipping"
```

---

### Task 8: Criar addresses.ts — endereços de entrega

**Files:**
- Create: `server/src/routes/addresses.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// server/src/routes/addresses.ts
import type { FastifyInstance } from 'fastify'

export default async function addressesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET / — list user's addresses
  fastify.get('/', async (request, reply) => {
    const addresses = await fastify.prisma.address.findMany({
      where: { userId: request.userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })
    reply.send(addresses)
  })

  // POST / — create address
  fastify.post<{
    Body: {
      recipientName: string
      street: string
      number: string
      complement?: string
      neighborhood: string
      city: string
      state: string
      zipCode: string
      isDefault?: boolean
    }
  }>('/', async (request, reply) => {
    const { recipientName, street, number, complement, neighborhood, city, state, zipCode, isDefault } = request.body

    if (isDefault) {
      await fastify.prisma.address.updateMany({
        where: { userId: request.userId },
        data: { isDefault: false },
      })
    }

    const count = await fastify.prisma.address.count({ where: { userId: request.userId } })
    const address = await fastify.prisma.address.create({
      data: {
        userId: request.userId,
        recipientName,
        street,
        number,
        complement: complement ?? null,
        neighborhood,
        city,
        state: state.toUpperCase().slice(0, 2),
        zipCode: zipCode.replace(/\D/g, '').slice(0, 8),
        isDefault: isDefault ?? count === 0,
      },
    })
    reply.status(201).send(address)
  })

  // PUT /:id — update address
  fastify.put<{
    Params: { id: string }
    Body: {
      recipientName?: string
      street?: string
      number?: string
      complement?: string
      neighborhood?: string
      city?: string
      state?: string
      zipCode?: string
    }
  }>('/:id', async (request, reply) => {
    const address = await fastify.prisma.address.findUnique({
      where: { id: request.params.id, userId: request.userId },
    })
    if (!address) return reply.status(404).send({ error: 'Not found' })

    const { state, zipCode, ...rest } = request.body
    const updated = await fastify.prisma.address.update({
      where: { id: address.id },
      data: {
        ...rest,
        ...(state ? { state: state.toUpperCase().slice(0, 2) } : {}),
        ...(zipCode ? { zipCode: zipCode.replace(/\D/g, '').slice(0, 8) } : {}),
      },
    })
    reply.send(updated)
  })

  // DELETE /:id — delete address
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await fastify.prisma.address.deleteMany({
      where: { id: request.params.id, userId: request.userId },
    })
    reply.status(204).send()
  })

  // PUT /:id/default — set as default address
  fastify.put<{ Params: { id: string } }>('/:id/default', async (request, reply) => {
    const address = await fastify.prisma.address.findUnique({
      where: { id: request.params.id, userId: request.userId },
      select: { id: true },
    })
    if (!address) return reply.status(404).send({ error: 'Not found' })

    await fastify.prisma.address.updateMany({
      where: { userId: request.userId },
      data: { isDefault: false },
    })
    const updated = await fastify.prisma.address.update({
      where: { id: address.id },
      data: { isDefault: true },
    })
    reply.send(updated)
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/addresses.ts
git commit -m "feat(addresses): CRUD + set default address"
```

---

### Task 9: Criar orders.ts — pedidos + Mercado Pago + webhook

**Files:**
- Create: `server/src/routes/orders.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// server/src/routes/orders.ts
import type { FastifyInstance } from 'fastify'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { sendPush } from '../plugins/fcm'
import crypto from 'crypto'

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN ?? '',
})
const mpPayment = new Payment(mpClient)

const PUSH_MESSAGES: Record<string, { title: string; body: string }> = {
  PAID:      { title: 'Pedido pago! 🎉', body: 'Seu pedido foi confirmado e está sendo preparado.' },
  PREPARING: { title: 'Pedido em preparação 📦', body: 'Estamos separando os seus itens.' },
  SHIPPED:   { title: 'Pedido enviado 🚚', body: 'Seu pedido está a caminho!' },
  DELIVERED: { title: 'Pedido entregue ✅', body: 'Seu pedido foi entregue. Aproveite!' },
}

const VALID_ORDER_STATUSES = ['PENDING', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const

export default async function ordersRoutes(fastify: FastifyInstance) {
  // POST / — create order + Mercado Pago [AUTH REQUIRED]
  fastify.post<{
    Body: {
      addressId: string
      paymentMethod: 'pix' | 'credit_card'
      cardToken?: string
      paymentMethodId?: string
      installments?: number
    }
  }>('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { addressId, paymentMethod, cardToken, paymentMethodId, installments } = request.body

    const [address, cartItems, user] = await Promise.all([
      fastify.prisma.address.findUnique({
        where: { id: addressId, userId: request.userId },
        select: { id: true, state: true },
      }),
      fastify.prisma.cartItem.findMany({
        where: { userId: request.userId },
        include: { ownProduct: { select: { id: true, name: true, price: true, stock: true } } },
      }),
      fastify.prisma.user.findUnique({
        where: { id: request.userId },
        select: { email: true, name: true },
      }),
    ])

    if (!address) return reply.status(404).send({ error: 'Address not found' })
    if (!cartItems.length) return reply.status(422).send({ error: 'Cart is empty' })
    if (!user) return reply.status(404).send({ error: 'User not found' })

    // Check stock
    for (const item of cartItems) {
      if (item.ownProduct.stock < item.quantity) {
        return reply.status(422).send({ error: `Produto "${item.ownProduct.name}" sem estoque suficiente` })
      }
    }

    // Calculate totals
    const SHIPPING_FEES: Record<string, number> = {
      SP: 15.9, RJ: 18.9, MG: 18.9, ES: 21.9, PR: 18.9, SC: 21.9, RS: 21.9,
      DF: 23.9, GO: 23.9, MT: 25.9, MS: 25.9, BA: 25.9, PE: 27.9, CE: 27.9,
      MA: 29.9, PA: 29.9, AM: 35.9,
    }
    const shippingFee = SHIPPING_FEES[address.state.toUpperCase()] ?? 29.9
    const subtotal = cartItems.reduce(
      (acc, item) => acc + Number(item.ownProduct.price) * item.quantity,
      0
    )
    const total = Math.round((subtotal + shippingFee) * 100) / 100

    // Create order (PENDING)
    const order = await fastify.prisma.order.create({
      data: {
        userId: request.userId,
        status: 'PENDING',
        total,
        shippingFee,
        addressId,
        items: {
          create: cartItems.map((item) => ({
            ownProductId: item.ownProductId,
            quantity: item.quantity,
            priceAtPurchase: item.ownProduct.price,
          })),
        },
      },
    })

    // Process payment with Mercado Pago
    try {
      if (paymentMethod === 'pix') {
        const mpResult = await mpPayment.create({
          body: {
            transaction_amount: total,
            description: `Pedido #MT-${order.id.slice(-6).toUpperCase()}`,
            payment_method_id: 'pix',
            payer: { email: user.email },
          },
        })

        const pixQrCode = mpResult.point_of_interaction?.transaction_data?.qr_code_base64 ?? null
        const pixCode = mpResult.point_of_interaction?.transaction_data?.qr_code ?? null

        await fastify.prisma.order.update({
          where: { id: order.id },
          data: {
            mercadoPagoPaymentId: String(mpResult.id),
            mercadoPagoPixQrCode: pixQrCode,
            mercadoPagoPixCode: pixCode,
          },
        })

        return reply.status(201).send({
          orderId: order.id,
          status: 'pending',
          pixQrCode,
          pixCode,
        })
      }

      // Credit card
      if (!cardToken || !paymentMethodId) {
        return reply.status(422).send({ error: 'cardToken and paymentMethodId required for credit_card' })
      }

      const mpResult = await mpPayment.create({
        body: {
          transaction_amount: total,
          description: `Pedido #MT-${order.id.slice(-6).toUpperCase()}`,
          payment_method_id: paymentMethodId,
          installments: installments ?? 1,
          token: cardToken,
          payer: { email: user.email },
        },
      })

      const paid = mpResult.status === 'approved'
      await fastify.prisma.order.update({
        where: { id: order.id },
        data: {
          mercadoPagoPaymentId: String(mpResult.id),
          status: paid ? 'PAID' : 'CANCELLED',
        },
      })

      if (paid) {
        // Decrement stock
        for (const item of cartItems) {
          await fastify.prisma.ownProduct.update({
            where: { id: item.ownProductId },
            data: { stock: { decrement: item.quantity } },
          })
        }
        await fastify.prisma.cartItem.deleteMany({ where: { userId: request.userId } })
      }

      return reply.status(201).send({
        orderId: order.id,
        status: mpResult.status,
        statusDetail: mpResult.status_detail,
      })
    } catch (err) {
      // Payment failed — cancel order
      await fastify.prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      })
      fastify.log.error(err)
      return reply.status(502).send({ error: 'Payment processing failed' })
    }
  })

  // GET / — list user's orders [AUTH REQUIRED]
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const orders = await fastify.prisma.order.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          take: 2,
          include: { ownProduct: { select: { id: true, name: true, images: true } } },
        },
      },
    })
    reply.send(orders)
  })

  // GET /:id — order detail [AUTH REQUIRED]
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const order = await fastify.prisma.order.findUnique({
        where: { id: request.params.id, userId: request.userId },
        include: {
          address: true,
          items: {
            include: { ownProduct: { select: { id: true, name: true, images: true, price: true } } },
          },
        },
      })
      if (!order) return reply.status(404).send({ error: 'Not found' })
      reply.send(order)
    }
  )

  // POST /webhook — Mercado Pago webhook [PUBLIC — validated by signature]
  fastify.post<{
    Headers: { 'x-signature'?: string; 'x-request-id'?: string }
    Body: { type: string; data: { id: string } }
  }>('/webhook', async (request, reply) => {
    // Validate MP signature
    const xSignature = request.headers['x-signature']
    const xRequestId = request.headers['x-request-id']
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET
    if (secret && xSignature && xRequestId) {
      const dataId = request.body?.data?.id
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${xSignature.split(',').find((p) => p.startsWith('ts='))?.split('=')[1] ?? ''};`
      const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
      const v1 = xSignature.split(',').find((p) => p.startsWith('v1='))?.split('=')[1]
      if (hmac !== v1) {
        return reply.status(401).send({ error: 'Invalid signature' })
      }
    }

    if (request.body.type !== 'payment') return reply.status(200).send({ ok: true })

    const paymentId = String(request.body.data.id)
    const mpResult = await mpPayment.get({ id: Number(paymentId) })
    if (!mpResult) return reply.status(200).send({ ok: true })

    const order = await fastify.prisma.order.findFirst({
      where: { mercadoPagoPaymentId: paymentId },
      include: { user: { select: { fcmToken: true } } },
    })
    if (!order) return reply.status(200).send({ ok: true })

    let newStatus: string | null = null
    if (mpResult.status === 'approved' && order.status === 'PENDING') {
      newStatus = 'PAID'
    } else if (mpResult.status === 'cancelled') {
      newStatus = 'CANCELLED'
    }

    if (newStatus) {
      await fastify.prisma.order.update({
        where: { id: order.id },
        data: { status: newStatus },
      })

      if (newStatus === 'PAID') {
        // Decrement stock + clear cart
        const items = await fastify.prisma.orderItem.findMany({
          where: { orderId: order.id },
        })
        for (const item of items) {
          await fastify.prisma.ownProduct.update({
            where: { id: item.ownProductId },
            data: { stock: { decrement: item.quantity } },
          })
        }
        await fastify.prisma.cartItem.deleteMany({ where: { userId: order.userId } })
      }

      const msg = PUSH_MESSAGES[newStatus]
      if (msg && order.user.fcmToken) {
        await sendPush(order.user.fcmToken, msg.title, msg.body)
      }
    }

    reply.status(200).send({ ok: true })
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/orders.ts
git commit -m "feat(orders): create order, list, detail, MP webhook with PIX + credit card"
```

---

### Task 10: Criar admin/own-products.ts

**Files:**
- Create: `server/src/routes/admin/own-products.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// server/src/routes/admin/own-products.ts
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

export default fp(async function adminOwnProductsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', async (request, reply) => {
    const allowed = ['ADMIN', 'EDITOR']
    if (!allowed.includes((request as any).userRole ?? '')) {
      return reply.status(403).send({ error: 'Forbidden' })
    }
  })

  // GET / — list own products (admin, all)
  fastify.get<{ Querystring: { page?: string; limit?: string; search?: string } }>(
    '/',
    async (request, reply) => {
      const page = Math.max(1, Number(request.query.page ?? 1))
      const limit = Math.min(Number(request.query.limit ?? 20), 100)
      const skip = (page - 1) * limit
      const search = request.query.search?.trim()

      const where = search ? { name: { contains: search } } : {}

      const [items, total] = await Promise.all([
        fastify.prisma.ownProduct.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { category: { select: { id: true, name: true, slug: true } } },
        }),
        fastify.prisma.ownProduct.count({ where }),
      ])

      reply.send({ items, total, page, limit, totalPages: Math.ceil(total / limit) })
    }
  )

  // POST / — create own product
  fastify.post<{
    Body: {
      name: string
      description: string
      price: number
      images?: string[]
      stock?: number
      sku?: string
      featured?: boolean
      active?: boolean
      categoryId: string
    }
  }>('/', async (request, reply) => {
    const { name, description, price, images, stock, sku, featured, active, categoryId } = request.body
    const product = await fastify.prisma.ownProduct.create({
      data: {
        name,
        description,
        price: Math.round(price * 100) / 100,
        images: images ?? [],
        stock: stock ?? 0,
        sku: sku ?? null,
        featured: featured ?? false,
        active: active ?? true,
        categoryId,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    })
    reply.status(201).send(product)
  })

  // PUT /:id — update own product
  fastify.put<{
    Params: { id: string }
    Body: {
      name?: string
      description?: string
      price?: number
      images?: string[]
      stock?: number
      sku?: string
      featured?: boolean
      active?: boolean
      categoryId?: string
    }
  }>('/:id', async (request, reply) => {
    const { price, ...rest } = request.body
    const product = await fastify.prisma.ownProduct.update({
      where: { id: request.params.id },
      data: {
        ...rest,
        ...(price !== undefined ? { price: Math.round(price * 100) / 100 } : {}),
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    })
    reply.send(product)
  })

  // DELETE /:id — delete own product
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await fastify.prisma.ownProduct.delete({ where: { id: request.params.id } })
    reply.status(204).send()
  })
})
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/admin/own-products.ts
git commit -m "feat(admin): own-products CRUD routes"
```

---

### Task 11: Criar admin/orders.ts

**Files:**
- Create: `server/src/routes/admin/orders.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// server/src/routes/admin/orders.ts
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { sendPush } from '../../plugins/fcm'

const VALID_ORDER_STATUSES = ['PENDING', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const
const PUSH_MESSAGES: Record<string, { title: string; body: string }> = {
  PAID:      { title: 'Pedido pago! 🎉', body: 'Seu pedido foi confirmado e está sendo preparado.' },
  PREPARING: { title: 'Pedido em preparação 📦', body: 'Estamos separando os seus itens.' },
  SHIPPED:   { title: 'Pedido enviado 🚚', body: 'Seu pedido está a caminho!' },
  DELIVERED: { title: 'Pedido entregue ✅', body: 'Seu pedido foi entregue. Aproveite!' },
}

export default fp(async function adminOrdersRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', async (request, reply) => {
    const allowed = ['ADMIN', 'EDITOR']
    if (!allowed.includes((request as any).userRole ?? '')) {
      return reply.status(403).send({ error: 'Forbidden' })
    }
  })

  // GET / — list all orders with optional status filter
  fastify.get<{ Querystring: { status?: string; page?: string; limit?: string } }>(
    '/',
    async (request, reply) => {
      const page = Math.max(1, Number(request.query.page ?? 1))
      const limit = Math.min(Number(request.query.limit ?? 20), 100)
      const skip = (page - 1) * limit
      const where = request.query.status ? { status: request.query.status } : {}

      const [items, total] = await Promise.all([
        fastify.prisma.order.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            address: { select: { city: true, state: true } },
            items: {
              take: 2,
              include: { ownProduct: { select: { id: true, name: true } } },
            },
          },
        }),
        fastify.prisma.order.count({ where }),
      ])

      reply.send({ items, total, page, limit, totalPages: Math.ceil(total / limit) })
    }
  )

  // PUT /:id/status — update order status + fire push notification
  fastify.put<{ Params: { id: string }; Body: { status: string; trackingCode?: string } }>(
    '/:id/status',
    async (request, reply) => {
      const { status, trackingCode } = request.body
      if (!(VALID_ORDER_STATUSES as readonly string[]).includes(status)) {
        return reply.status(422).send({ error: `Invalid status. Valid: ${VALID_ORDER_STATUSES.join(', ')}` })
      }

      const order = await fastify.prisma.order.update({
        where: { id: request.params.id },
        data: {
          status,
          ...(trackingCode ? { trackingCode } : {}),
        },
        include: { user: { select: { fcmToken: true } } },
      })

      const msg = PUSH_MESSAGES[status]
      if (msg && order.user.fcmToken) {
        await sendPush(order.user.fcmToken, msg.title, msg.body)
      }

      reply.send(order)
    }
  )
})
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/admin/orders.ts
git commit -m "feat(admin): orders list + status update with push notification"
```

---

### Task 12: Adicionar rota FCM token para o usuário + registrar todas as rotas no index.ts

**Files:**
- Modify: `server/src/routes/users.ts` (adicionar PUT /users/fcm-token)
- Modify: `server/src/index.ts`

- [ ] **Step 1: Adicionar `PUT /fcm-token` no arquivo users.ts**

Abrir `server/src/routes/users.ts` e adicionar ao final da função (antes do fechamento):

```typescript
  // PUT /fcm-token — register FCM token for push notifications
  fastify.put<{ Body: { token: string; platform: 'android' | 'ios' } }>(
    '/fcm-token',
    async (request, reply) => {
      const { token } = request.body
      if (!token) return reply.status(422).send({ error: 'token required' })
      await fastify.prisma.user.update({
        where: { id: request.userId },
        data: { fcmToken: token },
      })
      reply.status(204).send()
    }
  )
```

- [ ] **Step 2: Registrar as novas rotas no index.ts**

Adicionar os imports no topo de `server/src/index.ts`:

```typescript
import ownProductsRoutes from './routes/own-products'
import wishlistRoutes from './routes/wishlist'
import cartRoutes from './routes/cart'
import addressesRoutes from './routes/addresses'
import ordersRoutes from './routes/orders'
import adminOwnProductsRoutes from './routes/admin/own-products'
import adminOrdersRoutes from './routes/admin/orders'
```

Adicionar os registros após `await fastify.register(publicProductsRoutes, { prefix: '/products' })`:

```typescript
await fastify.register(ownProductsRoutes, { prefix: '/own-products' })
await fastify.register(wishlistRoutes, { prefix: '/wishlist' })
await fastify.register(cartRoutes, { prefix: '/cart' })
await fastify.register(addressesRoutes, { prefix: '/addresses' })
await fastify.register(ordersRoutes, { prefix: '/orders' })
await fastify.register(adminOwnProductsRoutes, { prefix: '/admin/own-products' })
await fastify.register(adminOrdersRoutes, { prefix: '/admin/orders' })
```

- [ ] **Step 3: Verificar que o servidor inicia sem erros**

```bash
cd server
npm run dev
```

Esperado: `Server listening at http://0.0.0.0:3001` sem erros de TypeScript.

- [ ] **Step 4: Testar rotas básicas com curl**

```bash
# Health check
curl http://localhost:3001/health

# Tentar acessar /own-products sem auth (deve retornar 401)
curl http://localhost:3001/own-products
```

Esperado: `{"status":"ok"}` e `{"error":"Unauthorized"}` (ou similar).

- [ ] **Step 5: Commit final**

```bash
git add server/src/routes/users.ts server/src/index.ts
git commit -m "feat(server): register all shopping routes — own-products, wishlist, cart, addresses, orders, admin"
```

---

### Task 13: Variáveis de ambiente necessárias

**Files:** Nenhum arquivo de código — apenas documentação do que configurar no VPS.

- [ ] **Step 1: Adicionar as env vars no VPS**

No VPS, editar o arquivo de env:
```bash
ssh -p 443 root@2.25.137.78
nano /opt/mothersteam/server/.env
```

Adicionar:
```
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxx...
MERCADO_PAGO_WEBHOOK_SECRET=seu-secret-aleatorio

FIREBASE_PROJECT_ID=mothers-team-xxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@mothers-team-xxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXX\n-----END PRIVATE KEY-----\n"
```

> **Como obter:** Mercado Pago → Credenciais. Firebase → Configurações do Projeto → Contas de serviço → Gerar nova chave privada.

- [ ] **Step 2: Recriar o container com as novas variáveis**

```bash
cd /opt/mothersteam
docker compose -f docker-compose.prod.yml up -d --no-deps api
```

- [ ] **Step 3: Verificar logs**

```bash
docker compose -f docker-compose.prod.yml logs api --tail=50
```

Esperado: servidor iniciado sem erros, `[fcm]` warning apenas se as vars não estiverem configuradas.
