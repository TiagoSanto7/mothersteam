export type TabId = 'home' | 'maeIA' | 'baby' | 'comunidade' | 'shopping';

export type PregnancyPhase =
  | { stage: 'pregnant'; week: number }
  | { stage: 'postpartum'; ageInDays: number };

export type EvolutionStage = 'embryo' | 'fetus-early' | 'fetus-late' | 'newborn';

export interface RoutineEntry {
  id: string;
  time: string;
  date: string;
  title: string;
  category: 'task' | 'appointment' | 'medication';
  done: boolean;
}

export interface BabyEntry {
  id: string;
  time: string;
  type: 'sleep' | 'feed' | 'diaper';
  detail: string;
}
