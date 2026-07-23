import { ARCHETYPES } from './onboardingScoring';

const FALLBACK = '#BC8474'; // matches tailwind sara-terracotta (see tailwind.config.js)

export function getAvatarColor(archetypeKey: string | null | undefined): string {
  if (archetypeKey && ARCHETYPES[archetypeKey as keyof typeof ARCHETYPES]) {
    return ARCHETYPES[archetypeKey as keyof typeof ARCHETYPES].color;
  }
  return FALLBACK;
}
