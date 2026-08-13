import { ChevronLeft, Package, MapPin, CheckCircle, Circle, Truck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import type { ApiOrder } from '../../lib/types'

interface Props {
  orderId: string
  onBack: () => void
}

const STATUS_STEPS = ['PENDING', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED'] as const

const STATUS_LABEL: Record<string, string> = {
  PENDING:   'Aguardando pagamento',
  PAID:      'Pagamento confirmado',
  PREPARING: 'Preparando pedido',
  SHIPPED:   'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

export function OrderDetailScreen({ orderId, onBack }: Props) {
  const { data: order, isLoading } = useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => apiFetch<ApiOrder>(`/orders/${orderId}`),
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF]">
        <div className="flex items-center gap-3 px-4 pt-10 pb-4">
          <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center">
            <ChevronLeft size={20} className="text-graphite" />
          </button>
        </div>
        <div className="px-4 animate-pulse flex flex-col gap-3">
          <div className="h-32 bg-white/60 rounded-3xl" />
          <div className="h-48 bg-white/60 rounded-3xl" />
        </div>
      </div>
    )
  }

  if (!order) return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF]">
      <div className="flex items-center gap-3 px-4 pt-10 pb-4">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center active:scale-95 transition-transform">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
      </div>
      <p className="text-center text-sm text-graphite-muted mt-8">Pedido não encontrado.</p>
    </div>
  )

  const currentStatusIndex = STATUS_STEPS.indexOf(order.status as typeof STATUS_STEPS[number])
  const isCancelled = order.status === 'CANCELLED'

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-10 pb-4 flex-shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-white/70 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
        >
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-graphite">
            Pedido #{order.id.slice(-8).toUpperCase()}
          </h1>
          <p className="text-xs text-graphite-muted">
            {new Date(order.createdAt).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="bg-white/60 rounded-3xl p-4 mb-4">
          <p className="text-xs font-semibold text-graphite-muted uppercase tracking-wide mb-3">
            Status do pedido
          </p>
          {isCancelled ? (
            <div className="flex items-center gap-2 text-sara-terracotta">
              <Circle size={16} />
              <span className="text-sm font-medium">Pedido cancelado</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {STATUS_STEPS.map((status, i) => {
                const isDone = i <= currentStatusIndex
                const isCurrent = i === currentStatusIndex
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isDone ? 'bg-sara-gold' : 'bg-graphite-muted/20'
                    }`}>
                      {isDone ? (
                        <CheckCircle size={12} className="text-white" />
                      ) : (
                        <Circle size={12} className="text-graphite-muted/40" />
                      )}
                    </div>
                    <span className={`text-sm ${isCurrent ? 'font-semibold text-graphite' : isDone ? 'text-graphite-muted' : 'text-graphite-muted/40'}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {order.trackingCode && (
            <div className="mt-3 pt-3 border-t border-sara-linen/60">
              <div className="flex items-center gap-2">
                <Truck size={14} className="text-sara-gold" />
                <span className="text-xs text-graphite-muted">Rastreio: </span>
                <span className="text-xs font-mono font-semibold text-graphite">{order.trackingCode}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white/60 rounded-3xl p-4 mb-4">
          <p className="text-xs font-semibold text-graphite-muted uppercase tracking-wide mb-3">
            Itens do pedido
          </p>
          {order.items.map((item) => {
            const img = (item.ownProduct.images as string[])[0]
            return (
              <div key={item.id} className="flex gap-3 mb-3 last:mb-0">
                {img ? (
                  <img src={img} alt={item.ownProduct.name} className="w-12 h-12 rounded-xl object-cover bg-sara-linen flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-sara-linen flex items-center justify-center flex-shrink-0">
                    <Package size={14} className="text-graphite-muted" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-graphite line-clamp-1">{item.ownProduct.name}</p>
                  <p className="text-xs text-graphite-muted">
                    {item.quantity}× R$ {Number(item.priceAtPurchase).toFixed(2)}
                  </p>
                  <p className="text-xs font-semibold text-graphite">
                    R$ {(Number(item.priceAtPurchase) * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-white/60 rounded-3xl p-4 mb-4">
          <div className="flex justify-between text-sm text-graphite mb-1.5">
            <span>Subtotal</span>
            <span>R$ {(Number(order.total) - Number(order.shippingFee)).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-graphite mb-2">
            <span>Frete</span>
            <span>R$ {Number(order.shippingFee).toFixed(2)}</span>
          </div>
          <div className="border-t border-sara-linen pt-2 flex justify-between text-sm font-bold text-graphite">
            <span>Total</span>
            <span className="text-sara-gold">R$ {Number(order.total).toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white/60 rounded-3xl p-4">
          <p className="text-xs font-semibold text-graphite-muted uppercase tracking-wide mb-2 flex items-center gap-1">
            <MapPin size={11} /> Endereço de entrega
          </p>
          <p className="text-sm font-medium text-graphite">{order.address.recipientName}</p>
          <p className="text-xs text-graphite-muted">
            {order.address.street}, {order.address.number}
            {order.address.complement ? `, ${order.address.complement}` : ''}
          </p>
          <p className="text-xs text-graphite-muted">
            {order.address.neighborhood} — {order.address.city}/{order.address.state}
          </p>
          <p className="text-xs text-graphite-muted">CEP {order.address.zipCode}</p>
        </div>
      </div>
    </div>
  )
}
