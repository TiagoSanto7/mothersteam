export type ReceptionBeat =
  | 'bem-vinda'
  | 'sara-aparece'
  | 'capitulo-1'
  | 'capitulo-2'
  | 'capitulo-3'
  | 'preparando-tudo'
  | 'presente'
  | 'done'

export type MoodAnswer = 'A' | 'B' | 'C' | 'D'
export type SupportAnswer = 'A' | 'B' | 'C'
export type GoalAnswer = 'A' | 'B' | 'C' | 'D'
export type ConcernAnswer = 'A' | 'B' | 'C' | 'D'

export interface ReceptionOtherChild {
  name: string
  ageDescription: string
}

export interface ReceptionData {
  motherName?: string
  phase?: 'pregnant' | 'postpartum'
  week?: number
  ageInDays?: number
  babyName?: string | null
  otherChildren: ReceptionOtherChild[]
  mood?: MoodAnswer
  supportNetwork?: SupportAnswer
  goal?: GoalAnswer
  concern?: ConcernAnswer
}
