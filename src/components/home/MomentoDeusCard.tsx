import { useMemo } from 'react'
import { getMomentoDoDia, getMoodPeriod, MOOD_CONFIG } from '../../data/momentoDeus'

interface Props { onClick: () => void }

export function MomentoDeusCard({ onClick }: Props) {
  const momento = useMemo(() => getMomentoDoDia(), [])
  const mood = useMemo(() => getMoodPeriod(), [])
  const config = MOOD_CONFIG[mood]

  return (
    <button
      onClick={onClick}
      aria-label="Abrir Momento com Deus"
      className="mx-4 w-[calc(100%-2rem)] rounded-2xl p-3.5 text-left active:scale-[0.98] transition-transform overflow-hidden relative"
      style={{ background: `linear-gradient(135deg, ${config.gradientFrom}, ${config.gradientTo})` }}
    >
      <p className="text-[9px] font-bold text-white/60 uppercase tracking-wide mb-1">
        {config.icon} Momento com Deus
      </p>
      <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2 mb-1.5">
        "{momento.verso.slice(0, 80)}{momento.verso.length > 80 ? '…' : ''}"
      </p>
      <p className="text-[10px] text-white/70 font-medium">
        {momento.referencia} · Toque para ler →
      </p>
    </button>
  )
}
