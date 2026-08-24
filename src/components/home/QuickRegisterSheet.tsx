import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Moon, X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { apiFetch } from '../../lib/api'

type Mode = 'amamentacao' | 'sono' | 'fralda'

interface QuickRegisterSheetProps {
  open: boolean
  onClose: () => void
  /** If provided, pre-selects the tab. Defaults to sono when timer is running, else amamentacao. */
  initialMode?: Mode
}

const TAB_META: { id: Mode; label: string }[] = [
  { id: 'amamentacao', label: 'Amamentação' },
  { id: 'sono',        label: 'Sono' },
  { id: 'fralda',      label: 'Fralda' },
]

function nowClock(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function QuickRegisterSheet({ open, onClose, initialMode }: QuickRegisterSheetProps) {
  const sleepStartedAt = useAppStore((s) => s.sleepTimerStartedAt)

  // Auto-select sono tab if timer is running (mother's most likely intent when re-opening).
  const defaultMode: Mode = initialMode ?? (sleepStartedAt ? 'sono' : 'amamentacao')
  const [mode, setMode] = useState<Mode>(defaultMode)

  // Reset mode when sheet reopens (so a stale selection doesn't linger).
  useEffect(() => {
    if (open) setMode(initialMode ?? (sleepStartedAt ? 'sono' : 'amamentacao'))
  }, [open, initialMode, sleepStartedAt])

  // Escape closes.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            data-testid="sheet-backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Registrar bebê"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.9 }}
            className="fixed left-0 right-0 bottom-0 z-50 bg-white rounded-t-mt-lg shadow-mt-lg"
            style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 16px)` }}
          >
            <div className="mx-auto w-12 h-1.5 bg-mt-linen rounded-full mt-3 mb-3" />

            {/* Tab pills */}
            <div className="px-5">
              <div role="tablist" aria-label="Tipo de registro" className="flex gap-1.5 bg-mt-linen/60 rounded-mt-pill p-1">
                {TAB_META.map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    type="button"
                    aria-selected={mode === tab.id}
                    onClick={() => setMode(tab.id)}
                    className={`flex-1 py-2 rounded-mt-pill text-[12px] font-semibold transition-colors ${
                      mode === tab.id ? 'bg-white text-mt-rose shadow-sm' : 'text-mt-muted'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-5 pt-4 pb-2">
              {mode === 'amamentacao' && <AmamentacaoForm onDone={onClose} />}
              {mode === 'sono' && <SonoForm onDone={onClose} />}
              {mode === 'fralda' && <FraldaForm onDone={onClose} />}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ────────────────────────────────────────────────────────────────────
// Amamentação — mesma UI da versão antiga, agora enxuta.
// ────────────────────────────────────────────────────────────────────
function AmamentacaoForm({ onDone }: { onDone: () => void }) {
  const lastFeedSide = useAppStore((s) => s.lastFeedSide)
  const setFeedSide = useAppStore((s) => s.setFeedSide)
  const queryClient = useQueryClient()
  const [selectedSide, setSelectedSide] = useState<'Esquerdo' | 'Direito'>(
    lastFeedSide === 'left' ? 'Direito' : 'Esquerdo',
  )

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch('/baby', {
        method: 'POST',
        body: JSON.stringify({ type: 'feed', time: nowClock(), detail: selectedSide }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baby'] })
      setFeedSide(selectedSide === 'Esquerdo' ? 'left' : 'right')
      onDone()
    },
  })

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-semibold text-mt-muted uppercase tracking-wide">Qual seio?</p>
      <div className="flex gap-2">
        {(['Esquerdo', 'Direito'] as const).map((side) => (
          <button
            key={side}
            onClick={() => setSelectedSide(side)}
            aria-pressed={selectedSide === side}
            className={`flex-1 py-3 rounded-mt-pill text-[13px] font-semibold transition-colors ${
              selectedSide === side
                ? 'bg-mt-rose text-white shadow-mt'
                : 'bg-mt-linen text-mt-muted'
            }`}
          >
            {side === 'Esquerdo' ? '← Esquerdo' : 'Direito →'}
          </button>
        ))}
      </div>
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="w-full py-3 mt-1 rounded-mt-pill bg-mt-gradient text-white text-[14px] font-bold shadow-mt disabled:opacity-60"
      >
        {mutation.isPending ? 'Registrando…' : `Registrar agora · ${nowClock()}`}
      </button>
      {mutation.isError && (
        <p className="text-[11px] text-red-500 text-center">Erro ao registrar. Tente de novo.</p>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// Sono — timer live ou entrada manual em minutos.
// ────────────────────────────────────────────────────────────────────
function SonoForm({ onDone }: { onDone: () => void }) {
  const sleepStartedAt   = useAppStore((s) => s.sleepTimerStartedAt)
  const startSleepTimer  = useAppStore((s) => s.startSleepTimer)
  const cancelSleepTimer = useAppStore((s) => s.cancelSleepTimer)
  const clearSleepTimer  = useAppStore((s) => s.clearSleepTimer)
  const queryClient = useQueryClient()

  const [manualMode, setManualMode] = useState(false)
  const [manualMinutes, setManualMinutes] = useState('')
  const [tick, setTick] = useState(0)

  // Re-render every 30s while timer is running so the elapsed time updates.
  useEffect(() => {
    if (!sleepStartedAt) return
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000)
    return () => window.clearInterval(id)
  }, [sleepStartedAt])

  const elapsedMin = useMemo(() => {
    if (!sleepStartedAt) return 0
    return Math.max(0, Math.round((Date.now() - new Date(sleepStartedAt).getTime()) / 60_000))
  }, [sleepStartedAt, tick])

  const saveMutation = useMutation({
    mutationFn: (minutes: number) =>
      apiFetch('/baby', {
        method: 'POST',
        body: JSON.stringify({
          type: 'sleep',
          time: nowClock(),
          detail: `Dormiu por ${minutes} min`,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baby'] })
      clearSleepTimer()
      onDone()
    },
  })

  function handleStop() {
    if (elapsedMin < 1) {
      // Menos de 1 minuto — provável tap acidental. Só cancela.
      cancelSleepTimer()
      onDone()
      return
    }
    saveMutation.mutate(elapsedMin)
  }

  function handleManualSubmit() {
    const n = parseInt(manualMinutes, 10)
    if (!Number.isFinite(n) || n <= 0) return
    saveMutation.mutate(n)
  }

  // ── Timer rodando ─────────────────────────────────────────────
  if (sleepStartedAt) {
    const h = Math.floor(elapsedMin / 60)
    const m = elapsedMin % 60
    const label = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`
    return (
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="w-20 h-20 rounded-full bg-mt-pink-soft flex items-center justify-center">
          <Moon size={32} className="text-mt-rose-dark" strokeWidth={1.6} />
        </div>
        <div className="text-center">
          <p className="text-[11px] font-semibold text-mt-muted uppercase tracking-wide">Bebê dormindo há</p>
          <p className="text-3xl font-bold text-mt-charcoal tabular-nums mt-1">{label}</p>
        </div>
        <button
          onClick={handleStop}
          disabled={saveMutation.isPending}
          className="w-full py-3 rounded-mt-pill bg-mt-gradient text-white text-[14px] font-bold shadow-mt disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Salvando…' : 'Acordou'}
        </button>
        <button
          onClick={() => { cancelSleepTimer(); onDone() }}
          className="text-[12px] text-mt-muted underline underline-offset-4"
        >
          Cancelar (não registrar)
        </button>
      </div>
    )
  }

  // ── Modo manual ──────────────────────────────────────────────
  if (manualMode) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-mt-muted uppercase tracking-wide">
            Quanto tempo?
          </p>
          <button
            onClick={() => { setManualMode(false); setManualMinutes('') }}
            aria-label="Voltar para timer"
            className="text-mt-muted"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>
        <div className="flex items-baseline gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            value={manualMinutes}
            onChange={(e) => setManualMinutes(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="0"
            autoFocus
            className="flex-1 text-4xl font-bold text-mt-charcoal tabular-nums bg-mt-linen/60 rounded-mt py-4 px-4 text-center focus:outline-none focus:ring-2 focus:ring-mt-rose"
          />
          <span className="text-lg text-mt-muted">min</span>
        </div>
        <button
          onClick={handleManualSubmit}
          disabled={!manualMinutes || saveMutation.isPending}
          className="w-full py-3 rounded-mt-pill bg-mt-gradient text-white text-[14px] font-bold shadow-mt disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Salvando…' : 'Registrar'}
        </button>
      </div>
    )
  }

  // ── Estado inicial: iniciar timer ────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-mt-muted text-center leading-relaxed">
        Toque quando o bebê começar a dormir. A gente cronometra até você marcar "Acordou".
      </p>
      <button
        onClick={() => startSleepTimer()}
        className="w-full py-4 rounded-mt-pill bg-mt-gradient text-white text-[15px] font-bold shadow-mt flex items-center justify-center gap-2"
      >
        <Moon size={18} strokeWidth={1.8} />
        Começou a dormir agora
      </button>
      <button
        onClick={() => setManualMode(true)}
        className="text-[12px] text-mt-rose font-semibold self-center"
      >
        Já dormiu — registrar manualmente
      </button>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// Fralda — 3 botões grandes (Xixi / Coco / Ambos).
// ────────────────────────────────────────────────────────────────────
function FraldaForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (detail: string) =>
      apiFetch('/baby', {
        method: 'POST',
        body: JSON.stringify({ type: 'diaper', time: nowClock(), detail }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baby'] })
      onDone()
    },
  })

  const OPTIONS: { key: string; label: string; emoji: string }[] = [
    { key: 'Xixi',  label: 'Xixi',  emoji: '💧' },
    { key: 'Coco',  label: 'Cocô',  emoji: '💩' },
    { key: 'Ambos', label: 'Ambos', emoji: '🌊' },
  ]

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-semibold text-mt-muted uppercase tracking-wide">O que registrar?</p>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => mutation.mutate(opt.key)}
            disabled={mutation.isPending}
            className="flex flex-col items-center gap-2 py-4 rounded-mt bg-mt-linen active:scale-[0.97] transition-transform disabled:opacity-60"
          >
            <span className="text-2xl leading-none">{opt.emoji}</span>
            <span className="text-[13px] font-semibold text-mt-charcoal">{opt.label}</span>
          </button>
        ))}
      </div>
      {mutation.isError && (
        <p className="text-[11px] text-red-500 text-center">Erro ao registrar. Tente de novo.</p>
      )}
    </div>
  )
}

