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
