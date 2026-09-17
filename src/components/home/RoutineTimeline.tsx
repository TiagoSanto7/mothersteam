import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pill, Calendar, CheckSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiRoutineEntry } from '../../lib/types';
import { EventDetailModal } from './EventDetailModal';

const CATEGORY_CONFIG = {
  medication:  { icon: Pill,        color: 'text-mt-rose-dark', bg: 'bg-mt-linen' },
  appointment: { icon: Calendar,    color: 'text-mt-rose',       bg: 'bg-mt-cream' },
  task:        { icon: CheckSquare, color: 'text-mt-muted',       bg: 'bg-mt-linen' },
} as const;

const EMPTY_ENTRIES: ApiRoutineEntry[] = [];
const TOGGLE_KEY = ['routine', 'toggle'] as const;

// Short, snappy springs in the spirit of iOS Reminders; only transform/opacity are animated.
const FILL_SPRING = { type: 'spring', stiffness: 600, damping: 28 } as const;
const SOFT = { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] } as const;

/** Pending first, done last; each group by time, earliest on top. */
export function sortRoutine(list: readonly ApiRoutineEntry[]): ApiRoutineEntry[] {
  return [...list].sort((a, b) => Number(a.done) - Number(b.done) || a.time.localeCompare(b.time));
}

// How long a toggled item stays in place (showing its check) before sliding to its new group.
export const REORDER_DELAY_MS = 500;

/**
 * Display order that lags behind reorders, like iOS Reminders: a toggled row shows its check in
 * place, then slides to its group. Entries added/removed (or a day change) apply at once.
 */
function useSettledOrder(entries: readonly ApiRoutineEntry[]): ApiRoutineEntry[] {
  const target = sortRoutine(entries).map((e) => e.id);
  const targetKey = target.join('|');
  const targetRef = useRef(target);
  targetRef.current = target;
  const [order, setOrder] = useState(target);

  const sameMembers = order.length === target.length && target.every((id) => order.includes(id));
  if (!sameMembers) setOrder(target);

  useEffect(() => {
    if (order.join('|') === targetKey) return;
    // Each new toggle restarts the wait, so rapid taps move rows once, after the last one.
    const t = window.setTimeout(() => setOrder(targetRef.current), REORDER_DELAY_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  const byId = new Map(entries.map((e) => [e.id, e]));
  return (sameMembers ? order : target)
    .map((id) => byId.get(id))
    .filter((e): e is ApiRoutineEntry => e !== undefined);
}

interface EntryCardProps {
  entry: ApiRoutineEntry;
  onToggle: (entry: ApiRoutineEntry) => void;
  onDetail: (entry: ApiRoutineEntry) => void;
}

const EntryCard = memo(function EntryCard({ entry, onToggle, onDetail }: EntryCardProps) {
  const cfg = CATEGORY_CONFIG[entry.category];
  const done = entry.done;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={`Ver detalhe: ${entry.title}`}
      onClick={() => onDetail(entry)}
      onKeyDown={(e) => e.key === 'Enter' && onDetail(entry)}
      className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 border border-white/50 cursor-pointer"
    >
      <motion.div
        animate={{ opacity: done ? 0.5 : 1 }}
        transition={SOFT}
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}
      >
        <cfg.icon size={18} className={cfg.color} />
      </motion.div>
      <motion.div animate={{ opacity: done ? 0.5 : 1 }} transition={SOFT} className="flex-1 min-w-0">
        {/* Strike line grows from the left instead of snapping on with text-decoration. */}
        <p className="relative inline-block max-w-full align-top">
          <span className="block text-sm font-medium truncate text-mt-charcoal">{entry.title}</span>
          <motion.span
            aria-hidden="true"
            initial={false}
            animate={{ scaleX: done ? 1 : 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ originX: 0 }}
            className="absolute left-0 right-0 top-1/2 h-px bg-mt-charcoal"
          />
        </p>
        <p className="text-xs text-mt-muted">{entry.time}</p>
        {entry.notes && <p className="text-[11px] text-mt-muted/70 truncate">{entry.notes}</p>}
      </motion.div>
      <motion.button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(entry);
        }}
        whileTap={{ scale: 0.82 }}
        transition={FILL_SPRING}
        aria-pressed={done}
        aria-label={done ? `Desmarcar: ${entry.title}` : `Marcar como feita: ${entry.title}`}
        className="relative w-7 h-7 flex-shrink-0 rounded-full border-2 border-mt-linen bg-mt-cream"
      >
        {/* Fill circle scales in over the border; check path draws on top. */}
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{ scale: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={FILL_SPRING}
          className="absolute -inset-[2px] rounded-full bg-mt-rose"
        />
        <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute inset-0 m-auto w-3.5 h-3.5">
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            fill="none"
            stroke="white"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
            transition={{ duration: done ? 0.22 : 0.12, delay: done ? 0.06 : 0, ease: 'easeOut' }}
          />
        </svg>
      </motion.button>
    </motion.div>
  );
});

export function RoutineTimeline() {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const isLoggedIn   = useAppStore((s) => s.isLoggedIn);
  const queryClient  = useQueryClient();
  const [detailEntry, setDetailEntry] = useState<ApiRoutineEntry | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data: apiEntries = EMPTY_ENTRIES } = useQuery({
    queryKey: ['routine', selectedDate],
    queryFn: () => apiFetch<ApiRoutineEntry[]>(`/routine?date=${selectedDate}`),
    enabled: isLoggedIn,
  });

  const entries = useSettledOrder(apiEntries);

  /** Sets `done` for one entry in every cached routine list (day lists and upcoming events). */
  const setDoneInCache = useCallback(
    (id: string, done: boolean) => {
      for (const [key, list] of queryClient.getQueriesData<ApiRoutineEntry[]>({ queryKey: ['routine'] })) {
        if (Array.isArray(list)) {
          queryClient.setQueryData<ApiRoutineEntry[]>(key, list.map((e) => (e.id === id ? { ...e, done } : e)));
        }
      }
    },
    [queryClient],
  );

  const { mutate: toggle } = useMutation({
    mutationKey: TOGGLE_KEY,
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      apiFetch(`/routine/${id}`, { method: 'PATCH', body: JSON.stringify({ done }) }),
    // Rapid taps queue up and reach the server in tap order.
    scope: { id: 'routine-toggle' },
    onError: (_err, { id, done }) => {
      setDoneInCache(id, !done);
      setNotice('Não foi possível atualizar o lembrete. Ele voltou como estava.');
    },
    onSettled: () => {
      // Refetch only after the last pending toggle, so rapid taps never flicker back.
      if (queryClient.isMutating({ mutationKey: TOGGLE_KEY }) === 1) {
        return queryClient.invalidateQueries({ queryKey: ['routine'] });
      }
    },
  });

  const handleToggle = useCallback(
    (entry: ApiRoutineEntry) => {
      // Read the live cache so a quick second tap flips the optimistic value, not a stale prop.
      const current = queryClient
        .getQueryData<ApiRoutineEntry[]>(['routine', selectedDate])
        ?.find((e) => e.id === entry.id);
      const done = !(current ?? entry).done;
      // Optimistic update in the tap handler itself (mutation callbacks run async and queued),
      // so the check animates in the same frame as the tap.
      void queryClient.cancelQueries({ queryKey: ['routine'] });
      setDoneInCache(entry.id, done);
      toggle({ id: entry.id, done });
    },
    [queryClient, selectedDate, setDoneInCache, toggle],
  );

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10">
        <span className="text-4xl">🌿</span>
        <p className="text-sm text-mt-muted">Nenhuma tarefa para hoje</p>
        <p className="text-xs text-mt-muted">Toque em + para adicionar</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2 px-4">
        <AnimatePresence>
          {notice && (
            <motion.p
              key="notice"
              role="alert"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="text-[12px] text-mt-rose-dark bg-mt-pink-soft rounded-2xl px-3 py-2 text-center"
            >
              {notice}
            </motion.p>
          )}
        </AnimatePresence>
        {entries.map((entry, index) => (
          // Stable keys: cache updates and refetches re-render in place, the entrance runs only on mount.
          <motion.div
            key={entry.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.06,
              duration: 0.3,
              layout: { type: 'spring', stiffness: 420, damping: 38, delay: 0 },
            }}
          >
            <EntryCard entry={entry} onToggle={handleToggle} onDetail={setDetailEntry} />
          </motion.div>
        ))}
      </div>

      {detailEntry && (
        <EventDetailModal
          entry={detailEntry}
          onClose={() => setDetailEntry(null)}
        />
      )}
    </>
  );
}
