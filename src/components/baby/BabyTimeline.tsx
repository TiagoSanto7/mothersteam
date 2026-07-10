import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiBabyEntry } from '../../lib/types';

const TYPE_EMOJI: Record<ApiBabyEntry['type'], string> = { sleep: '😴', feed: '🤱', diaper: '🧷' };
const TYPE_LABEL: Record<ApiBabyEntry['type'], string> = { sleep: 'Sono', feed: 'Amamentação', diaper: 'Fralda' };

export function BabyTimeline() {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);

  const { data: entries = [] } = useQuery({
    queryKey: ['baby'],
    queryFn: () => apiFetch<ApiBabyEntry[]>('/baby'),
    enabled: isLoggedIn,
  });

  const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="flex flex-col gap-2 px-4">
      <h3 className="text-sm font-semibold font-serif text-graphite">Timeline de hoje</h3>
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <span className="text-3xl">🌙</span>
          <p className="text-xs text-graphite-muted">Nenhuma atividade registrada</p>
        </div>
      ) : (
        sorted.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.3 }}
            className="flex items-center gap-3 bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-3"
          >
            <div className="w-8 h-8 rounded-xl bg-sara-linen flex items-center justify-center text-lg flex-shrink-0">
              {TYPE_EMOJI[entry.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-graphite-muted font-medium">{TYPE_LABEL[entry.type]}</p>
              <p className="text-sm font-medium text-graphite truncate">{entry.detail}</p>
            </div>
            <span className="text-xs text-graphite-muted flex-shrink-0">{entry.time}</span>
          </motion.div>
        ))
      )}
    </div>
  );
}
