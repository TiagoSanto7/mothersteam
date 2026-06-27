import { useAppStore } from '../../store/useAppStore';
import type { BabyEntry } from '../../types';

const TYPE_EMOJI: Record<BabyEntry['type'], string> = {
  sleep:  '😴',
  feed:   '🤱',
  diaper: '🧷',
};

const TYPE_LABEL: Record<BabyEntry['type'], string> = {
  sleep:  'Sono',
  feed:   'Amamentação',
  diaper: 'Fralda',
};

export function BabyTimeline() {
  const babyEntries = useAppStore((s) => s.babyEntries);
  const sorted = [...babyEntries].sort((a, b) => b.time.localeCompare(a.time));

  return (
    <div className="flex flex-col gap-2 px-4">
      <h3 className="text-sm font-semibold text-graphite">Timeline de hoje</h3>
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <span className="text-3xl">🌙</span>
          <p className="text-xs text-graphite-muted">Nenhuma atividade registrada</p>
        </div>
      ) : (
        sorted.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-lavender-50 flex items-center justify-center text-lg flex-shrink-0">
              {TYPE_EMOJI[entry.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-graphite-muted font-medium">{TYPE_LABEL[entry.type]}</p>
              <p className="text-sm font-medium text-graphite truncate">{entry.detail}</p>
            </div>
            <span className="text-xs text-graphite-muted flex-shrink-0">{entry.time}</span>
          </div>
        ))
      )}
    </div>
  );
}
