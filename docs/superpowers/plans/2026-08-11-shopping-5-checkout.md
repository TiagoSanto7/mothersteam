# Shopping — Plano 5: Checkout, Pedidos & FCM

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar `CheckoutScreen` em 3 etapas (endereço → pagamento → confirmação), `OrdersTab` com histórico de pedidos, `OrderDetailScreen` com timeline de status, e registrar token FCM no login para push notifications.

**Architecture:** CheckoutScreen como overlay z-50 a partir do CartScreen. PIX com polling `GET /orders/:id` a cada 3s até PAID ou timeout 10min. Mercado Pago SDK JS carregado via script tag para tokenizar cartão (PCI-safe). FCM token registrado via `@capacitor/push-notifications` no useEffect do App.tsx após login.

**Tech Stack:** React, TanStack Query, @capacitor/push-notifications, Tailwind, Lucide icons

**Dependência:** Planos 1–4 concluídos.

---

## File Structure

- Create: `src/components/shopping/CheckoutScreen.tsx`
- Create: `src/components/shopping/OrdersTab.tsx`
- Create: `src/components/shopping/OrderDetailScreen.tsx`
- Modify: `src/App.tsx` — CheckoutScreen overlay + OrderDetailScreen overlay + FCM registration

---

### Task 1: Criar CheckoutScreen — stepper de 3 etapas

**Files:**
- Create: `src/components/shopping/CheckoutScreen.tsx`

Este arquivo é grande — vamos construí-lo por etapas (Step 1 = Etapa 1 Endereço, Step 2 = Etapa 2 Pagamento, Step 3 = Etapa 3 Confirmação, Step 4 = montar tudo).

- [ ] **Step 1: Criar estrutura base + Etapa 1 (Endereço)**

```tsx
// src/components/shopping/CheckoutScreen.tsx
import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, Plus, MapPin, CreditCard, QrCode, CheckCircle, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import type { ApiAddress, ApiCart, ApiOrder } from '../../lib/types'

interface Props {
  onBack: () => void
  onOrderComplete: (orderId: string) => void
}

type Step = 'address' | 'payment' | 'confirmation'

// ── Etapa 1 — Endereço ──────────────────────────────────────

function AddressStep({
  onNext,
}: {
  onNext: (addressId: string) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    recipientName: '', street: '', number: '', complement: '', neighborhood: '',
    city: '', state: '', zipCode: '', isDefault: false,
  })
  const [zipLoading, setZipLoading] = useState(false)
  const queryClient = useQueryClient()

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => apiFetch<ApiAddress[]>('/addresses'),
    staleTime: 60_000,
  })

  // Auto-select default address
  useEffect(() => {
    const def = addresses.find((a) => a.isDefault)
    if (def && !selectedId) setSelectedId(def.id)
  }, [addresses])

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<ApiAddress>('/addresses', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: (addr) => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      setSelectedId(addr.id)
      setShowForm(false)
    },
  })

  async function fetchZip(zip: string) {
    const clean = zip.replace(/\D/g, '')
    if (clean.length !== 8) return
    setZipLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm((f) => ({
          ...f,
          street: data.logradouro ?? f.street,
          neighborhood: data.bairro ?? f.neighborhood,
          city: data.localidade ?? f.city,
          state: data.uf ?? f.state,
        }))
      }
    } catch {}
    setZipLoading(false)
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-white/70 text-sm text-graphite outline-none border border-transparent focus:border-sara-gold/40 placeholder:text-graphite-muted/50'

  return (
    <div className="flex flex-col gap-4 pb-4">
      <p className="text-sm font-semibold text-graphite">Selecione o endereço de entrega</p>

      {addresses.map((addr) => (
        <button
          key={addr.id}
          onClick={() => setSelectedId(addr.id)}
          className={`w-full text-left p-4 rounded-2xl border-2 transition-colors flex gap-3 items-start ${
            selectedId === addr.id
              ? 'border-sara-gold bg-sara-gold/5'
              : 'border-sara-linen/60 bg-white/50'
          }`}
        >
          <MapPin size={16} className="text-sara-gold flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-graphite">{addr.recipientName}</p>
            <p className="text-xs text-graphite-muted">
              {addr.street}, {addr.number}
              {addr.complement ? `, ${addr.complement}` : ''} — {addr.neighborhood}
            </p>
            <p className="text-xs text-graphite-muted">
              {addr.city} / {addr.state} — CEP {addr.zipCode}
            </p>
            {addr.isDefault && (
              <span className="text-[10px] text-sara-gold font-medium">Padrão</span>
            )}
          </div>
        </button>
      ))}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-2xl border border-dashed border-sara-gold/40 text-sara-gold text-sm font-medium flex items-center justify-center gap-2"
        >
          <Plus size={14} /> Novo endereço
        </button>
      )}

      {showForm && (
        <div className="bg-white/60 rounded-3xl p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-graphite">Novo endereço</p>
          <input
            className={inputClass}
            placeholder="Nome do destinatário"
            value={form.recipientName}
            onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
          />
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="CEP (apenas números)"
              value={form.zipCode}
              maxLength={8}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 8)
                setForm((f) => ({ ...f, zipCode: v }))
                if (v.length === 8) fetchZip(v)
              }}
            />
            {zipLoading && <Loader2 size={16} className="animate-spin text-sara-gold self-center" />}
          </div>
          <input
            className={inputClass}
            placeholder="Rua"
            value={form.street}
            onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
          />
          <div className="flex gap-2">
            <input
              className={`${inputClass} w-24 flex-shrink-0`}
              placeholder="Nº"
              value={form.number}
              onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
            />
            <input
              className={inputClass}
              placeholder="Complemento (opcional)"
              value={form.complement}
              onChange={(e) => setForm((f) => ({ ...f, complement: e.target.value }))}
            />
          </div>
          <input
            className={inputClass}
            placeholder="Bairro"
            value={form.neighborhood}
            onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
          />
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="Cidade"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
            <input
              className={`${inputClass} w-16 flex-shrink-0`}
              placeholder="UF"
              value={form.state}
              maxLength={2}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase().slice(0, 2) }))}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-graphite-muted">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              className="accent-sara-gold"
            />
            Definir como endereço padrão
          </label>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-xl border border-sara-linen text-graphite-muted text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.recipientName || !form.street || !form.number}
              className="flex-1 py-2.5 rounded-xl bg-sara-gold text-white text-sm font-semibold disabled:opacity-50"
            >
              {createMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => selectedId && onNext(selectedId)}
        disabled={!selectedId}
        className="w-full py-4 rounded-2xl bg-sara-gold text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 shadow-lg mt-2"
      >
        Continuar
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Adicionar Etapa 2 (Pagamento) ao mesmo arquivo**

Após o componente `AddressStep`, adicionar:

```tsx
// ── Etapa 2 — Pagamento ──────────────────────────────────────

declare global {
  interface Window { MercadoPago: any }
}

function PaymentStep({
  addressId,
  onSuccess,
  onBack,
}: {
  addressId: string
  onSuccess: (result: { orderId: string; status: string; pixQrCode?: string; pixCode?: string }) => void
  onBack: () => void
}) {
  const queryClient = useQueryClient()
  const [method, setMethod] = useState<'pix' | 'credit_card'>('pix')
  const [cardForm, setCardForm] = useState({
    number: '', expiry: '', cvv: '', name: '',
    installments: 1, paymentMethodId: '',
  })
  const [error, setError] = useState('')
  const sdkRef = useRef<any>(null)

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => apiFetch<ApiCart>('/cart'),
    staleTime: 30_000,
  })

  // Load MercadoPago SDK
  useEffect(() => {
    if (window.MercadoPago) return
    const script = document.createElement('script')
    script.src = 'https://sdk.mercadopago.com/js/v2'
    script.async = true
    script.onload = () => {
      sdkRef.current = new window.MercadoPago(
        import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY ?? '',
        { locale: 'pt-BR' }
      )
    }
    document.body.appendChild(script)
  }, [])

  const orderMutation = useMutation({
    mutationFn: async () => {
      if (method === 'pix') {
        return apiFetch<{ orderId: string; status: string; pixQrCode: string; pixCode: string }>('/orders', {
          method: 'POST',
          body: JSON.stringify({ addressId, paymentMethod: 'pix' }),
        })
      }

      // Tokenize card via MercadoPago SDK
      if (!sdkRef.current) throw new Error('SDK not ready')
      const { token, payment_method_id } = await sdkRef.current.createCardToken({
        cardNumber: cardForm.number.replace(/\s/g, ''),
        cardExpirationMonth: cardForm.expiry.split('/')[0],
        cardExpirationYear: `20${cardForm.expiry.split('/')[1]}`,
        securityCode: cardForm.cvv,
        cardholderName: cardForm.name,
      })

      return apiFetch<{ orderId: string; status: string; statusDetail?: string }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          addressId,
          paymentMethod: 'credit_card',
          cardToken: token,
          paymentMethodId: payment_method_id ?? cardForm.paymentMethodId,
          installments: cardForm.installments,
        }),
      })
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      onSuccess(result)
    },
    onError: (err: any) => {
      setError(err?.message ?? 'Erro ao processar pagamento. Tente novamente.')
    },
  })

  const subtotal = Number(cart?.subtotal ?? 0)
  const inputClass =
    'w-full px-3 py-2.5 rounded-xl bg-white/70 text-sm text-graphite outline-none border border-transparent focus:border-sara-gold/40 placeholder:text-graphite-muted/50'

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Order summary */}
      <div className="bg-white/50 rounded-2xl px-4 py-3 flex justify-between items-center">
        <span className="text-xs text-graphite-muted">
          {cart?.itemCount ?? 0} itens · Total estimado
        </span>
        <span className="text-sm font-bold text-graphite">R$ {subtotal.toFixed(2)}</span>
      </div>

      {/* Method selector */}
      <p className="text-sm font-semibold text-graphite">Forma de pagamento</p>
      <div className="flex gap-2">
        {(['pix', 'credit_card'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`flex-1 py-3 rounded-2xl border-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              method === m
                ? 'border-sara-gold bg-sara-gold/5 text-sara-gold'
                : 'border-sara-linen/60 bg-white/50 text-graphite-muted'
            }`}
          >
            {m === 'pix' ? <><QrCode size={14} /> PIX</> : <><CreditCard size={14} /> Cartão</>}
          </button>
        ))}
      </div>

      {method === 'pix' && (
        <div className="bg-white/60 rounded-2xl p-4 text-center">
          <QrCode size={32} className="text-sara-gold mx-auto mb-2" />
          <p className="text-sm text-graphite font-medium">Aprovação imediata</p>
          <p className="text-xs text-graphite-muted mt-1">
            QR Code gerado após confirmar o pedido. Válido por 10 minutos.
          </p>
        </div>
      )}

      {method === 'credit_card' && (
        <div className="flex flex-col gap-3">
          <input
            className={inputClass}
            placeholder="Número do cartão"
            maxLength={19}
            value={cardForm.number}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 16)
              const formatted = v.replace(/(\d{4})/g, '$1 ').trim()
              setCardForm((f) => ({ ...f, number: formatted }))
            }}
          />
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="MM/AA"
              maxLength={5}
              value={cardForm.expiry}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                const formatted = v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v
                setCardForm((f) => ({ ...f, expiry: formatted }))
              }}
            />
            <input
              className={inputClass}
              placeholder="CVV"
              maxLength={4}
              value={cardForm.cvv}
              onChange={(e) =>
                setCardForm((f) => ({ ...f, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))
              }
            />
          </div>
          <input
            className={inputClass}
            placeholder="Nome no cartão"
            value={cardForm.name}
            onChange={(e) => setCardForm((f) => ({ ...f, name: e.target.value.toUpperCase() }))}
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-graphite-muted flex-shrink-0">Parcelar em:</label>
            <select
              className={`${inputClass} flex-1`}
              value={cardForm.installments}
              onChange={(e) => setCardForm((f) => ({ ...f, installments: Number(e.target.value) }))}
            >
              {[1, 2, 3, 6, 12].map((n) => (
                <option key={n} value={n}>
                  {n}x R$ {(subtotal / n).toFixed(2)} {n === 1 ? '(sem juros)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-sara-terracotta bg-sara-terracotta/10 rounded-xl px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2 mt-2">
        <button
          onClick={onBack}
          className="flex-none w-11 h-11 rounded-xl bg-white/70 flex items-center justify-center active:scale-95 transition-transform"
        >
          <ChevronLeft size={18} className="text-graphite" />
        </button>
        <button
          onClick={() => orderMutation.mutate()}
          disabled={orderMutation.isPending}
          className="flex-1 py-3.5 rounded-2xl bg-sara-gold text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-60 shadow-lg"
        >
          {orderMutation.isPending ? 'Processando...' : 'Confirmar pedido'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Adicionar Etapa PIX e Etapa 3 (Confirmação) ao mesmo arquivo**

```tsx
// ── PIX — tela de espera com QR Code ─────────────────────────

function PixWaitingScreen({
  orderId,
  pixQrCode,
  pixCode,
  onPaid,
  onCancel,
}: {
  orderId: string
  pixQrCode?: string | null
  pixCode?: string | null
  onPaid: () => void
  onCancel: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [expired, setExpired] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Poll every 3s for 10 minutes
    intervalRef.current = setInterval(async () => {
      try {
        const order = await apiFetch<ApiOrder>(`/orders/${orderId}`)
        if (order.status === 'PAID') {
          clearInterval(intervalRef.current!)
          clearTimeout(timeoutRef.current!)
          onPaid()
        }
      } catch {}
    }, 3000)

    timeoutRef.current = setTimeout(() => {
      clearInterval(intervalRef.current!)
      setExpired(true)
    }, 10 * 60 * 1000)

    return () => {
      clearInterval(intervalRef.current!)
      clearTimeout(timeoutRef.current!)
    }
  }, [orderId])

  async function copyCode() {
    if (!pixCode) return
    try {
      await navigator.clipboard.writeText(pixCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  if (expired) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="text-sara-terracotta font-semibold text-sm">QR Code expirado</p>
        <p className="text-xs text-graphite-muted">O tempo de pagamento via PIX expirou.</p>
        <button
          onClick={onCancel}
          className="px-6 py-2.5 rounded-xl bg-white/70 text-graphite text-sm font-medium"
        >
          Voltar ao carrinho
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="flex items-center gap-2">
        <Loader2 size={16} className="animate-spin text-sara-gold" />
        <p className="text-sm text-graphite font-medium">Aguardando pagamento PIX...</p>
      </div>

      {pixQrCode && (
        <img
          src={`data:image/png;base64,${pixQrCode}`}
          alt="QR Code PIX"
          className="w-48 h-48 rounded-2xl border-2 border-sara-gold/20"
        />
      )}

      {pixCode && (
        <div className="w-full">
          <p className="text-xs text-graphite-muted mb-1">Ou copie o código PIX:</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={pixCode}
              className="flex-1 text-xs bg-white/70 rounded-xl px-3 py-2 outline-none truncate"
            />
            <button
              onClick={copyCode}
              className="px-3 py-2 rounded-xl bg-sara-gold text-white text-xs font-semibold active:scale-95"
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      )}

      <p className="text-[10px] text-graphite-muted">
        Verificando automaticamente. Válido por 10 minutos.
      </p>
    </div>
  )
}

// ── Etapa 3 — Confirmação ─────────────────────────────────────

function ConfirmationStep({
  orderId,
  onViewOrder,
  onContinue,
}: {
  orderId: string
  onViewOrder: () => void
  onContinue: () => void
}) {
  const { data: order } = useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => apiFetch<ApiOrder>(`/orders/${orderId}`),
    staleTime: 60_000,
  })

  return (
    <div className="flex flex-col items-center gap-5 py-8 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle size={36} className="text-green-500" />
      </div>
      <div>
        <p className="text-lg font-bold text-graphite">Pedido confirmado!</p>
        <p className="text-xs text-graphite-muted mt-1">
          #{order?.id.slice(-8).toUpperCase() ?? orderId.slice(-8).toUpperCase()}
        </p>
      </div>
      {order && (
        <p className="text-sm text-graphite-muted">
          Total: <span className="font-bold text-graphite">R$ {Number(order.total).toFixed(2)}</span>
        </p>
      )}
      <p className="text-xs text-graphite-muted">
        Previsão de entrega: 5–8 dias úteis após o pagamento.
      </p>
      <div className="flex flex-col gap-2 w-full mt-2">
        <button
          onClick={onViewOrder}
          className="w-full py-3.5 rounded-2xl bg-sara-gold text-white font-bold text-sm active:scale-95 transition-transform"
        >
          Ver meu pedido
        </button>
        <button
          onClick={onContinue}
          className="w-full py-3 rounded-2xl bg-white/70 text-graphite text-sm font-medium active:scale-95 transition-transform"
        >
          Continuar comprando
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Adicionar o componente principal CheckoutScreen ao mesmo arquivo**

```tsx
// ── CheckoutScreen — orquestrador das etapas ─────────────────

export function CheckoutScreen({ onBack, onOrderComplete }: Props) {
  const [step, setStep] = useState<Step>('address')
  const [addressId, setAddressId] = useState<string | null>(null)
  const [pixData, setPixData] = useState<{ orderId: string; qrCode?: string; code?: string } | null>(null)
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null)

  const STEPS: Step[] = ['address', 'payment', 'confirmation']
  const stepIndex = STEPS.indexOf(step)

  const stepLabel: Record<Step, string> = {
    address: 'Endereço',
    payment: 'Pagamento',
    confirmation: 'Confirmação',
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-10 pb-4 flex-shrink-0">
        {step !== 'confirmation' && (
          <button
            onClick={step === 'address' ? onBack : () => setStep('address')}
            className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronLeft size={20} className="text-graphite" />
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-base font-semibold text-graphite">Finalizar pedido</h1>
          <p className="text-xs text-graphite-muted">{stepLabel[step]}</p>
        </div>
      </div>

      {/* Stepper indicator */}
      {step !== 'confirmation' && (
        <div className="flex px-4 mb-4 gap-1.5 flex-shrink-0">
          {STEPS.filter((s) => s !== 'confirmation').map((s, i) => (
            <div
              key={s}
              className={`h-1 rounded-full flex-1 transition-colors ${
                i <= stepIndex - (step === 'confirmation' ? 0 : 0)
                  ? 'bg-sara-gold'
                  : 'bg-sara-linen/60'
              }`}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {step === 'address' && (
          <AddressStep
            onNext={(id) => {
              setAddressId(id)
              setStep('payment')
            }}
          />
        )}

        {step === 'payment' && addressId && !pixData && (
          <PaymentStep
            addressId={addressId}
            onBack={() => setStep('address')}
            onSuccess={(result) => {
              if (result.pixQrCode || result.pixCode) {
                setPixData({ orderId: result.orderId, qrCode: result.pixQrCode, code: result.pixCode })
              } else {
                setConfirmedOrderId(result.orderId)
                setStep('confirmation')
              }
            }}
          />
        )}

        {step === 'payment' && pixData && (
          <PixWaitingScreen
            orderId={pixData.orderId}
            pixQrCode={pixData.qrCode}
            pixCode={pixData.code}
            onPaid={() => {
              setConfirmedOrderId(pixData.orderId)
              setPixData(null)
              setStep('confirmation')
            }}
            onCancel={() => {
              setPixData(null)
              onBack()
            }}
          />
        )}

        {step === 'confirmation' && confirmedOrderId && (
          <ConfirmationStep
            orderId={confirmedOrderId}
            onViewOrder={() => onOrderComplete(confirmedOrderId)}
            onContinue={onBack}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Adicionar env var para a chave pública do Mercado Pago**

No arquivo `src/.env` (ou `.env.local`):

```
VITE_MERCADO_PAGO_PUBLIC_KEY=APP_USR-xxx...
```

Obter em: Mercado Pago → Credenciais → Chave pública.

- [ ] **Step 6: Commit**

```bash
git add src/components/shopping/CheckoutScreen.tsx
git commit -m "feat(shopping): CheckoutScreen stepper — address, PIX/card payment, confirmation"
```

---

### Task 2: Criar OrdersTab

**Files:**
- Create: `src/components/shopping/OrdersTab.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
// src/components/shopping/OrdersTab.tsx
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
```

- [ ] **Step 2: Substituir o `OrdersTabPlaceholder` no ShoppingScreen pelo `OrdersTab` real**

Em `src/components/shopping/ShoppingScreen.tsx`:
1. Importar `OrdersTab` e remover `OrdersTabPlaceholder`
2. Atualizar a prop da ShoppingScreen para receber `onOpenOrder`

```tsx
// Adicionar prop:
interface ShoppingScreenProps {
  onOpenProduct: (type: 'affiliate' | 'own', id: string) => void
  onOpenCart: () => void
  onOpenOrder: (orderId: string) => void
}

// No JSX:
{activeTab === 'orders' && <OrdersTab onOpenOrder={onOpenOrder} />}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shopping/OrdersTab.tsx src/components/shopping/ShoppingScreen.tsx
git commit -m "feat(shopping): OrdersTab with status badges, replace placeholder in ShoppingScreen"
```

---

### Task 3: Criar OrderDetailScreen

**Files:**
- Create: `src/components/shopping/OrderDetailScreen.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
// src/components/shopping/OrderDetailScreen.tsx
import { ChevronLeft, Package, MapPin, CheckCircle, Circle, Truck, Star } from 'lucide-react'
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

  if (!order) return null

  const currentStatusIndex = STATUS_STEPS.indexOf(order.status as any)
  const isCancelled = order.status === 'CANCELLED'

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
        {/* Status timeline */}
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

        {/* Items */}
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

        {/* Totals */}
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

        {/* Delivery address */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shopping/OrderDetailScreen.tsx
git commit -m "feat(shopping): OrderDetailScreen with status timeline, items, address, tracking"
```

---

### Task 4: Registrar FCM token + wire overlays em App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Importar novos componentes**

```tsx
import { CheckoutScreen } from './components/shopping/CheckoutScreen'
import { OrderDetailScreen } from './components/shopping/OrderDetailScreen'
```

- [ ] **Step 2: Adicionar estados de checkout e pedido**

```tsx
const [openOrderId, setOpenOrderId] = useState<string | null>(null)
```

(`showCheckout` já foi adicionado no Plano 4)

- [ ] **Step 3: Adicionar overlay CheckoutScreen**

```tsx
{showCheckout && (
  <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
    <div className="w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <CheckoutScreen
        onBack={() => setShowCheckout(false)}
        onOrderComplete={(orderId) => {
          setShowCheckout(false)
          setOpenOrderId(orderId)
        }}
      />
    </div>
  </div>
)}
```

- [ ] **Step 4: Adicionar overlay OrderDetailScreen**

```tsx
{openOrderId && (
  <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
    <div className="w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <OrderDetailScreen
        orderId={openOrderId}
        onBack={() => setOpenOrderId(null)}
      />
    </div>
  </div>
)}
```

- [ ] **Step 5: Atualizar ShoppingScreen com prop onOpenOrder**

```tsx
shopping: (
  <ShoppingScreen
    onOpenProduct={(type, id) => setOpenProduct({ type, id })}
    onOpenCart={() => setShowCart(true)}
    onOpenOrder={(orderId) => setOpenOrderId(orderId)}
  />
),
```

- [ ] **Step 6: Registrar token FCM ao fazer login**

Adicionar import no topo de App.tsx:

```tsx
import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'
```

Adicionar useEffect após o `useSSE()`:

```tsx
useEffect(() => {
  if (!isLoggedIn || !Capacitor.isNativePlatform()) return

  async function registerFcm() {
    let permission = await PushNotifications.checkPermissions()
    if (permission.receive === 'prompt') {
      permission = await PushNotifications.requestPermissions()
    }
    if (permission.receive !== 'granted') return

    await PushNotifications.register()

    const listener = await PushNotifications.addListener('registration', async (token) => {
      try {
        await apiFetch('/users/fcm-token', {
          method: 'PUT',
          body: JSON.stringify({ token: token.value, platform: Capacitor.getPlatform() }),
        })
      } catch {}
      listener.remove()
    })
  }

  registerFcm().catch(() => {})
}, [isLoggedIn])
```

Nota: `@capacitor/push-notifications` e `@capacitor/core` já devem estar instalados (o app usa Capacitor). Se não estiver: `npm install @capacitor/push-notifications`.

- [ ] **Step 7: Verificar o fluxo completo**

```bash
npm run dev
```

1. Shopping → produto próprio → "Adicionar ao carrinho"
2. Ícone carrinho → CartScreen → "Finalizar pedido"
3. CheckoutScreen → selecionar endereço → Continuar
4. PIX → confirmar → QR Code aparece → polling aguarda status PAID
5. (Simular webhook ou mudar status no DB) → Etapa 3 aparece
6. "Ver meu pedido" → OrderDetailScreen
7. Tab "Pedidos" no Shopping → OrdersTab com o pedido listado
8. Tocar no pedido → OrderDetailScreen

- [ ] **Step 8: Commit final**

```bash
git add src/App.tsx
git commit -m "feat(app): CheckoutScreen + OrderDetailScreen overlays + FCM registration on login"
```
