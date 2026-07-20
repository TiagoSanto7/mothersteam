import type { ReceptionData } from '../../types/reception'

export const SARA_FRASES = {
  saraAparece: (motherName: string) =>
    `Oi, ${motherName}. Fico feliz que você esteja aqui. Antes da gente começar, queria conhecer você um pouquinho. Prometo que é rapidinho.`,

  capitulo1_pergunta1: () =>
    'Me conta… você está esperando o bebê ou ele já chegou?',

  capitulo2_pergunta1: () =>
    'E me conta uma coisa… como você tem se sentido nesses últimos dias?',

  capitulo2_pergunta2: () =>
    'E hoje em dia, com que frequência você consegue contar com alguém pra te ajudar?',

  capitulo3_pergunta1: () =>
    'E, olhando pra tudo que você está vivendo agora… o que você mais gostaria que fosse um pouquinho mais fácil?',

  capitulo3_pergunta2: () =>
    'E se você me contasse uma coisa que anda tirando um pouquinho do seu sono ou da sua paz… o que seria?',

  presenteIntro: () =>
    'Antes da gente seguir… queria deixar uma palavra com você. Espero que ela encontre um lugar no seu coração hoje.',

  primeiraHome: (motherName: string, data: ReceptionData): string => {
    if (data.phase === 'pregnant') {
      const semana = data.week ?? 28
      return `Bom dia, ${motherName}. Hoje vocês chegaram à ${semana}ª semana. Espero que o dia seja leve por aí.`
    }
    const nome = data.babyName?.trim() || 'seu bebê'
    const dias = data.ageInDays ?? 0
    return `Bom dia, ${motherName}. Hoje ${nome} completa ${dias} dias. Como vocês acordaram?`
  },
} as const
