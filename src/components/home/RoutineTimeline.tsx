import { Check, Pill, Calendar, CheckSquare } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { RoutineEntry } from '../../types';

const CATEGORY_CONFIG = {
  medication:  { icon: Pill,        color: 'text-blush-500',    bg: 'bg-blush-100' },
  appointment: { icon: Calendar,    color: 'text-babyblue-300', bg: 'bg-babyblue-100' },
  task:        { icon: CheckSquare, color: 'text-sage-400',     bg: 'bg-sage-100' },
} as const;

function EntryCard({ entry }: { entry: RoutineEntry }) {
  const toggleRoutineDone = useAppStore((s) => s.toggleRoutineDone);
  const cfg = CATEGORY_CONFIG[entry.category];

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-2xl bg-white shadow-sm transition-opacity ${
        entry.done ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
        <cfg.icon size={18} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${entry.done ? 'line-through text-graphite-muted' : 'text-graphite'}`}>
          {entry.title}
        </p>
        <p className="text-xs text-graphite-muted">{entry.time}</p>
      </div>
      <button
        onClick={() => toggleRoutineDone(entry.id)}
        aria-label={entry.done ? `Desmarcar: ${entry.title}` : `Marcar como feita: ${entry.title}`}
        className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
          entry.done
            ? 'bg-lavender-600 border-lavender-600'
            : 'border-gray-200 bg-white'
        }`}
      >
        {entry.done && <Check size={14} className="text-white" strokeWidth={2.5} />}
      </button>
    </div>
  );
}

export function RoutineTimeline() {
  const routineEntries = useAppStore((s) => s.routineEntries);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const sorted = [...routineEntries]
    .filter((e) => e.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10">
        <span className="text-4xl">🌿</span>
        <p className="text-sm text-graphite-muted">Nenhuma tarefa para hoje</p>
        <p className="text-xs text-graphite-muted">Toque em + para adicionar</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-4">
      {sorted.map((entry) => (
        <EntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
