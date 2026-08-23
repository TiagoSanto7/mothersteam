import { Moon, Plus, Minus } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiBabyEntry } from '../../lib/types';

const PERIOD_OPTIONS: { key: string; emoji: string; aria: string }[] = [
  { key: 'manhã', emoji: '🌅', aria: 'Manhã' },
  { key: 'tarde', emoji: '☀️', aria: 'Tarde' },
  { key: 'noite', emoji: '🌙', aria: 'Noite' },
];

export function SleepCard() {
  const isLoggedIn  = useAppStore((s) => s.isLoggedIn);
  const queryClient = useQueryClient();

  // Duration as hours + minutes (30-min steps, max 12h)
  const [hoursInput, setHoursInput]   = useState(1);
  const [minutesInput, setMinutesInput] = useState(0);
  const [period, setPeriod] = useState('noite');

  const totalMinutes = hoursInput * 60 + minutesInput;

  function inc() {
    if (totalMinutes >= 12 * 60) return;
    if (minutesInput === 0) { setMinutesInput(30); }
    else { setMinutesInput(0); setHoursInput((h) => h + 1); }
  }
  function dec() {
    if (totalMinutes <= 30) return;
    if (minutesInput === 30) { setMinutesInput(0); }
    else { setMinutesInput(30); setHoursInput((h) => Math.max(0, h - 1)); }
  }

  const { data: entries = [] } = useQuery({
    queryKey: ['baby'],
    queryFn: () => apiFetch<ApiBabyEntry[]>('/baby'),
    enabled: isLoggedIn,
  });

  const totalToday = entries
    .filter((e) => e.type === 'sleep')
    .reduce((acc, e) => {
      const match = e.detail.match(/(\d+)\s*min/);
      return acc + (match ? parseInt(match[1], 10) : 0);
    }, 0);

  const todayHours = Math.floor(totalToday / 60);
  const todayMins  = totalToday % 60;
  const todayLabel = todayHours > 0
    ? `${todayHours}h${todayMins > 0 ? ` ${todayMins}m` : ''}`
    : `${todayMins}m`;

  const { mutate: addSleep, isPending } = useMutation({
    mutationFn: () => {
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return apiFetch<ApiBabyEntry>('/baby', {
        method: 'POST',
        body: JSON.stringify({ time: now, type: 'sleep', detail: `Dormiu por ${totalMinutes} min — ${period}` }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['baby'] }),
  });

  const durationLabel = hoursInput > 0
    ? `${hoursInput}h${minutesInput > 0 ? `${minutesInput}` : ''}`
    : `${minutesInput}m`;

  return (
    <div className="bg-white rounded-mt p-4 shadow-mt flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <Moon size={16} className="text-mt-rose flex-shrink-0" strokeWidth={1.8} />
        <span className="text-sm font-semibold text-mt-charcoal truncate">Sono</span>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-mt-charcoal tabular-nums leading-none">
          {totalToday === 0 ? '0m' : todayLabel}
        </span>
        <span className="text-[10px] text-mt-muted">hoje</span>
      </div>

      {/* Duration stepper: [−] 1h30 [+] */}
      <div className="flex items-center justify-between bg-mt-linen/60 rounded-2xl p-1">
        <button
          onClick={dec}
          aria-label="Diminuir duração"
          disabled={totalMinutes <= 30}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white text-mt-rose disabled:opacity-30 active:scale-90 transition-transform"
        >
          <Minus size={14} strokeWidth={2.5} />
        </button>
        <span className="text-sm font-bold text-mt-charcoal tabular-nums">
          {durationLabel}
        </span>
        <button
          onClick={inc}
          aria-label="Aumentar duração"
          disabled={totalMinutes >= 12 * 60}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white text-mt-rose disabled:opacity-30 active:scale-90 transition-transform"
        >
          <Plus size={14} strokeWidth={2.5} />
        </button>
      </div>

      {/* Period selector — emoji only, super compact */}
      <div className="flex gap-1">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setPeriod(opt.key)}
            aria-pressed={period === opt.key}
            aria-label={opt.aria}
            className={`flex-1 h-9 rounded-xl text-base transition-colors flex items-center justify-center ${
              period === opt.key
                ? 'bg-mt-rose/15 ring-2 ring-mt-rose'
                : 'bg-mt-linen/60'
            }`}
          >
            <span>{opt.emoji}</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => addSleep()}
        disabled={isPending}
        aria-label="Registrar soneca"
        className="w-full py-2 rounded-2xl bg-mt-linen text-mt-rose text-xs font-semibold flex items-center justify-center gap-1 active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        <Plus size={14} strokeWidth={2.5} />
        {isPending ? 'Registrando...' : 'Registrar'}
      </button>
    </div>
  );
}
