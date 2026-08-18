import { Moon, Plus } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiBabyEntry } from '../../lib/types';

const DURATION_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 30,  label: '30min' },
  { minutes: 60,  label: '1h'    },
  { minutes: 90,  label: '1h30'  },
  { minutes: 120, label: '2h'    },
  { minutes: 150, label: '2h30'  },
  { minutes: 180, label: '3h'    },
];

const PERIOD_OPTIONS: { key: string; label: string; emoji: string }[] = [
  { key: 'manhã',  label: 'Manhã', emoji: '🌅' },
  { key: 'tarde',  label: 'Tarde', emoji: '☀️' },
  { key: 'noite',  label: 'Noite', emoji: '🌙' },
];

export function SleepCard() {
  const isLoggedIn  = useAppStore((s) => s.isLoggedIn);
  const queryClient = useQueryClient();
  const [minutes, setMinutes] = useState(60);
  const [period, setPeriod]   = useState('noite');

  const { data: entries = [] } = useQuery({
    queryKey: ['baby'],
    queryFn: () => apiFetch<ApiBabyEntry[]>('/baby'),
    enabled: isLoggedIn,
  });

  const totalMinutes = entries
    .filter((e) => e.type === 'sleep')
    .reduce((acc, e) => {
      const match = e.detail.match(/(\d+)\s*min/);
      return acc + (match ? parseInt(match[1], 10) : 0);
    }, 0);

  const hours = Math.floor(totalMinutes / 60);
  const mins  = totalMinutes % 60;
  const totalLabel = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;

  const { mutate: addSleep, isPending } = useMutation({
    mutationFn: () => {
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return apiFetch<ApiBabyEntry>('/baby', {
        method: 'POST',
        body: JSON.stringify({ time: now, type: 'sleep', detail: `Dormiu por ${minutes} min — ${period}` }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['baby'] }),
  });

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Moon size={18} className="text-sara-gold" strokeWidth={1.8} />
        <span className="text-sm font-semibold text-graphite">Sono</span>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-bold text-graphite tabular-nums">
          {totalMinutes === 0 ? '0m' : totalLabel.trim()}
        </span>
        <span className="text-xs text-graphite-muted">hoje</span>
      </div>

      {/* Duration selector */}
      <div className="flex gap-1.5 flex-wrap">
        {DURATION_OPTIONS.map((opt) => (
          <button
            key={opt.minutes}
            onClick={() => setMinutes(opt.minutes)}
            aria-pressed={minutes === opt.minutes}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              minutes === opt.minutes
                ? 'bg-sara-gold text-white'
                : 'bg-sara-linen text-graphite-muted hover:text-graphite'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div className="flex gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setPeriod(opt.key)}
            aria-pressed={period === opt.key}
            className={`flex-1 py-2 rounded-2xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
              period === opt.key
                ? 'bg-sara-gold text-white'
                : 'bg-sara-linen text-graphite-muted hover:text-graphite'
            }`}
          >
            <span>{opt.emoji}</span>
            {opt.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => addSleep()}
        disabled={isPending}
        aria-label="Registrar soneca"
        className="w-full py-2.5 rounded-2xl bg-sara-linen text-sara-gold text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        <Plus size={16} strokeWidth={2.5} />
        {isPending ? 'Registrando...' : 'Registrar soneca'}
      </button>
    </div>
  );
}
