import type { PregnancyPhase, EvolutionStage } from '../types';

export function getEvolutionStage(phase: PregnancyPhase): EvolutionStage {
  if (phase.stage === 'postpartum') return 'newborn';
  if (phase.week <= 8) return 'embryo';
  if (phase.week <= 20) return 'fetus-early';
  return 'fetus-late';
}

export function getEvolutionEmoji(phase: PregnancyPhase): string {
  const map: Record<EvolutionStage, string> = {
    embryo:        '🌱',
    'fetus-early': '🫘',
    'fetus-late':  '🤰',
    newborn:       '👶',
  };
  return map[getEvolutionStage(phase)];
}

export function getHeaderGreeting(
  phase: PregnancyPhase,
  motherName: string,
  babyName: string,
): string {
  if (phase.stage === 'postpartum') {
    const weeks = Math.floor(phase.ageInDays / 7);
    if (weeks >= 1) {
      return `${motherName}, o ${babyName} já está com ${weeks} semana${weeks > 1 ? 's' : ''}!`;
    }
    return `${motherName}, o ${babyName} já está com ${phase.ageInDays} dias!`;
  }
  const remaining = Math.max(0, 40 - phase.week);
  if (remaining === 0) return `${motherName}, é hoje! O parto está próximo 💜`;
  const plural = remaining !== 1;
  return `Olá, ${motherName}! Falt${plural ? 'am' : 'a'} ${remaining} semana${plural ? 's' : ''} para o parto`;
}
