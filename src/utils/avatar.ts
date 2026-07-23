import { ARCHETYPES } from './onboardingScoring';

const FALLBACK = '#C97E5A'; // matches tailwind sara-terracotta

export function getAvatarColor(archetypeKey: string | null | undefined): string {
  if (archetypeKey && ARCHETYPES[archetypeKey as keyof typeof ARCHETYPES]) {
    return ARCHETYPES[archetypeKey as keyof typeof ARCHETYPES].color;
  }
  return FALLBACK;
}
