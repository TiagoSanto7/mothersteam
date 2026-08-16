# F+C+B: Sara voz / Parcelamento real / @menção em comentários

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Três correções independentes: ativar voz de Sara no onboarding (env var), exibir taxas reais de parcelamento do MP, e notificar usuários mencionados em comentários.

**Architecture:** F é configuração pura. C adiciona `GET /orders/installments` que proxia a API do MP e atualiza o `<select>` de parcelamento no frontend. B adiciona mention-extraction no handler `POST /:id/comments` de `posts.ts`, replicando a lógica já presente na criação de posts.

**Tech Stack:** Fastify, Prisma, Vitest (testes de integração com DB real), React Query v5, TypeScript.

---

## Sub-projeto F — VITE_ELEVENLABS_AGENT_ID

### Task F1: Adicionar env var no .env local + redeploy

**Files:**
- Modify: `.env`
- Rebuild + redeploy frontend

- [ ] **Step 1: Adicionar a variável ao .env local**

No arquivo `.env`, adicionar logo abaixo da linha `ELEVENLABS_AGENT_ID=...`:

```
VITE_ELEVENLABS_AGENT_ID=agent_4301kxv5d1q3fsf85z1xb1sz90nt
```

O valor deve ser idêntico ao `ELEVENLABS_AGENT_ID` já presente no arquivo.

- [ ] **Step 2: Rebuild do frontend**

```bash
npm run build
```

Verificar saída: `✓ built in Xs` sem erros.

- [ ] **Step 3: Deploy do frontend no VPS**

```bash
cat dist.tar.gz | ... # usar pipe SSH conforme padrão estabelecido
# ou:
tar czf /tmp/f-dist.tar.gz -C dist . && cat /tmp/f-dist.tar.gz | ssh -p 443 root@2.25.137.78 "cat > /tmp/f-dist.tar.gz && tar xzf /tmp/f-dist.tar.gz -C /var/www/mothersteam/ && echo DONE"
```

- [ ] **Step 4: Commit**

```bash
git add .env
git commit -m "feat(sara): add VITE_ELEVENLABS_AGENT_ID so onboarding narration connects to agent"
```

---

## Sub-projeto C — Parcelamento com taxa real do MP

### Task C1: Adicionar tipo ApiInstallmentOption ao types.ts

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Adicionar interface ao final de `src/lib/types.ts`**

```ts
export interface ApiInstallmentOption {
  installments: number
  rate: number
  installmentAmount: number
  totalAmount: number
  label: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add ApiInstallmentOption for MP installments endpoint"
```

### Task C2: Backend — endpoint GET /orders/installments (TDD)

**Files:**
- Modify: `server/src/routes/orders.ts` (adicionar rota no final, antes do `}`)
- Create: `server/src/routes/orders.installments.test.ts`

- [ ] **Step 1: Escrever o teste (arquivo novo)**

Criar `server/src/routes/orders.installments.test.ts`:

```ts
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

describe('GET /orders/installments', () => {
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
```

- [ ] **Step 2: Rodar os testes — verificar que TODOS falham**

```bash
cd server && npx vitest run src/routes/orders.installments.test.ts 2>&1
```

Esperado: todos os testes falham com "Cannot find..." ou 404.

- [ ] **Step 3: Implementar o endpoint em `server/src/routes/orders.ts`**

Adicionar antes do último `}` que fecha `ordersRoutes`:

```ts
  // GET /installments — busca opções reais de parcelamento do MP [AUTH REQUIRED]
  fastify.get<{
    Querystring: { paymentMethodId?: string; amount?: string }
  }>('/installments', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { paymentMethodId, amount } = request.query
    if (!paymentMethodId || !amount) {
      return reply.status(400).send({ error: 'paymentMethodId and amount are required' })
    }
    const numAmount = Number(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return reply.status(400).send({ error: 'amount must be a positive number' })
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? ''
    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payment_methods/installments?payment_method_id=${encodeURIComponent(paymentMethodId)}&amount=${numAmount}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!mpRes.ok) {
      fastify.log.error({ status: mpRes.status }, 'MP installments API error')
      return reply.status(502).send({ error: 'Failed to fetch installment options' })
    }

    type MPInstallmentRow = {
      payer_costs?: Array<{
        installments: number
        installment_rate: number
        installment_amount: number
        total_amount: number
        recommended_message: string
      }>
    }
    const data = (await mpRes.json()) as MPInstallmentRow[]
    const payerCosts = data[0]?.payer_costs ?? []

    reply.send(payerCosts.map((pc) => ({
      installments: pc.installments,
      rate: pc.installment_rate,
      installmentAmount: pc.installment_amount,
      totalAmount: pc.total_amount,
      label: pc.recommended_message,
    })))
  })
```

- [ ] **Step 4: Rodar os testes — verificar que TODOS passam**

```bash
cd server && npx vitest run src/routes/orders.installments.test.ts 2>&1
```

Esperado: `6 passed`.

- [ ] **Step 5: TS check no servidor**

```bash
cd server && npx tsc --noEmit 2>&1
```

Esperado: sem erros.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/orders.ts server/src/routes/orders.installments.test.ts
git commit -m "feat(orders): GET /installments proxies MP payer_costs for real installment rates"
```

### Task C3: Frontend — usar taxas reais no CheckoutScreen

**Files:**
- Modify: `src/components/shopping/CheckoutScreen.tsx`

- [ ] **Step 1: Adicionar import do tipo e ajustar imports**

No topo de `CheckoutScreen.tsx`, adicionar `ApiInstallmentOption` ao import de types:

```ts
import type { ApiAddress, ApiCart, ApiOrder, ApiPaymentMethod, ApiInstallmentOption } from '../../lib/types'
```

- [ ] **Step 2: Substituir a query e o select dentro de `PaymentStep`**

Dentro de `PaymentStep`, logo após a query de `savedCards`:

```ts
  const detectedBrand = cardForm.number.replace(/\D/g, '').length >= 6
    ? detectPaymentMethodId(cardForm.number)
    : null

  const { data: installmentOptions, isFetching: installmentsFetching } = useQuery({
    queryKey: ['installments', detectedBrand, cart?.subtotal],
    queryFn: () =>
      apiFetch<ApiInstallmentOption[]>(
        `/orders/installments?paymentMethodId=${detectedBrand}&amount=${cart?.subtotal ?? '0'}`
      ),
    enabled: !!detectedBrand && savedCardId === 'new' && Number(cart?.subtotal ?? 0) > 0,
    staleTime: 60_000,
    placeholderData: [],
  })
```

- [ ] **Step 3: Substituir o bloco do select de parcelas**

Encontrar e substituir o bloco:

```tsx
          <div className="flex items-center gap-2">
            <label className="text-xs text-graphite-muted flex-shrink-0">Parcelar em:</label>
            <select
              className={`${inputClass} flex-1`}
              value={cardForm.installments}
              onChange={(e) => setCardForm((f) => ({ ...f, installments: Number(e.target.value) }))}
            >
              {[1, 2, 3, 6, 12].map((n) => (
                <option key={n} value={n}>
                  {n}x R$ {(subtotal / n).toFixed(2)} {n === 1 ? '(sem juros)' : ''}
                </option>
              ))}
            </select>
          </div>
```

Por:

```tsx
          <div className="flex items-center gap-2">
            <label className="text-xs text-graphite-muted flex-shrink-0">Parcelar em:</label>
            {installmentsFetching ? (
              <div className={`${inputClass} flex-1 flex items-center gap-2 text-graphite-muted`}>
                <Loader2 size={12} className="animate-spin" /> Calculando...
              </div>
            ) : (
              <select
                className={`${inputClass} flex-1`}
                value={cardForm.installments}
                onChange={(e) => setCardForm((f) => ({ ...f, installments: Number(e.target.value) }))}
              >
                {(installmentOptions && installmentOptions.length > 0
                  ? installmentOptions
                  : [{ installments: 1, rate: 0, installmentAmount: Number(cart?.subtotal ?? 0), totalAmount: Number(cart?.subtotal ?? 0), label: `1x R$ ${Number(cart?.subtotal ?? 0).toFixed(2)} sem juros` }]
                ).map((opt) => (
                  <option key={opt.installments} value={opt.installments}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>
```

- [ ] **Step 4: TS check no frontend**

```bash
npx tsc --noEmit 2>&1
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/components/shopping/CheckoutScreen.tsx
git commit -m "feat(checkout): use real MP installment rates instead of hardcoded division"
```

---

## Sub-projeto B — @menção em comentários

### Task B1: Testes para mention em comentários (TDD)

**Files:**
- Create: `server/src/routes/posts.comment-mention.test.ts`

- [ ] **Step 1: Escrever o arquivo de testes**

Criar `server/src/routes/posts.comment-mention.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'
import Fastify from 'fastify'
import postsRoutes from './posts'

const prisma = new PrismaClient()

async function makeApp(viewerId: string) {
  const app = Fastify()
  app.decorate('prisma', prisma)
  app.decorateRequest('userId', '')
  app.decorate('authenticate', async (req: any) => { req.userId = viewerId })
  await app.register(postsRoutes)
  return app
}

async function setupFixture() {
  const suffix = `${Date.now()}${Math.random().toString(36).slice(2)}`
  const postAuthor = await prisma.user.create({
    data: { email: `postauthor${suffix}@t.com`, passwordHash: 'x', name: 'Autora', pregnancyStage: 'pregnant' },
  })
  const commenter = await prisma.user.create({
    data: { email: `commenter${suffix}@t.com`, passwordHash: 'x', name: 'Comentarista', username: `comentarista${suffix}`, pregnancyStage: 'pregnant' },
  })
  const mentioned = await prisma.user.create({
    data: { email: `mentioned${suffix}@t.com`, passwordHash: 'x', name: 'Mencionada', username: `mencionada${suffix}`, pregnancyStage: 'pregnant' },
  })
  const post = await prisma.post.create({
    data: { content: 'post original', category: 'gestação', authorId: postAuthor.id },
  })
  return { postAuthor, commenter, mentioned, post, suffix }
}

async function cleanup(ids: string[]) {
  await prisma.notification.deleteMany({ where: { actorId: { in: ids } } })
  await prisma.notification.deleteMany({ where: { recipientId: { in: ids } } })
  await prisma.comment.deleteMany({ where: { authorId: { in: ids } } })
  await prisma.post.deleteMany({ where: { authorId: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
}

describe('POST /:id/comments — @menções', () => {
  it('cria notificação de mention para usuário mencionado no comentário', async () => {
    const { postAuthor, commenter, mentioned, post, suffix } = await setupFixture()
    const app = await makeApp(commenter.id)

    const res = await app.inject({
      method: 'POST',
      url: `/${post.id}/comments`,
      payload: { content: `Olha isso @mencionada${suffix}!` },
    })

    expect(res.statusCode).toBe(201)

    const notif = await prisma.notification.findFirst({
      where: { recipientId: mentioned.id, type: 'mention', actorId: commenter.id },
    })
    expect(notif).not.toBeNull()
    expect(notif?.text).toContain('Comentarista')
    expect(notif?.targetType).toBe('post')
    expect(notif?.targetId).toBe(post.id)

    await app.close()
    await cleanup([postAuthor.id, commenter.id, mentioned.id])
  })

  it('não cria mention para o próprio autor do comentário', async () => {
    const { postAuthor, commenter, mentioned, post, suffix } = await setupFixture()
    const app = await makeApp(commenter.id)

    await app.inject({
      method: 'POST',
      url: `/${post.id}/comments`,
      payload: { content: `@comentarista${suffix} falando comigo mesmo` },
    })

    const selfNotif = await prisma.notification.findFirst({
      where: { recipientId: commenter.id, type: 'mention' },
    })
    expect(selfNotif).toBeNull()

    await app.close()
    await cleanup([postAuthor.id, commenter.id, mentioned.id])
  })

  it('não duplica notificação para o dono do post quando ele é mencionado no comentário (já recebeu de comment)', async () => {
    const { postAuthor, commenter, mentioned, post, suffix } = await setupFixture()
    const app = await makeApp(commenter.id)

    await app.inject({
      method: 'POST',
      url: `/${post.id}/comments`,
      payload: { content: `@${postAuthor.username ?? `postauthor${suffix}`} veja isso` },
    })

    // O autor do post recebe uma notificação de comment (não de mention)
    const mentionNotif = await prisma.notification.findFirst({
      where: { recipientId: postAuthor.id, type: 'mention', actorId: commenter.id },
    })
    expect(mentionNotif).toBeNull()

    const commentNotif = await prisma.notification.findFirst({
      where: { recipientId: postAuthor.id, type: 'comment', actorId: commenter.id },
    })
    expect(commentNotif).not.toBeNull()

    await app.close()
    await cleanup([postAuthor.id, commenter.id, mentioned.id])
  })

  it('@username inexistente — sem notificação de mention, request bem-sucedido', async () => {
    const { postAuthor, commenter, mentioned, post } = await setupFixture()
    const app = await makeApp(commenter.id)

    const res = await app.inject({
      method: 'POST',
      url: `/${post.id}/comments`,
      payload: { content: '@usuarioquenaexiste123xyz testando' },
    })

    expect(res.statusCode).toBe(201)
    const mentionNotifs = await prisma.notification.count({
      where: { actorId: commenter.id, type: 'mention' },
    })
    expect(mentionNotifs).toBe(0)

    await app.close()
    await cleanup([postAuthor.id, commenter.id, mentioned.id])
  })
})
```

- [ ] **Step 2: Rodar os testes — verificar que FALHAM**

```bash
cd server && npx vitest run src/routes/posts.comment-mention.test.ts 2>&1
```

Esperado: os testes 1 e 3 falham (mention não é criada), testes 2 e 4 passam.

- [ ] **Step 3: Implementar mention-extraction no handler de comentários**

Em `server/src/routes/posts.ts`, localizar o handler `POST /:id/comments` (próximo da linha 379).
Após a notificação do autor do post (linha ~414), adicionar antes de `reply.status(201).send(comment)`:

```ts
    // Notify @mentioned users in the comment (fire-and-forget)
    const commentHandles = [...body.data.content.matchAll(/@([a-z0-9_]+)/gi)].map((m) => m[1].toLowerCase())
    if (commentHandles.length > 0) {
      const excludeIds = [request.userId, ...(post ? [post.authorId] : [])]
      fastify.prisma.user.findMany({
        where: { username: { in: commentHandles }, id: { notIn: excludeIds } },
        select: { id: true },
      }).then(async (mentionedUsers) => {
        if (mentionedUsers.length === 0) return
        const actorName = actor?.name ?? 'Alguém'
        for (const u of mentionedUsers) {
          await fastify.prisma.notification.create({
            data: {
              type: 'mention',
              text: `${actorName} citou você em um comentário.`,
              recipientId: u.id,
              targetType: 'post',
              targetId: request.params.id,
              actorId: request.userId,
              actorName,
              postExcerpt: body.data.content.slice(0, 200),
            },
          })
        }
      }).catch(() => {})
    }
```

**Atenção:** `body` precisa estar tipado — verificar que o handler já faz `const body = commentSchema.safeParse(request.body)` e usa `body.data.content`. Isso é verdade nas linhas 380–381, então o acesso é válido.

- [ ] **Step 4: Rodar os testes — verificar que TODOS passam**

```bash
cd server && npx vitest run src/routes/posts.comment-mention.test.ts 2>&1
```

Esperado: `4 passed`.

- [ ] **Step 5: Rodar todos os testes do servidor para verificar regressão**

```bash
cd server && npx vitest run 2>&1
```

Esperado: todos os testes existentes continuam passando.

- [ ] **Step 6: TS check**

```bash
cd server && npx tsc --noEmit 2>&1
```

Esperado: sem erros.

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/posts.ts server/src/routes/posts.comment-mention.test.ts
git commit -m "feat(posts): notify @mentioned users in comments, exclude self and post author"
```

---

## Deploy Final (F + C + B)

### Task Deploy: Subir backend atualizado no VPS

**Files:**
- VPS: `/opt/mothersteam/server/src/routes/orders.ts`
- VPS: `/opt/mothersteam/server/src/routes/posts.ts`

- [ ] **Step 1: Copiar arquivos alterados para o VPS**

```bash
scp -P 443 server/src/routes/orders.ts root@2.25.137.78:/opt/mothersteam/server/src/routes/orders.ts
scp -P 443 server/src/routes/posts.ts root@2.25.137.78:/opt/mothersteam/server/src/routes/posts.ts
```

- [ ] **Step 2: Rebuild e restart do container**

```bash
ssh -p 443 root@2.25.137.78 "cd /opt/mothersteam/deploy && docker compose -f docker-compose.prod.yml build api --no-cache 2>&1 | tail -5 && docker compose -f docker-compose.prod.yml up -d api 2>&1"
```

- [ ] **Step 3: Verificar saúde do container**

```bash
ssh -p 443 root@2.25.137.78 "docker logs mothersteam-api --tail 10 2>&1"
```

Esperado: `Server listening at http://0.0.0.0:3001` sem erros.

- [ ] **Step 4: Rebuild e deploy do frontend (inclui VITE_ELEVENLABS_AGENT_ID)**

```bash
npm run build && tar czf /tmp/fcb-dist.tar.gz -C dist . && cat /tmp/fcb-dist.tar.gz | ssh -p 443 root@2.25.137.78 "cat > /tmp/fcb-dist.tar.gz && tar xzf /tmp/fcb-dist.tar.gz -C /var/www/mothersteam/ && echo DONE"
```
