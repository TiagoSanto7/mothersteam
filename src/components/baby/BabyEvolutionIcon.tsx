import { useAppStore } from '../../store/useAppStore';
import { getEvolutionStage, getEvolutionEmoji } from '../../utils/pregnancyUtils';

const STAGE_LABELS = {
  embryo:        'Embrião',
  'fetus-early': 'Feto inicial',
  'fetus-late':  'Bebê formado',
  newborn:       'Recém-nascido',
} as const;

export function BabyEvolutionIcon() {
  const { phase, babyName } = useAppStore();
  const stage = getEvolutionStage(phase);
  const emoji = getEvolutionEmoji(phase);

  const subtitle =
    phase.stage === 'pregnant'
      ? `Semana ${phase.week} — ${STAGE_LABELS[stage]}`
      : `${babyName} — ${Math.floor(phase.ageInDays / 7)} semana${Math.floor(phase.ageInDays / 7) !== 1 ? 's' : ''} de vida`;

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <div className="w-20 h-20 rounded-full bg-lavender-100 flex items-center justify-center text-5xl shadow-inner">
        {emoji}
      </div>
      <p className="text-xs text-graphite-muted font-medium text-center">{subtitle}</p>
    </div>
  );
}
