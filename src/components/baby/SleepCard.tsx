import { Moon, Plus } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiBabyEntry } from '../../lib/types';

export function SleepCard() {
  const isLoggedIn  = useAppStore((s) => s.isLoggedIn);
  const queryClient = useQueryClient();
  const [minutes, setMinutes] = useState(45);

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

  const { mutate: addSleep } = useMutation({
    mutationFn: () => {
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return apiFetch<ApiBabyEntry>('/baby', {
        method: 'POST',
        body: JSON.stringify({ time: now, type: 'sleep', detail: `Dormiu por ${minutes} min` }),
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

      <div className="flex items-center gap-2">
        <input
          type="range"
          min={5}
          max={180}
          step={5}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="flex-1 accent-sara-gold"
          aria-label="Duração da soneca em minutos"
        />
        <span className="text-xs text-graphite-muted w-10 text-right">{minutes}m</span>
      </div>

      <button
        onClick={() => addSleep()}
        aria-label="Registrar soneca"
        className="w-full py-2.5 rounded-2xl bg-sara-linen text-sara-gold text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
      >
        <Plus size={16} strokeWidth={2.5} />
        Registrar soneca
      </button>
    </div>
  );
}
