import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { WeekCalendar } from './WeekCalendar';
import { RoutineTimeline } from './RoutineTimeline';
import { AddRoutineModal } from './AddRoutineModal';
import { SARA_FRASES } from '../../data/reception/sara-frases';
import { getAvatarColor } from '../../utils/avatar';
import type { ReceptionData } from '../../types/reception';

interface HomeScreenProps {
  onOpenProfile: () => void;
}

export function HomeScreen({ onOpenProfile }: HomeScreenProps) {
  const phase         = useAppStore((s) => s.phase);
  const motherName    = useAppStore((s) => s.motherName);
  const motherProfile = useAppStore((s) => s.motherProfile);
  const babyName      = useAppStore((s) => s.babyName);
  const selectedDate  = useAppStore((s) => s.selectedDate);
  const receptionShape: ReceptionData = {
    phase: phase.stage,
    week: phase.stage === 'pregnant' ? phase.week : undefined,
    ageInDays: phase.stage === 'postpartum' ? phase.ageInDays : undefined,
    babyName,
    otherChildren: [],
  };
  const greeting = SARA_FRASES.primeiraHome(motherName || 'mãe', receptionShape);
  const [showAddModal, setShowAddModal] = useState(false);
  const initial = (motherName || 'M').charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button
          onClick={onOpenProfile}
          aria-label="Abrir perfil"
          style={{ background: getAvatarColor(motherProfile?.archetypeKey ?? null) }}
          className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white shadow-sm flex-shrink-0 active:scale-95 transition-transform"
        >
          {initial}
        </button>
        <div>
          <h1 className="text-[15px] font-semibold font-serif text-graphite leading-snug max-w-[260px]">
            {greeting}
          </h1>
        </div>
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

      <motion.button
        onClick={() => setShowAddModal(true)}
        aria-label="Adicionar lembrete ou evento"
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="fixed bottom-24 right-6 w-12 h-12 rounded-full bg-sara-gold shadow-lg shadow-sara-terracotta/30 flex items-center justify-center"
      >
        <Plus size={22} className="text-white" strokeWidth={2.5} />
      </motion.button>

      {showAddModal && (
        <AddRoutineModal
          onClose={() => setShowAddModal(false)}
          defaultDate={selectedDate}
        />
      )}
    </div>
  );
}
