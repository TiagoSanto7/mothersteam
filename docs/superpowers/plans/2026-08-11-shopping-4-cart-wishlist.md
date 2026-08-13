# Shopping — Plano 4: Wishlist & Carrinho

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar top tabs ao ShoppingScreen (Produtos | Favoritos | Pedidos), criar `FavoritesTab`, criar `CartScreen` com controle de quantidade e cálculo de frete, e atualizar a sidebar com badge de carrinho.

**Architecture:** Top tabs via `useState` local no ShoppingScreen. CartScreen como overlay (push navigation). Badge no ícone da sidebar alimentado por `useQuery(['cart'])` sem polling — invalidado a cada mutação. Zustand somente via selectors atômicos.

**Tech Stack:** React, TanStack Query, Tailwind, Lucide icons

**Dependência:** Planos 1, 2 e 3 concluídos.

---

## File Structure

- Modify: `src/components/shopping/ShoppingScreen.tsx` — top tabs + cart icon header
- Create: `src/components/shopping/FavoritesTab.tsx`
- Create: `src/components/shopping/CartScreen.tsx`
- Modify: `src/components/layout/LeftSidebar.tsx` — cart badge
- Modify: `src/App.tsx` — CartScreen overlay + passar `onOpenCart` ao ShoppingScreen

---

### Task 1: Criar FavoritesTab

**Files:**
- Create: `src/components/shopping/FavoritesTab.tsx`

- [ ] **Step 1: Criar o arquivo completo**

```tsx
// src/components/shopping/FavoritesTab.tsx
import { Heart, ShoppingBag, ExternalLink, ShoppingCart } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import type { ApiWishlistEntry, ApiAdminProduct, ApiOwnProduct } from '../../lib/types'

interface Props {
  onOpenProduct: (type: 'affiliate' | 'own', id: string) => void
}

interface WishlistResponse {
  items: ApiWishlistEntry[]
}

export function FavoritesTab({ onOpenProduct }: Props) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => apiFetch<WishlistResponse>('/wishlist'),
    staleTime: 30_000,
  })

  const removeMutation = useMutation({
    mutationFn: ({ type, id }: { type: 'affiliate' | 'own'; id: string }) =>
      apiFetch(type === 'affiliate' ? `/products/${id}/wishlist` : `/own-products/${id}/wishlist`, {
        method: 'POST',
      }),
    onMutate: async ({ type, id }) => {
      await queryClient.cancelQueries({ queryKey: ['wishlist'] })
      const prev = queryClient.getQueryData<WishlistResponse>(['wishlist'])
      queryClient.setQueryData<WishlistResponse>(['wishlist'], (old) => ({
        items: (old?.items ?? []).filter(
          (entry) => (entry.product as any)?.id !== id
        ),
      }))
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['wishlist'], ctx.prev)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      queryClient.invalidateQueries({ queryKey: ['product-detail'] })
    },
  })

  const cartMutation = useMutation({
    mutationFn: (ownProductId: string) =>
      apiFetch('/cart', { method: 'POST', body: JSON.stringify({ ownProductId, quantity: 1 }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-3xl h-24 animate-pulse" />
        ))}
      </div>
    )
  }

  const items = data?.items ?? []

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 px-4">
        <Heart size={40} className="text-graphite-muted/30" />
        <p className="text-graphite-muted text-sm font-medium">Nenhum favorito ainda</p>
        <p className="text-xs text-graphite-muted text-center">
          Toque no ♡ em qualquer produto para salvar aqui
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-6">
      {items.map((entry) => {
        const product = entry.product as (ApiAdminProduct | ApiOwnProduct) & { id: string }
        const isOwn = entry.type === 'own'
        const hasStock = isOwn ? (product as ApiOwnProduct).stock > 0 : true
        const images = product.images as string[]

        return (
          <div key={product.id} className="bg-white rounded-3xl p-4 shadow-sm flex gap-3">
            <button
              onClick={() => onOpenProduct(entry.type, product.id)}
              className="flex-shrink-0"
            >
              {images[0] ? (
                <img
                  src={images[0]}
                  alt={product.name}
                  className="w-20 h-20 rounded-2xl object-cover bg-sara-linen"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-sara-linen flex items-center justify-center">
                  <ShoppingBag size={24} className="text-graphite-muted" />
                </div>
              )}
            </button>

            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <p className="text-[11px] text-graphite-muted">
                {(product as any).category?.name ?? ''}
              </p>
              <button
                onClick={() => onOpenProduct(entry.type, product.id)}
                className="text-sm font-semibold text-graphite leading-tight text-left line-clamp-2"
              >
                {product.name}
              </button>
              <p className="text-sm font-bold text-sara-gold">
                R$ {Number(product.price).toFixed(2)}
              </p>

              <div className="flex gap-2 mt-auto pt-1">
                {!isOwn && (
                  <button
                    onClick={() => onOpenProduct('affiliate', product.id)}
                    className="flex-1 py-1.5 rounded-xl bg-sara-gold text-white text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-transform"
                  >
                    Ver no site <ExternalLink size={10} />
                  </button>
                )}
                {isOwn && hasStock && (
                  <button
                    onClick={() => cartMutation.mutate(product.id)}
                    disabled={cartMutation.isPending}
                    className="flex-1 py-1.5 rounded-xl bg-sara-gold text-white text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-transform disabled:opacity-60"
                  >
                    <ShoppingCart size={11} /> Carrinho
                  </button>
                )}
                {isOwn && !hasStock && (
                  <span className="flex-1 py-1.5 rounded-xl bg-graphite-muted/10 text-graphite-muted text-xs font-medium text-center">
                    Indisponível
                  </span>
                )}
                <button
                  onClick={() => removeMutation.mutate({ type: entry.type, id: product.id })}
                  disabled={removeMutation.isPending}
                  className="w-8 h-8 rounded-xl bg-sara-terracotta/10 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Heart size={14} className="text-sara-terracotta fill-current" />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shopping/FavoritesTab.tsx
git commit -m "feat(shopping): FavoritesTab — wishlist list with remove and CTA per product type"
```

---

### Task 2: Criar CartScreen

**Files:**
- Create: `src/components/shopping/CartScreen.tsx`

- [ ] **Step 1: Criar o arquivo completo**

```tsx
// src/components/shopping/CartScreen.tsx
import { useState, useEffect } from 'react'
import { ChevronLeft, ShoppingCart, Minus, Plus, Trash2, Package } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import type { ApiCart, ApiAddress } from '../../lib/types'
import { useAppStore } from '../../store/useAppStore'

interface Props {
  onBack: () => void
  onCheckout: () => void
}

export function CartScreen({ onBack, onCheckout }: Props) {
  const queryClient = useQueryClient()
  const [shippingFee, setShippingFee] = useState<string | null>(null)
  const [shippingDays, setShippingDays] = useState<number | null>(null)

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => apiFetch<ApiCart>('/cart'),
    staleTime: 30_000,
  })

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => apiFetch<ApiAddress[]>('/addresses'),
    staleTime: 60_000,
  })

  const defaultAddress = addresses?.find((a) => a.isDefault)

  // Calculate shipping when default address is available
  useEffect(() => {
    if (!defaultAddress || !cart?.items.length) return
    apiFetch<{ fee: string; estimatedDays: number }>('/cart/shipping', {
      method: 'POST',
      body: JSON.stringify({ addressId: defaultAddress.id }),
    }).then(({ fee, estimatedDays }) => {
      setShippingFee(fee)
      setShippingDays(estimatedDays)
    }).catch(() => {})
  }, [defaultAddress?.id, cart?.items.length])

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      apiFetch<ApiCart>(`/cart/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      }),
    onSuccess: (newCart) => {
      queryClient.setQueryData(['cart'], newCart)
    },
  })

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => apiFetch<ApiCart>(`/cart/${itemId}`, { method: 'DELETE' }),
    onSuccess: (newCart) => {
      queryClient.setQueryData(['cart'], newCart)
    },
  })

  const items = cart?.items ?? []
  const subtotal = Number(cart?.subtotal ?? 0)
  const shipping = shippingFee !== null ? Number(shippingFee) : null
  const total = shipping !== null ? subtotal + shipping : null

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF]">
        <div className="flex items-center gap-3 px-4 pt-10 pb-4">
          <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center">
            <ChevronLeft size={20} className="text-graphite" />
          </button>
          <h1 className="text-base font-semibold text-graphite">Carrinho</h1>
        </div>
        <div className="px-4 flex flex-col gap-3 animate-pulse">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white/60 rounded-3xl h-24" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-10 pb-4 flex-shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-white/70 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
        >
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <h1 className="text-base font-semibold text-graphite">
          Carrinho {items.length > 0 && `(${cart?.itemCount} itens)`}
        </h1>
      </div>

      {items.length === 0 ? (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          <ShoppingCart size={48} className="text-graphite-muted/30" />
          <p className="text-graphite-muted text-sm font-medium">Seu carrinho está vazio</p>
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform"
          >
            Explorar produtos
          </button>
        </div>
      ) : (
        <>
          {/* Scrollable items */}
          <div className="flex-1 overflow-y-auto px-4 pb-2">
            <div className="flex flex-col gap-3">
              {items.map((item) => {
                const images = item.ownProduct.images as string[]
                return (
                  <div key={item.id} className="bg-white/70 rounded-3xl p-4 flex gap-3">
                    {images[0] ? (
                      <img
                        src={images[0]}
                        alt={item.ownProduct.name}
                        className="w-16 h-16 rounded-2xl object-cover bg-sara-linen flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-sara-linen flex items-center justify-center flex-shrink-0">
                        <Package size={20} className="text-graphite-muted" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-graphite line-clamp-2 leading-tight">
                        {item.ownProduct.name}
                      </p>
                      <p className="text-sm font-bold text-sara-gold mt-0.5">
                        R$ {Number(item.ownProduct.price).toFixed(2)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() =>
                            updateMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 })
                          }
                          disabled={updateMutation.isPending}
                          className="w-7 h-7 rounded-lg bg-sara-linen flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
                        >
                          <Minus size={12} className="text-graphite" />
                        </button>
                        <span className="text-sm font-semibold text-graphite w-5 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 })
                          }
                          disabled={updateMutation.isPending || item.quantity >= item.ownProduct.stock}
                          className="w-7 h-7 rounded-lg bg-sara-linen flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
                        >
                          <Plus size={12} className="text-graphite" />
                        </button>
                        <button
                          onClick={() => removeMutation.mutate(item.id)}
                          disabled={removeMutation.isPending}
                          className="ml-auto w-7 h-7 rounded-lg bg-sara-terracotta/10 flex items-center justify-center active:scale-95 transition-transform"
                        >
                          <Trash2 size={12} className="text-sara-terracotta" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Totals */}
            <div className="bg-white/60 rounded-3xl p-4 mt-4">
              <div className="flex justify-between text-sm text-graphite mb-2">
                <span>Subtotal</span>
                <span className="font-semibold">R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-graphite mb-2">
                <span>Frete</span>
                <span className="font-semibold">
                  {shipping !== null
                    ? `R$ ${shipping.toFixed(2)}`
                    : defaultAddress
                    ? 'Calculando...'
                    : 'Calculado no checkout'}
                </span>
              </div>
              {shippingDays && (
                <p className="text-[10px] text-graphite-muted mb-2">
                  Prazo estimado: {shippingDays} dias úteis
                </p>
              )}
              <div className="border-t border-sara-linen pt-2 flex justify-between text-sm font-bold text-graphite">
                <span>Total</span>
                <span className="text-sara-gold">
                  {total !== null ? `R$ ${total.toFixed(2)}` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Checkout CTA */}
          <div className="px-4 pb-8 pt-3 flex-shrink-0">
            <button
              onClick={onCheckout}
              className="w-full py-4 rounded-2xl bg-sara-gold text-white font-bold text-sm active:scale-95 transition-transform shadow-lg"
            >
              Finalizar pedido
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shopping/CartScreen.tsx
git commit -m "feat(shopping): CartScreen with quantity controls, shipping calc, empty state"
```

---

### Task 3: Refatorar ShoppingScreen com top tabs + cart icon

**Files:**
- Modify: `src/components/shopping/ShoppingScreen.tsx`

- [ ] **Step 1: Atualizar props da ShoppingScreen**

Substituir a interface Props atual por:

```tsx
interface ShoppingScreenProps {
  onOpenProduct: (type: 'affiliate' | 'own', id: string) => void
  onOpenCart: () => void
  activeShoppingTab?: 'products' | 'favorites' | 'orders'
  onTabChange?: (tab: 'products' | 'favorites' | 'orders') => void
}
```

Adicionar import de `FavoritesTab`:
```tsx
import { FavoritesTab } from './FavoritesTab'
import { ShoppingCart } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { ApiCart } from '../../lib/types'
```

- [ ] **Step 2: Adicionar query do cart para o badge**

Dentro da função `ShoppingScreen`, adicionar:

```tsx
const { data: cart } = useQuery({
  queryKey: ['cart'],
  queryFn: () => apiFetch<ApiCart>('/cart'),
  staleTime: 60_000,
})
const cartCount = cart?.itemCount ?? 0
```

- [ ] **Step 3: Adicionar estado de tab local**

```tsx
const [activeTab, setActiveTab] = useState<'products' | 'favorites' | 'orders'>('products')
```

- [ ] **Step 4: Substituir o header + adicionar top tabs**

O JSX do componente ShoppingScreen deve ter este header antes de tudo:

```tsx
return (
  <div className="flex flex-col gap-0 pb-0">
    {/* Header com ícone de carrinho */}
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <div>
        <h1 className="text-base font-semibold text-graphite">Shopping</h1>
        <p className="text-xs text-graphite-muted">Produtos para você e seu bebê</p>
      </div>
      <button
        onClick={onOpenCart}
        className="relative w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center active:scale-95 transition-transform"
      >
        <ShoppingCart size={20} className="text-graphite" strokeWidth={1.8} />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-sara-terracotta text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {cartCount > 9 ? '9+' : cartCount}
          </span>
        )}
      </button>
    </div>

    {/* Top tabs */}
    <div className="flex border-b border-sara-linen/60 px-4 mb-0">
      {(['products', 'favorites', 'orders'] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === tab
              ? 'text-sara-gold border-sara-gold'
              : 'text-graphite-muted border-transparent'
          }`}
        >
          {tab === 'products' ? 'Produtos' : tab === 'favorites' ? 'Favoritos' : 'Pedidos'}
        </button>
      ))}
    </div>

    {/* Tab content */}
    {activeTab === 'products' && <ProductsTab onOpenProduct={onOpenProduct} />}
    {activeTab === 'favorites' && <FavoritesTab onOpenProduct={onOpenProduct} />}
    {activeTab === 'orders' && <OrdersTabPlaceholder />}
  </div>
)
```

- [ ] **Step 5: Extrair o conteúdo atual para componente `ProductsTab`**

Mover todo o JSX atual do ShoppingScreen (category filter, featured, grid) para uma função local `ProductsTab`:

```tsx
function ProductsTab({ onOpenProduct }: { onOpenProduct: (type: 'affiliate' | 'own', id: string) => void }) {
  // ... todo o estado e lógica atual (categories, products, loading, etc.)
  // mas o onClick dos cards chama onOpenProduct('affiliate', p.id) em vez de abrir URL
}
```

- [ ] **Step 6: Adicionar placeholder para OrdersTab**

```tsx
function OrdersTabPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2 px-4">
      <p className="text-graphite-muted text-sm">Histórico de pedidos disponível no Plano 5</p>
    </div>
  )
}
```

O OrdersTab real será implementado no Plano 5.

- [ ] **Step 7: Atualizar chamada em App.tsx para passar onOpenCart**

Em App.tsx, na linha onde ShoppingScreen é renderizado:
```tsx
shopping: (
  <ShoppingScreen
    onOpenProduct={(type, id) => setOpenProduct({ type, id })}
    onOpenCart={() => setShowCart(true)}
  />
),
```

(O estado `showCart` será adicionado no próximo task.)

- [ ] **Step 8: Commit**

```bash
git add src/components/shopping/ShoppingScreen.tsx
git commit -m "feat(shopping): add top tabs (Produtos|Favoritos|Pedidos) + cart icon with badge"
```

---

### Task 4: Adicionar CartScreen overlay no App.tsx + badge na sidebar

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/LeftSidebar.tsx`

- [ ] **Step 1: Importar CartScreen em App.tsx**

```tsx
import { CartScreen } from './components/shopping/CartScreen'
```

- [ ] **Step 2: Adicionar estado `showCart` e `showCheckout`**

```tsx
const [showCart, setShowCart] = useState(false)
const [showCheckout, setShowCheckout] = useState(false)
```

- [ ] **Step 3: Adicionar overlay CartScreen em App.tsx**

```tsx
{showCart && (
  <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
    <div className="w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <CartScreen
        onBack={() => setShowCart(false)}
        onCheckout={() => {
          setShowCart(false)
          setShowCheckout(true)
        }}
      />
    </div>
  </div>
)}
```

- [ ] **Step 4: Atualizar onOpenCart no ShoppingScreen**

Verificar que a prop `onOpenCart={() => setShowCart(true)}` está conectada (já foi definida no Task 3 Step 7).

- [ ] **Step 5: Atualizar ProductDetailScreen para abrir cart**

No overlay do `openProduct` em App.tsx, a prop `onOpenCart` já está conectada (passada no Plano 2). Atualizar se necessário:

```tsx
onOpenCart={() => {
  setOpenProduct(null)
  setShowCart(true)
}}
```

- [ ] **Step 6: Atualizar LeftSidebar para exibir badge do carrinho**

Abrir `src/components/layout/LeftSidebar.tsx`.

Adicionar import e query no topo do componente:

```tsx
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import type { ApiCart } from '../../lib/types'
```

Adicionar dentro da função `LeftSidebar`, antes do return:

```tsx
const isLoggedIn = useAppStore((s) => s.isLoggedIn)

const { data: cart } = useQuery({
  queryKey: ['cart'],
  queryFn: () => apiFetch<ApiCart>('/cart'),
  enabled: isLoggedIn,
  staleTime: 60_000,
})
const cartCount = cart?.itemCount ?? 0
```

Localizar o botão de "Recomendações" (Shopping) no sidebar e substituir pelo trecho com badge:

```tsx
<button
  title="Recomendações"
  aria-label="Recomendações"
  onClick={() => setActiveTab('shopping' as TabId)}
  className={navBtnClass(activeTab === ('shopping' as TabId))}
>
  <span className="relative flex-shrink-0">
    <ShoppingBag size={20} strokeWidth={1.8} />
    {cartCount > 0 && (
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-sara-terracotta text-white text-[9px] font-bold rounded-full flex items-center justify-center">
        {cartCount > 9 ? '9+' : cartCount}
      </span>
    )}
  </span>
  <span className="text-sm font-medium hidden lg:block">Recomendações</span>
</button>
```

- [ ] **Step 7: Verificar o fluxo completo**

```bash
npm run dev
```

1. Abrir Shopping via sidebar
2. Verificar top tabs (Produtos | Favoritos | Pedidos)
3. Adicionar produto ao carrinho via ProductDetailScreen
4. Badge aparece no ícone da sidebar + no header do Shopping
5. Tocar ícone 🛒 no header → CartScreen abre
6. Ajustar quantidade → subtotal atualiza
7. "← Carrinho" volta ao Shopping
8. Tab "Favoritos" → FavoritesTab aparece

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/components/layout/LeftSidebar.tsx
git commit -m "feat(app): CartScreen overlay, cart badge in sidebar, wire ShoppingScreen cart icon"
```
