import { Bell, Plus } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getHeaderGreeting } from '../../utils/pregnancyUtils';
import { WeekCalendar } from './WeekCalendar';
import { RoutineTimeline } from './RoutineTimeline';

export function HomeScreen() {
  const { phase, motherName, babyName, selectedDate } = useAppStore();
  const greeting = getHeaderGreeting(phase, motherName, babyName);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex items-start justify-between px-4 pt-4">
        <div>
          <p className="text-xs text-graphite-muted font-medium">Bom dia ☀️</p>
          <h1 className="text-base font-semibold text-graphite leading-snug mt-0.5 max-w-[260px]">
            {greeting}
          </h1>
        </div>
        <button
          aria-label="Notificações"
          className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center"
        >
          <Bell size={18} className="text-graphite-light" strokeWidth={1.8} />
        </button>
      </div>

      <WeekCalendar referenceDate={selectedDate} />

      <div className="flex items-center justify-between px-4">
        <h2 className="text-sm font-semibold text-graphite">Sua Rotina</h2>
        <span className="text-xs text-graphite-muted">
          {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </span>
      </div>

      <RoutineTimeline />

      <button
        aria-label="Adicionar lembrete ou evento"
        className="fixed bottom-24 right-6 w-12 h-12 rounded-full bg-lavender-600 shadow-lg shadow-lavender-400/40 flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus size={22} className="text-white" strokeWidth={2.5} />
      </button>
    </div>
  );
}
