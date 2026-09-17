import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { formatShortDate, shiftISODate, todayISO } from '../../lib/dateUtils';
import { useBabyDayEntries } from './useBabyDayEntries';
import { BabyEntryEditSheet } from './BabyEntryEditSheet';
import { DatePickerSheet } from '../mt/DateField';
import type { ApiBabyEntry } from '../../lib/types';

const TYPE_EMOJI: Record<ApiBabyEntry['type'], string> = { sleep: '😴', feed: '🤱', diaper: '🧷' };
const TYPE_LABEL: Record<ApiBabyEntry['type'], string> = { sleep: 'Sono', feed: 'Amamentação', diaper: 'Fralda' };

function dayLabel(day: string, today: string): string {
  if (day === today) return 'Hoje';
  if (day === shiftISODate(today, -1)) return 'Ontem';
  return formatShortDate(day);
}

export function BabyTimeline() {
  const today = todayISO();
  const [day, setDay] = useState(today);
  const [pickerOpen, setPickerOpen] = useState(false);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const [editing, setEditing] = useState<ApiBabyEntry | null>(null);
  const closeEdit = useCallback(() => setEditing(null), []);
  const entries = useBabyDayEntries(day);
  const isToday = day >= today;
  const label = dayLabel(day, today);

  return (
    <div className="flex flex-col gap-2 px-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold font-serif text-mt-charcoal">Timeline</h3>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isToday && (
            <button
              type="button"
              onClick={() => setDay(today)}
              aria-label="Voltar para hoje"
              className="h-8 px-3 mr-1 rounded-full bg-mt-rose text-white text-[11px] font-semibold shadow-sm active:scale-95 transition-transform"
            >
              Hoje
            </button>
          )}
          <button
            type="button"
            onClick={() => setDay((d) => shiftISODate(d, -1))}
            aria-label="Dia anterior"
            className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-mt-rose active:scale-95 transition-transform"
          >
            <ChevronLeft size={16} strokeWidth={2.2} />
          </button>
          {/* Tapping the date opens the app calendar (same sheet as "Adicionar à rotina"). */}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-label={`Escolher data (${label})`}
            aria-haspopup="dialog"
            className="h-8 pl-3 pr-2 rounded-full bg-white/70 flex items-center gap-1 text-[12px] font-semibold text-mt-charcoal active:scale-95 transition-transform"
          >
            <span data-testid="timeline-day-label" className="whitespace-nowrap">{label}</span>
            <ChevronDown size={14} strokeWidth={2.2} className="text-mt-rose" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setDay((d) => shiftISODate(d, 1))}
            disabled={isToday}
            aria-label="Próximo dia"
            className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-mt-rose active:scale-95 transition-transform disabled:opacity-30 disabled:active:scale-100"
          >
            <ChevronRight size={16} strokeWidth={2.2} />
          </button>
        </div>
      </div>
      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <span className="text-3xl">🌙</span>
          <p className="text-xs text-mt-muted">
            {isToday ? 'Nenhuma atividade registrada' : 'Nenhuma atividade registrada neste dia'}
          </p>
        </div>
      ) : (
        entries.map((entry, index) => (
          <motion.button
            key={entry.id}
            type="button"
            onClick={() => setEditing(entry)}
            aria-label={`Editar ${TYPE_LABEL[entry.type]} das ${entry.time}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.3 }}
            className="w-full text-left flex items-center gap-3 bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-3 active:scale-[0.99] transition-transform"
          >
            <div className="w-8 h-8 rounded-xl bg-mt-linen flex items-center justify-center text-lg flex-shrink-0">
              {TYPE_EMOJI[entry.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-mt-muted font-medium">{TYPE_LABEL[entry.type]}</p>
              <p className="text-sm font-medium text-mt-charcoal truncate">{entry.detail}</p>
            </div>
            <span className="text-xs text-mt-muted flex-shrink-0">{entry.time}</span>
            <Pencil size={13} className="text-mt-muted/70 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
          </motion.button>
        ))
      )}
      <BabyEntryEditSheet entry={editing} onClose={closeEdit} />
      <DatePickerSheet open={pickerOpen} onClose={closePicker} value={day} onSelect={setDay} max={today} />
    </div>
  );
}
