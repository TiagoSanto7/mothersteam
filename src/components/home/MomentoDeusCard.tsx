import { useMemo } from 'react'
import { getMomentoDoDia, getMoodPeriod, MOOD_CONFIG } from '../../data/momentoDeus'

interface Props { onClick: () => void }

export function MomentoDeusCard({ onClick }: Props) {
  const momento = useMemo(() => getMomentoDoDia(), [])
  const mood = useMemo(() => getMoodPeriod(), [])
  const config = MOOD_CONFIG[mood]

  const versoPreview = momento.verso.slice(0, 50) + (momento.verso.length > 50 ? '…' : '')

  return (
    <button
      onClick={onClick}
      aria-label="Abrir Momento com Deus"
      className="mx-4 w-[calc(100%-2rem)] rounded-2xl p-5 text-left active:scale-[0.98] transition-transform overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${config.gradientFrom}, ${config.gradientTo})` }}
    >
      <p className="text-2xl text-center mb-3">{config.icon}</p>

      <p className="text-[15px] font-bold text-white text-center leading-snug">
        Separe um minuto.
      </p>
      <p className="text-[12px] text-white/70 text-center mt-0.5 mb-4">
        Tem uma palavra para você.
      </p>

      <hr className="border-white/20 mb-4" />

      <p className="text-[13px] font-medium text-white leading-snug text-center mb-1">
        "{versoPreview}"
      </p>
      <p className="text-[10px] text-white/60 text-center mb-3">
        {momento.referencia}
      </p>

      <p className="text-[11px] text-white/80 text-center font-semibold">
        Entrar nesse momento →
      </p>
    </button>
  )
}
