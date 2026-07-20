import type {
  MoodAnswer,
  SupportAnswer,
  GoalAnswer,
  ConcernAnswer,
} from '../../types/reception'

export const OPCOES_MOOD: Array<{ value: MoodAnswer; label: string }> = [
  { value: 'A', label: 'Confiante e animada, curtindo o processo' },
  { value: 'B', label: 'Cansada, mas conseguindo lidar' },
  { value: 'C', label: 'Ansiosa, com medos e inseguranças' },
  { value: 'D', label: 'Sobrecarregada, exausta, sem tempo pra mim' },
]

export const OPCOES_SUPPORT: Array<{ value: SupportAnswer; label: string }> = [
  { value: 'A', label: 'Sempre tenho ajuda por perto' },
  { value: 'B', label: 'Só em momentos específicos ou fim de semana' },
  { value: 'C', label: 'Cuido de quase tudo sozinha' },
]

export const OPCOES_GOAL: Array<{ value: GoalAnswer; label: string }> = [
  { value: 'A', label: 'Entender o desenvolvimento do bebê' },
  { value: 'B', label: 'Cuidar da minha saúde física' },
  { value: 'C', label: 'Melhorar o sono (meu e do bebê)' },
  { value: 'D', label: 'Organizar a rotina do dia a dia' },
]

export const OPCOES_CONCERN: Array<{ value: ConcernAnswer; label: string }> = [
  { value: 'A', label: 'Autocuidado e minha identidade' },
  { value: 'B', label: 'Choro, cólicas ou sono do bebê' },
  { value: 'C', label: 'Amamentação ou alimentação' },
  { value: 'D', label: 'Corpo, hormônios, autoestima' },
]
