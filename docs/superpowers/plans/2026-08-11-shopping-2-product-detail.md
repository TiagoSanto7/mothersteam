# Shopping — Plano 2: Tela de Detalhe do Produto

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar `ProductDetailScreen` com galeria de fotos, meta, descrição colapsável, teaser de reviews e CTA adaptado por tipo (afiliado / próprio). Adicionar navegação push a partir do ShoppingScreen via overlay em App.tsx.

**Architecture:** Overlay de `fixed inset-0 z-50` em App.tsx, igual ao padrão de SettingsScreen/ProfileScreen. Estado `openProduct: { type, id } | null` em App.tsx. TanStack Query para buscar detalhe. Zustand somente via selectors atômicos.

**Tech Stack:** React, TanStack Query, Tailwind, Lucide icons, apiFetch

**Dependência:** Plano 1 concluído (rotas `GET /products/:id` e `GET /own-products/:id` existem).

---

## File Structure

- Modify: `src/lib/types.ts` — adicionar tipos de shopping
- Create: `src/components/shopping/ProductDetailScreen.tsx`
- Modify: `src/components/shopping/ShoppingScreen.tsx` — receber `onOpenProduct` prop
- Modify: `src/App.tsx` — estado `openProduct` + overlay

---

### Task 1: Adicionar tipos de shopping em types.ts

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Adicionar os novos tipos ao final do arquivo**

```typescript
// ── Shopping types ──────────────────────────────────────────

export interface ApiCategory {
  id: string
  name: string
  slug: string
  icon: string
}

export interface ApiOwnProduct {
  id: string
  type: 'own'
  name: string
  description: string
  price: string
  images: string[]
  stock: number
  sku?: string | null
  featured: boolean
  active: boolean
  categoryId: string
  category: ApiCategory
  createdAt: string
  updatedAt: string
}

export interface ApiReview {
  id: string
  rating: number
  text?: string | null
  verifiedPurchase: boolean
  userId: string
  user: { id: string; name: string; avatarUrl?: string | null }
  createdAt: string
}

export interface ApiReviewsSummary {
  average: number
  count: number
  distribution: Record<string, number>
}

export interface ApiProductDetail {
  id: string
  type: 'affiliate'
  name: string
  description: string
  price: string
  affiliateUrl?: string | null
  images: string[]
  phases: string[]
  stock?: number | null
  featured: boolean
  active: boolean
  categoryId: string
  category: ApiCategory
  reviewsSummary: ApiReviewsSummary
  reviews: ApiReview[]
  inWishlist: boolean
  related: Array<ApiProductDetail | ApiOwnProductDetail>
  createdAt: string
  updatedAt: string
}

export interface ApiOwnProductDetail extends ApiOwnProduct {
  reviewsSummary: ApiReviewsSummary
  reviews: ApiReview[]
  inWishlist: boolean
  related: ApiOwnProduct[]
}

export type AnyProductDetail = ApiProductDetail | ApiOwnProductDetail

export interface ApiCartItem {
  id: string
  ownProductId: string
  ownProduct: ApiOwnProduct
  quantity: number
  createdAt: string
}

export interface ApiCart {
  items: ApiCartItem[]
  subtotal: string
  itemCount: number
}

export interface ApiWishlistEntry {
  type: 'affiliate' | 'own'
  product: ApiAdminProduct | ApiOwnProduct
  savedAt: string
}

export interface ApiAddress {
  id: string
  recipientName: string
  street: string
  number: string
  complement?: string | null
  neighborhood: string
  city: string
  state: string
  zipCode: string
  isDefault: boolean
  createdAt: string
}

export interface ApiOrderItem {
  id: string
  ownProductId: string
  ownProduct: { id: string; name: string; images: string[]; price: string }
  quantity: number
  priceAtPurchase: string
}

export interface ApiOrder {
  id: string
  userId: string
  status: 'PENDING' | 'PAID' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  total: string
  shippingFee: string
  mercadoPagoPaymentId?: string | null
  mercadoPagoPixQrCode?: string | null
  mercadoPagoPixCode?: string | null
  trackingCode?: string | null
  addressId: string
  address: ApiAddress
  items: ApiOrderItem[]
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add shopping types — OwnProduct, ProductDetail, Review, Cart, Order"
```

---

### Task 2: Criar ProductDetailScreen

**Files:**
- Create: `src/components/shopping/ProductDetailScreen.tsx`

- [ ] **Step 1: Criar o arquivo completo**

```tsx
// src/components/shopping/ProductDetailScreen.tsx
import { useState } from 'react'
import { ChevronLeft, Heart, Star, ShoppingCart, ExternalLink, Package } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import type { AnyProductDetail } from '../../lib/types'

interface Props {
  productType: 'affiliate' | 'own'
  productId: string
  onBack: () => void
  onOpenProduct: (type: 'affiliate' | 'own', id: string) => void
  onOpenReviews: (productType: 'affiliate' | 'own', productId: string, productName: string) => void
  onOpenCart: () => void
}

export function ProductDetailScreen({
  productType,
  productId,
  onBack,
  onOpenProduct,
  onOpenReviews,
  onOpenCart,
}: Props) {
  const queryClient = useQueryClient()
  const [imageIndex, setImageIndex] = useState(0)
  const [descExpanded, setDescExpanded] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)

  const endpoint = productType === 'affiliate' ? `/products/${productId}` : `/own-products/${productId}`

  const { data: product, isLoading } = useQuery({
    queryKey: ['product-detail', productType, productId],
    queryFn: () => apiFetch<AnyProductDetail>(endpoint),
    staleTime: 60_000,
  })

  const wishlistMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ inWishlist: boolean }>(
        productType === 'affiliate' ? `/products/${productId}/wishlist` : `/own-products/${productId}/wishlist`,
        { method: 'POST' }
      ),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['product-detail', productType, productId] })
      const prev = queryClient.getQueryData<AnyProductDetail>(['product-detail', productType, productId])
      if (prev) {
        queryClient.setQueryData(['product-detail', productType, productId], {
          ...prev,
          inWishlist: !prev.inWishlist,
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['product-detail', productType, productId], ctx.prev)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
    },
  })

  const cartMutation = useMutation({
    mutationFn: () =>
      apiFetch('/cart', { method: 'POST', body: JSON.stringify({ ownProductId: productId, quantity: 1 }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      setAddedToCart(true)
      setTimeout(() => setAddedToCart(false), 3000)
    },
  })

  const affiliateMutation = useMutation({
    mutationFn: () => apiFetch<{ url: string }>(`/products/${productId}/go`),
    onSuccess: ({ url }) => window.open(url, '_blank', 'noopener,noreferrer'),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF]">
        <div className="flex items-center gap-3 px-4 pt-10 pb-4">
          <button onClick={onBack} className="w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center">
            <ChevronLeft size={18} className="text-graphite" />
          </button>
        </div>
        <div className="flex-1 px-4 flex flex-col gap-4 animate-pulse">
          <div className="w-full h-64 rounded-3xl bg-white/50" />
          <div className="h-4 w-3/4 rounded bg-white/50" />
          <div className="h-6 w-1/2 rounded bg-white/50" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] items-center justify-center gap-3">
        <Package size={40} className="text-graphite-muted" />
        <p className="text-graphite-muted text-sm">Produto não encontrado</p>
        <button onClick={onBack} className="text-sara-gold text-sm font-medium">Voltar</button>
      </div>
    )
  }

  const images = product.images as string[]
  const isOwn = product.type === 'own'
  const hasStock = isOwn ? (product as any).stock > 0 : true
  const phases = (product as any).phases as string[] | undefined

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-10 pb-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-white/70 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
        >
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <button
          onClick={() => wishlistMutation.mutate()}
          disabled={wishlistMutation.isPending}
          className="w-9 h-9 rounded-xl bg-white/70 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
        >
          <Heart
            size={20}
            className={product.inWishlist ? 'text-sara-terracotta fill-current' : 'text-graphite-muted'}
          />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-28 px-4">
        {/* Image gallery */}
        <div className="relative mb-4">
          <div className="w-full h-64 rounded-3xl overflow-hidden bg-white/60">
            {images.length > 0 ? (
              <img
                src={images[imageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package size={48} className="text-graphite-muted" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <>
              {/* Swipe dots */}
              <div className="flex justify-center gap-1.5 mt-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImageIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === imageIndex ? 'bg-sara-gold' : 'bg-graphite-muted/30'
                    }`}
                  />
                ))}
              </div>
              {/* Prev/Next */}
              {imageIndex > 0 && (
                <button
                  onClick={() => setImageIndex((i) => i - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center"
                >
                  <ChevronLeft size={16} className="text-graphite" />
                </button>
              )}
              {imageIndex < images.length - 1 && (
                <button
                  onClick={() => setImageIndex((i) => i + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center rotate-180"
                >
                  <ChevronLeft size={16} className="text-graphite" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Meta */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="px-2.5 py-1 rounded-full bg-white/70 text-xs text-graphite-muted font-medium">
            {product.category.icon} {product.category.name}
          </span>
          {phases?.map((ph) => (
            <span key={ph} className="px-2.5 py-1 rounded-full bg-sara-gold/10 text-xs text-sara-gold font-medium">
              {ph}
            </span>
          ))}
        </div>

        <h1 className="text-xl font-bold text-graphite leading-snug mb-1">{product.name}</h1>
        <p className="text-2xl font-extrabold text-sara-gold mb-2">
          R$ {Number(product.price).toFixed(2)}
        </p>

        {/* Stars summary — tap to scroll to reviews */}
        {product.reviewsSummary.count > 0 && (
          <button
            className="flex items-center gap-1.5 mb-4"
            onClick={() => onOpenReviews(productType, productId, product.name)}
          >
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={14}
                  className={
                    s <= Math.round(product.reviewsSummary.average)
                      ? 'text-sara-gold fill-current'
                      : 'text-graphite-muted/30'
                  }
                />
              ))}
            </div>
            <span className="text-xs text-graphite-muted">
              {product.reviewsSummary.average.toFixed(1)} ({product.reviewsSummary.count} avaliações)
            </span>
          </button>
        )}

        {/* Description */}
        <div className="mb-5">
          <p
            className={`text-sm text-graphite leading-relaxed ${
              !descExpanded ? 'line-clamp-3' : ''
            }`}
          >
            {product.description}
          </p>
          <button
            onClick={() => setDescExpanded((v) => !v)}
            className="text-xs text-sara-gold font-medium mt-1"
          >
            {descExpanded ? 'Ver menos' : 'Ver mais'}
          </button>
        </div>

        {/* Reviews teaser */}
        {product.reviewsSummary.count > 0 && (
          <div className="bg-white/60 rounded-3xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-2xl font-bold text-graphite">
                  {product.reviewsSummary.average.toFixed(1)}
                </span>
                <span className="text-xs text-graphite-muted ml-1">/ 5</span>
              </div>
              <div className="flex flex-col gap-1 flex-1 ml-4">
                {[5, 4, 3, 2, 1].map((r) => {
                  const count = product.reviewsSummary.distribution[r] ?? 0
                  const pct = product.reviewsSummary.count
                    ? (count / product.reviewsSummary.count) * 100
                    : 0
                  return (
                    <div key={r} className="flex items-center gap-1.5">
                      <span className="text-[10px] text-graphite-muted w-2">{r}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-graphite-muted/20 overflow-hidden">
                        <div
                          className="h-full bg-sara-gold rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            {product.reviews.slice(0, 2).map((review) => (
              <div key={review.id} className="border-t border-sara-linen/60 pt-3 mt-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-sara-gold/20 flex items-center justify-center text-xs font-bold text-sara-gold">
                    {review.user.name.charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-graphite">{review.user.name}</span>
                  {review.verifiedPurchase && (
                    <span className="text-[10px] text-green-600 font-medium">✓ Verificado</span>
                  )}
                  <div className="flex ml-auto">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={10}
                        className={
                          s <= review.rating ? 'text-sara-gold fill-current' : 'text-graphite-muted/30'
                        }
                      />
                    ))}
                  </div>
                </div>
                {review.text && <p className="text-xs text-graphite-muted line-clamp-2">{review.text}</p>}
              </div>
            ))}
            <button
              onClick={() => onOpenReviews(productType, productId, product.name)}
              className="w-full mt-3 py-2 rounded-xl bg-white text-sara-gold text-xs font-semibold border border-sara-gold/30 active:scale-95 transition-transform"
            >
              Ver todas as avaliações
            </button>
          </div>
        )}

        {/* Related products */}
        {product.related.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-graphite-muted uppercase tracking-wide mb-2">
              Produtos relacionados
            </p>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {product.related.map((rel) => (
                <button
                  key={rel.id}
                  onClick={() => onOpenProduct(rel.type as 'affiliate' | 'own', rel.id)}
                  className="flex-shrink-0 w-32 bg-white/70 rounded-2xl p-2 flex flex-col gap-1 active:scale-95 transition-transform"
                >
                  {(rel.images as string[])[0] ? (
                    <img
                      src={(rel.images as string[])[0]}
                      alt={rel.name}
                      className="w-full h-20 rounded-xl object-cover bg-sara-linen"
                    />
                  ) : (
                    <div className="w-full h-20 rounded-xl bg-sara-linen flex items-center justify-center">
                      <Package size={20} className="text-graphite-muted" />
                    </div>
                  )}
                  <p className="text-xs font-medium text-graphite line-clamp-2 leading-tight">{rel.name}</p>
                  <p className="text-xs font-bold text-sara-gold">R$ {Number(rel.price).toFixed(2)}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-gradient-to-t from-[#D9C4AF] to-transparent flex-shrink-0">
        {!isOwn && (
          <button
            onClick={() => affiliateMutation.mutate()}
            disabled={affiliateMutation.isPending}
            className="w-full py-3.5 rounded-2xl bg-sara-gold text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg"
          >
            Ver no site <ExternalLink size={14} />
          </button>
        )}
        {isOwn && hasStock && (
          <div className="flex flex-col gap-2">
            {addedToCart && (
              <div className="flex items-center justify-between px-3 py-2 bg-green-50 rounded-xl border border-green-200">
                <span className="text-xs text-green-700 font-medium">Adicionado ao carrinho!</span>
                <button onClick={onOpenCart} className="text-xs text-sara-gold font-semibold">
                  Ver carrinho
                </button>
              </div>
            )}
            <button
              onClick={() => cartMutation.mutate()}
              disabled={cartMutation.isPending}
              className="w-full py-3.5 rounded-2xl bg-sara-gold text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg disabled:opacity-60"
            >
              <ShoppingCart size={16} />
              {cartMutation.isPending ? 'Adicionando...' : 'Adicionar ao carrinho'}
            </button>
          </div>
        )}
        {isOwn && !hasStock && (
          <button
            disabled
            className="w-full py-3.5 rounded-2xl bg-graphite-muted/20 text-graphite-muted font-semibold text-sm cursor-not-allowed"
          >
            Indisponível
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shopping/ProductDetailScreen.tsx
git commit -m "feat(shopping): ProductDetailScreen with gallery, meta, description, reviews teaser, CTA"
```

---

### Task 3: Modificar ShoppingScreen para receber prop onOpenProduct

**Files:**
- Modify: `src/components/shopping/ShoppingScreen.tsx`

- [ ] **Step 1: Adicionar prop `onOpenProduct` e conectar nos ProductCards**

Adicionar a interface de props no topo do arquivo e usar a prop:

```tsx
// Adicionar no topo do arquivo, após os imports:
interface ShoppingScreenProps {
  onOpenProduct: (type: 'affiliate' | 'own', id: string) => void
}

// Mudar a assinatura da função ShoppingScreen:
export function ShoppingScreen({ onOpenProduct }: ShoppingScreenProps) {
```

Mudar o render dos ProductCards para usar `onOpenProduct` em vez de `clickMutation`:

```tsx
// featured.map:
{featured.map((p) => (
  <ProductCard
    key={p.id}
    product={p}
    onClick={() => onOpenProduct('affiliate', p.id)}
    featured
  />
))}

// rest.map:
{rest.map((p) => (
  <ProductCard
    key={p.id}
    product={p}
    onClick={() => onOpenProduct('affiliate', p.id)}
  />
))}
```

Modificar `ProductCard` para usar `onClick` diretamente (remover `handleBuy` que abria URL):

```tsx
function ProductCard({
  product: p,
  onClick,
  featured = false,
}: {
  product: ApiAdminProduct
  onClick: () => void
  featured?: boolean
}) {
  // remover handleBuy — onClick já é passado diretamente
  // trocar onClick={handleBuy} por onClick={onClick} em todos os botões do card
```

Remover também o `clickMutation` e o import de `useMutation` se não for mais usado aqui (o click é registrado pelo backend em `GET /:id/go`).

- [ ] **Step 2: Commit**

```bash
git add src/components/shopping/ShoppingScreen.tsx
git commit -m "feat(shopping): ShoppingScreen receives onOpenProduct prop, cards open detail instead of URL"
```

---

### Task 4: Adicionar overlay ProductDetailScreen no App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Importar o ProductDetailScreen**

```tsx
import { ProductDetailScreen } from './components/shopping/ProductDetailScreen'
```

- [ ] **Step 2: Adicionar estado para o produto aberto**

```tsx
// Dentro do componente App, junto com os outros estados:
const [openProduct, setOpenProduct] = useState<{ type: 'affiliate' | 'own'; id: string } | null>(null)
const [openReviews, setOpenReviews] = useState<{ type: 'affiliate' | 'own'; id: string; name: string } | null>(null)
```

- [ ] **Step 3: Passar a prop onOpenProduct ao ShoppingScreen**

Localizar `shopping: <ShoppingScreen />` no objeto `screens` e substituir por:

```tsx
shopping: (
  <ShoppingScreen
    onOpenProduct={(type, id) => setOpenProduct({ type, id })}
  />
),
```

- [ ] **Step 4: Adicionar o overlay do ProductDetailScreen**

Adicionar antes do fechamento do fragmento `</>`, após o último overlay existente:

```tsx
{openProduct && (
  <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
    <div className="w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <ProductDetailScreen
        productType={openProduct.type}
        productId={openProduct.id}
        onBack={() => setOpenProduct(null)}
        onOpenProduct={(type, id) => setOpenProduct({ type, id })}
        onOpenReviews={(type, id, name) => setOpenReviews({ type, id, name })}
        onOpenCart={() => {
          setOpenProduct(null)
          // será implementado no Plano 4
        }}
      />
    </div>
  </div>
)}
```

- [ ] **Step 5: Verificar no browser**

```bash
npm run dev
```

Abrir o shopping (ícone na sidebar), clicar em um produto. A tela de detalhe deve abrir sobre o shopping com o botão "←" para voltar.

- [ ] **Step 6: Verificar que o TypeScript não acusa erros**

```bash
npm run tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): ProductDetailScreen overlay — push navigation from ShoppingScreen"
```
