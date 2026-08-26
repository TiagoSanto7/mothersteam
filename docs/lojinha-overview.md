# Lojinha — Documentação Técnica

> Última atualização: 2026-08-25 · Baseado em `feat/backend-cadastro-deploy` @ commit `139d498`

## Arquitetura em 1 parágrafo

Loja híbrida com **2 tipos de produto**: `Product` (afiliados — link externo, sem estoque local) e `OwnProduct` (venda direta — com estoque, entra no carrinho). Frontend em `src/components/shopping/*`, backend Fastify em `server/src/routes/*` (públicos) e `server/src/routes/admin/*` (protegidos por role `ADMIN`/`EDITOR`). Pagamentos via **MercadoPago SDK** (PIX + cartão + cartão salvo, 1-12x). Emails via **Resend**. Push via **FCM**. **Sem** integração dos Correios/rastreio — `trackingCode` é setado manualmente pelo admin.

---

## Modelo de dados (Prisma)

Arquivo: `server/prisma/schema.prisma`

| Modelo | O que é | Chave |
|---|---|---|
| `Category` | Categorias com `slug`, ícone emoji, `sortOrder` | usado por Product + OwnProduct |
| `Product` | **Afiliado** — só link + preço + imagens (JSON) + `affiliateUrl` | reviews, clicks, wishlist |
| `OwnProduct` | **Venda direta** — com `sku`, `stock` | cart, orders, reviews, wishlist |
| `ProductClick` | Analytics — cada clique em afiliado | indexado por `productId` + `clickedAt` |
| `Review` | 1-5 estrelas + texto opcional, `verifiedPurchase` bool | 1 review por user por produto (unique constraint) |
| `WishlistItem` | Favoritos (afiliado OU own) | union via 2 FKs |
| `CartItem` | **Só OwnProduct** (afiliados não vão pro cart) | qty + unique per user |
| `Order` | Pedido com `status` + campos MP + `trackingCode` | contém `OrderItem[]` |
| `OrderItem` | Line item com `priceAtPurchase` (snapshot) | preserva preço da hora da compra |
| `PaymentMethod` | Cartões salvos via MP (`mpCardId` unique, `brand`, `lastFour`, expiração) | 1:N com User |
| `Address` | Endereços do user com `isDefault` | 1:N com User |

### Campos MP no Order

```
mercadoPagoPaymentId  String?  // id retornado pela MP
mercadoPagoPixQrCode  String?  @db.Text  // base64 pra <img>
mercadoPagoPixCode    String?  @db.Text  // copy-paste code
trackingCode          String?  @db.VarChar(100)  // manual, sem Correios
```

### Estados de Order

```
PENDING → PAID → PREPARING → SHIPPED → DELIVERED
                                    ↓
                                CANCELLED (pode acontecer em qualquer transição)
```

---

## Endpoints backend

### Público (sem auth) — `server/src/routes/products-public.ts`

| Método | Path | O que faz |
|---|---|---|
| `GET` | `/products` | lista afiliados (cursor, filtro categoria/phase/featured) |
| `GET` | `/products/categories` | lista categorias ativas |
| `GET` | `/products/:id` | detalhe afiliado + reviews + related + inWishlist |
| `GET` | `/products/:id/go` | **redireciona** pro affiliateUrl (registra click) |
| `POST` | `/products/:id/click` | track click sem redirect |
| `POST` | `/products/:id/wishlist` | toggle favorito |
| `GET` | `/products/:id/reviews` | reviews paginadas |
| `POST` | `/products/:id/reviews` | criar/atualizar review |

### Auth-required (usuária logada)

| Arquivo | Endpoints principais |
|---|---|
| `cart.ts` | `GET/POST/PUT/DELETE /cart` + `POST /cart/shipping` (calcula frete por estado) |
| `wishlist.ts` | `GET /wishlist` (unificado afiliado + own) |
| `own-products.ts` | mesma estrutura de `/products` mas pra `OwnProduct` |
| `addresses.ts` | `GET/POST/PUT/DELETE /addresses` + `PUT /:id/default` |
| `payment-methods.ts` | `GET/DELETE /payment-methods` (delete sincroniza com MP) |
| `orders.ts` | `POST /orders` (cria + inicia pgto), `GET /orders`, `GET /orders/:id`, `GET /orders/installments` |

### Admin — `server/src/routes/admin/*` (requer role `ADMIN` ou `EDITOR`)

| Arquivo | Endpoints |
|---|---|
| `admin/products.ts` | CRUD + `POST /bulk` (importa até 500 afiliados de uma vez) |
| `admin/own-products.ts` | CRUD (delete é **hard**, não soft) |
| `admin/orders.ts` | listar + `PUT /:id/status` (muda status + trackingCode, dispara push) |
| `admin/categories.ts` | CRUD |

### Público não-autenticado (importante isolar)

| Método | Path | Notas |
|---|---|---|
| `POST` | `/orders/webhook` | **webhook MP** (valida HMAC-SHA256 no header `x-signature`) |

Se `MERCADO_PAGO_WEBHOOK_SECRET` não estiver setado, o webhook rejeita tudo com 401 (fix de segurança intencional).

---

## Integrações externas

### 💳 MercadoPago

**Env vars:**
- Backend: `MERCADO_PAGO_ACCESS_TOKEN` + `MERCADO_PAGO_WEBHOOK_SECRET`
- Frontend: `VITE_MERCADO_PAGO_PUBLIC_KEY`

**SDK frontend:** v2 carregado de `https://sdk.mercadopago.com/js/v2` no `CheckoutScreen.tsx`. Tokeniza cartão do lado do cliente — número **nunca** chega no nosso backend.

**Métodos suportados:**
- PIX (instantâneo, sem taxa MP)
- Cartão (1-12x, detecta bandeira Visa/Master/Elo/Amex/Hipercard via regex)

**Cartão salvo:**
- Primeira compra: cria `mpCustomerId` no user + `mpCardId`
- Futuras compras: token do card salvo + CVV (nunca guardamos CVV)

**Fluxo de pagamento:**

```
POST /orders
├─ status = PENDING
├─ PIX:
│   └─ retorna QR base64 + código copy-paste
│       └─ frontend polla GET /orders/:id a cada 3s (até 10min)
│           └─ webhook confirma → status = PAID → estoque decrementa
│                                              → cart limpa → email enviado
└─ Cartão:
    └─ tokenização síncrona
        ├─ aprovado → status = PAID (mesma sequência do PIX aprovado)
        ├─ pendente/in_process → cart limpo otimista, aguarda webhook
        └─ rejeitado → status = CANCELLED
```

**Validação do webhook:**
HMAC-SHA256 sobre `id:{data.id};request-id:{x-request-id};ts:{timestamp}` usando `MERCADO_PAGO_WEBHOOK_SECRET`.

**Endpoint de parcelas em tempo real:**
`GET /orders/installments?paymentMethodId={brand}&amount={total}` — chama `v1/payment_methods/installments` do MP pra retornar opções REAIS de parcelamento (com juros da bandeira).

### 📧 Email (Resend)

- **Env:** `RESEND_API_KEY` + `EMAIL_FROM` (default `"Mothers Team <noreply@santoti.com>"`)
- **Trigger:** só na confirmação de pagamento (aprovação síncrona OU webhook)
- Wrapper `sendEmail()` em `server/src/plugins/email.ts` — loga falha mas não faz throw (não trava o request se Resend cair)

### 🔔 Push (Firebase Cloud Messaging)

- **Env:** `FIREBASE_SERVICE_ACCOUNT_JSON` (JSON stringificado, inicialização lazy)
- **Triggers:** transição de status do pedido
  - `PAID` → 🎉 "Pedido pago!"
  - `PREPARING` → 📦 "Preparando seu pedido"
  - `SHIPPED` → 🚚 "Pedido a caminho"
  - `DELIVERED` → 🏠 "Pedido entregue"
- Enviado tanto pelo webhook MP quanto pelo `PUT /admin/orders/:id/status`

### 📮 Correios / rastreio

**NÃO existe integração.** `trackingCode` é campo string preenchido manualmente pelo admin no update de status. Sem polling, sem API dos Correios, sem atualização automática do status "in transit" → "delivered".

**Frontend** (`OrderDetailScreen.tsx`) faz link pra `https://rastreamento.correios.com.br/...` se o trackingCode aparenta ser um código de postagem BR (heurística de formato).

### 🏠 ViaCEP

Frontend chama `https://viacep.com.br/ws/{cep}/json/` no formulário de endereço (`CheckoutScreen.tsx`) pra autocompletar cidade/estado/bairro/rua por CEP. Sem chave, gratuito.

---

## Fluxo do usuário

**Entrada:**
- `BottomTabBar` (aba shopping)
- `LeftSidebar` — botão "Shopping"
- `SideDrawer` — item "Lojinha"

```
ShoppingScreen (3 tabs)
├─ Produtos: grid categoria/featured
│  └─ ProductDetailScreen
│     ├─ Afiliado: "Ver no site" → GET /products/:id/go → abre link externo
│     └─ Own: "Adicionar ao carrinho" → POST /cart
├─ Favoritos: FavoritesTab (afiliado + own unificados)
└─ Pedidos: OrdersTab
   └─ OrderDetailScreen
      └─ Timeline visual + link Correios (se trackingCode)

CartScreen
└─ CheckoutScreen (3 passos com stepper visual)
   1. Address (lista + form + ViaCEP autocomplete)
   2. Payment (PIX ou cartão + parcelas dinâmicas)
   3. Confirmação
      ├─ PIX: PixWaitingScreen (QR code + copy-paste + polling 3s)
      └─ Cartão: Success screen com order # + delivery ETA
```

### Componentes principais

Arquivo | Screen | Endpoints usados
---|---|---
`src/components/shopping/ShoppingScreen.tsx` | Home da loja com 3 tabs | `GET /products`, `/own-products`, `/products/categories`, `/cart`
`ProductDetailScreen.tsx` | Detalhe do produto | `GET /products/:id` ou `/own-products/:id`, `POST /cart`, `POST /*/wishlist`, `GET /*/go` (afiliado)
`CartScreen.tsx` | Carrinho | `GET /cart`, `POST /cart/shipping`, `PUT/DELETE /cart/:itemId`
`CheckoutScreen.tsx` | 3-step checkout | `GET /addresses`, `/payment-methods`, `/orders/installments`, `POST /addresses`, `/orders`
`OrdersTab.tsx` | Histórico de pedidos | `GET /orders`
`OrderDetailScreen.tsx` | Detalhe de pedido + timeline | `GET /orders/:id`
`FavoritesTab.tsx` | Wishlist unificado | `GET /wishlist`, toggles `POST /*/wishlist`
`ReviewsScreen.tsx` | Lista de reviews | `GET /*/reviews`
`ReviewModal.tsx` | Criar/editar review | `POST /*/reviews`

---

## Admin

Rotas separadas em `src/admin/pages/*`, protegidas por role.

### ProductsPage (`src/admin/pages/ProductsPage.tsx`)

- Tabela paginada de afiliados
- Filtros: search por nome, categoria, ativo/inativo
- Ações por linha:
  - ⭐ toggle featured
  - 👁️ toggle active (visibilidade)
  - ✏️ editar
  - 🗑️ soft delete (marca `active = false`)
- **Bulk import CSV/XLSX**: template com colunas `nome`, `descricao`, `preco`, `categoria_slug`, `url_afiliado`, `fases`, `estoque`, `destaque`. Até 500 linhas. Retorna linhas com erro pra retry.

### ProductFormPage

Create/edit com upload múltiplo de imagens (`uploadImage()` helper).

### Admin de OwnProduct e Orders

Separados. `OwnProduct` delete é hard (não soft). Orders admin faz `PUT /:id/status` que muda status + `trackingCode` opcional + dispara push notification automático.

---

## Estado no frontend

**Zero Zustand slots pra shopping.** Toda state vive em React Query com essas keys:

- `['cart']`
- `['wishlist']`
- `['orders']`, `['orders', orderId]`
- `['payment-methods']`
- `['addresses']`
- `['product-detail', type, id]`
- `['reviews', type, id, page]`

`staleTime` 30-60s pra auto-revalidation.

---

## Tipos frontend

`src/lib/types.ts` (linhas ~220-370):

- `ApiCategory`, `ApiOwnProduct`, `ApiProductDetail` (afiliado), `ApiOwnProductDetail`
- `ApiReview`, `ApiReviewsSummary` (com `distribution: Record<string, number>`)
- `ApiCart`, `ApiCartItem`
- `ApiWishlistEntry` (union `type: 'affiliate' | 'own'`)
- `ApiAddress`
- `ApiOrder`, `ApiOrderItem` (com `priceAtPurchase`)
- `ApiPaymentMethod`
- `ApiInstallmentOption`

---

## Gaps identificados (a considerar antes de escalar)

| Gap | Severidade | Onde | Fix estimado |
|---|---|---|---|
| Nenhuma busca por texto | Média | ShoppingScreen só filtro por categoria | 2-3h |
| Sem botão de cancelar pedido | Média | OrderDetailScreen mostra status, mas sem cancel action | 1-2h |
| Sem edição de endereço | Baixa | Só create+delete, não edit | 1h |
| **Sem rastreio automático** | Alta se escala | `trackingCode` manual, sem API Correios | dias (integração Correios) |
| Sem low-stock warnings pra admin | Baixa | Estoque só validado no add-to-cart | 2h |
| Shipping table duplicada | Muito baixa | `cart.ts:3-21` e `orders.ts:51-55` — mesma tabela por estado | 30min (extrair pra utility) |
| Wishlist só como aba | Baixa | Reachable só via ShoppingScreen (sem entrada própria no nav) | 1h |
| Sem CTA de shopping em Home/Jornada | Baixa | Só na sidebar/drawer | design decision |

---

## Env vars de produção (checklist antes de escalar)

Ver [`memory/project-credentials-checklist.md`] pra lista completa. Resumo do shopping:

- `MERCADO_PAGO_ACCESS_TOKEN` — chave PROD da conta MP dos donos
- `VITE_MERCADO_PAGO_PUBLIC_KEY` — chave pública PROD
- `MERCADO_PAGO_WEBHOOK_SECRET` — **sem isso o checkout não funciona** (webhook rejeita 401 sempre)
- `RESEND_API_KEY` — pra emails de confirmação
- `FIREBASE_SERVICE_ACCOUNT_JSON` — pra push notifications

---

## Como testar localmente

**Backend + dev DB:**
```bash
docker compose up -d          # MySQL 8 em localhost:3307
cd server && npm run dev      # Fastify em localhost:3001
```

**Frontend:**
```bash
npm run dev                   # Vite em localhost:5173
```

**Fluxo de smoke test manual:**
1. Login/register
2. Ir pra Shopping (sidebar/drawer)
3. Tab Produtos → clicar num own product → Adicionar ao carrinho
4. Ir pro carrinho → Finalizar pedido
5. Checkout: escolher endereço (adicionar se não tem) → PIX
6. Verificar QR code renderiza + polling funciona

**Sem MP real:** MP em modo teste retorna QR code fake, mas o polling só resolve com webhook real (ou via `PUT /admin/orders/:id/status` manual pra simular pagamento aprovado).
