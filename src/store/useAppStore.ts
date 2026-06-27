import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TabId, PregnancyPhase, RoutineEntry, BabyEntry } from '../types';

const SEED_ROUTINE: RoutineEntry[] = [
  { id: '1', time: '08:00', title: 'Tomar Vitamina', category: 'medication', done: false },
  { id: '2', time: '14:00', title: 'Consulta Obstetra', category: 'appointment', done: false },
  { id: '3', time: '19:00', title: 'Caminhada leve 20min', category: 'task', done: false },
];

const SEED_BABY: BabyEntry[] = [
  { id: '1', time: '09:15', type: 'sleep', detail: 'Dormiu por 45 min' },
  { id: '2', time: '10:30', type: 'feed', detail: 'Mamou 15 min (esq.)' },
  { id: '3', time: '12:00', type: 'diaper', detail: 'Fralda trocada — xixi' },
];

interface AppState {
  activeTab: TabId;
  phase: PregnancyPhase;
  motherName: string;
  babyName: string;
  selectedDate: string;
  routineEntries: RoutineEntry[];
  babyEntries: BabyEntry[];
  diaperCount: number;
  lastFeedSide: 'left' | 'right';
  setActiveTab: (tab: TabId) => void;
  setSelectedDate: (date: string) => void;
  toggleRoutineDone: (id: string) => void;
  incrementDiaper: () => void;
  toggleFeedSide: () => void;
  addBabyEntry: (entry: BabyEntry) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeTab: 'home',
      phase: { stage: 'pregnant', week: 28 },
      motherName: 'Mariana',
      babyName: 'Léo',
      selectedDate: new Date().toISOString().split('T')[0],
      routineEntries: SEED_ROUTINE,
      babyEntries: SEED_BABY,
      diaperCount: 0,
      lastFeedSide: 'left',
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      toggleRoutineDone: (id) =>
        set((s) => ({
          routineEntries: s.routineEntries.map((e) =>
            e.id === id ? { ...e, done: !e.done } : e,
          ),
        })),
      incrementDiaper: () =>
        set((s) => ({
          diaperCount: s.diaperCount + 1,
          babyEntries: [
            ...s.babyEntries,
            {
              id: Date.now().toString(),
              time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              type: 'diaper',
              detail: 'Fralda trocada',
            },
          ],
        })),
      toggleFeedSide: () =>
        set((s) => ({ lastFeedSide: s.lastFeedSide === 'left' ? 'right' : 'left' })),
      addBabyEntry: (entry) =>
        set((s) => ({ babyEntries: [...s.babyEntries, entry] })),
    }),
    { name: 'mothers-team-v1' },
  ),
);
