import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Returns the last 7 days ending today (index 6 = today). */
function getRollingWeek(): Date[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d;
  });
}

function toISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Rolling 7-day window ending today. `referenceDate` prop kept for backward compat. */
export function WeekCalendar({ referenceDate: _referenceDate }: { referenceDate?: string }) {
  const { selectedDate, setSelectedDate } = useAppStore();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const days = getRollingWeek();
  const today = toISO(new Date());

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value) {
      setSelectedDate(e.target.value);
    }
  }

  function openDatePicker() {
    dateInputRef.current?.showPicker?.();
    dateInputRef.current?.click();
  }

  return (
    <div className="flex flex-col gap-1 px-2 py-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {days.map((day) => {
          const iso = toISO(day);
          const isSelected = iso === selectedDate;
          const isToday = iso === today;

          return (
            <motion.button
              key={iso}
              aria-pressed={isSelected}
              onClick={() => setSelectedDate(iso)}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={`flex-shrink-0 flex flex-col items-center gap-1 w-11 py-2 rounded-2xl transition-colors ${
                isSelected
                  ? 'bg-sara-gold text-white shadow-md shadow-sara-gold/30'
                  : 'bg-white text-graphite'
              }`}
            >
              <span className="text-[11px] font-medium">
                {DAYS_PT[day.getDay()]}
              </span>
              <span className={`text-base font-semibold ${isToday && !isSelected ? 'text-sara-gold' : ''}`}>
                {day.getDate()}
              </span>
              {isToday && (
                <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-sara-terracotta'}`} />
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="flex justify-center">
        <button
          onClick={openDatePicker}
          aria-label="Ver outras datas"
          className="text-[11px] text-graphite-muted underline underline-offset-2 py-0.5"
        >
          ver outras datas
        </button>
        <input
          ref={dateInputRef}
          type="date"
          aria-label="Selecionar data"
          value={selectedDate}
          onChange={handlePickerChange}
          className="sr-only"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}
