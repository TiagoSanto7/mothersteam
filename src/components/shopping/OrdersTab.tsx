import { Package } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import type { ApiOrder } from '../../lib/types'

interface Props {
  onOpenOrder: (orderId: string) => void
}

const STATUS_LABEL: Record<string, string> = {
  PENDING:   'Aguardando pagamento',
  PAID:      'Pago',
  PREPARING: 'Em preparação',
  SHIPPED:   'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  PAID:      'bg-blue-100 text-blue-700',
  PREPARING: 'bg-orange-100 text-orange-700',
  SHIPPED:   'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export function OrdersTab({ onOpenOrder }: Props) {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => apiFetch<ApiOrder[]>('/orders'),
    staleTime: 30_000,
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

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 px-4">
        <Package size={40} className="text-graphite-muted/30" />
        <p className="text-graphite-muted text-sm font-medium">Nenhum pedido ainda</p>
        <p className="text-xs text-graphite-muted text-center">
          Seus pedidos aparecerão aqui após a compra
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-6">
      {orders.map((order) => {
        const firstItems = order.items.slice(0, 2)
        return (
          <button
            key={order.id}
            onClick={() => onOpenOrder(order.id)}
            className="w-full text-left bg-white rounded-3xl p-4 shadow-sm flex gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="flex gap-1 flex-shrink-0">
              {firstItems.map((item) => {
                const img = (item.ownProduct.images as string[])[0]
                return img ? (
                  <img
                    key={item.id}
                    src={img}
                    alt={item.ownProduct.name}
                    className="w-12 h-12 rounded-xl object-cover bg-sara-linen"
                  />
                ) : (
                  <div key={item.id} className="w-12 h-12 rounded-xl bg-sara-linen flex items-center justify-center">
                    <Package size={14} className="text-graphite-muted" />
                  </div>
                )
              })}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-graphite">
                  #{order.id.slice(-8).toUpperCase()}
                </p>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLOR[order.status] ?? 'bg-graphite-muted/10 text-graphite-muted'}`}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
              <p className="text-xs text-graphite-muted mt-0.5">
                {new Date(order.createdAt).toLocaleDateString('pt-BR')}
              </p>
              <p className="text-sm font-bold text-sara-gold mt-1">
                R$ {Number(order.total).toFixed(2)}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
