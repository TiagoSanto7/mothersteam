import { forwardRef, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../../store/useAppStore'
import { apiFetch } from '../../lib/api'

type Mode = 'amamentacao' | 'sono' | 'fralda'

interface QuickRegisterSheetProps {
  open: boolean
  onClose: () => void
  /** Pre-selects the tab on open. */
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
  const [mode, setMode] = useState<Mode>(initialMode ?? 'amamentacao')

  // Sync mode whenever the sheet reopens with a new intent.
  useEffect(() => {
    if (open) setMode(initialMode ?? 'amamentacao')
  }, [open, initialMode])

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
// Amamentação
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
// Sono — dois inputs livres (h + m). Sem passos rígidos, sem timer forçado.
// ────────────────────────────────────────────────────────────────────
function SonoForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient()
  const hInputRef = useRef<HTMLInputElement>(null)
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')

  useEffect(() => {
    // Foca o campo de horas ao abrir a aba, pro teclado já subir.
    hInputRef.current?.focus()
  }, [])

  const totalMinutes = (parseInt(hours || '0', 10) || 0) * 60 + (parseInt(minutes || '0', 10) || 0)
  const canSave = totalMinutes > 0

  const saveMutation = useMutation({
    mutationFn: (mins: number) =>
      apiFetch('/baby', {
        method: 'POST',
        body: JSON.stringify({
          type: 'sleep',
          time: nowClock(),
          detail: `Dormiu por ${mins} min`,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baby'] })
      onDone()
    },
  })

  function bump(field: 'h' | 'm', dir: 1 | -1) {
    if (field === 'h') {
      const n = Math.max(0, Math.min(23, (parseInt(hours || '0', 10) || 0) + dir))
      setHours(String(n))
    } else {
      const n = Math.max(0, Math.min(59, (parseInt(minutes || '0', 10) || 0) + dir))
      setMinutes(String(n))
    }
  }

  const h = parseInt(hours || '0', 10) || 0
  const m = parseInt(minutes || '0', 10) || 0
  const summary = h > 0
    ? m > 0 ? `${h}h ${m}min` : `${h}h`
    : m > 0 ? `${m}min` : 'quanto tempo?'

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] font-semibold text-mt-muted uppercase tracking-wide text-center">
        Quanto tempo o bebê dormiu?
      </p>

      <div className="flex items-center justify-center gap-2">
        <TimeField
          ref={hInputRef}
          value={hours}
          onChange={setHours}
          onBump={(d) => bump('h', d)}
          max={23}
          label="h"
        />
        <span className="text-3xl font-bold text-mt-muted pb-6">:</span>
        <TimeField
          value={minutes}
          onChange={setMinutes}
          onBump={(d) => bump('m', d)}
          max={59}
          label="min"
        />
      </div>

      <p className="text-[13px] text-mt-muted text-center -mt-2">= {summary}</p>

      <button
        onClick={() => saveMutation.mutate(totalMinutes)}
        disabled={!canSave || saveMutation.isPending}
        className="w-full py-3 rounded-mt-pill bg-mt-gradient text-white text-[14px] font-bold shadow-mt disabled:opacity-40"
      >
        {saveMutation.isPending ? 'Salvando…' : 'Salvar soneca'}
      </button>
    </div>
  )
}

interface TimeFieldProps {
  value: string
  onChange: (v: string) => void
  onBump: (dir: 1 | -1) => void
  max: number
  label: string
}

const TimeField = forwardRef<HTMLInputElement, TimeFieldProps>(function TimeField(
  { value, onChange, onBump, max, label },
  ref,
) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        aria-label={`Aumentar ${label}`}
        onClick={() => onBump(1)}
        className="text-mt-muted hover:text-mt-rose transition-colors"
      >
        ▲
      </button>
      <input
        ref={ref}
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={value}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, '')
          if (!raw) { onChange(''); return }
          const n = Math.min(max, parseInt(raw, 10))
          onChange(String(n))
        }}
        placeholder="0"
        className="w-20 h-16 bg-mt-linen/60 rounded-mt text-4xl font-bold text-mt-charcoal tabular-nums text-center focus:outline-none focus:ring-2 focus:ring-mt-rose"
      />
      <button
        type="button"
        aria-label={`Diminuir ${label}`}
        onClick={() => onBump(-1)}
        className="text-mt-muted hover:text-mt-rose transition-colors"
      >
        ▼
      </button>
      <span className="text-[10px] font-semibold text-mt-muted uppercase">{label}</span>
    </div>
  )
})

// ────────────────────────────────────────────────────────────────────
// Fralda — 3 botões grandes.
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
