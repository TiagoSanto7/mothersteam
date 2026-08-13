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

const EMPTY_ITEMS: ApiWishlistEntry[] = []

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
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['wishlist'] })
      const prev = queryClient.getQueryData<WishlistResponse>(['wishlist'])
      queryClient.setQueryData<WishlistResponse>(['wishlist'], (old) => ({
        items: (old?.items ?? EMPTY_ITEMS).filter(
          (entry) => (entry.product as ApiAdminProduct | ApiOwnProduct).id !== id
        ),
      }))
      return { prev }
    },
    onError: (_err: unknown, _vars: unknown, ctx: { prev?: WishlistResponse } | undefined) => {
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

  const items = data?.items ?? EMPTY_ITEMS

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
        const product = entry.product as ApiAdminProduct | ApiOwnProduct
        const isOwn = entry.type === 'own'
        const hasStock = isOwn ? (product as ApiOwnProduct).stock > 0 : true
        const images = product.images as string[]

        return (
          <div key={product.id} className="bg-white rounded-3xl p-4 shadow-sm flex gap-3">
            <button onClick={() => onOpenProduct(entry.type, product.id)} className="flex-shrink-0">
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
                {(product as ApiAdminProduct).category?.name ?? ''}
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
                    Ver detalhes <ExternalLink size={10} />
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
