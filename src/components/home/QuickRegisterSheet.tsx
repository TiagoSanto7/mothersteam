import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../../store/useAppStore'
import { apiFetch } from '../../lib/api'

interface QuickRegisterSheetProps {
  open: boolean
  onClose: () => void
}

export function QuickRegisterSheet({ open, onClose }: QuickRegisterSheetProps) {
  const lastFeedSide = useAppStore((s) => s.lastFeedSide)
  const setFeedSide = useAppStore((s) => s.setFeedSide)
  const queryClient = useQueryClient()

  const [selectedSide, setSelectedSide] = useState<'Esquerdo' | 'Direito'>(
    lastFeedSide === 'left' ? 'Direito' : 'Esquerdo',
  )

  useEffect(() => {
    if (open) setSelectedSide(lastFeedSide === 'left' ? 'Direito' : 'Esquerdo')
  }, [open, lastFeedSide])

  const nd = new Date()
  const nowDisplay = `${String(nd.getHours()).padStart(2, '0')}:${String(nd.getMinutes()).padStart(2, '0')}`

  const mutation = useMutation({
    mutationFn: () => {
      const now = new Date()
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      return apiFetch('/baby', {
        method: 'POST',
        body: JSON.stringify({ type: 'feed', time, detail: selectedSide }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baby'] })
      setFeedSide(selectedSide === 'Esquerdo' ? 'left' : 'right')
      onClose()
    },
  })

  return (
    <div
      data-testid="sheet-backdrop"
      className={`fixed inset-0 z-50 flex items-end transition-all duration-200 ${
        open ? 'bg-black/40' : 'bg-transparent pointer-events-none'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !mutation.isPending) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Registrar mamada"
        className={`w-full bg-sara-cream rounded-t-3xl px-5 pb-8 pt-4 transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="w-9 h-1 rounded-full bg-[#D4C0A8] mx-auto mb-4" />

        <p className="text-[15px] font-bold text-graphite mb-4">Registrar mamada</p>

        <p className="text-[10px] font-semibold text-graphite-muted uppercase tracking-wide mb-2">
          Qual seio?
        </p>
        <div className="flex gap-2 mb-4">
          {(['Esquerdo', 'Direito'] as const).map((side) => (
            <button
              key={side}
              onClick={() => setSelectedSide(side)}
              aria-pressed={selectedSide === side}
              className={`flex-1 py-2.5 rounded-2xl text-[13px] font-semibold border-2 transition-colors ${
                selectedSide === side
                  ? 'border-sara-gold bg-sara-gold/10 text-sara-gold'
                  : 'border-sara-linen bg-white text-graphite-muted'
              }`}
            >
              {side === 'Esquerdo' ? '← Esquerdo' : 'Direito →'}
            </button>
          ))}
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          aria-label="Registrar mamada agora"
          className="w-full py-3.5 rounded-2xl bg-sara-gold text-white text-[14px] font-bold disabled:opacity-60"
        >
          {mutation.isPending ? 'Registrando...' : 'Registrar agora'}
        </button>

        {mutation.isError && (
          <p className="text-[11px] text-red-500 text-center mt-2">
            Erro ao registrar. Tente de novo.
          </p>
        )}

        <p className="text-[11px] text-graphite-muted text-center mt-3">
          Horário: agora · {nowDisplay}
        </p>
      </div>
    </div>
  )
}
