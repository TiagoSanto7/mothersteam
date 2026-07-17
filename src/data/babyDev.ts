import type { PregnancyPhase } from '../types'

export interface BabyDevContent {
  title: string
  size: string
  emoji: string
  curiosities: string[]
  source: string
}

const PREGNANCY: Record<string, BabyDevContent> = {
  '4-6': {
    title: 'Semanas 4–6: O coração começa a bater',
    size: 'menor que um grão de arroz',
    emoji: '🌱',
    curiosities: [
      'O coração já pulsa cerca de 110 vezes por minuto nessa fase.',
      'O tubo neural — precursor do cérebro e medula espinal — está se formando.',
      'Os brotos dos membros superiores já aparecem por volta da 6ª semana.',
    ],
    source: 'Mayo Clinic · MedlinePlus',
  },
  '7-9': {
    title: 'Semanas 7–9: Feições em formação',
    size: 'do tamanho de uma uva',
    emoji: '🫐',
    curiosities: [
      'Os olhos estão visíveis como pontos escuros e as narinas começam a se formar.',
      'Os dedos das mãos começam a se separar — ainda unidos por uma membrana fina.',
      'Movimentos espontâneos já ocorrem, mas a mãe ainda não os sente.',
    ],
    source: 'ACOG · MedlinePlus',
  },
  '10-13': {
    title: 'Semanas 10–13: Fim do 1° trimestre',
    size: 'do tamanho de um limão',
    emoji: '🍋',
    curiosities: [
      'Todos os órgãos vitais estão formados — agora é fase de crescimento.',
      'As unhas começam a aparecer nas pontas dos dedos.',
      'O bebê já consegue engolir o líquido amniótico.',
    ],
    source: 'Mayo Clinic · NIH',
  },
  '14-17': {
    title: 'Semanas 14–17: Movimentos ativos',
    size: 'do tamanho de uma maçã',
    emoji: '🍎',
    curiosities: [
      'O bebê já faz expressões faciais — sorrisos e caretas involuntárias.',
      'As impressões digitais únicas estão se formando.',
      'O sistema nervoso está amadurecendo rapidamente.',
    ],
    source: 'ACOG · MedlinePlus',
  },
  '18-22': {
    title: 'Semanas 18–22: Chute e virada',
    size: 'do tamanho de uma banana',
    emoji: '🍌',
    curiosities: [
      'A maioria das mães sente os primeiros movimentos nessa janela.',
      'O vernix caseosa — camada protetora branca — cobre a pele do bebê.',
      'O sono do bebê já tem ciclos de REM, semelhantes aos de recém-nascidos.',
    ],
    source: 'Mayo Clinic · NIH',
  },
  '23-27': {
    title: 'Semanas 23–27: Pulmões em desenvolvimento',
    size: 'do tamanho de um pimentão',
    emoji: '🫑',
    curiosities: [
      'Os pulmões produzem surfactante, substância que evita o colapso dos alvéolos.',
      'O bebê consegue ouvir a voz da mãe e reagir a sons externos.',
      'A gordura subcutânea começa a se acumular, suavizando a aparência da pele.',
    ],
    source: 'ACOG · MedlinePlus',
  },
  '28-31': {
    title: 'Semanas 28–31: Olhos abertos',
    size: 'do tamanho de um coco',
    emoji: '🥥',
    curiosities: [
      'Os olhos já abrem e fecham — o bebê consegue perceber luz através da barriga.',
      'O cérebro cresce rapidamente, com os sulcos característicos se aprofundando.',
      'O bebê pratica a respiração com o líquido amniótico, preparando os pulmões.',
    ],
    source: 'Mayo Clinic · NIH',
  },
  '32-36': {
    title: 'Semanas 32–36: Preparação para o mundo',
    size: 'do tamanho de um melão',
    emoji: '🍈',
    curiosities: [
      'O bebê ocupa quase todo o útero e os movimentos ficam mais perceptíveis.',
      'O sistema imune recebe anticorpos maternos pela placenta.',
      'A maioria dos bebês assume a posição de cabeça para baixo nessa fase.',
    ],
    source: 'ACOG · Mayo Clinic',
  },
  '37-40': {
    title: 'Semanas 37–40: Pronto para nascer',
    size: 'do tamanho de uma melancia',
    emoji: '🍉',
    curiosities: [
      'O bebê a termo pesa em média 3,3 kg e mede ~50 cm.',
      'Os pulmões estão maduros e prontos para a primeira respiração.',
      'O bebê reconhece a voz da mãe — estudos mostram reação preferencial a ela.',
    ],
    source: 'Mayo Clinic · NIH · ACOG',
  },
  '41+': {
    title: 'Semana 41+: Na hora certa',
    size: 'do tamanho de uma melancia madura',
    emoji: '🌸',
    curiosities: [
      'Gestações de 41–42 semanas são consideradas pós-termo — monitoramento é importante.',
      'O bebê pode apresentar descamação da pele, pois o vernix foi reabsorvido.',
      'A OMS considera o parto entre 37 e 42 semanas como a termo completo.',
    ],
    source: 'ACOG · OMS',
  },
}

const POSTPARTUM: Record<string, BabyDevContent> = {
  '0': {
    title: 'Recém-nascido: O primeiro encontro',
    size: 'em média 3,3 kg · ~50 cm',
    emoji: '🌷',
    curiosities: [
      'Recém-nascidos reconhecem o cheiro da mãe desde as primeiras horas de vida.',
      'A visão ainda é borrada — o bebê enxerga melhor a ~25 cm, distância do rosto durante a amamentação.',
      'O reflexo de sucção está presente desde o nascimento e é vital para a amamentação.',
    ],
    source: 'Mayo Clinic · MedlinePlus',
  },
  '1': {
    title: '1 mês: Sorriso social chegando',
    size: 'em média 4,3 kg · ~55 cm',
    emoji: '☀️',
    curiosities: [
      'Por volta de 6 semanas surge o primeiro sorriso social — resposta real ao rosto da mãe.',
      'O bebê já segue objetos em movimento com os olhos.',
      'Choro é a única linguagem, mas a mãe começa a diferenciar os tipos.',
    ],
    source: 'CDC · MedlinePlus',
  },
  '2': {
    title: '2 meses: Vocalizando',
    size: 'em média 5,6 kg · ~58 cm',
    emoji: '🗣️',
    curiosities: [
      'O bebê começa a emitir sons além do choro — os primeiros "oohs" e "aahs".',
      'Consegue sustentar a cabeça brevemente quando colocado de bruços.',
      'O ciclo sono-vigília começa a se organizar gradualmente.',
    ],
    source: 'CDC · AAP',
  },
  '3': {
    title: '3 meses: Descobrindo as mãos',
    size: 'em média 6,4 kg · ~61 cm',
    emoji: '🤲',
    curiosities: [
      'O bebê descobre as próprias mãos e passa tempo fascinado olhando para elas.',
      'Gargalhadas surgem — o riso social é um marco emocionante.',
      'Os cólicos tendem a diminuir significativamente nessa fase.',
    ],
    source: 'CDC · Mayo Clinic',
  },
  '4-5': {
    title: '4–5 meses: Rolando e explorando',
    size: 'em média 7 kg · ~64 cm',
    emoji: '🔄',
    curiosities: [
      'A maioria dos bebês aprende a rolar de bruços para a barriga nessa fase.',
      'O interesse por objetos coloridos e texturas aumenta muito.',
      'O bebê começa a levar objetos à boca como forma de exploração sensorial.',
    ],
    source: 'CDC · AAP',
  },
  '6-8': {
    title: '6–8 meses: Sentando e mastigando',
    size: 'em média 8 kg · ~68 cm',
    emoji: '🥄',
    curiosities: [
      'A introdução alimentar complementar pode começar a partir dos 6 meses.',
      'O bebê começa a sentar sem apoio — um marco importante do desenvolvimento motor.',
      'Aparece a angústia de separação: o bebê sente falta da mãe quando ela sai.',
    ],
    source: 'OMS · CDC · AAP',
  },
  '9-11': {
    title: '9–11 meses: Engatinhando',
    size: 'em média 9 kg · ~72 cm',
    emoji: '🐾',
    curiosities: [
      'A maioria engatinha — mas alguns bebês pulam essa fase e vão direto para andar.',
      'A pinça fina (pegar objetos pequenos entre polegar e indicador) está se desenvolvendo.',
      'O bebê entende palavras simples como "não" e o próprio nome.',
    ],
    source: 'CDC · Mayo Clinic',
  },
  '12+': {
    title: '12+ meses: Primeiros passos',
    size: 'em média 10 kg · ~76 cm',
    emoji: '👣',
    curiosities: [
      'A maioria das crianças dá os primeiros passos entre 9 e 12 meses.',
      'O vocabulário começa a crescer — primeiras palavras com significado real.',
      'A amamentação pode continuar pelo tempo que mãe e bebê desejarem, segundo a OMS.',
    ],
    source: 'OMS · CDC · AAP',
  },
}

function getPregnancyBucket(week: number): string {
  if (week <= 6) return '4-6'
  if (week <= 9) return '7-9'
  if (week <= 13) return '10-13'
  if (week <= 17) return '14-17'
  if (week <= 22) return '18-22'
  if (week <= 27) return '23-27'
  if (week <= 31) return '28-31'
  if (week <= 36) return '32-36'
  if (week <= 40) return '37-40'
  return '41+'
}

function getPostpartumBucket(ageInDays: number): string {
  const months = ageInDays / 30
  if (months < 1) return '0'
  if (months < 2) return '1'
  if (months < 3) return '2'
  if (months < 4) return '3'
  if (months < 6) return '4-5'
  if (months < 9) return '6-8'
  if (months < 12) return '9-11'
  return '12+'
}

export function getBabyDevContent(phase: PregnancyPhase): BabyDevContent {
  if (phase.stage === 'pregnant') {
    return PREGNANCY[getPregnancyBucket(phase.week)]
  }
  return POSTPARTUM[getPostpartumBucket(phase.ageInDays)]
}
