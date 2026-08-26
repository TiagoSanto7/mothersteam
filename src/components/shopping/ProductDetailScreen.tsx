import { useState } from 'react'
import { ChevronLeft, Heart, Star, ExternalLink, Package } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, resolveApiUrl } from '../../lib/api'
import type { ApiProductDetail } from '../../lib/types'

interface Props {
  productId: string
  onBack: () => void
  onOpenProduct: (productId: string) => void
  onOpenReviews: (productId: string, productName: string) => void
}

export function ProductDetailScreen({
  productId,
  onBack,
  onOpenProduct,
  onOpenReviews,
}: Props) {
  const queryClient = useQueryClient()
  const [imageIndex, setImageIndex] = useState(0)
  const [descExpanded, setDescExpanded] = useState(false)

  const { data: product, isLoading, isError, refetch } = useQuery({
    queryKey: ['product-detail', productId],
    queryFn: () => apiFetch<ApiProductDetail>(`/products/${productId}`),
    staleTime: 60_000,
    retry: 1,
  })

  const wishlistMutation = useMutation<{ inWishlist: boolean }, unknown, void, { prev?: ApiProductDetail }>({
    mutationFn: () =>
      apiFetch<{ inWishlist: boolean }>(`/products/${productId}/wishlist`, { method: 'POST' }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['product-detail', productId] })
      const prev = queryClient.getQueryData<ApiProductDetail>(['product-detail', productId])
      if (prev) {
        queryClient.setQueryData(['product-detail', productId], {
          ...prev,
          inWishlist: !prev.inWishlist,
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['product-detail', productId], ctx.prev)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF]">
        <div className="flex items-center gap-3 px-4 pt-10 pb-4">
          <button onClick={onBack} className="w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center">
            <ChevronLeft size={18} className="text-mt-charcoal" />
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

  if (isError) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] items-center justify-center gap-3 px-6">
        <Package size={40} className="text-mt-muted" />
        <p className="text-mt-muted text-sm text-center">Não foi possível carregar o produto. Verifique sua conexão.</p>
        <button onClick={() => refetch()} className="px-4 py-2 rounded-xl bg-mt-rose text-white text-sm font-semibold active:scale-95 transition-transform">Tentar novamente</button>
        <button onClick={onBack} className="text-mt-muted text-sm">Voltar</button>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] items-center justify-center gap-3">
        <Package size={40} className="text-mt-muted" />
        <p className="text-mt-muted text-sm">Produto não encontrado</p>
        <button onClick={onBack} className="text-mt-rose text-sm font-medium">Voltar</button>
      </div>
    )
  }

  const images = product.images
  const phases = product.phases
  const mercadoLivreUrl = product.mercadoLivreUrl

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-10 pb-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-white/70 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
        >
          <ChevronLeft size={20} className="text-mt-charcoal" />
        </button>
        <button
          onClick={() => wishlistMutation.mutate()}
          disabled={wishlistMutation.isPending}
          className="w-9 h-9 rounded-xl bg-white/70 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
        >
          <Heart
            size={20}
            className={product.inWishlist ? 'text-mt-rose-dark fill-current' : 'text-mt-muted'}
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
                <Package size={48} className="text-mt-muted" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <>
              <div className="flex justify-center gap-1.5 mt-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImageIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === imageIndex ? 'bg-mt-rose' : 'bg-mt-charcoal-muted/30'
                    }`}
                  />
                ))}
              </div>
              {imageIndex > 0 && (
                <button
                  onClick={() => setImageIndex((i) => i - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center"
                >
                  <ChevronLeft size={16} className="text-mt-charcoal" />
                </button>
              )}
              {imageIndex < images.length - 1 && (
                <button
                  onClick={() => setImageIndex((i) => i + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center rotate-180"
                >
                  <ChevronLeft size={16} className="text-mt-charcoal" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Meta */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="px-2.5 py-1 rounded-full bg-white/70 text-xs text-mt-muted font-medium">
            {product.category.icon} {product.category.name}
          </span>
          {phases?.map((ph) => (
            <span key={ph} className="px-2.5 py-1 rounded-full bg-mt-rose/10 text-xs text-mt-rose font-medium">
              {ph}
            </span>
          ))}
        </div>

        <h1 className="text-xl font-bold text-mt-charcoal leading-snug mb-1">{product.name}</h1>
        <p className="text-2xl font-extrabold text-mt-rose mb-2">
          R$ {Number(product.price).toFixed(2)}
        </p>

        {/* Stars summary */}
        {product.reviewsSummary.count > 0 && (
          <button
            className="flex items-center gap-1.5 mb-4"
            onClick={() => onOpenReviews(productId, product.name)}
          >
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={14}
                  className={
                    s <= Math.round(product.reviewsSummary.average)
                      ? 'text-mt-rose fill-current'
                      : 'text-mt-muted/30'
                  }
                />
              ))}
            </div>
            <span className="text-xs text-mt-muted">
              {product.reviewsSummary.average.toFixed(1)} ({product.reviewsSummary.count} avaliações)
            </span>
          </button>
        )}

        {/* Description */}
        <div className="mb-5">
          <p
            className={`text-sm text-mt-charcoal leading-relaxed ${
              !descExpanded ? 'line-clamp-3' : ''
            }`}
          >
            {product.description}
          </p>
          <button
            onClick={() => setDescExpanded((v) => !v)}
            className="text-xs text-mt-rose font-medium mt-1"
          >
            {descExpanded ? 'Ver menos' : 'Ver mais'}
          </button>
        </div>

        {/* Reviews teaser */}
        {product.reviewsSummary.count > 0 && (
          <div className="bg-white/60 rounded-3xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-2xl font-bold text-mt-charcoal">
                  {product.reviewsSummary.average.toFixed(1)}
                </span>
                <span className="text-xs text-mt-muted ml-1">/ 5</span>
              </div>
              <div className="flex flex-col gap-1 flex-1 ml-4">
                {[5, 4, 3, 2, 1].map((r) => {
                  const count = product.reviewsSummary.distribution[r] ?? 0
                  const pct = product.reviewsSummary.count
                    ? (count / product.reviewsSummary.count) * 100
                    : 0
                  return (
                    <div key={r} className="flex items-center gap-1.5">
                      <span className="text-[10px] text-mt-muted w-2">{r}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-mt-charcoal-muted/20 overflow-hidden">
                        <div
                          className="h-full bg-mt-rose rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            {product.reviews.slice(0, 2).map((review) => (
              <div key={review.id} className="border-t border-mt-linen/60 pt-3 mt-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-mt-rose/20 flex items-center justify-center text-xs font-bold text-mt-rose">
                    {review.user.name.charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-mt-charcoal">{review.user.name}</span>
                  {review.verifiedPurchase && (
                    <span className="text-[10px] text-green-600 font-medium">✓ Verificado</span>
                  )}
                  <div className="flex ml-auto">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={10}
                        className={
                          s <= review.rating ? 'text-mt-rose fill-current' : 'text-mt-muted/30'
                        }
                      />
                    ))}
                  </div>
                </div>
                {review.text && <p className="text-xs text-mt-muted line-clamp-2">{review.text}</p>}
              </div>
            ))}
            <button
              onClick={() => onOpenReviews(productId, product.name)}
              className="w-full mt-3 py-2 rounded-xl bg-white text-mt-rose text-xs font-semibold border border-mt-rose/30 active:scale-95 transition-transform"
            >
              Ver todas as avaliações
            </button>
          </div>
        )}

        {/* Related products */}
        {product.related.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-mt-muted uppercase tracking-wide mb-2">
              Produtos relacionados
            </p>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {product.related.map((rel) => (
                <button
                  key={rel.id}
                  onClick={() => onOpenProduct(rel.id)}
                  className="flex-shrink-0 w-32 bg-white/70 rounded-2xl p-2 flex flex-col gap-1 active:scale-95 transition-transform"
                >
                  {rel.images[0] ? (
                    <img
                      src={rel.images[0]}
                      alt={rel.name}
                      className="w-full h-20 rounded-xl object-cover bg-mt-linen"
                    />
                  ) : (
                    <div className="w-full h-20 rounded-xl bg-mt-linen flex items-center justify-center">
                      <Package size={20} className="text-mt-muted" />
                    </div>
                  )}
                  <p className="text-xs font-medium text-mt-charcoal line-clamp-2 leading-tight">{rel.name}</p>
                  <p className="text-xs font-bold text-mt-rose">R$ {Number(rel.price).toFixed(2)}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-gradient-to-t from-[#D9C4AF] to-transparent flex-shrink-0">
        {mercadoLivreUrl ? (
          <button
            type="button"
            onClick={() => window.open(resolveApiUrl(`/products/${product.id}/comprar`), '_blank', 'noopener,noreferrer')}
            className="w-full py-4 rounded-2xl bg-mt-rose text-white font-semibold text-base flex items-center justify-center gap-2 active:scale-95 transition-transform"
            aria-label="Comprar no Mercado Livre"
          >
            Comprar no Mercado Livre
            <ExternalLink size={16} />
          </button>
        ) : (
          <div className="w-full py-4 rounded-2xl bg-mt-linen text-mt-muted text-sm text-center">
            Produto indisponível
          </div>
        )}
      </div>
    </div>
  )
}
