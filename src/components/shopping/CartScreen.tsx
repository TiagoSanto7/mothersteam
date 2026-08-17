import { useState, useEffect } from 'react'
import { ChevronLeft, ShoppingCart, Minus, Plus, Trash2, Package } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import type { ApiCart, ApiAddress } from '../../lib/types'

interface Props {
  onBack: () => void
  onCheckout: () => void
}

const EMPTY_ITEMS: ApiCart['items'] = []

export function CartScreen({ onBack, onCheckout }: Props) {
  const queryClient = useQueryClient()
  const [shippingFee, setShippingFee] = useState<string | null>(null)
  const [shippingDays, setShippingDays] = useState<number | null>(null)
  const [mutationError, setMutationError] = useState('')

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

  useEffect(() => {
    if (!defaultAddress || !cart?.items.length) return
    apiFetch<{ fee: string; estimatedDays: number }>('/cart/shipping', {
      method: 'POST',
      body: JSON.stringify({ addressId: defaultAddress.id }),
    })
      .then(({ fee, estimatedDays }) => {
        setShippingFee(fee)
        setShippingDays(estimatedDays)
      })
      .catch(() => {})
  }, [defaultAddress?.id, cart?.subtotal])

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      apiFetch<ApiCart>(`/cart/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      }),
    onSuccess: (newCart) => {
      queryClient.setQueryData(['cart'], newCart)
    },
    onError: () => {
      setMutationError('Erro ao atualizar o carrinho. Tente novamente.')
      setTimeout(() => setMutationError(''), 3000)
    },
  })

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => apiFetch<ApiCart>(`/cart/${itemId}`, { method: 'DELETE' }),
    onSuccess: (newCart) => {
      queryClient.setQueryData(['cart'], newCart)
    },
    onError: () => {
      setMutationError('Erro ao remover o item. Tente novamente.')
      setTimeout(() => setMutationError(''), 3000)
    },
  })

  const items = cart?.items ?? EMPTY_ITEMS
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
          <div className="flex-1 overflow-y-auto px-4 pb-2">
            {mutationError && (
              <p className="text-xs text-sara-terracotta bg-sara-terracotta/10 rounded-xl px-3 py-2 mb-3">{mutationError}</p>
            )}
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
              {shippingDays !== null && (
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
