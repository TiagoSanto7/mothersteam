import { Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { todayISO } from '../../lib/dateUtils';
import { useBabyDayEntries } from './useBabyDayEntries';
import type { ApiBabyEntry } from '../../lib/types';

export function DiaperCard() {
  const queryClient = useQueryClient();
  const entries = useBabyDayEntries(todayISO());

  const diaperCount = entries.filter((e) => e.type === 'diaper').length;

  const { mutate: increment } = useMutation({
    mutationFn: () => {
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return apiFetch<ApiBabyEntry>('/baby', {
        method: 'POST',
        body: JSON.stringify({ time: now, type: 'diaper', detail: 'Fralda trocada' }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['baby'] }),
  });

  return (
    <div className="bg-white rounded-mt p-4 shadow-mt flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧷</span>
          <span className="text-sm font-semibold text-mt-charcoal">Fraldas</span>
        </div>
        <span className="text-xs text-mt-muted">hoje</span>
      </div>

      <div className="flex items-center justify-between">
        <span data-testid="diaper-count" className="text-4xl font-bold text-mt-charcoal tabular-nums">
          {diaperCount}
        </span>
        <button
          aria-label="Registrar troca de fralda"
          onClick={() => increment()}
          className="w-11 h-11 rounded-2xl bg-mt-linen flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus size={20} className="text-mt-rose" strokeWidth={2.5} />
        </button>
      </div>

      <p className="text-xs text-mt-muted">
        {diaperCount === 0
          ? 'Nenhuma troca registrada'
          : `${diaperCount} troca${diaperCount > 1 ? 's' : ''} registrada${diaperCount > 1 ? 's' : ''}`}
      </p>
    </div>
  );
}
