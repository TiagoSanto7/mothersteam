import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { BabyScreen } from '../baby/BabyScreen';
import { WeekCalendar } from '../home/WeekCalendar';
import { RoutineTimeline } from '../home/RoutineTimeline';
import { AddRoutineModal } from '../home/AddRoutineModal';
import { QuickRegisterSheet } from '../home/QuickRegisterSheet';
import { BabyDevCard } from '../home/BabyDevCard';
import { BabyDevScreen } from '../home/BabyDevScreen';

type Segment = 'hoje' | 'planejamento' | 'evolucao';

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'hoje',         label: 'Hoje' },
  { id: 'planejamento', label: 'Planejamento' },
  { id: 'evolucao',     label: 'Evolução' },
];

export function JornadaScreen() {
  const [segment, setSegment]           = useState<Segment>('hoje');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [babyDevOpen, setBabyDevOpen]   = useState(false);
  const selectedDate                    = useAppStore((s) => s.selectedDate);

  return (
    <>
      <div className="flex flex-col pb-28">
        {/* Segmented control */}
        <div className="flex gap-1 mx-4 mt-4 mb-3 bg-white/60 rounded-2xl p-1">
          {SEGMENTS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSegment(id)}
              aria-pressed={segment === id}
              className={`flex-1 py-1.5 rounded-xl text-[12px] font-semibold transition-colors ${
                segment === id
                  ? 'bg-sara-gold text-white shadow-sm'
                  : 'text-graphite-muted hover:text-graphite'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Segment: Hoje — baby day tracking */}
        {segment === 'hoje' && <BabyScreen />}

        {/* Segment: Planejamento — weekly calendar + routine */}
        {segment === 'planejamento' && (
          <div className="flex flex-col gap-4 pb-6">
            <WeekCalendar referenceDate={selectedDate} />
            <div className="flex items-center justify-between px-4">
              <h2 className="text-sm font-semibold text-graphite">Sua Rotina</h2>
              <button
                onClick={() => setAddModalOpen(true)}
                aria-label="Adicionar tarefa"
                className="w-7 h-7 rounded-full bg-sara-gold text-white flex items-center justify-center shadow-sm"
              >
                <Plus size={14} />
              </button>
            </div>
            <RoutineTimeline />
          </div>
        )}

        {/* Segment: Evolução — baby development */}
        {segment === 'evolucao' && (
          <div className="flex flex-col gap-4 pt-2">
            <BabyDevCard onClick={() => setBabyDevOpen(true)} />
          </div>
        )}
      </div>

      {/* FAB — opens quick-register sheet */}
      <button
        onClick={() => setRegisterOpen(true)}
        aria-label="Registrar"
        className="fixed bottom-[84px] right-4 w-14 h-14 rounded-full bg-sara-terracotta text-white shadow-lg shadow-sara-terracotta/30 flex items-center justify-center active:scale-95 transition-transform z-30"
      >
        <Plus size={24} />
      </button>

      <QuickRegisterSheet open={registerOpen} onClose={() => setRegisterOpen(false)} />
      {addModalOpen && (
        <AddRoutineModal
          onClose={() => setAddModalOpen(false)}
          defaultDate={selectedDate}
        />
      )}
      <BabyDevScreen open={babyDevOpen} onClose={() => setBabyDevOpen(false)} />
    </>
  );
}
