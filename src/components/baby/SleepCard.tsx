import { Moon, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiBabyEntry } from '../../lib/types';

/**
 * SleepCard — acumulador + "+".
 *
 * Mostra o total de sono do dia (H/m) e um botão "+" que abre o
 * <QuickRegisterSheet> na aba Sono. A entrada em si é feita lá — dois
 * campos livres (h + m) para a mãe digitar o tempo total sem passos rígidos.
 */
export function SleepCard() {
  const isLoggedIn    = useAppStore((s) => s.isLoggedIn);
  const openBabySheet = useAppStore((s) => s.openBabySheet);

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

  const napCount = entries.filter((e) => e.type === 'sleep').length;

  const todayHours = Math.floor(totalToday / 60);
  const todayMins  = totalToday % 60;
  const todayLabel = totalToday === 0
    ? '0m'
    : todayHours > 0
      ? `${todayHours}h${todayMins > 0 ? ` ${todayMins}m` : ''}`
      : `${todayMins}m`;

  return (
    <div className="bg-white rounded-mt p-4 shadow-mt flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Moon size={16} className="text-mt-rose flex-shrink-0" strokeWidth={1.8} />
          <span className="text-sm font-semibold text-mt-charcoal truncate">Sono</span>
        </div>
        <span className="text-[10px] text-mt-muted">hoje</span>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-mt-charcoal tabular-nums leading-none">
          {todayLabel}
        </span>
        {napCount > 0 && (
          <span className="text-[10px] text-mt-muted">
            · {napCount} soneca{napCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <button
        onClick={() => openBabySheet('sono')}
        aria-label="Registrar soneca"
        className="w-full py-2.5 rounded-mt-pill bg-mt-linen text-mt-rose text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <Plus size={14} strokeWidth={2.5} />
        Nova soneca
      </button>
    </div>
  );
}
