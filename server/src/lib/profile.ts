// Server-side mirror of src/utils/onboardingScoring.ts (function `computeProfile`).
// Keep the mapping rules in sync when either file changes. Server only needs
// `profileKey` + `archetypeKey`; labels/insights/phrases stay client-side.

type Q1 = 'A' | 'B' | 'C' | 'D' | 'E'
type Letter = 'A' | 'B' | 'C' | 'D'
type Q3 = 'A' | 'B' | 'C'

type ArchetypeKey = 'maria' | 'ana' | 'ester' | 'debora' | 'rute'

const PROFILE_TO_ARCHETYPE: Record<string, ArchetypeKey> = {
  exausta_sem_apoio: 'maria',
  sobrecarregada_amparada: 'maria',
  gestante_ansiosa_inicio: 'debora',
  gestante_ansiosa_reta_final: 'debora',
  preparando_grande_dia: 'debora',
  gestante_tranquila: 'ester',
  recuperacao_fisica: 'rute',
  guerreira_sono: 'ana',
  desafio_amamentacao: 'ana',
  mae_busca_si_mesma: 'rute',
  mae_solo: 'ana',
  mae_experiente: 'ester',
  mae_em_jornada: 'ester',
}

export interface ProfileInput {
  stage: 'pregnant' | 'postpartum'
  week?: number
  ageInDays?: number
  mood: Letter
  supportNetwork: Q3
  goal: Letter
  concern: Letter
}

function derivarQ1(input: ProfileInput): Q1 {
  if (input.stage === 'pregnant') return (input.week ?? 28) < 28 ? 'A' : 'B'
  const days = input.ageInDays ?? 0
  if (days <= 90) return 'C'
  if (days <= 365) return 'D'
  return 'E'
}

function pickProfileKey(q1: Q1, q2: Letter, q3: Q3, q4: Letter, q5: Letter): string {
  if (q2 === 'D' && q3 === 'C') return 'exausta_sem_apoio'
  if (q2 === 'D' && q3 !== 'C') return 'sobrecarregada_amparada'
  if (q5 === 'C') return 'desafio_amamentacao'
  if (q4 === 'C' || q5 === 'B') return 'guerreira_sono'
  if (q1 === 'B' && (q2 === 'C' || q2 === 'D')) return 'gestante_ansiosa_reta_final'
  if (q1 === 'A' && (q2 === 'C' || q2 === 'D')) return 'gestante_ansiosa_inicio'
  if (q1 === 'C' && q4 === 'B') return 'recuperacao_fisica'
  if (q1 === 'B') return 'preparando_grande_dia'
  if (q1 === 'A') return 'gestante_tranquila'
  if (q1 === 'E') return 'mae_experiente'
  if (q3 === 'C' && (q1 === 'C' || q1 === 'D')) return 'mae_solo'
  if (q5 === 'A' || q5 === 'D') return 'mae_busca_si_mesma'
  return 'mae_em_jornada'
}

export function computeProfileFromLetters(input: ProfileInput) {
  const q1 = derivarQ1(input)
  const answers = {
    q1,
    q2: input.mood,
    q3: input.supportNetwork,
    q4: input.goal,
    q5: input.concern,
  }
  const profileKey = pickProfileKey(q1, input.mood, input.supportNetwork, input.goal, input.concern)
  return { answers, profileKey, archetypeKey: PROFILE_TO_ARCHETYPE[profileKey] }
}
