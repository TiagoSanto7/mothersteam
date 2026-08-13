# Shopping — Plano 3: Reviews & Ratings

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar `ReviewsScreen` com resumo de distribuição, lista paginada de avaliações e modal para escrever/editar review. Wire via overlay em App.tsx a partir do ProductDetailScreen.

**Architecture:** Overlay padrão (fixed inset-0 z-50). ReviewModal é um bottom sheet. Paginação por offset (page). O backend faz upsert — o mesmo POST cria ou edita.

**Tech Stack:** React, TanStack Query, Tailwind, Lucide icons

**Dependência:** Planos 1 e 2 concluídos.

---

## File Structure

- Create: `src/components/shopping/ReviewsScreen.tsx`
- Create: `src/components/shopping/ReviewModal.tsx`
- Modify: `src/App.tsx` — overlay `openReviews`

---

### Task 1: Criar ReviewModal — bottom sheet para escrever avaliação

**Files:**
- Create: `src/components/shopping/ReviewModal.tsx`

- [ ] **Step 1: Criar o arquivo completo**

```tsx
// src/components/shopping/ReviewModal.tsx
import { useState } from 'react'
import { X, Star } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import type { ApiReview } from '../../lib/types'

interface Props {
  productType: 'affiliate' | 'own'
  productId: string
  existingReview?: ApiReview | null
  onClose: () => void
  onSuccess: () => void
}

export function ReviewModal({ productType, productId, existingReview, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(existingReview?.rating ?? 0)
  const [hovered, setHovered] = useState(0)
  const [text, setText] = useState(existingReview?.text ?? '')
  const MAX_CHARS = 500

  const endpoint =
    productType === 'affiliate' ? `/products/${productId}/reviews` : `/own-products/${productId}/reviews`

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<ApiReview>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ rating, text: text.trim() || undefined }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', productType, productId] })
      queryClient.invalidateQueries({ queryKey: ['product-detail', productType, productId] })
      onSuccess()
      onClose()
    },
  })

  const displayRating = hovered || rating

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:w-[390px] bg-[#F5EDE0] rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-graphite">
            {existingReview ? 'Editar avaliação' : 'Escrever avaliação'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center"
          >
            <X size={16} className="text-graphite" />
          </button>
        </div>

        {/* Star selector */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-graphite-muted">Selecione sua nota</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(s)}
                className="p-1 active:scale-110 transition-transform"
              >
                <Star
                  size={32}
                  className={
                    s <= displayRating ? 'text-sara-gold fill-current' : 'text-graphite-muted/30'
                  }
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-xs text-graphite-muted">
              {['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'][rating]}
            </p>
          )}
        </div>

        {/* Text field */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-graphite-muted">Comentário (opcional)</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Conte sua experiência com o produto..."
            rows={4}
            className="w-full rounded-xl bg-white/70 px-3 py-2.5 text-sm text-graphite placeholder:text-graphite-muted/50 resize-none outline-none border border-transparent focus:border-sara-gold/40"
          />
          <span className="text-[10px] text-graphite-muted text-right">
            {text.length}/{MAX_CHARS}
          </span>
        </div>

        {/* Submit */}
        <button
          onClick={() => mutation.mutate()}
          disabled={rating === 0 || mutation.isPending}
          className="w-full py-3.5 rounded-2xl bg-sara-gold text-white font-semibold text-sm active:scale-95 transition-transform disabled:opacity-50"
        >
          {mutation.isPending ? 'Publicando...' : 'Publicar avaliação'}
        </button>

        {mutation.isError && (
          <p className="text-xs text-sara-terracotta text-center">
            Erro ao publicar. Tente novamente.
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shopping/ReviewModal.tsx
git commit -m "feat(shopping): ReviewModal bottom sheet with star selector + text field"
```

---

### Task 2: Criar ReviewsScreen — tela completa de avaliações

**Files:**
- Create: `src/components/shopping/ReviewsScreen.tsx`

- [ ] **Step 1: Criar o arquivo completo**

```tsx
// src/components/shopping/ReviewsScreen.tsx
import { useState } from 'react'
import { ChevronLeft, Star, PenLine } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import { ReviewModal } from './ReviewModal'
import type { ApiReview, ApiReviewsSummary } from '../../lib/types'
import { useAppStore } from '../../store/useAppStore'

interface ReviewsResponse {
  items: ApiReview[]
  total: number
  average: number
  distribution: Record<string, number>
}

interface Props {
  productType: 'affiliate' | 'own'
  productId: string
  productName: string
  onBack: () => void
}

export function ReviewsScreen({ productType, productId, productName, onBack }: Props) {
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const currentUserId = useAppStore((s) => s.currentUserId)
  const queryClient = useQueryClient()

  const endpoint =
    productType === 'affiliate' ? `/products/${productId}/reviews` : `/own-products/${productId}/reviews`

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', productType, productId, page],
    queryFn: () => apiFetch<ReviewsResponse>(`${endpoint}?page=${page}&limit=20`),
    staleTime: 30_000,
  })

  // Check if current user already has a review
  const myReview = data?.items.find((r) => r.userId === currentUserId) ?? null

  const summary: ApiReviewsSummary = {
    average: data?.average ?? 0,
    count: data?.total ?? 0,
    distribution: data?.distribution ?? {},
  }

  const totalPages = data ? Math.ceil(data.total / 20) : 1

  function formatDate(iso: string) {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'hoje'
    if (days === 1) return 'ontem'
    if (days < 7) return `há ${days} dias`
    if (days < 30) return `há ${Math.floor(days / 7)} semanas`
    if (days < 365) return `há ${Math.floor(days / 30)} meses`
    return `há ${Math.floor(days / 365)} anos`
  }

  return (
    <>
      <div className="flex flex-col h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-10 pb-4 flex-shrink-0">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white/70 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronLeft size={20} className="text-graphite" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-graphite truncate">Avaliações</h1>
            <p className="text-xs text-graphite-muted truncate">{productName}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-6 px-4">
          {/* Summary */}
          {data && (
            <div className="bg-white/60 rounded-3xl p-4 mb-4">
              <div className="flex items-start gap-4">
                <div className="text-center flex-shrink-0">
                  <p className="text-4xl font-extrabold text-graphite">{summary.average.toFixed(1)}</p>
                  <div className="flex justify-center mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={12}
                        className={
                          s <= Math.round(summary.average)
                            ? 'text-sara-gold fill-current'
                            : 'text-graphite-muted/30'
                        }
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-graphite-muted mt-1">{summary.count} avaliações</p>
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  {[5, 4, 3, 2, 1].map((r) => {
                    const count = summary.distribution[r] ?? 0
                    const pct = summary.count ? (count / summary.count) * 100 : 0
                    return (
                      <div key={r} className="flex items-center gap-2">
                        <span className="text-[10px] text-graphite-muted w-2.5">{r}★</span>
                        <div className="flex-1 h-2 rounded-full bg-graphite-muted/20 overflow-hidden">
                          <div
                            className="h-full bg-sara-gold rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-graphite-muted w-4 text-right">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Write review button */}
          <button
            onClick={() => setShowModal(true)}
            className="w-full mb-4 py-3 rounded-2xl border border-sara-gold/40 bg-white/60 text-sara-gold text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <PenLine size={16} />
            {myReview ? 'Editar minha avaliação' : 'Escrever avaliação'}
          </button>

          {/* Reviews list */}
          {isLoading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white/60 rounded-3xl p-4 animate-pulse h-20" />
              ))}
            </div>
          )}

          {data?.items.map((review) => (
            <div key={review.id} className="bg-white/60 rounded-3xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-sara-gold/20 flex items-center justify-center text-sm font-bold text-sara-gold flex-shrink-0">
                  {review.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-graphite truncate">
                    {review.user.name.split(' ')[0]} {review.user.name.split(' ').pop()?.charAt(0)}.
                  </p>
                  <p className="text-[10px] text-graphite-muted">{formatDate(review.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={11}
                        className={
                          s <= review.rating ? 'text-sara-gold fill-current' : 'text-graphite-muted/30'
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
              {review.verifiedPurchase && (
                <span className="inline-flex items-center gap-1 text-[10px] text-green-600 font-medium mb-1.5">
                  ✓ Compra verificada
                </span>
              )}
              {review.text && (
                <p className="text-sm text-graphite leading-relaxed">{review.text}</p>
              )}
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-xl bg-white/70 text-xs font-medium text-graphite disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="px-3 py-2 text-xs text-graphite-muted">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-xl bg-white/70 text-xs font-medium text-graphite disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}

          {data?.items.length === 0 && !isLoading && (
            <div className="flex flex-col items-center py-12 gap-2">
              <Star size={32} className="text-graphite-muted/30" />
              <p className="text-sm text-graphite-muted">Nenhuma avaliação ainda</p>
              <p className="text-xs text-graphite-muted">Seja a primeira a avaliar!</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ReviewModal
          productType={productType}
          productId={productId}
          existingReview={myReview}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['reviews', productType, productId] })
          }}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shopping/ReviewsScreen.tsx
git commit -m "feat(shopping): ReviewsScreen with distribution chart, paginated list, modal trigger"
```

---

### Task 3: Adicionar overlay ReviewsScreen no App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Importar ReviewsScreen**

```tsx
import { ReviewsScreen } from './components/shopping/ReviewsScreen'
```

- [ ] **Step 2: O estado `openReviews` já foi adicionado no Plano 2**

Verificar que existe:
```tsx
const [openReviews, setOpenReviews] = useState<{ type: 'affiliate' | 'own'; id: string; name: string } | null>(null)
```

Se não existir, adicionar ao bloco de estados do App.

- [ ] **Step 3: Adicionar o overlay**

Adicionar após o overlay do `openProduct`:

```tsx
{openReviews && (
  <div className="fixed inset-0 z-[55] sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
    <div className="w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <ReviewsScreen
        productType={openReviews.type}
        productId={openReviews.id}
        productName={openReviews.name}
        onBack={() => setOpenReviews(null)}
      />
    </div>
  </div>
)}
```

Nota: `z-[55]` (acima do ProductDetailScreen em `z-50`) para que Reviews fique sobre o Detalhe.

- [ ] **Step 4: Verificar o fluxo completo**

1. Abrir Shopping
2. Tocar em produto → ProductDetailScreen abre
3. Tocar em "Ver todas as avaliações" → ReviewsScreen abre sobre o detalhe
4. Tocar "Escrever avaliação" → ReviewModal abre (bottom sheet)
5. Preencher estrelas + texto, publicar → modal fecha, lista recarrega
6. "←" em ReviewsScreen volta ao ProductDetailScreen
7. "←" em ProductDetailScreen volta ao Shopping

```bash
npm run dev
```

Navegar o fluxo acima no browser.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): ReviewsScreen overlay (z-55) above ProductDetailScreen"
```
