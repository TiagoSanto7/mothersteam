import { Heart, ShoppingBag } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, resolveApiUrl } from '../../lib/api'
import type { ApiWishlistEntry, ApiAdminProduct } from '../../lib/types'

interface WishlistResponse {
  items: ApiWishlistEntry[]
}

const EMPTY_ITEMS: ApiWishlistEntry[] = []

export function FavoritesTab() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => apiFetch<WishlistResponse>('/wishlist'),
    staleTime: 30_000,
  })

  type RemoveVars = { id: string }
  type RemoveCtx = { prev?: WishlistResponse }

  const removeMutation = useMutation<unknown, unknown, RemoveVars, RemoveCtx>({
    mutationFn: ({ id }: RemoveVars) =>
      apiFetch(`/products/${id}/wishlist`, { method: 'POST' }),
    onMutate: async ({ id }: RemoveVars): Promise<RemoveCtx> => {
      await queryClient.cancelQueries({ queryKey: ['wishlist'] })
      const prev = queryClient.getQueryData<WishlistResponse>(['wishlist'])
      queryClient.setQueryData<WishlistResponse>(['wishlist'], (old) => ({
        items: (old?.items ?? EMPTY_ITEMS).filter(
          (entry) => (entry.product as ApiAdminProduct).id !== id
        ),
      }))
      return { prev }
    },
    onError: (_err: unknown, _vars: RemoveVars, ctx: RemoveCtx | undefined) => {
      if (ctx?.prev) queryClient.setQueryData(['wishlist'], ctx.prev)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      queryClient.invalidateQueries({ queryKey: ['product-detail'] })
    },
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

  const items = (data?.items ?? EMPTY_ITEMS).filter((w) => w.type === 'affiliate')

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 px-4">
        <Heart size={40} className="text-mt-muted/30" />
        <p className="text-mt-muted text-sm font-medium">Nenhum favorito ainda</p>
        <p className="text-xs text-mt-muted text-center">
          Toque no ♡ em qualquer produto para salvar aqui
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-6">
      {items.map((entry) => {
        const product = entry.product as ApiAdminProduct
        const images = product.images as string[]

        return (
          <div key={`affiliate-${product.id}`} className="bg-white rounded-3xl p-4 shadow-sm flex gap-3">
            <div className="flex-shrink-0">
              {images[0] ? (
                <img
                  src={images[0]}
                  alt={product.name}
                  className="w-20 h-20 rounded-2xl object-cover bg-mt-linen"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-mt-linen flex items-center justify-center">
                  <ShoppingBag size={24} className="text-mt-muted" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <p className="text-[11px] text-mt-muted">
                {product.category?.name ?? ''}
              </p>
              <p className="text-sm font-semibold text-mt-charcoal leading-tight line-clamp-2">
                {product.name}
              </p>
              <p className="text-sm font-bold text-mt-rose">
                R$ {Number(product.price).toFixed(2)}
              </p>

              <div className="flex gap-2 mt-auto pt-1">
                <a
                  href={resolveApiUrl(`/products/${product.id}/comprar`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-mt-rose text-white active:scale-95 transition-colors"
                >
                  Comprar no ML
                </a>
                <button
                  onClick={() => removeMutation.mutate({ id: product.id })}
                  disabled={removeMutation.isPending}
                  className="w-8 h-8 rounded-xl bg-mt-rose-dark/10 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Heart size={14} className="text-mt-rose-dark fill-current" />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
