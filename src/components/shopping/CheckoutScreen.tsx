import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, Plus, MapPin, CreditCard, QrCode, CheckCircle, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import { parsePaymentError } from '../../lib/errors'
import type { ApiAddress, ApiCart, ApiOrder, ApiPaymentMethod, ApiInstallmentOption } from '../../lib/types'

interface Props {
  onBack: () => void
  onOrderComplete: (orderId: string) => void
}

type Step = 'address' | 'payment' | 'confirmation' | 'pending'

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

  useEffect(() => {
    const def = addresses.find((a) => a.isDefault)
    if (def && !selectedId) setSelectedId(def.id)
  }, [addresses, selectedId])

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

// ── Etapa 2 — Pagamento ──────────────────────────────────────

declare global {
  interface Window { MercadoPago: any }
}

export function detectPaymentMethodId(cardNumber: string): string {
  const n = cardNumber.replace(/\D/g, '')
  // Elo (must come before generic 5xxx / 4xxx checks)
  if (/^(4011|4312|4389|4514|4576|4826|4929|5041|5066|5067|5090|5096|6277|6362|6363|6516|6550|6555|6556)/.test(n)) return 'elo'
  // Hipercard
  if (/^(606282|637095|637568|60889)/.test(n)) return 'hipercard'
  // Amex
  if (/^3[47]/.test(n)) return 'amex'
  // Visa
  if (/^4/.test(n)) return 'visa'
  // Mastercard (51-55, all 5xxx used in BR test cards like 5031/5480, and 2221-2720)
  if (/^5[0-9]/.test(n) || /^2[2-7]/.test(n)) return 'master'
  return 'master'
}

const BRAND_LABEL: Record<string, string> = {
  visa: 'Visa', master: 'Mastercard', elo: 'Elo',
  amex: 'Amex', hipercard: 'Hipercard',
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
  // null = not chosen yet; 'new' = new card form; string = saved card id
  const [savedCardId, setSavedCardId] = useState<string | 'new' | null>(null)
  const [saveCard, setSaveCard] = useState(false)
  const [cvvForSaved, setCvvForSaved] = useState('')
  const [cardForm, setCardForm] = useState({
    number: '', expiry: '', cvv: '', name: '', cpf: '',
    installments: 1,
  })
  const [error, setError] = useState('')
  const sdkRef = useRef<any>(null)

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => apiFetch<ApiCart>('/cart'),
    staleTime: 30_000,
  })

  const { data: savedCards = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => apiFetch<ApiPaymentMethod[]>('/payment-methods'),
    staleTime: 300_000,
  })

  const detectedBrand = cardForm.number.replace(/\D/g, '').length >= 6
    ? detectPaymentMethodId(cardForm.number)
    : null

  const { data: installmentOptions, isFetching: installmentsFetching } = useQuery({
    queryKey: ['installments', detectedBrand, cart?.subtotal],
    queryFn: () =>
      apiFetch<ApiInstallmentOption[]>(
        `/orders/installments?paymentMethodId=${detectedBrand}&amount=${cart?.subtotal ?? '0'}`
      ),
    enabled: !!detectedBrand && savedCardId === 'new' && Number(cart?.subtotal ?? 0) > 0,
    staleTime: 60_000,
    placeholderData: [],
  })

  // Auto-select first saved card when switching to credit_card
  useEffect(() => {
    if (method === 'credit_card' && savedCardId === null) {
      setSavedCardId(savedCards.length > 0 ? savedCards[0].id : 'new')
    }
  }, [method, savedCards, savedCardId])

  useEffect(() => {
    if (window.MercadoPago) {
      sdkRef.current = new window.MercadoPago(
        import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY ?? '',
        { locale: 'pt-BR' }
      )
      return
    }
    const script = document.createElement('script')
    script.src = 'https://sdk.mercadopago.com/js/v2'
    script.async = true
    let cancelled = false
    script.onload = () => {
      if (!cancelled) {
        sdkRef.current = new window.MercadoPago(
          import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY ?? '',
          { locale: 'pt-BR' }
        )
      }
    }
    document.body.appendChild(script)
    return () => { cancelled = true }
  }, [])

  const orderMutation = useMutation({
    mutationFn: async () => {
      if (method === 'pix') {
        return apiFetch<{ orderId: string; status: string; pixQrCode: string; pixCode: string }>('/orders', {
          method: 'POST',
          body: JSON.stringify({ addressId, paymentMethod: 'pix' }),
        })
      }

      if (!sdkRef.current) throw new Error('SDK não carregado. Tente novamente.')

      let cardToken: string
      let paymentMethodId: string

      const usingSaved = savedCardId && savedCardId !== 'new'
      if (usingSaved) {
        const card = savedCards.find((c) => c.id === savedCardId)
        if (!card) throw new Error('Cartão não encontrado.')
        const tokenResult = await sdkRef.current.createCardToken({
          cardId: card.mpCardId,
          securityCode: cvvForSaved,
        })
        if (!tokenResult?.id) throw new Error('Falha ao validar o cartão salvo.')
        cardToken = tokenResult.id
        paymentMethodId = card.brand
      } else {
        const expiryParts = cardForm.expiry.split('/')
        if (expiryParts.length !== 2 || expiryParts[1].length !== 2) {
          throw new Error('Data de validade incompleta.')
        }
        paymentMethodId = detectPaymentMethodId(cardForm.number)
        const tokenResult = await sdkRef.current.createCardToken({
          cardNumber: cardForm.number.replace(/\s/g, ''),
          cardExpirationMonth: expiryParts[0],
          cardExpirationYear: `20${expiryParts[1]}`,
          securityCode: cardForm.cvv,
          cardholderName: cardForm.name,
          identificationType: 'CPF',
          identificationNumber: cardForm.cpf.replace(/\D/g, ''),
        })
        if (!tokenResult?.id) throw new Error('Falha ao tokenizar cartão. Verifique os dados e tente novamente.')
        cardToken = tokenResult.id
      }

      return apiFetch<{ orderId: string; status: string; statusDetail?: string }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          addressId,
          paymentMethod: 'credit_card',
          cardToken,
          paymentMethodId,
          installments: usingSaved ? 1 : cardForm.installments,
          saveCard: !usingSaved && saveCard,
        }),
      })
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      if (saveCard && savedCardId === 'new') {
        queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      }
      onSuccess(result)
    },
    onError: (err: unknown) => {
      setError(parsePaymentError(err))
    },
  })

  const subtotal = Number(cart?.subtotal ?? 0)
  const inputClass =
    'w-full px-3 py-2.5 rounded-xl bg-white/70 text-sm text-graphite outline-none border border-transparent focus:border-sara-gold/40 placeholder:text-graphite-muted/50'

  const creditCardDisabled = orderMutation.isPending || (() => {
    if (savedCardId && savedCardId !== 'new') return !cvvForSaved
    return (
      cardForm.number.replace(/\D/g, '').length < 16 ||
      cardForm.expiry.length < 5 ||
      !cardForm.cvv ||
      !cardForm.name ||
      cardForm.cpf.replace(/\D/g, '').length < 11
    )
  })()

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="bg-white/50 rounded-2xl px-4 py-3 flex justify-between items-center">
        <span className="text-xs text-graphite-muted">
          {cart?.itemCount ?? 0} itens · Total estimado
        </span>
        <span className="text-sm font-bold text-graphite">R$ {subtotal.toFixed(2)}</span>
      </div>

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
          {savedCards.length > 0 && (
            <>
              <p className="text-xs font-semibold text-graphite-muted uppercase tracking-wide">Cartões salvos</p>
              {savedCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => { setSavedCardId(card.id); setCvvForSaved('') }}
                  className={`w-full text-left p-3 rounded-2xl border-2 transition-colors flex items-center gap-3 ${
                    savedCardId === card.id
                      ? 'border-sara-gold bg-sara-gold/5'
                      : 'border-sara-linen/60 bg-white/50'
                  }`}
                >
                  <CreditCard size={16} className="text-sara-gold flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-graphite">
                      {BRAND_LABEL[card.brand] ?? card.brand} •••• {card.lastFour}
                    </p>
                    <p className="text-xs text-graphite-muted">{card.holderName} · {card.expirationMonth.toString().padStart(2, '0')}/{card.expirationYear}</p>
                  </div>
                </button>
              ))}

              {savedCardId && savedCardId !== 'new' && (
                <input
                  className={inputClass}
                  placeholder="CVV"
                  maxLength={4}
                  value={cvvForSaved}
                  onChange={(e) => setCvvForSaved(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
              )}

              <button
                onClick={() => { setSavedCardId('new'); setSaveCard(false) }}
                className={`w-full py-2.5 rounded-2xl border-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  savedCardId === 'new'
                    ? 'border-sara-gold bg-sara-gold/5 text-sara-gold'
                    : 'border-dashed border-sara-linen/60 text-graphite-muted'
                }`}
              >
                <Plus size={14} /> Usar outro cartão
              </button>
            </>
          )}

          {savedCardId === 'new' && (
            <>
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
              <input
                className={inputClass}
                placeholder="CPF do titular (apenas números)"
                maxLength={14}
                value={cardForm.cpf}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 11)
                  const fmt = v.length > 9
                    ? `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`
                    : v.length > 6
                    ? `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`
                    : v.length > 3
                    ? `${v.slice(0,3)}.${v.slice(3)}`
                    : v
                  setCardForm((f) => ({ ...f, cpf: fmt }))
                }}
              />
              <div className="flex items-center gap-2">
                <label className="text-xs text-graphite-muted flex-shrink-0">Parcelar em:</label>
                {installmentsFetching ? (
                  <div className={`${inputClass} flex-1 flex items-center gap-2 text-graphite-muted`}>
                    <Loader2 size={12} className="animate-spin" /> Calculando...
                  </div>
                ) : (
                  <select
                    className={`${inputClass} flex-1`}
                    value={cardForm.installments}
                    onChange={(e) => setCardForm((f) => ({ ...f, installments: Number(e.target.value) }))}
                  >
                    {(installmentOptions && installmentOptions.length > 0
                      ? installmentOptions
                      : [{ installments: 1, rate: 0, installmentAmount: subtotal, totalAmount: subtotal, label: `1x R$ ${subtotal.toFixed(2)} sem juros` }]
                    ).map((opt) => (
                      <option key={opt.installments} value={opt.installments}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs text-graphite-muted">
                <input
                  type="checkbox"
                  checked={saveCard}
                  onChange={(e) => setSaveCard(e.target.checked)}
                  className="accent-sara-gold"
                />
                Salvar cartão para próximas compras
              </label>
            </>
          )}
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
          disabled={method === 'credit_card' ? creditCardDisabled : orderMutation.isPending}
          className="flex-1 py-3.5 rounded-2xl bg-sara-gold text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-60 shadow-lg"
        >
          {orderMutation.isPending ? 'Processando...' : 'Confirmar pedido'}
        </button>
      </div>
    </div>
  )
}

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
  const [pollError, setPollError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onPaidRef = useRef(onPaid)
  const errorCountRef = useRef(0)
  useEffect(() => { onPaidRef.current = onPaid }, [onPaid])

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      try {
        const order = await apiFetch<ApiOrder>(`/orders/${orderId}`)
        errorCountRef.current = 0
        if (order.status === 'PAID') {
          clearInterval(intervalRef.current!)
          clearTimeout(timeoutRef.current!)
          onPaidRef.current()
        }
      } catch {
        errorCountRef.current++
        if (errorCountRef.current >= 3) {
          clearInterval(intervalRef.current!)
          clearTimeout(timeoutRef.current!)
          setPollError('Não conseguimos verificar o pagamento. Verifique seu pedido em "Meus Pedidos".')
        }
      }
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

  if (pollError) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="text-sara-terracotta font-semibold text-sm">Erro ao verificar pagamento</p>
        <p className="text-xs text-graphite-muted">{pollError}</p>
        <button
          onClick={onCancel}
          className="px-6 py-2.5 rounded-xl bg-white/70 text-graphite text-sm font-medium"
        >
          Ver meus pedidos
        </button>
      </div>
    )
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

// ── CheckoutScreen — orquestrador das etapas ─────────────────

export function CheckoutScreen({ onBack, onOrderComplete }: Props) {
  const [step, setStep] = useState<Step>('address')
  const [addressId, setAddressId] = useState<string | null>(null)
  const [pixData, setPixData] = useState<{ orderId: string; qrCode?: string; code?: string } | null>(null)
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null)
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null)

  const STEPS: Step[] = ['address', 'payment', 'confirmation']
  const stepIndex = STEPS.indexOf(step)

  const stepLabel: Record<Step, string> = {
    address: 'Endereço',
    payment: 'Pagamento',
    confirmation: 'Confirmação',
    pending: 'Em análise',
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] overflow-hidden">
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

      {step !== 'confirmation' && (
        <div className="flex px-4 mb-4 gap-1.5 flex-shrink-0">
          {STEPS.filter((s) => s !== 'confirmation').map((s, i) => (
            <div
              key={s}
              className={`h-1 rounded-full flex-1 transition-colors ${
                i <= stepIndex
                  ? 'bg-sara-gold'
                  : 'bg-sara-linen/60'
              }`}
            />
          ))}
        </div>
      )}

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
              } else if (result.status === 'approved') {
                setConfirmedOrderId(result.orderId)
                setStep('confirmation')
              } else if (result.status === 'in_process' || result.status === 'pending') {
                setPendingOrderId(result.orderId)
                setStep('pending')
              } else {
                // rejected / cancelled — error already shown via onError on the mutation
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

        {step === 'pending' && pendingOrderId && (
          <div className="flex flex-col items-center gap-5 py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-sara-gold/10 flex items-center justify-center">
              <Loader2 size={32} className="text-sara-gold animate-spin" />
            </div>
            <div>
              <p className="text-lg font-bold text-graphite">Pagamento em análise</p>
              <p className="text-xs text-graphite-muted mt-1">
                #{pendingOrderId.slice(-8).toUpperCase()}
              </p>
            </div>
            <p className="text-sm text-graphite-muted px-4">
              Seu pagamento está sendo analisado pela operadora. Você receberá uma notificação assim que for aprovado.
            </p>
            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                onClick={() => onOrderComplete(pendingOrderId)}
                className="w-full py-3.5 rounded-2xl bg-sara-gold text-white font-bold text-sm active:scale-95 transition-transform"
              >
                Acompanhar pedido
              </button>
              <button
                onClick={onBack}
                className="w-full py-3 rounded-2xl bg-white/70 text-graphite text-sm font-medium active:scale-95 transition-transform"
              >
                Voltar à loja
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
