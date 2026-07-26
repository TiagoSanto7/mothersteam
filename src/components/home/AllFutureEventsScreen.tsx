import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import { formatDateHeading } from '../../lib/dateUtils';
import type { ApiRoutineEntry } from '../../lib/types';
import { EventDetailModal } from './EventDetailModal';

const CATEGORY_EMOJI: Record<ApiRoutineEntry['category'], string> = {
  task: '✅',
  appointment: '📅',
  medication: '💊',
};

interface AllFutureEventsScreenProps {
  onClose: () => void;
}

export function AllFutureEventsScreen({ onClose }: AllFutureEventsScreenProps) {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const [selectedEntry, setSelectedEntry] = useState<ApiRoutineEntry | null>(null);

  const { data: futureEvents = [], isLoading } = useQuery({
    queryKey: ['routine', 'future'],
    queryFn: () => apiFetch<ApiRoutineEntry[]>('/routine?future=true&limit=50'),
    enabled: isLoggedIn,
    staleTime: 60_000,
  });

  // Exclude today — show only strictly future events grouped by date
  const today = new Date().toISOString().split('T')[0];
  const upcoming = futureEvents.filter((e) => e.date > today);

  // Group by date
  const grouped = upcoming.reduce<Record<string, ApiRoutineEntry[]>>((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort();

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Todos os eventos futuros"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 32 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="fixed inset-x-0 bottom-0 top-14 bg-sara-linen z-50 rounded-t-[28px] flex flex-col overflow-hidden shadow-2xl"
        style={{ maxWidth: 390, margin: '0 auto' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-sara-linen/60">
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm"
          >
            <ChevronLeft size={18} className="text-graphite" />
          </button>
          <h2 className="text-base font-semibold font-serif text-graphite flex-1">
            Eventos Futuros
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar tela"
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm"
          >
            <X size={14} className="text-graphite-muted" strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading && (
            <p className="text-sm text-graphite-muted text-center pt-8">Carregando…</p>
          )}

          {!isLoading && sortedDates.length === 0 && (
            <div className="flex flex-col items-center gap-2 pt-16">
              <span className="text-4xl">🌿</span>
              <p className="text-sm text-graphite-muted">Nenhum evento futuro</p>
            </div>
          )}

          {sortedDates.map((date) => (
            <div key={date} className="mb-5">
              <p className="text-[11px] font-bold text-graphite-muted uppercase tracking-wide mb-2">
                {formatDateHeading(date)}
              </p>
              <div className="flex flex-col gap-2">
                {grouped[date].map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    aria-label={`Detalhe: ${entry.title}`}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white shadow-sm text-left w-full active:scale-[0.98] transition-transform"
                  >
                    <span className="text-lg flex-shrink-0">{CATEGORY_EMOJI[entry.category]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-graphite truncate">{entry.title}</p>
                      {entry.notes && (
                        <p className="text-[11px] text-graphite-muted truncate">{entry.notes}</p>
                      )}
                    </div>
                    <span className="text-[11px] text-graphite-muted flex-shrink-0">{entry.time}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {selectedEntry && (
        <EventDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </>
  );
}
