# Spec — Shopping: Detalhe, Reviews, Carrinho & Checkout

**Data:** 2026-08-11
**Status:** Aprovado

---

## Visão Geral

Quatro subsistemas independentes que transformam o shopping do app em uma experiência completa de descoberta e compra mobile, mantendo o modelo híbrido de produtos afiliados (redirect) e produtos próprios (checkout interno via Mercado Pago).

**Ordem de implementação obrigatória:** 1 → 2 → 3 → 4 (cada um depende do anterior).

---

## Modelo de Produto Híbrido

Dois tipos coexistem no mesmo shopping:

- **`Product`** (já existe) — produto afiliado. Tem `affiliateUrl`. CTA = "Ver no site" via redirect no backend.
- **`OwnProduct`** (novo) — produto da loja Mothers Team. Sem `affiliateUrl`. CTA = "Adicionar ao carrinho" ou "Indisponível".

A distinção é feita pela presença/ausência no model, nunca por campo discriminador. Frontend recebe `type: 'affiliate' | 'own'` nos responses da API.

---

## 1. Arquitetura de Dados — Novos Models Prisma

### `OwnProduct`
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
```

### `Review`
```prisma
model Review {
  id              String      @id @default(cuid())
  rating          Int         // 1–5
  text            String?     @db.VarChar(500)
  verifiedPurchase Boolean    @default(false)
  userId          String
  user            User        @relation(fields: [userId], references: [id])
  productId       String?     // afiliado
  product         Product?    @relation(fields: [productId], references: [id])
  ownProductId    String?     // próprio
  ownProduct      OwnProduct? @relation(fields: [ownProductId], references: [id])
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@unique([userId, productId])
  @@unique([userId, ownProductId])
}
```

Exatamente um de `productId` ou `ownProductId` deve ser não-nulo — validado no backend via Zod.

### `WishlistItem`
```prisma
model WishlistItem {
  id           String      @id @default(cuid())
  userId       String
  user         User        @relation(fields: [userId], references: [id])
  productId    String?     // afiliado
  product      Product?    @relation(fields: [productId], references: [id])
  ownProductId String?     // próprio
  ownProduct   OwnProduct? @relation(fields: [ownProductId], references: [id])
  createdAt    DateTime    @default(now())

  @@unique([userId, productId])
  @@unique([userId, ownProductId])
}
```

### `CartItem`
```prisma
model CartItem {
  id           String     @id @default(cuid())
  userId       String
  user         User       @relation(fields: [userId], references: [id])
  ownProductId String
  ownProduct   OwnProduct @relation(fields: [ownProductId], references: [id])
  quantity     Int        @default(1)
  createdAt    DateTime   @default(now())

  @@unique([userId, ownProductId])
}
```

### `Order`
```prisma
model Order {
  id                    String      @id @default(cuid())
  userId                String
  user                  User        @relation(fields: [userId], references: [id])
  status                OrderStatus @default(PENDING)
  total                 Decimal     @db.Decimal(10, 2)
  shippingFee           Decimal     @db.Decimal(10, 2)
  mercadoPagoPaymentId  String?
  mercadoPagoPaymentUrl String?     // URL do QR Code PIX
  addressId             String
  address               Address     @relation(fields: [addressId], references: [id])
  items                 OrderItem[]
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt
}

enum OrderStatus {
  PENDING
  PAID
  PREPARING
  SHIPPED
  DELIVERED
  CANCELLED
}
```

### `OrderItem`
```prisma
model OrderItem {
  id             String     @id @default(cuid())
  orderId        String
  order          Order      @relation(fields: [orderId], references: [id])
  ownProductId   String
  ownProduct     OwnProduct @relation(fields: [ownProductId], references: [id])
  quantity       Int
  priceAtPurchase Decimal   @db.Decimal(10, 2)
}
```

### `Address`
```prisma
model Address {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
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

---

## 2. Backend API

### Redirect de afiliado (sem lógica no frontend)
```
GET /products/:id/go
→ registra ProductClick, retorna { url: string }
→ frontend abre a URL retornada
```

### Produtos próprios (público)
```
GET  /own-products
     ?limit=20&cursor=&categoryId=&featured=&phase=
     → { items: OwnProduct[], hasMore, nextCursor }

GET  /own-products/:id
     → OwnProduct + reviewsSummary { average, count } + reviews (3 mais recentes)
       + inWishlist: bool (se autenticado)

POST /own-products/:id/wishlist   [auth]
     → toggle: adiciona se não existe, remove se existe
     → { inWishlist: bool }
```

### Wishlist
```
GET /wishlist   [auth]
    → { items: Array<{ type: 'affiliate'|'own', product: Product|OwnProduct, savedAt }> }
```

### Afiliado — wishlist
```
POST /products/:id/wishlist   [auth]
     → toggle, retorna { inWishlist: bool }
```

### Reviews
```
GET  /products/:id/reviews?page=1&limit=20
     → { items: Review[], total, average, distribution: { 1:N, 2:N, 3:N, 4:N, 5:N } }

POST /products/:id/reviews   [auth]
     body: { rating: 1-5, text?: string }
     → cria ou atualiza (upsert por userId+productId)
     → verifiedPurchase calculado pelo backend: true se existe ProductClick deste userId

GET  /own-products/:id/reviews?page=1&limit=20
     → mesmo shape

POST /own-products/:id/reviews   [auth]
     → verifiedPurchase: true se existe OrderItem deste userId para este produto
```

### Carrinho
```
GET    /cart              [auth] → { items: CartItem[], subtotal, itemCount }
POST   /cart              [auth] body: { ownProductId, quantity }
                                  → upsert: incrementa quantity se item já existe no carrinho
PUT    /cart/:itemId      [auth] body: { quantity }  (quantity=0 remove o item)
DELETE /cart/:itemId      [auth]
POST   /cart/shipping     [auth] body: { addressId } → { fee, estimatedDays }
```

### Endereços
```
GET    /addresses           [auth]
POST   /addresses           [auth]
PUT    /addresses/:id       [auth]
DELETE /addresses/:id       [auth]
PUT    /addresses/:id/default [auth] → marca como padrão, desmarca outros
```

### Pedidos
```
POST /orders   [auth]
     body: { addressId, paymentMethod: 'pix' | 'credit_card', cardToken?: string, installments?: number }
     → cria Order (status PENDING) + chama Mercado Pago
     → se PIX: { orderId, status: 'pending', pixQrCode, pixCode }
     → se cartão: { orderId, status: 'paid'|'rejected' }

GET  /orders          [auth] → lista de pedidos com status + itens resumidos
GET  /orders/:id      [auth] → detalhe completo do pedido

POST /orders/webhook  [público, validado por X-Signature do MP]
     → atualiza status do Order
     → dispara push notification via FCM se status muda para PAID/SHIPPED/DELIVERED
```

### Admin
```
CRUD /admin/own-products    → gerenciar produtos próprios (mesma estrutura dos afiliados)
GET  /admin/orders          → lista de pedidos com filtro por status
PUT  /admin/orders/:id/status  body: { status } → atualiza status + dispara push
```

### Frete
Tabela fixa por estado no backend (sem integração Correios nesta fase). Valor configurável por variável de ambiente ou tabela no banco. Retorna prazo estimado em dias úteis.

---

## 3. Subsistema 1 — Tela de Detalhe do Produto

### Navegação
Push navigation a partir de `ShoppingScreen`. O toque em qualquer card (afiliado ou próprio) navega para `ProductDetailScreen` passando `{ type: 'affiliate' | 'own', id: string }`.

### `ProductDetailScreen` — estrutura
```
Header fixo:
  ← voltar                    ♡ (toggle wishlist)

Scroll vertical:
  1. Galeria de fotos
     - Swipe horizontal entre imagens
     - Paginação com dots na base
     - Placeholder se sem imagens

  2. Meta
     - Chip de categoria + chips de fases
     - Nome do produto (título grande)
     - Preço (R$ formatado, 2 casas)
     - Média estrelas + contagem → ao tocar, scroll até reviews

  3. Descrição
     - Texto colapsado (3 linhas) com botão "ver mais"

  4. Avaliações — teaser
     - Média + distribuição compacta
     - 3 reviews mais recentes
     - Botão "Ver todas as avaliações" → push para ReviewsScreen

  5. Produtos relacionados
     - Scroll horizontal, mesma categoria, máx 10 itens

Rodapé fixo:
  CTA adaptado por tipo:
  - Afiliado:        [Ver no site →]          chama GET /products/:id/go
  - Próprio c/stock: [Adicionar ao carrinho]  chama POST /cart
  - Próprio s/stock: [Indisponível]           botão desabilitado
```

### Estado do ♡ (wishlist)
Retornado pelo `GET /products/:id` ou `GET /own-products/:id` como `inWishlist: bool`. Toggle otimista no frontend — reverte se a chamada falhar.

### Feedback ao adicionar ao carrinho
Toast "Adicionado ao carrinho" com link rápido "Ver carrinho". Badge na sidebar atualizado via React Query `invalidateQueries`.

---

## 4. Subsistema 2 — Reviews & Ratings

### `ReviewsScreen`
Push a partir do botão "Ver todas as avaliações" na tela de detalhe.

```
Header: ← voltar + nome do produto

Seção de resumo:
  Média grande (ex: 4.2)
  5★ ████████░░  18
  4★ ██████░░░░  12
  3★ ███░░░░░░░   5
  2★ █░░░░░░░░░   2
  1★ ░░░░░░░░░░   1

Botão "Escrever avaliação" (visível para qualquer usuária logada)

Lista paginada de reviews:
  - Avatar inicial do nome
  - Nome (ex: "Ana M.")
  - Estrelas
  - Badge "✓ Compra verificada" se verifiedPurchase=true
  - Texto da avaliação (se houver)
  - Data relativa (ex: "há 2 dias")
```

### Modal "Escrever avaliação"
Bottom sheet:
- Seletor de 5 estrelas (toque para selecionar, obrigatório)
- Campo de texto opcional, máx 500 chars, contador regressivo
- Botão "Publicar"
- Se usuária já avaliou: abre pré-preenchido para editar
- Backend faz upsert — POST único trata criação e edição

### Regras backend
- `rating` obrigatório, inteiro 1–5
- `text` opcional, máx 500 chars
- `verifiedPurchase` calculado server-side, nunca aceito do cliente
- Upsert por `(userId, productId)` ou `(userId, ownProductId)`

---

## 5. Subsistema 3 — Wishlist & Carrinho

### Navegação dentro do Shopping
Shopping abre pela sidebar. A tela tem **top tabs internos**:

```
Header: "Shopping"   [🛒 badge]
        ─────────────────────────
        Produtos | Favoritos | Pedidos
```

O ícone 🛒 no header abre `CartScreen` via push, independente do tab ativo.

O ícone da sidebar ganha badge com `itemCount` do carrinho (React Query, sem polling — atualizado em cache local).

### `FavoritesTab` (tab "Favoritos")
Lista de wishlist. Cada item:
- Foto, categoria, nome, preço
- CTA adaptado (mesmo da tela de detalhe)
- Ícone ♡ preenchido → remover da wishlist (otimista)

### `CartScreen` (push)
```
Header: ← Carrinho  (N itens)

Lista de CartItems:
  [foto] Nome           − [qtd] +
         R$ preço       [remover]

Seção de total:
  Subtotal:   R$ X
  Frete:      R$ Y  (calculado pelo CEP do endereço padrão)
  ─────────────────
  Total:      R$ Z

CTA: [Finalizar pedido]  → push para CheckoutScreen

Estado vazio:
  Ilustração + "Seu carrinho está vazio"
  [Explorar produtos]
```

Frete calculado automaticamente ao abrir o carrinho se a usuária tem endereço padrão. Sem endereço padrão: "Frete calculado no checkout".

Controle de quantidade:
- `−` com quantity=1: remove o item (com confirmação por toast de desfazer)
- `+` limitado ao estoque disponível

---

## 6. Subsistema 4 — Checkout & Entrega

### `CheckoutScreen` — 3 etapas em stepper

**Etapa 1 — Endereço**
- Lista de endereços salvos, rádio de seleção
- Endereço padrão pré-selecionado
- Botão "+ Novo endereço" expande formulário inline
- Campos: nome do destinatário, CEP (com auto-preenchimento via ViaCEP), rua, número, complemento, bairro, cidade, estado
- Botão "Continuar"

**Etapa 2 — Pagamento**
```
Resumo colapsável (N itens — R$ total)

○ PIX
  Aprovação imediata. QR Code gerado após confirmar.

○ Cartão de crédito
  [Número do cartão]
  [MM/AA]  [CVV]
  [Nome no cartão]
  Parcelar em: [1x R$X ▾]  (opções geradas pelo Mercado Pago)

[Confirmar pedido]
```

Frontend usa **Mercado Pago SDK JS** apenas para tokenizar o cartão (gera `cardToken` no browser — PCI-safe). O token + dados do pedido vão para `POST /orders`. Toda lógica de cobrança no backend.

**PIX — fluxo após confirmar:**
Tela de espera com QR Code + código copia-e-cola. Polling a cada 3s em `GET /orders/:id`. Timeout de 10 minutos → status CANCELLED automático no backend. Ao receber status `PAID`: transição para etapa 3.

**Cartão — fluxo:**
Response do `POST /orders` já traz o resultado (aprovado/recusado). Se recusado: mensagem de erro com opção de tentar novamente ou trocar para PIX.

**Etapa 3 — Confirmação**
```
✅ Pedido confirmado!
   #MT-00042
   Previsão: 5–8 dias úteis
   [Ver meu pedido]   [Continuar comprando]
```

### `OrdersTab` (tab "Pedidos" no shopping)
Lista de pedidos com:
- Status visual com cor (badge)
- Data do pedido
- Total
- Primeiros 2 itens com foto
- Toque → push para `OrderDetailScreen`

### `OrderDetailScreen`
Timeline de status:
```
✅ Pago         12/08  14:32
✅ Preparando   13/08  09:00
○  Enviado
○  Entregue
```
Itens do pedido com foto, nome, quantidade, preço unitário e total.
Endereço de entrega.
Código de rastreio (quando status = SHIPPED, admin preenche no painel).

---

## 7. Navegação — Resumo

| Origem | Ação | Destino | Tipo |
|---|---|---|---|
| Sidebar | toque em Shopping | ShoppingScreen (com top tabs) | replace |
| ShoppingScreen / FavoritesTab | toque em produto | ProductDetailScreen | push |
| ProductDetailScreen | "Ver todas avaliações" | ReviewsScreen | push |
| ShoppingScreen header | toque em 🛒 | CartScreen | push |
| CartScreen | "Finalizar pedido" | CheckoutScreen | push |
| CheckoutScreen etapa 3 | "Ver meu pedido" | OrderDetailScreen | push |
| ShoppingScreen tab "Pedidos" | toque em pedido | OrderDetailScreen | push |

**Badge sidebar:** contagem de itens no carrinho. Atualizado via React Query sem polling — invalidado a cada mutação no carrinho.

**Push notifications (FCM):** disparadas pelo backend nos eventos PAID, SHIPPED, DELIVERED. Frontend registra token FCM no login via `@capacitor/push-notifications` e envia para `PUT /users/fcm-token` body: `{ token: string, platform: 'android' | 'ios' }`. Token salvo no model `User` (novo campo `fcmToken String?`).

---

## 8. Fora de Escopo (esta fase)

- Variantes de produto (tamanho, cor)
- Integração com Correios para frete real
- Cupons de desconto
- Devolução / reembolso
- Review com foto
- Compartilhamento de wishlist
- Atualização de produtos afiliados via planilha
- Programa de fidelidade
