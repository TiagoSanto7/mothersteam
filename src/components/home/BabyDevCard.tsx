import { useAppStore } from '../../store/useAppStore'
import { getBabyDevContent } from '../../data/babyDev'

interface Props { onClick: () => void }

export function BabyDevCard({ onClick }: Props) {
  const phase = useAppStore((s) => s.phase)
  const content = getBabyDevContent(phase)

  return (
    <button
      onClick={onClick}
      aria-label="Ver desenvolvimento do bebê"
      className="mx-4 w-[calc(100%-2rem)] bg-white rounded-2xl p-3.5 shadow-sm text-left active:scale-[0.98] transition-transform"
    >
      <p className="text-[9px] font-bold text-graphite-muted uppercase tracking-wide mb-1">
        Desenvolvimento
      </p>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sara-linen to-sara-cream flex items-center justify-center text-2xl flex-shrink-0">
          {content.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-graphite leading-tight line-clamp-1">
            {content.title}
          </p>
          <p className="text-[11px] text-graphite-muted mt-0.5 line-clamp-1">
            {content.size}
          </p>
          <p className="text-[10px] text-sara-gold font-semibold mt-1">
            Ver curiosidades →
          </p>
        </div>
      </div>
    </button>
  )
}
