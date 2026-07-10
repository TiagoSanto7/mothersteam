import { Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiBabyEntry } from '../../lib/types';

export function DiaperCard() {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const queryClient = useQueryClient();

  const { data: entries = [] } = useQuery({
    queryKey: ['baby'],
    queryFn: () => apiFetch<ApiBabyEntry[]>('/baby'),
    enabled: isLoggedIn,
  });

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
    <div className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧷</span>
          <span className="text-sm font-semibold text-graphite">Fraldas</span>
        </div>
        <span className="text-xs text-graphite-muted">hoje</span>
      </div>

      <div className="flex items-center justify-between">
        <span data-testid="diaper-count" className="text-4xl font-bold text-graphite tabular-nums">
          {diaperCount}
        </span>
        <button
          aria-label="Registrar troca de fralda"
          onClick={() => increment()}
          className="w-11 h-11 rounded-2xl bg-sara-linen flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus size={20} className="text-sara-gold" strokeWidth={2.5} />
        </button>
      </div>

      <p className="text-xs text-graphite-muted">
        {diaperCount === 0
          ? 'Nenhuma troca registrada'
          : `${diaperCount} troca${diaperCount > 1 ? 's' : ''} registrada${diaperCount > 1 ? 's' : ''}`}
      </p>
    </div>
  );
}
