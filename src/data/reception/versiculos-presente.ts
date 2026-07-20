import type { MoodAnswer } from '../../types/reception'

export interface Versiculo {
  verso: string
  referencia: string
}

const MAPA: Record<MoodAnswer, Versiculo> = {
  A: {
    verso: 'De modo especial e admirável fui formado; maravilhosas são as tuas obras.',
    referencia: 'Salmos 139:14',
  },
  B: {
    verso: 'Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.',
    referencia: 'Mateus 11:28',
  },
  C: {
    verso: 'Não estejais inquietos por coisa alguma; antes as vossas petições sejam conhecidas diante de Deus.',
    referencia: 'Filipenses 4:6-7',
  },
  D: {
    verso: 'Os que esperam no Senhor renovarão as suas forças e subirão com asas como águias.',
    referencia: 'Isaías 40:31',
  },
}

export function versiculoParaHumor(mood: MoodAnswer | undefined): Versiculo {
  return MAPA[mood ?? 'A']
}
