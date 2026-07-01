import { useState } from 'react';
import { Bell, Plus } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getHeaderGreeting } from '../../utils/pregnancyUtils';
import { WeekCalendar } from './WeekCalendar';
import { RoutineTimeline } from './RoutineTimeline';
import { InsightCard } from './InsightCard';
import { AddRoutineModal } from './AddRoutineModal';

interface HomeScreenProps {
  onOpenProfile: () => void;
}

export function HomeScreen({ onOpenProfile }: HomeScreenProps) {
  const { phase, motherName, babyName, selectedDate, motherProfile } = useAppStore();
  const greeting = getHeaderGreeting(phase, motherName, babyName);
  const [showAddModal, setShowAddModal] = useState(false);
  const initial = motherName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex items-start justify-between px-4 pt-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenProfile}
            aria-label="Abrir perfil"
            className="w-10 h-10 rounded-full bg-lavender-400 flex items-center justify-center text-base font-bold text-white shadow-sm flex-shrink-0 active:scale-95 transition-transform"
          >
            {initial}
          </button>
          <div>
            <p className="text-xs text-graphite-muted font-medium">Bom dia ☀️</p>
            <h1 className="text-base font-semibold text-graphite leading-snug max-w-[220px]">
              {greeting}
            </h1>
          </div>
        </div>
        <button
          aria-label="Notificações"
          className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center"
        >
          <Bell size={18} className="text-graphite-light" strokeWidth={1.8} />
        </button>
      </div>

      {motherProfile && <InsightCard profile={motherProfile} />}

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
        onClick={() => setShowAddModal(true)}
        aria-label="Adicionar lembrete ou evento"
        className="fixed bottom-24 right-6 w-12 h-12 rounded-full bg-lavender-600 shadow-lg shadow-lavender-400/40 flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus size={22} className="text-white" strokeWidth={2.5} />
      </button>

      {showAddModal && (
        <AddRoutineModal
          onClose={() => setShowAddModal(false)}
          defaultDate={selectedDate}
        />
      )}
    </div>
  );
}
