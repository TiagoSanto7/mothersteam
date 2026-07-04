import { useAppStore } from '../../store/useAppStore';

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getWeekDays(referenceDate: string): Date[] {
  const ref = new Date(referenceDate + 'T12:00:00');
  const day = ref.getDay();
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - day + (day === 0 ? -6 : 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function WeekCalendar({ referenceDate }: { referenceDate: string }) {
  const { selectedDate, setSelectedDate } = useAppStore();
  const days = getWeekDays(referenceDate);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-2">
      {days.map((day) => {
        const iso = toISO(day);
        const isSelected = iso === selectedDate;
        const isToday = iso === today;

        return (
          <button
            key={iso}
            aria-pressed={isSelected}
            onClick={() => setSelectedDate(iso)}
            className={`flex-shrink-0 flex flex-col items-center gap-1 w-11 py-2 rounded-2xl transition-all ${
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
          </button>
        );
      })}
    </div>
  );
}
