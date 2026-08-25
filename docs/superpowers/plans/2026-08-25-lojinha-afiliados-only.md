# Lojinha 100% Afiliados Mercado Livre Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivotar a lojinha de híbrida (afiliados + venda direta) para **100% afiliados Mercado Livre** — CTA vira "Comprar no Mercado Livre" que redireciona pro ML, deletando todo o commerce interno (carrinho, checkout, MercadoPago, pedidos, endereços, pagamentos).

**Architecture:** Três fases atômicas. **Fase 1** entrega a mudança de UX (rename `affiliateUrl → mercadoLivreUrl`, endpoint `/go → /comprar`, novo CTA "Comprar no ML", esconde OwnProducts + Pedidos + cart no frontend). **Fase 2** limpa o backend (deleta rotas cart/orders/payment/addresses/own-products, drop tables, remove MercadoPago SDK, simplifica Review/WishlistItem). **Fase 3** limpa o frontend (deleta componentes de cart/checkout/pedidos, tipos, simplifica FavoritesTab/ProductDetailScreen).

**Tech Stack:** Frontend React 18 + Vite + Zustand + React Query. Backend Fastify + Prisma + MySQL. Deploy: docker compose no VPS Hostinger + scp de dist estático.

---

## Ordem de execução e shippabilidade

Cada fase termina num estado deployável (build passa, testes passam, prod aceita deploy). Se pausar entre fases, nada quebra pro usuário.

- **Fase 1 — UX pivot**: shippa a mudança visível pra usuária. Frontend esconde OwnProducts + Pedidos + cart entry points. Backend renomeia field/endpoint mas mantém todas as rotas antigas funcionando (backwards-compat).
- **Fase 2 — Backend cleanup**: deleta rotas, drop tables, remove MercadoPago dep. Frontend continua funcionando porque já não chama nada dessas rotas (Fase 1 fez a poda).
- **Fase 3 — Frontend cleanup**: deleta arquivos de UI + types órfãos. Bundle fica menor.

---

## File Structure

### Backend

**Modificar:**
- `server/prisma/schema.prisma` — rename field (Fase 1), depois drop tables (Fase 2)
- `server/src/routes/products-public.ts` — rename endpoint, atualizar select fields, remover wishlist toggle branch (Fase 1 + Fase 2)
- `server/src/routes/admin/products.ts` — atualizar Zod schema pra `mercadoLivreUrl` + validação ML (Fase 1)
- `server/src/routes/wishlist.ts` — simplificar pra só afiliado (Fase 2)
- `server/src/routes/users.ts` — se `GET /me` inclui campos de commerce (mpCustomerId), remover (Fase 2)
- `server/src/lib/user-select.ts` — remover campos de commerce do select (Fase 2)
- `server/package.json` — remover `mercadopago` dep (Fase 2)

**Deletar:**
- `server/src/routes/cart.ts` + `.test.ts` (se existir)
- `server/src/routes/orders.ts`
- `server/src/routes/payment-methods.ts`
- `server/src/routes/addresses.ts`
- `server/src/routes/own-products.ts`
- `server/src/routes/admin/orders.ts`
- `server/src/routes/admin/own-products.ts`

### Frontend

**Modificar:**
- `src/components/shopping/ProductDetailScreen.tsx` — novo CTA "Comprar no Mercado Livre" (Fase 1), depois remover branches de OwnProduct (Fase 3)
- `src/components/shopping/ShoppingScreen.tsx` — remover tab "Pedidos" + filtrar OwnProducts da listagem + remover cart badge (Fase 1), depois deletar código morto (Fase 3)
- `src/components/shopping/FavoritesTab.tsx` — filtrar apenas afiliados (Fase 1), depois remover branches (Fase 3)
- `src/components/layout/LeftSidebar.tsx` — remover entrada "Carrinho" ou qualquer badge se existir (Fase 1)
- `src/lib/types.ts` — remover tipos ApiCart/ApiOrder/etc (Fase 3)
- `src/admin/pages/ProductFormPage.tsx` — simplificar campos (rename field + validação ML) (Fase 1)
- `src/admin/pages/ProductsPage.tsx` — mostrar `mercadoLivreUrl` em vez de `affiliateUrl` (Fase 1)

**Deletar:**
- `src/components/shopping/CartScreen.tsx`
- `src/components/shopping/CheckoutScreen.tsx`
- `src/components/shopping/OrderDetailScreen.tsx`
- `src/components/shopping/OrdersTab.tsx`
- `src/components/shopping/detectPaymentMethodId.test.ts`

**Deploy:** cada fase = 1 backend rebuild + 1 frontend build + scp.

---

## Fase 1 — UX pivot (jornada do usuário)

Rename campo + endpoint. Novo CTA no frontend. Esconde tudo que vira dead code (mas não deleta ainda). App fica funcional; usuária só vê "Comprar no ML" em vez de carrinho/checkout.

### Task 1.1: Rename Prisma `Product.affiliateUrl` → `Product.mercadoLivreUrl`

**Files:**
- Modify: `server/prisma/schema.prisma` (bloco `model Product`, ~linha 268)
- Create: `server/prisma/migrations/<timestamp>_rename_affiliate_to_ml/migration.sql`

- [ ] **Step 1: Editar schema.prisma**

Trocar linha `affiliateUrl String?` em `model Product` por:

```prisma
  mercadoLivreUrl String? @db.VarChar(500)
```

- [ ] **Step 2: Gerar migration**

Run: `cd server && npx prisma migrate dev --name rename_affiliate_to_ml`

Expected: cria `server/prisma/migrations/<timestamp>_rename_affiliate_to_ml/migration.sql` com `ALTER TABLE Product CHANGE affiliateUrl mercadoLivreUrl VARCHAR(500)` (ou similar sequência DROP+ADD).

**Verificação:** Se Prisma gerar como DROP+ADD (perde dados), editar o SQL manualmente pra usar `RENAME COLUMN` do MySQL 8:

```sql
ALTER TABLE `Product` RENAME COLUMN `affiliateUrl` TO `mercadoLivreUrl`;
```

E rodar `npx prisma migrate resolve --applied <timestamp>_rename_affiliate_to_ml` se já foi aplicada como drop+add.

- [ ] **Step 3: Verificar dev DB atualizado**

Run: `docker exec mothers-team-mysql-1 mysql -u mothers -pmothers123 mothers_team -e "DESCRIBE Product;" | grep -i url`

Expected: linha `mercadoLivreUrl` presente, `affiliateUrl` ausente.

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "refactor(db): rename Product.affiliateUrl to mercadoLivreUrl"
```

---

### Task 1.2: Atualizar backend — endpoint rename + ML URL validation

**Files:**
- Modify: `server/src/routes/products-public.ts` — endpoint `/go` vira `/comprar`, USER_SELECT usa `mercadoLivreUrl`
- Modify: `server/src/routes/admin/products.ts` — Zod schema aceita `mercadoLivreUrl` (não `affiliateUrl`) com regex validation
- Create: `server/src/routes/products-public.test.ts` (se não existir) — testa novo endpoint + validação

- [ ] **Step 1: Escrever teste do novo endpoint**

**Files:**
- Test: `server/src/routes/products-public.test.ts` (se já existe, adicionar `describe`; se não, criar seguindo pattern de `users.test.ts` — inline Fastify + PrismaClient + cleanup)

```ts
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
```

- [ ] **Step 2: Rodar teste — deve falhar**

Run: `cd server && npm test -- products-public.test.ts`

Expected: FAIL (endpoint `/comprar` ainda não existe — o antigo é `/go`).

- [ ] **Step 3: Renomear endpoint em products-public.ts**

Ler `server/src/routes/products-public.ts` primeiro pra encontrar o handler `/go`. Substituir a rota:

```ts
// ANTES:
fastify.get('/:id/go', async (request, reply) => {
  // ... busca produto por id, valida affiliateUrl, cria ProductClick, redireciona
})

// DEPOIS:
fastify.get('/:id/comprar', async (request, reply) => {
  const { id } = request.params as { id: string }
  const product = await fastify.prisma.product.findUnique({
    where: { id },
    select: { id: true, mercadoLivreUrl: true },
  })
  if (!product || !product.mercadoLivreUrl) {
    return reply.status(404).send({ error: 'Product or Mercado Livre URL not found' })
  }
  // fire-and-forget click log
  fastify.prisma.productClick.create({
    data: { productId: id, userId: request.userId || null },
  }).catch(() => {})
  return reply.redirect(product.mercadoLivreUrl, 302)
})
```

- [ ] **Step 4: Atualizar todos os `select` que usam `affiliateUrl` neste arquivo**

Grep no arquivo por `affiliateUrl` e trocar por `mercadoLivreUrl` em cada `select: { ... }` (endpoints GET /:id, GET /). Deixar `products-public.ts` inteiro sem referência a `affiliateUrl`.

- [ ] **Step 5: Rodar teste — deve passar**

Run: `cd server && npm test -- products-public.test.ts`

Expected: PASS 2/2.

- [ ] **Step 6: Atualizar admin/products.ts Zod schema**

Modificar `server/src/routes/admin/products.ts`. Encontrar o Zod schema de create/update de produto. Trocar:

```ts
// ANTES:
affiliateUrl: z.string().url().optional(),

// DEPOIS:
mercadoLivreUrl: z.string()
  .url('Deve ser uma URL válida')
  .regex(
    /(?:mercadolivre\.com|mercadolibre\.com|produto\.mercadolivre|articulo\.mercadolibre)/i,
    'URL deve ser do Mercado Livre'
  )
  .optional(),
```

Também trocar `affiliateUrl` por `mercadoLivreUrl` nos handlers (create, update, bulk import) e no select da response.

**No bulk import**, atualizar mensagens de erro e a coluna esperada do CSV: `url_afiliado` vira `url_mercadolivre`.

- [ ] **Step 7: Rodar suíte inteira do backend**

Run: `cd server && npm test`

Expected: PASS todos (número anterior — provavelmente 38+ — mantém, +2 dos novos testes).

- [ ] **Step 8: Commit**

```bash
git add server/src/routes/products-public.ts server/src/routes/products-public.test.ts server/src/routes/admin/products.ts
git commit -m "feat(products): rename /go endpoint to /comprar + validate ML URL"
```

---

### Task 1.3: Atualizar admin frontend — ProductFormPage + ProductsPage usam `mercadoLivreUrl`

**Files:**
- Modify: `src/admin/pages/ProductFormPage.tsx`
- Modify: `src/admin/pages/ProductsPage.tsx`

- [ ] **Step 1: Substituir todas ocorrências de `affiliateUrl` → `mercadoLivreUrl` em ProductFormPage.tsx**

Grep no arquivo. Renomear:
- State variable: `affiliateUrl` → `mercadoLivreUrl`
- Input label: "URL de afiliado" → "URL do Mercado Livre"
- Placeholder: "https://..." → "https://produto.mercadolivre.com.br/..."
- Payload no `POST /admin/products` e `PUT /admin/products/:id`: campo `affiliateUrl` → `mercadoLivreUrl`
- Também no bulk import label/template (se existir aqui)

Adicionar validação frontend (visual) — se URL preenchida não bate regex `/mercadolivre|mercadolibre/i`, mostrar helper text vermelho: "URL deve ser do Mercado Livre".

- [ ] **Step 2: Substituir em ProductsPage.tsx**

Se a listagem exibe `affiliateUrl` em coluna ou tooltip, trocar por `mercadoLivreUrl`.

Se o bulk import (CSV/XLSX) template menciona coluna `url_afiliado`, trocar por `url_mercadolivre`. Atualizar também o mapping do parser.

- [ ] **Step 3: Rodar typecheck**

Run: `npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 4: Rodar suíte de tests do admin (se existir)**

Run: `npx vitest run src/admin`

Expected: PASS. Se algum teste referenciava `affiliateUrl`, atualizar antes de commitar.

- [ ] **Step 5: Commit**

```bash
git add src/admin/pages/ProductFormPage.tsx src/admin/pages/ProductsPage.tsx
git commit -m "feat(admin): rename affiliateUrl UI to mercadoLivreUrl with ML validation"
```

---

### Task 1.4: ProductDetailScreen — CTA "Comprar no Mercado Livre"

**Files:**
- Modify: `src/components/shopping/ProductDetailScreen.tsx`

- [ ] **Step 1: Escrever teste**

**Files:**
- Test: `src/components/shopping/ProductDetailScreen.test.tsx` (se não existir, criar)

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProductDetailScreen } from './ProductDetailScreen'

vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({
    id: 'p1',
    type: 'affiliate',
    name: 'Produto Teste',
    description: 'desc',
    price: '99.90',
    images: [],
    phases: [],
    categoryId: 'c1',
    category: { id: 'c1', name: 'Bebê', slug: 'bebe', icon: '🍼' },
    mercadoLivreUrl: 'https://produto.mercadolivre.com.br/MLB-123',
    reviewsSummary: { average: 0, count: 0, distribution: {} },
    reviews: [],
    inWishlist: false,
    related: [],
  }),
  resolveApiUrl: (path: string) => `https://api.test${path}`,
}))

function renderWith(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('ProductDetailScreen — Comprar no ML CTA', () => {
  it('shows "Comprar no Mercado Livre" button that opens the mercadoLivreUrl via /comprar endpoint', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    renderWith(<ProductDetailScreen productId="p1" productType="affiliate" onBack={vi.fn()} />)
    const btn = await screen.findByRole('button', { name: /comprar no mercado livre/i })
    fireEvent.click(btn)
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('/products/p1/comprar'),
      '_blank'
    )
    openSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Rodar teste — deve falhar**

Run: `npx vitest run src/components/shopping/ProductDetailScreen.test.tsx`

Expected: FAIL (CTA atual é "Ver no site" e chama `/go`).

- [ ] **Step 3: Substituir CTA no ProductDetailScreen.tsx**

Ler o arquivo. Encontrar o botão "Ver no site" (ou similar) que chama `GET /products/:id/go`. Trocar por:

```tsx
<a
  href={`${resolveApiUrl(`/products/${product.id}/comprar`)}`}
  target="_blank"
  rel="noopener noreferrer"
  onClick={(e) => {
    // Also open programmatically to work with popup blockers in some webviews
    e.preventDefault()
    window.open(`${resolveApiUrl(`/products/${product.id}/comprar`)}`, '_blank')
  }}
  className="w-full py-4 rounded-2xl bg-mt-rose text-white font-semibold text-base flex items-center justify-center gap-2 active:scale-95 transition-transform"
  aria-label="Comprar no Mercado Livre"
>
  <img src="/mercadolivre-logo.svg" alt="" className="w-5 h-5" />
  Comprar no Mercado Livre
  <ExternalLink size={16} />
</a>
```

**IMPORTANTE**: se o produto for `type === 'own'` (que ainda existe no data model até Fase 2), esconder o CTA completamente OU mostrar "Indisponível" (não vai ser reachable porque a listagem já vai filtrar own, mas defensive):

```tsx
{product.type === 'affiliate' && product.mercadoLivreUrl ? (
  /* CTA de comprar no ML acima */
) : (
  <div className="w-full py-4 rounded-2xl bg-mt-linen text-mt-muted text-sm text-center">
    Produto indisponível
  </div>
)}
```

Adicionar logo do ML em `public/mercadolivre-logo.svg` (baixar de https://logos-download.com/wp-content/uploads/2018/02/Mercado_Libre_logo.png ou usar SVG oficial — inline se preferir evitar asset).

Remover o botão "Adicionar ao carrinho" completamente (mesmo pra OwnProduct — Fase 1 esconde tudo de commerce interno).

- [ ] **Step 4: Rodar teste — deve passar**

Run: `npx vitest run src/components/shopping/ProductDetailScreen.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shopping/ProductDetailScreen.tsx src/components/shopping/ProductDetailScreen.test.tsx public/mercadolivre-logo.svg
git commit -m "feat(shopping): CTA 'Comprar no Mercado Livre' replaces add-to-cart"
```

---

### Task 1.5: ShoppingScreen — remover tab "Pedidos" + filtrar OwnProducts + remover cart entry

**Files:**
- Modify: `src/components/shopping/ShoppingScreen.tsx`

- [ ] **Step 1: Escrever teste**

Ler `src/components/shopping/ShoppingScreen.test.tsx` (se existir) pra padrão. Adicionar caso:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ShoppingScreen } from './ShoppingScreen'

vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
  resolveApiUrl: (p: string) => p,
}))

function renderWith(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('ShoppingScreen — pivot to ML-only', () => {
  it('has only Produtos and Favoritos tabs — no Pedidos', () => {
    renderWith(<ShoppingScreen />)
    expect(screen.getByRole('tab', { name: /produtos/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /favoritos/i })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /pedidos/i })).not.toBeInTheDocument()
  })

  it('does not render a cart button or badge', () => {
    renderWith(<ShoppingScreen />)
    expect(screen.queryByRole('button', { name: /carrinho|cart/i })).not.toBeInTheDocument()
  })
})
```

Se `ShoppingScreen.test.tsx` não existir, criar novo com estes 2 testes.

- [ ] **Step 2: Rodar teste — deve falhar (tab Pedidos ainda existe)**

Run: `npx vitest run src/components/shopping/ShoppingScreen.test.tsx`

Expected: FAIL — tab "Pedidos" ainda no DOM.

- [ ] **Step 3: Modificar ShoppingScreen.tsx**

Ler o arquivo. Fazer 3 mudanças:

1. **Remover import** de `OrdersTab`:
```tsx
// deletar linha: import { OrdersTab } from './OrdersTab'
```

2. **Reduzir tabs de 3 pra 2**. Encontrar o array/objeto de tabs (algo como `TABS = [{ id: 'produtos', ... }, { id: 'favoritos', ... }, { id: 'pedidos', ... }]`). Remover o item `pedidos`. Adicionar tipo:

```tsx
type ShoppingTab = 'produtos' | 'favoritos'
// (era: 'produtos' | 'favoritos' | 'pedidos')
```

3. **Remover renderização** do `<OrdersTab />` no switch/if de qual tab render.

4. **Remover cart badge/entry**. Localizar qualquer botão/ícone que mostra count do carrinho (`useQuery(['cart'], ...)` + badge). Deletar completamente esse bloco.

5. **Filtrar OwnProducts da listagem** — se ShoppingScreen faz `useQuery` pra `/own-products`, remover essa query. Se combina resultados de `/products` e `/own-products` num só grid, deixar só `/products`.

- [ ] **Step 4: Rodar teste — deve passar**

Run: `npx vitest run src/components/shopping/ShoppingScreen.test.tsx`

Expected: PASS 2/2.

- [ ] **Step 5: Commit**

```bash
git add src/components/shopping/ShoppingScreen.tsx src/components/shopping/ShoppingScreen.test.tsx
git commit -m "feat(shopping): drop Pedidos tab + cart badge + own-products query"
```

---

### Task 1.6: FavoritesTab — filtrar apenas afiliados

**Files:**
- Modify: `src/components/shopping/FavoritesTab.tsx`

- [ ] **Step 1: Editar FavoritesTab.tsx**

Ler o arquivo. Encontrar renderização de cada item. Hoje: cada `WishlistEntry` tem `type: 'affiliate' | 'own'` com branches diferentes (afiliado → "Ver detalhes"; own → "Carrinho"/"Indisponível").

Substituir por: **filtrar** só afiliados no `useQuery` ou no render:

```tsx
const { data: wishlist = [] } = useQuery({
  queryKey: ['wishlist'],
  queryFn: () => apiFetch<ApiWishlistEntry[]>('/wishlist'),
})

// Filtrar own out — só render afiliados
const affiliateOnly = wishlist.filter((w) => w.type === 'affiliate')
```

Para cada card, substituir os 2 branches de action por um só:

```tsx
<a
  href={`${resolveApiUrl(`/products/${item.product.id}/comprar`)}`}
  target="_blank"
  rel="noopener noreferrer"
  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-mt-rose text-white flex items-center gap-1"
>
  Comprar no ML
</a>
```

- [ ] **Step 2: Verificar (sem novos testes, o comportamento é filtrar/mudar CTA)**

Run: `npx vitest run src/components/shopping/FavoritesTab.test.tsx` (se existir) OU `npm run typecheck`

Expected: PASS / clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/shopping/FavoritesTab.tsx
git commit -m "feat(shopping): FavoritesTab shows only affiliates with ML CTA"
```

---

### Task 1.7: LeftSidebar — remover entrada "Carrinho" (se existir)

**Files:**
- Modify: `src/components/layout/LeftSidebar.tsx` (grep found cart references here — verify what they are)

- [ ] **Step 1: Ler LeftSidebar.tsx e identificar referências a "cart"**

Run: `grep -n -i "cart\|carrinho" src/components/layout/LeftSidebar.tsx`

Se houver botão de nav ou badge de cart count, remover linha por linha. Se as referências forem só em textos genéricos (não navegacionais), deixar.

- [ ] **Step 2: Rodar suíte de layout tests**

Run: `npx vitest run src/components/layout/`

Expected: PASS (todos que já passavam antes).

- [ ] **Step 3: Commit (se houve mudança)**

```bash
git add src/components/layout/LeftSidebar.tsx
git commit -m "feat(layout): drop cart entry from LeftSidebar"
```

Se não houve mudança (era só coincidência de string), pular commit.

---

### Task 1.8: Deploy Fase 1

- [ ] **Step 1: Rodar suíte completa local**

Run: `npm test && (cd server && npm test)`

Expected: todos PASS (backend + frontend).

- [ ] **Step 2: Build frontend**

Run: `npm run build`

Expected: `dist/` gerado sem erros.

- [ ] **Step 3: Push branch e SSH**

```bash
git push origin feat/backend-cadastro-deploy   # ou nova branch — decidir com dono antes
```

- [ ] **Step 4: Backend deploy no VPS**

```bash
ssh -p 443 root@2.25.137.78 'cd /opt/mothersteam && git pull && cd deploy && \
  docker compose -f docker-compose.prod.yml --env-file .env.production build api && \
  docker compose -f docker-compose.prod.yml --env-file .env.production run --rm --no-deps api /app/node_modules/.bin/prisma migrate deploy && \
  docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps api'
```

- [ ] **Step 5: Frontend deploy**

```bash
scp -P 443 -r dist/. root@2.25.137.78:/var/www/mothersteam/
npx cap sync android
```

- [ ] **Step 6: Smoke test**

Verificar em prod:
- Loja abre com só 2 tabs (Produtos, Favoritos)
- Detalhe do produto mostra "Comprar no Mercado Livre"
- Click abre URL do ML (verificar network tab: request pra `/products/:id/comprar` retorna 302 com Location: mercadolivre.com)

---

## Fase 2 — Backend cleanup

Deleta rotas de commerce, drop tables, remove MercadoPago dep. Frontend continua funcionando porque Fase 1 já parou de chamar essas rotas.

### Task 2.1: Deletar rotas de commerce backend

**Files a deletar:**
- `server/src/routes/cart.ts` + `.test.ts` (se existir)
- `server/src/routes/orders.ts`
- `server/src/routes/payment-methods.ts`
- `server/src/routes/addresses.ts`
- `server/src/routes/own-products.ts`
- `server/src/routes/admin/orders.ts`
- `server/src/routes/admin/own-products.ts`

**Files a modificar:**
- `server/src/index.ts` — remover registrations dessas rotas

- [ ] **Step 1: Deletar arquivos**

```bash
rm server/src/routes/cart.ts server/src/routes/cart.test.ts 2>/dev/null
rm server/src/routes/orders.ts server/src/routes/orders.installments.test.ts
rm server/src/routes/payment-methods.ts
rm server/src/routes/addresses.ts
rm server/src/routes/own-products.ts
rm server/src/routes/admin/orders.ts
rm server/src/routes/admin/own-products.ts
```

- [ ] **Step 2: Remover registrations em `server/src/index.ts`**

Ler `server/src/index.ts`. Encontrar linhas tipo:

```ts
import cartRoutes from './routes/cart'
import ordersRoutes from './routes/orders'
import paymentMethodsRoutes from './routes/payment-methods'
import addressesRoutes from './routes/addresses'
import ownProductsRoutes from './routes/own-products'
// ...
await app.register(cartRoutes, { prefix: '/cart' })
await app.register(ordersRoutes, { prefix: '/orders' })
// etc
```

Remover TODAS essas linhas (imports + registers). Fazer o mesmo pras rotas admin (`admin/orders`, `admin/own-products`).

- [ ] **Step 3: Rodar server pra confirmar não crasha**

Run: `cd server && npm run dev` (em terminal separado ou background), então `curl http://localhost:3001/health`

Expected: 200. Kill o server depois.

- [ ] **Step 4: Rodar tests backend inteiros**

Run: `cd server && npm test`

Expected: PASS. Se algum teste referenciava rotas deletadas, deletar/atualizar esse teste também.

- [ ] **Step 5: Commit**

```bash
git add -A server/src/
git commit -m "refactor(server): delete cart/orders/payments/addresses/own-products routes"
```

---

### Task 2.2: Simplificar rotas remanescentes

**Files:**
- Modify: `server/src/routes/wishlist.ts` — remover branch de OwnProduct
- Modify: `server/src/routes/products-public.ts` — remover toggle branch de OwnProduct em `POST /:id/wishlist`
- Modify: `server/src/lib/user-select.ts` — remover campos de commerce

- [ ] **Step 1: Simplificar wishlist.ts**

Ler o arquivo. Hoje o `GET /wishlist` faz JOIN em Product AND OwnProduct e retorna union. Simplificar pra só Product:

```ts
fastify.get('/', async (request, reply) => {
  const items = await fastify.prisma.wishlistItem.findMany({
    where: { userId: request.userId, productId: { not: null } },
    include: { product: { include: { category: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return items
    .filter((w) => w.product)
    .map((w) => ({
      type: 'affiliate' as const,
      product: w.product,
      savedAt: w.createdAt,
    }))
})
```

- [ ] **Step 2: Simplificar products-public.ts wishlist toggle**

Se o handler `POST /:id/wishlist` tinha branch pra `ownProductId`, remover — deixa só `productId`:

```ts
fastify.post('/:id/wishlist', async (request, reply) => {
  const { id } = request.params as { id: string }
  const existing = await fastify.prisma.wishlistItem.findFirst({
    where: { userId: request.userId, productId: id },
  })
  if (existing) {
    await fastify.prisma.wishlistItem.delete({ where: { id: existing.id } })
    return { inWishlist: false }
  }
  await fastify.prisma.wishlistItem.create({
    data: { userId: request.userId, productId: id },
  })
  return { inWishlist: true }
})
```

- [ ] **Step 3: Simplificar `user-select.ts`**

Ler `server/src/lib/user-select.ts`. Remover linhas:
- `mpCustomerId: true` (se existir)

Manter `fcmToken` (push notifications ainda servem pra comentários/mentions).

- [ ] **Step 4: Rodar tests backend**

Run: `cd server && npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/wishlist.ts server/src/routes/products-public.ts server/src/lib/user-select.ts
git commit -m "refactor(server): drop OwnProduct branches from wishlist + user-select"
```

---

### Task 2.3: Drop tabelas + simplificar Review + WishlistItem no schema

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/<timestamp>_drop_commerce_tables/migration.sql`

- [ ] **Step 1: Editar schema.prisma — remover modelos**

Remover completamente estes blocos `model` do arquivo:
- `OwnProduct`
- `Order`
- `OrderItem`
- `CartItem`
- `PaymentMethod`
- `Address`

- [ ] **Step 2: Simplificar Review**

No `model Review`, remover:
- `ownProductId String?`
- `ownProduct OwnProduct?  @relation(...)`
- `@@unique([userId, ownProductId])`

Tornar `productId` NOT NULL (era `String?`):

```prisma
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  @@unique([userId, productId])
```

- [ ] **Step 3: Simplificar WishlistItem**

No `model WishlistItem`, remover:
- `ownProductId String?`
- `ownProduct OwnProduct? @relation(...)`
- `@@unique([userId, ownProductId])`

Tornar `productId` NOT NULL:

```prisma
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  @@unique([userId, productId])
```

- [ ] **Step 4: Simplificar User**

No `model User`, remover:
- `mpCustomerId String?`
- `reviews Review[]` (mantém, mas só afiliado agora)
- `wishlistItems WishlistItem[]` (mantém)
- `cartItems CartItem[]` (**deletar** — model foi removido)
- `orders Order[]` (**deletar**)
- `addresses Address[]` (**deletar**)
- `paymentMethods PaymentMethod[]` (**deletar**)

Manter: `fcmToken`, `refreshTokens[]`, `posts[]`, `comments[]`, `savedVerses[]`, `following[]`, `followers[]`, `communities[]`, etc.

- [ ] **Step 5: Gerar migration**

Run: `cd server && npx prisma migrate dev --name drop_commerce_tables`

Expected: cria migration que:
- Deleta rows de `Review` e `WishlistItem` que têm `productId IS NULL` (rows órfãs de OwnProduct)
- DROP TABLE `OrderItem`, `Order`, `CartItem`, `PaymentMethod`, `Address`, `OwnProduct` (na ordem correta de FKs)
- ALTER TABLE `Review` DROP COLUMN `ownProductId`, MODIFY `productId` NOT NULL, DROP CONSTRAINT `Review_userId_ownProductId_key`
- ALTER TABLE `WishlistItem` mesma coisa
- ALTER TABLE `User` DROP COLUMN `mpCustomerId`

Se Prisma pedir "data loss confirmation", aceitar (dono decidiu deletar tudo).

- [ ] **Step 6: Verificar migration aplicada no dev DB**

Run: `cd server && npx prisma migrate status`

Expected: `Database schema is up to date!`

Verificar tabelas dropadas:
```bash
docker exec mothers-team-mysql-1 mysql -u mothers -pmothers123 mothers_team -e "SHOW TABLES;" | grep -iE "Order|Cart|Address|Payment|OwnProduct"
```
Expected: nenhum resultado.

- [ ] **Step 7: Rodar tests backend**

Run: `cd server && npm test`

Expected: PASS. Se algum teste refere a tabela deletada (ex.: `orders.installments.test.ts` que foi deletado no Task 2.1), garantir que foi deletado ali.

- [ ] **Step 8: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "refactor(db): drop OwnProduct/Order/Cart/Payment/Address tables + simplify Review/WishlistItem"
```

---

### Task 2.4: Remover MercadoPago dep + env vars

**Files:**
- Modify: `server/package.json` — remover `mercadopago` das dependencies
- Modify: `server/package-lock.json` — regenerar

- [ ] **Step 1: Remover dep**

Run: `cd server && npm uninstall mercadopago`

Expected: `mercadopago` removido de `dependencies` no `package.json` + regenera `package-lock.json`.

- [ ] **Step 2: Grep pra confirmar zero imports restantes**

Run: `grep -rn "mercadopago" server/src/ 2>&1 | head`

Expected: nenhum resultado (todas as rotas que importavam foram deletadas no Task 2.1).

- [ ] **Step 3: Rodar tests + typecheck**

Run: `cd server && npm test && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore(server): remove mercadopago dependency"
```

- [ ] **Step 5: Anotar env vars pra remover em prod (não commitar — só doc)**

Ao deployar, remover do `.env.production` do VPS:
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`

Manter: `RESEND_API_KEY` (emails de senha), `FIREBASE_SERVICE_ACCOUNT_JSON` (push de comentários/mentions).

---

### Task 2.5: Deploy Fase 2 backend

- [ ] **Step 1: Push branch**

```bash
git push
```

- [ ] **Step 2: Deploy VPS com migration destrutiva**

**IMPORTANTE**: essa migration DROPA TABELAS COM DADOS. Fazer backup antes.

```bash
ssh -p 443 root@2.25.137.78 '
  cd /opt/mothersteam && \
  docker exec mothers-team-mysql-1 mysqldump -u mothers -pmothers123 mothers_team \
    OwnProduct Order OrderItem CartItem PaymentMethod Address \
    > /root/backup-commerce-tables-$(date +%Y%m%d-%H%M%S).sql && \
  git pull && \
  cd deploy && \
  docker compose -f docker-compose.prod.yml --env-file .env.production build api && \
  docker compose -f docker-compose.prod.yml --env-file .env.production run --rm --no-deps api /app/node_modules/.bin/prisma migrate deploy && \
  docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps api
'
```

- [ ] **Step 3: Remover env vars MP do .env.production**

```bash
ssh -p 443 root@2.25.137.78 'cd /opt/mothersteam/deploy && \
  cp .env.production .env.production.bak-$(date +%Y%m%d) && \
  sed -i "/^MERCADO_PAGO_/d" .env.production && \
  grep MERCADO .env.production || echo "clean"'
```

Expected: `clean`.

- [ ] **Step 4: Restart container pra pegar env limpa**

```bash
ssh -p 443 root@2.25.137.78 'cd /opt/mothersteam/deploy && \
  docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps api && \
  sleep 10 && \
  docker ps --filter name=mothersteam-api --format "{{.Names}} | {{.Status}}"'
```

Expected: `Up ... (healthy)`.

- [ ] **Step 5: Smoke test em prod**

```bash
curl -sS "https://api.santoti.com/health" -w "\nHTTP %{http_code}\n"
curl -sS "https://api.santoti.com/orders" -w "\nHTTP %{http_code}\n"  # deve 404
curl -sS "https://api.santoti.com/cart" -w "\nHTTP %{http_code}\n"    # deve 404
```

Expected: `/health` → 200. `/orders` e `/cart` → 404 (rotas deletadas).

---

## Fase 3 — Frontend cleanup

Deleta componentes órfãos + tipos órfãos. Bundle fica menor. Usuária não vê diferença.

### Task 3.1: Deletar componentes frontend órfãos

**Files a deletar:**
- `src/components/shopping/CartScreen.tsx` + `.test.tsx`
- `src/components/shopping/CheckoutScreen.tsx` + `.test.tsx` (se existir)
- `src/components/shopping/OrderDetailScreen.tsx` + `.test.tsx` (se existir)
- `src/components/shopping/OrdersTab.tsx` + `.test.tsx` (se existir)
- `src/components/shopping/detectPaymentMethodId.test.ts`
- `src/components/shopping/detectPaymentMethodId.ts` (se existir separado)

- [ ] **Step 1: Deletar arquivos**

```bash
rm src/components/shopping/CartScreen.tsx src/components/shopping/CartScreen.test.tsx 2>/dev/null
rm src/components/shopping/CheckoutScreen.tsx src/components/shopping/CheckoutScreen.test.tsx 2>/dev/null
rm src/components/shopping/OrderDetailScreen.tsx src/components/shopping/OrderDetailScreen.test.tsx 2>/dev/null
rm src/components/shopping/OrdersTab.tsx src/components/shopping/OrdersTab.test.tsx 2>/dev/null
rm src/components/shopping/detectPaymentMethodId.test.ts src/components/shopping/detectPaymentMethodId.ts 2>/dev/null
```

- [ ] **Step 2: Rodar typecheck — vai revelar imports órfãos**

Run: `npx tsc --noEmit 2>&1 | head -30`

Se aparecer erro tipo `Cannot find module './CartScreen'` em algum lugar (App.tsx, layout, etc), abrir esse arquivo e remover o import + o uso.

Locais prováveis com imports órfãos:
- `src/App.tsx` — pode ter roteamento pra CartScreen/CheckoutScreen
- `src/components/shopping/ShoppingScreen.tsx` — pode ter import de OrdersTab (já removido em Task 1.5, verificar)

- [ ] **Step 3: Rodar suíte inteira**

Run: `npm test 2>&1 | tail -5`

Expected: PASS (a 15 falhas pré-existentes de chat/community/etc podem continuar — anotar mas não bloquear).

- [ ] **Step 4: Commit**

```bash
git add -A src/components/shopping src/App.tsx
git commit -m "refactor(shopping): delete Cart/Checkout/Order/OrdersTab dead components"
```

---

### Task 3.2: Remover tipos órfãos + MercadoPago SDK do frontend

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `index.html` (se carregava MercadoPago SDK via `<script>`)
- Modify: `src/components/shopping/CheckoutScreen.tsx` (já deletado — verificar se algum outro arquivo referencia)

- [ ] **Step 1: Deletar tipos em `src/lib/types.ts`**

Ler `src/lib/types.ts`. Remover interfaces:
- `ApiCart`
- `ApiCartItem`
- `ApiOrder`
- `ApiOrderItem`
- `ApiPaymentMethod`
- `ApiAddress`
- `ApiInstallmentOption`
- `ApiOwnProduct`
- `ApiOwnProductDetail`

Manter:
- `ApiProduct`, `ApiProductDetail` (afiliado), `ApiCategory`, `ApiReview`, `ApiReviewsSummary`, `ApiWishlistEntry`, `ApiUser`

Renomear `ApiProductDetail.affiliateUrl` → `mercadoLivreUrl` (se ainda não foi feito).

- [ ] **Step 2: Simplificar ApiWishlistEntry**

Antes:
```ts
export interface ApiWishlistEntry {
  type: 'affiliate' | 'own'
  product: ApiAdminProduct | ApiOwnProduct
  savedAt: string
}
```

Depois:
```ts
export interface ApiWishlistEntry {
  type: 'affiliate'
  product: ApiAdminProduct  // ou ApiProduct — usar o tipo que já é usado no wishlist
  savedAt: string
}
```

- [ ] **Step 3: Grep e remover uso de MercadoPago SDK**

Run: `grep -rn "mercadopago\|MercadoPago\|VITE_MERCADO_PAGO" src/ index.html 2>&1 | head`

Se `index.html` carregava `<script src="https://sdk.mercadopago.com/js/v2">`, remover essa linha.

Se `.env` ou `.env.example` tem `VITE_MERCADO_PAGO_PUBLIC_KEY`, remover.

- [ ] **Step 4: Rodar typecheck + tests**

Run: `npx tsc --noEmit && npm test 2>&1 | tail -5`

Expected: PASS. Se aparecer type error em arquivo que referenciava tipo deletado, abrir e limpar.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts index.html src/
git commit -m "refactor(types): drop cart/order/payment types + remove MercadoPago SDK"
```

---

### Task 3.3: Simplificar ProductDetailScreen — remover branches de OwnProduct

**Files:**
- Modify: `src/components/shopping/ProductDetailScreen.tsx`

- [ ] **Step 1: Ler e simplificar**

Hoje o componente aceita `productType: 'affiliate' | 'own'` e faz `useQuery` em `/products/:id` OR `/own-products/:id` dependendo do tipo.

Simplificar pra sempre afiliado:

```tsx
interface Props {
  productId: string
  onBack: () => void
  // productType removed — sempre afiliado agora
}

export function ProductDetailScreen({ productId, onBack }: Props) {
  const { data: product } = useQuery({
    queryKey: ['product-detail', productId],
    queryFn: () => apiFetch<ApiProductDetail>(`/products/${productId}`),
  })
  // ... resto igual, mas sem checks de type/own
}
```

Remover qualquer `if (product.type === 'own')` — só afiliado agora.

Remover mocked "quantity" state, "add to cart" mutations, stock check (afiliado não tem stock local — quem valida é o ML).

- [ ] **Step 2: Atualizar callers**

Grep quem passa `productType`:

```bash
grep -rn "ProductDetailScreen" src/ | grep -v "\.test\.\|.d\.ts"
```

Em cada caller (provavelmente `ShoppingScreen.tsx`, `FavoritesTab.tsx`), remover a prop `productType={...}` — deixar só `productId={...}` e `onBack={...}`.

- [ ] **Step 3: Rodar tests**

Run: `npx vitest run src/components/shopping/`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/shopping/ProductDetailScreen.tsx src/components/shopping/ShoppingScreen.tsx src/components/shopping/FavoritesTab.tsx
git commit -m "refactor(shopping): ProductDetailScreen accepts only affiliate products"
```

---

### Task 3.4: Simplificar ProductFormPage — só campos essenciais

**Files:**
- Modify: `src/admin/pages/ProductFormPage.tsx`

- [ ] **Step 1: Reduzir form pros 5 campos combinados**

Manter só:
- `name` (text)
- `description` (textarea)
- `mercadoLivreUrl` (URL com validação regex)
- `categoryId` (select)
- `images` (upload múltiplo)

Remover:
- `stock` (numérico) — não faz sentido pra ML
- `phases` (multiselect) — se ainda vai ser usado, manter; senão remover. **Decisão**: manter (dono não pediu pra tirar).
- `featured` toggle — manter (útil pra destacar)
- `active` toggle — manter

Se hoje tem campos `sku`, `weight`, `dimensions`, remover — só faziam sentido pra OwnProduct.

- [ ] **Step 2: Verificar payload no `POST/PUT`**

O payload enviado pro `admin/products` endpoint deve refletir os campos acima. Sem `stock`, `sku`, etc.

- [ ] **Step 3: Rodar typecheck**

Run: `npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/admin/pages/ProductFormPage.tsx
git commit -m "refactor(admin): simplify product form to essentials (name, desc, images, cat, ML URL)"
```

---

### Task 3.5: Deploy Fase 3 (frontend)

- [ ] **Step 1: Build + scp**

```bash
npm run build && \
  scp -P 443 -r dist/. root@2.25.137.78:/var/www/mothersteam/ && \
  npx cap sync android
```

- [ ] **Step 2: Smoke test em prod (browser)**

- Loja abre → 2 tabs (Produtos, Favoritos)
- Detalhe produto → botão "Comprar no Mercado Livre" → click → abre ML em nova aba
- Favoritos → só afiliados listados
- Admin (`/admin`) → só menu Dashboard, Produtos, Categorias
- Admin Produto Novo → form com 5 campos essenciais

---

## Cross-cutting concerns

### Migração de dados existentes

Fase 2 Task 2.3 dropa tabelas com dados. Todas as linhas de `Order`, `CartItem`, `PaymentMethod`, `Address`, `OwnProduct` são **permanentemente deletadas** em prod. Backup manual é feito no Task 2.5 Step 2 antes do migrate deploy.

Rows órfãs em `Review` e `WishlistItem` (com `productId IS NULL` e `ownProductId IS NOT NULL`) são deletadas pela migration.

### Testes existentes que ficam órfãos

- `server/src/routes/orders.installments.test.ts` — deletado com o route file (Task 2.1)
- Qualquer teste que importa componentes deletados vai quebrar type-check → deletar junto

### Fase 1 preserva backend routes antigos

Cart/Orders/Payment endpoints continuam funcionando em Fase 1 (só o frontend para de chamar). Isso é intencional: se der problema visual em prod, rollback do frontend restaura tudo. Só depois de Fase 1 estar estável em prod é que Fase 2 deleta rotas.

### Rollback plan

- **Fase 1**: revert 8 commits → build → scp → done. Backend intacto.
- **Fase 2**: rollback = `git revert` dos commits Fase 2 + `prisma migrate resolve --rolled-back <migration_name>` no VPS. **Dados dropados NÃO voltam** (usar backup do Task 2.5 Step 2 se precisar restaurar).
- **Fase 3**: revert commits + build + scp.

### Env vars a manter/remover

**Manter** (usados por outros features):
- `RESEND_API_KEY` — recovery de senha
- `FIREBASE_SERVICE_ACCOUNT_JSON` — push de comentários/mentions
- `ELEVENLABS_*` — Sara + MãeIA
- `DATABASE_URL`, `JWT_SECRET`, `REFRESH_SECRET`

**Remover** (só commerce):
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `VITE_MERCADO_PAGO_PUBLIC_KEY` (frontend `.env`)

---

## Self-Review

**1. Spec coverage:**
- ✅ Fase 1 (jornada usuário): CTA vira "Comprar no ML", redireciona via endpoint reaproveitado (renomeado /comprar) — Tasks 1.2, 1.4
- ✅ Rename `affiliateUrl` → `mercadoLivreUrl` — Tasks 1.1, 1.2
- ✅ Validação URL ML — Task 1.2
- ✅ Esconde cart/checkout/pedidos no frontend — Tasks 1.5, 1.6, 1.7
- ✅ Fase 2 backend: deleta cart/orders/payment/addresses/webhooks/MP integration — Tasks 2.1, 2.2, 2.4
- ✅ Fase 2 DB: drop tables — Task 2.3
- ✅ Fase 3 frontend: deleta telas + queries — Tasks 3.1, 3.2, 3.3
- ✅ Admin simplificado (nome, descrição, imagens, categoria, URL ML) — Task 3.4

**2. Placeholder scan:**
- Sem TBD/TODO/"add appropriate X"
- Cada task tem código completo mostrado (não "similar to Task N")
- Cada comando com output esperado
- Nenhum placeholder de arquitetura

**3. Type consistency:**
- `mercadoLivreUrl` usado consistentemente em Prisma, Zod, TypeScript
- `ApiProductDetail.mercadoLivreUrl` em `src/lib/types.ts` bate com backend
- Endpoint `/comprar` usado em backend Task 1.2 e frontend Tasks 1.4, 1.6

Nenhum gap encontrado.

---

**Plan complete and saved to `docs/superpowers/plans/2026-08-25-lojinha-afiliados-only.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
