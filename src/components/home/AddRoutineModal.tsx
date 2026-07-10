import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { RoutineEntry } from '../../types';

interface AddRoutineModalProps {
  onClose: () => void;
  defaultDate: string;
}

const CATEGORIES: { value: RoutineEntry['category']; label: string; emoji: string }[] = [
  { value: 'task',        label: 'Tarefa',   emoji: '✅' },
  { value: 'appointment', label: 'Consulta', emoji: '📅' },
  { value: 'medication',  label: 'Medicação', emoji: '💊' },
];

function nowTime(): string {
  const d = new Date();
  const h = d.getHours();
  const rawM = Math.round(d.getMinutes() / 15) * 15;
  const m = rawM >= 60 ? 0 : rawM;
  const adjustedH = rawM >= 60 ? (h + 1) % 24 : h;
  return `${String(adjustedH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function AddRoutineModal({ onClose, defaultDate }: AddRoutineModalProps) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState(nowTime());
  const [category, setCategory] = useState<RoutineEntry['category']>('task');
  const [date, setDate] = useState(defaultDate);

  const queryClient = useQueryClient();
  const selectedDate = useAppStore((s) => s.selectedDate);

  const { mutate: addEntry, isPending } = useMutation({
    mutationFn: () =>
      apiFetch('/routine', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), time, category, date: selectedDate }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine', selectedDate] });
      onClose();
    },
  });

  function handleAdd() {
    if (!title.trim()) return;
    addEntry();
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Adicionar à rotina"
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[390px] bg-sara-linen/90 backdrop-blur-md rounded-t-[32px] z-50 px-6 pt-5 pb-10 flex flex-col gap-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
          <h2 className="text-base font-semibold font-serif text-graphite pt-2">Adicionar à Rotina</h2>
          <button onClick={onClose} aria-label="Fechar" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={14} className="text-graphite-muted" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-graphite-muted" htmlFor="routine-title">
            O que você precisa fazer?
          </label>
          <input
            id="routine-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Tomar vitamina D"
            autoFocus
            className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-sara-muted focus:outline-none focus:border-sara-gold"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-medium text-graphite-muted" htmlFor="routine-time">
              Horário
            </label>
            <input
              id="routine-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite focus:outline-none focus:border-sara-gold"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-medium text-graphite-muted" htmlFor="routine-date">
              Data
            </label>
            <input
              id="routine-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite focus:outline-none focus:border-sara-gold"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-graphite-muted">Categoria</p>
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                aria-pressed={category === cat.value}
                className={`flex-1 py-2.5 rounded-2xl text-xs font-medium flex flex-col items-center gap-1 transition-colors border-2 ${
                  category === cat.value
                    ? 'border-sara-gold bg-sara-linen text-graphite'
                    : 'border-sara-linen bg-sara-cream text-graphite-muted'
                }`}
              >
                <span className="text-base">{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <motion.button
          onClick={handleAdd}
          disabled={!title.trim() || isPending}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="w-full py-3.5 rounded-2xl bg-sara-gold text-white text-sm font-semibold disabled:opacity-40"
        >
          {isPending ? 'Adicionando…' : 'Adicionar'}
        </motion.button>
      </div>
    </>
  );
}
