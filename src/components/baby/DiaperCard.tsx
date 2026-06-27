import { Plus } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function DiaperCard() {
  const { diaperCount, incrementDiaper } = useAppStore();

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧷</span>
          <span className="text-sm font-semibold text-graphite">Fraldas</span>
        </div>
        <span className="text-xs text-graphite-muted">hoje</span>
      </div>

      <div className="flex items-center justify-between">
        <span
          data-testid="diaper-count"
          className="text-4xl font-bold text-graphite tabular-nums"
        >
          {diaperCount}
        </span>
        <button
          aria-label="Registrar troca de fralda"
          onClick={incrementDiaper}
          className="w-11 h-11 rounded-2xl bg-lavender-100 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus size={20} className="text-lavender-600" strokeWidth={2.5} />
        </button>
      </div>

      <p className="text-xs text-graphite-muted">
        {diaperCount === 0
          ? 'Nenhuma troca registrada'
          : `${diaperCount} troca${diaperCount > 1 ? 's' : ''} registrada${diaperCount > 1 ? 's' : ''}`}
      </p>
    </div>
  );
}
