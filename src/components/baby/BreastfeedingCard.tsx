import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiBabyEntry } from '../../lib/types';

export function BreastfeedingCard() {
  const lastFeedSide = useAppStore((s) => s.lastFeedSide);
  const setFeedSide = useAppStore((s) => s.setFeedSide);
  const toggleFeedSide = useAppStore((s) => s.toggleFeedSide);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { mutate: registerFeed, isPending } = useMutation({
    mutationFn: () => {
      const side = lastFeedSide === 'left' ? 'esquerdo' : 'direito';
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return apiFetch<ApiBabyEntry>('/baby', {
        method: 'POST',
        body: JSON.stringify({ time: now, type: 'feed', detail: `Mamou — seio ${side}` }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baby'] });
      toggleFeedSide();
      setError(null);
    },
    onError: () => {
      setError('Não foi possível registrar. Tente novamente.');
    },
  });

  return (
    <div className="bg-white rounded-mt p-4 shadow-mt flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">🤱</span>
        <span className="text-sm font-semibold text-mt-charcoal">Amamentação</span>
      </div>

      <div className="flex gap-2">
        {(['left', 'right'] as const).map((side) => (
          <button
            key={side}
            onClick={() => setFeedSide(side)}
            aria-pressed={lastFeedSide === side}
            aria-label={side === 'left' ? 'Seio esquerdo' : 'Seio direito'}
            className={`flex-1 py-2 rounded-2xl text-sm font-medium transition-colors ${
              lastFeedSide === side
                ? 'bg-mt-rose-dark text-white'
                : 'bg-mt-linen text-mt-rose-dark'
            }`}
          >
            {side === 'left' ? '⬅️ Esquerdo' : 'Direito ➡️'}
          </button>
        ))}
      </div>

      <button
        onClick={() => { setError(null); registerFeed(); }}
        disabled={isPending}
        aria-label="Registrar amamentação"
        className="w-full py-2.5 rounded-2xl bg-mt-linen text-mt-rose text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {isPending ? 'Registrando...' : 'Registrar amamentação'}
      </button>

      {error && (
        <p role="alert" className="text-[11px] text-mt-rose-dark text-center">
          {error}
        </p>
      )}
    </div>
  );
}
