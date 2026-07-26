import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiRoutineEntry } from '../../lib/types';
import { EventDetailModal } from './EventDetailModal';
import { AllFutureEventsScreen } from './AllFutureEventsScreen';

const CATEGORY_EMOJI: Record<ApiRoutineEntry['category'], string> = {
  task: '✅',
  appointment: '📅',
  medication: '💊',
};

function formatShortDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

export function UpcomingEventsCard() {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const [selectedEntry, setSelectedEntry] = useState<ApiRoutineEntry | null>(null);
  const [showAll, setShowAll] = useState(false);

  const { data: futureEvents = [] } = useQuery({
    queryKey: ['routine', 'future'],
    queryFn: () => apiFetch<ApiRoutineEntry[]>('/routine?future=true&limit=3'),
    enabled: isLoggedIn,
    staleTime: 60_000,
  });

  // Exclude today from "upcoming" — show only strictly future events
  const today = new Date().toISOString().split('T')[0];
  const upcoming = futureEvents.filter((e) => e.date > today).slice(0, 2);

  if (upcoming.length === 0) return null;

  return (
    <>
      <div className="mx-4 bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-graphite-muted uppercase tracking-wide">
            Próximos Eventos
          </h3>
          <button
            onClick={() => setShowAll(true)}
            className="flex items-center gap-0.5 text-[11px] text-sara-gold font-medium"
            aria-label="Ver outros eventos"
          >
            ver outros eventos <ChevronRight size={13} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {upcoming.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setSelectedEntry(entry)}
              aria-label={`Detalhe: ${entry.title}`}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-sara-linen/60 text-left w-full hover:bg-sara-linen transition-colors"
            >
              <span className="text-base flex-shrink-0">{CATEGORY_EMOJI[entry.category]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-graphite truncate">{entry.title}</p>
                {entry.notes && (
                  <p className="text-[11px] text-graphite-muted truncate">{entry.notes}</p>
                )}
              </div>
              <div className="flex flex-col items-end flex-shrink-0">
                <span className="text-[11px] text-graphite-muted">{formatShortDate(entry.date)}</span>
                <span className="text-[10px] text-graphite-muted/70">{entry.time}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedEntry && (
        <EventDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}

      {showAll && (
        <AllFutureEventsScreen onClose={() => setShowAll(false)} />
      )}
    </>
  );
}
