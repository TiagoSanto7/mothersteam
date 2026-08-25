import type { PregnancyPhase } from '../../types'

export const SARA_FRASES = {
  saraAparece: (motherName: string) =>
    `Oi, ${motherName}. Fico feliz que você esteja aqui. Antes da gente começar, queria conhecer um pouquinho de você. Prometo que é rapidinho.`,

  presenteIntro: () =>
    'Antes da gente seguir… queria deixar uma palavra com você. Espero que ela encontre um lugar no seu coração hoje.',

  primeiraHome: (motherName: string, phase: PregnancyPhase, babyName: string | null | undefined): string => {
    if (phase.stage === 'pregnant') {
      return `Bom dia, ${motherName}. Hoje vocês chegaram à ${phase.week}ª semana. Espero que o dia seja leve por aí.`
    }
    const nome = babyName?.trim() || 'seu bebê'
    return `Bom dia, ${motherName}. Hoje ${nome} completa ${phase.ageInDays} dias. Como vocês acordaram?`
  },
} as const
