import { useAppStore } from '../../store/useAppStore';

export function BreastfeedingCard() {
  const { lastFeedSide, setFeedSide, toggleFeedSide, addBabyEntry } = useAppStore();

  function handleRegister() {
    const side = lastFeedSide === 'left' ? 'esquerdo' : 'direito';
    addBabyEntry({
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      type: 'feed',
      detail: `Mamou — seio ${side}`,
    });
    toggleFeedSide();
  }

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">🤱</span>
        <span className="text-sm font-semibold text-graphite">Amamentação</span>
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
                ? 'bg-sara-terracotta text-white'
                : 'bg-sara-linen text-sara-terracotta'
            }`}
          >
            {side === 'left' ? '⬅️ Esquerdo' : 'Direito ➡️'}
          </button>
        ))}
      </div>

      <button
        onClick={handleRegister}
        aria-label="Registrar mamada"
        className="w-full py-2.5 rounded-2xl bg-sara-linen text-sara-gold text-sm font-semibold active:scale-[0.98] transition-transform"
      >
        Registrar mamada
      </button>
    </div>
  );
}
