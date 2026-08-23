import { useEffect, useMemo, useState } from 'react';
import { Moon, Play, Square } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiBabyEntry } from '../../lib/types';

function nowClock(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * SleepCard — enxuta.
 *
 * - Mostra o total de sono do dia (soma dos "Dormiu por N min").
 * - Se não há timer ativo: botão "Iniciar" (arma o timer no store).
 * - Se há timer ativo: mostra tempo decorrido ao vivo + botão "Parar" (registra e limpa).
 *
 * O sheet completo (com entrada manual, tabs pra fralda/amamentação) vive em
 * <QuickRegisterSheet>, disparado pelo M-CTA da BottomTabBar.
 */
export function SleepCard() {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const sleepStartedAt   = useAppStore((s) => s.sleepTimerStartedAt);
  const startSleepTimer  = useAppStore((s) => s.startSleepTimer);
  const clearSleepTimer  = useAppStore((s) => s.clearSleepTimer);
  const cancelSleepTimer = useAppStore((s) => s.cancelSleepTimer);
  const queryClient = useQueryClient();

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!sleepStartedAt) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, [sleepStartedAt]);

  const elapsedMin = useMemo(() => {
    if (!sleepStartedAt) return 0;
    return Math.max(0, Math.round((Date.now() - new Date(sleepStartedAt).getTime()) / 60_000));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepStartedAt, tick]);

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
  const todayLabel = totalToday === 0
    ? '0m'
    : todayHours > 0
      ? `${todayHours}h${todayMins > 0 ? ` ${todayMins}m` : ''}`
      : `${todayMins}m`;

  const stopMutation = useMutation({
    mutationFn: (minutes: number) =>
      apiFetch('/baby', {
        method: 'POST',
        body: JSON.stringify({ type: 'sleep', time: nowClock(), detail: `Dormiu por ${minutes} min` }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baby'] });
      clearSleepTimer();
    },
  });

  function handleStop() {
    if (elapsedMin < 1) {
      cancelSleepTimer();
      return;
    }
    stopMutation.mutate(elapsedMin);
  }

  const timerH = Math.floor(elapsedMin / 60);
  const timerM = elapsedMin % 60;
  const timerLabel = timerH > 0
    ? `${timerH}h${String(timerM).padStart(2, '0')}`
    : `${timerM}m`;

  return (
    <div className="bg-white rounded-mt p-4 shadow-mt flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Moon size={16} className="text-mt-rose flex-shrink-0" strokeWidth={1.8} />
          <span className="text-sm font-semibold text-mt-charcoal truncate">Sono</span>
        </div>
        <span className="text-[10px] text-mt-muted">hoje</span>
      </div>

      {sleepStartedAt ? (
        // ─── Timer ativo ───────────────────────────────────
        <>
          <div className="rounded-mt bg-mt-gradient-pastel p-4 flex flex-col items-center gap-1">
            <span className="text-[10px] font-semibold text-mt-rose-dark uppercase tracking-wider">
              Dormindo há
            </span>
            <span className="text-3xl font-bold text-mt-charcoal tabular-nums leading-none tracking-tight">
              {timerLabel}
            </span>
          </div>
          <button
            onClick={handleStop}
            disabled={stopMutation.isPending}
            aria-label="Parar sono e registrar"
            className="w-full py-2.5 rounded-mt-pill bg-mt-gradient text-white text-[13px] font-bold flex items-center justify-center gap-2 shadow-mt disabled:opacity-60"
          >
            <Square size={13} strokeWidth={2.5} fill="currentColor" />
            {stopMutation.isPending ? 'Salvando…' : 'Parar e registrar'}
          </button>
        </>
      ) : (
        // ─── Sem timer ─────────────────────────────────────
        <>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-mt-charcoal tabular-nums leading-none">
              {todayLabel}
            </span>
            <span className="text-[10px] text-mt-muted">acumulado</span>
          </div>
          <button
            onClick={() => startSleepTimer()}
            aria-label="Iniciar cronômetro de sono"
            className="w-full py-2.5 rounded-mt-pill bg-mt-linen text-mt-rose text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Play size={13} strokeWidth={2.5} fill="currentColor" />
            Iniciar
          </button>
        </>
      )}
    </div>
  );
}
