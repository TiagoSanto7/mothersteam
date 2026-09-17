import { memo, useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, type PanInfo } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { DAYS_PT, parseLocalDate, shiftISODate, startOfWeekISO, todayISO } from '../../lib/dateUtils';
import { DatePickerSheet } from '../mt/DateField';

// iOS-like paging: the release velocity is projected forward before deciding the page,
// then a critically-damped spring carries that same velocity into the settle.
const PROJECTION_SECONDS = 0.2;
const PAGE_SPRING = { type: 'spring', stiffness: 320, damping: 36, mass: 1 } as const;

/**
 * Which week to settle on after a horizontal drag: -1 previous, 1 next, 0 stay.
 * `width` is the width of one week page.
 */
export function pageAfterSwipe(offsetX: number, velocityX: number, width: number): -1 | 0 | 1 {
  if (width <= 0) return 0;
  const projected = offsetX + velocityX * PROJECTION_SECONDS;
  if (projected < -width / 2) return 1;
  if (projected > width / 2) return -1;
  return 0;
}

/** "setembro de 2026" */
function monthLabel(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

interface WeekRowProps {
  weekStart: string;
  selectedDate: string;
  today: string;
  interactive: boolean;
  onSelect: (iso: string) => void;
}

const WeekRow = memo(function WeekRow({ weekStart, selectedDate, today, interactive, onSelect }: WeekRowProps) {
  return (
    <div
      className="w-1/3 flex-shrink-0 flex gap-1.5 px-3"
      aria-hidden={interactive ? undefined : true}
      data-testid={interactive ? 'week-strip' : undefined}
    >
      {Array.from({ length: 7 }, (_, i) => {
        const iso = shiftISODate(weekStart, i);
        const isSelected = iso === selectedDate;
        const isToday = iso === today;
        const date = parseLocalDate(iso);

        return (
          <button
            key={iso}
            type="button"
            tabIndex={interactive ? undefined : -1}
            aria-pressed={interactive ? isSelected : undefined}
            aria-label={date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            onClick={() => onSelect(iso)}
            className={`flex-1 min-w-0 flex flex-col items-center gap-1 py-2 rounded-2xl transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
              isSelected ? 'bg-mt-rose text-white shadow-md shadow-mt-rose/30' : 'bg-white text-mt-charcoal'
            }`}
          >
            <span className="text-[11px] font-medium">{DAYS_PT[date.getDay()]}</span>
            <span className={`text-base font-semibold ${isToday && !isSelected ? 'text-mt-rose' : ''}`}>
              {date.getDate()}
            </span>
            <span
              className={`w-1 h-1 rounded-full ${
                isToday ? (isSelected ? 'bg-white' : 'bg-mt-rose-dark') : 'bg-transparent'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
});

/**
 * Week strip (Dom–Sáb) of the week that contains the selected date, paged like iOS Calendar:
 * the strip follows the finger with both neighbour weeks already rendered, and settles with a
 * velocity-aware spring. Tap the month to open the app calendar; "Hoje" jumps back.
 * `referenceDate` prop kept for backward compat.
 */
export function WeekCalendar({ referenceDate: _referenceDate }: { referenceDate?: string }) {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const [pickerOpen, setPickerOpen] = useState(false);
  const closePicker = useCallback(() => setPickerOpen(false), []);

  const viewportRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const reduceMotion = useReducedMotion();
  // True from drag start until the settle finishes; blocks the click that ends a drag.
  const busyRef = useRef(false);

  const today = todayISO();
  const weekStart = startOfWeekISO(selectedDate);

  /** Slides one page (-1 / 1) with the given initial velocity, then swaps the weeks under it. */
  const pageTo = useCallback(
    (page: -1 | 0 | 1, velocity: number, commit: () => void) => {
      const width = viewportRef.current?.offsetWidth ?? 0;
      busyRef.current = true;
      animate(x, -page * width, {
        ...(reduceMotion ? { duration: 0 } : { ...PAGE_SPRING, velocity }),
        onComplete: () => {
          if (page !== 0) {
            // Render the new centre week and recentre in the same frame: no visual jump.
            flushSync(commit);
            x.set(0);
          }
          busyRef.current = false;
        },
      });
    },
    [x, reduceMotion],
  );

  const selectDate = useCallback(
    (iso: string) => {
      if (busyRef.current) return;
      const diff = startOfWeekISO(iso) === weekStart ? 0 : startOfWeekISO(iso) > weekStart ? 1 : -1;
      const adjacent = diff !== 0 && startOfWeekISO(iso) === shiftISODate(weekStart, diff * 7);
      if (adjacent) {
        pageTo(diff as -1 | 1, 0, () => setSelectedDate(iso));
      } else {
        setSelectedDate(iso);
      }
    },
    [weekStart, pageTo, setSelectedDate],
  );

  function handleDragEnd(_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const width = viewportRef.current?.offsetWidth ?? 0;
    const page = pageAfterSwipe(info.offset.x, info.velocity.x, width);
    // Keeps the same weekday selected on the new week.
    pageTo(page, info.velocity.x, () => setSelectedDate(shiftISODate(selectedDate, page * 7)));
  }

  return (
    <div className="flex flex-col gap-2 py-2">
      <div className="flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label={`Ver outras datas (${monthLabel(selectedDate)})`}
          aria-haspopup="dialog"
          className="flex items-center gap-1 h-8 -ml-1 px-1 rounded-full text-sm font-semibold font-serif text-mt-charcoal capitalize active:scale-95 transition-transform"
        >
          <span data-testid="week-month-label">{monthLabel(selectedDate)}</span>
          <ChevronDown size={15} strokeWidth={2.2} className="text-mt-rose" aria-hidden="true" />
        </button>
        <AnimatePresence>
          {selectedDate !== today && (
            <motion.button
              key="today"
              type="button"
              onClick={() => selectDate(today)}
              aria-label="Voltar para hoje"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="h-8 px-3 rounded-full bg-mt-rose text-white text-[11px] font-semibold shadow-sm"
            >
              Hoje
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div ref={viewportRef} className="overflow-hidden">
        {/* Three pages [previous, current, next]; the static -33.33% shift keeps "current" in view. */}
        <div className="w-[300%] -translate-x-1/3">
          <motion.div
            style={{ x }}
            drag="x"
            dragMomentum={false}
            dragElastic={0}
            dragDirectionLock
            onDragStart={() => {
              busyRef.current = true;
            }}
            onDragEnd={handleDragEnd}
            className="flex touch-pan-y will-change-transform"
          >
            {[-1, 0, 1].map((offset) => (
              <WeekRow
                key={shiftISODate(weekStart, offset * 7)}
                weekStart={shiftISODate(weekStart, offset * 7)}
                selectedDate={selectedDate}
                today={today}
                interactive={offset === 0}
                onSelect={selectDate}
              />
            ))}
          </motion.div>
        </div>
      </div>

      <DatePickerSheet open={pickerOpen} onClose={closePicker} value={selectedDate} onSelect={selectDate} />
    </div>
  );
}
