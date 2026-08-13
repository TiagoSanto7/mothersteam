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

const EMPTY_DISTRIBUTION: Record<string, number> = {}

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

  const myReview = data?.items.find((r) => r.userId === currentUserId) ?? null

  const summary: ApiReviewsSummary = {
    average: data?.average ?? 0,
    count: data?.total ?? 0,
    distribution: data?.distribution ?? EMPTY_DISTRIBUTION,
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

        <div className="flex-1 overflow-y-auto pb-6 px-4">
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

          <button
            onClick={() => setShowModal(true)}
            className="w-full mb-4 py-3 rounded-2xl border border-sara-gold/40 bg-white/60 text-sara-gold text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <PenLine size={16} />
            {myReview ? 'Editar minha avaliação' : 'Escrever avaliação'}
          </button>

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
                <div className="flex flex-shrink-0">
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
