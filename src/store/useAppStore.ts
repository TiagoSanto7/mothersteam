import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TabId, PregnancyPhase, RoutineEntry, BabyEntry, OnboardingAnswers, MotherProfile, CommunityPost } from '../types';
import { computeProfile } from '../utils/onboardingScoring';

const today = new Date().toISOString().split('T')[0];

const SEED_ROUTINE: RoutineEntry[] = [
  { id: '1', time: '08:00', date: today, title: 'Tomar Vitamina', category: 'medication', done: false },
  { id: '2', time: '14:00', date: today, title: 'Consulta Obstetra', category: 'appointment', done: false },
  { id: '3', time: '19:00', date: today, title: 'Caminhada leve 20min', category: 'task', done: false },
];

const SEED_BABY: BabyEntry[] = [
  { id: '1', time: '09:15', type: 'sleep', detail: 'Dormiu por 45 min' },
  { id: '2', time: '10:30', type: 'feed', detail: 'Mamou 15 min (esq.)' },
  { id: '3', time: '12:00', type: 'diaper', detail: 'Fralda trocada — xixi' },
];

const SEED_POSTS: CommunityPost[] = [
  {
    id: '1', category: 'gestação', author: 'Fernanda S.', badge: 'experiente',
    content: 'Dicas para aliviar o enjoo do primeiro trimestre: gengibre em cápsulas ajudou muito!',
    likes: 24, replies: 8, time: '2h',
  },
  {
    id: '2', category: 'amamentação', author: 'Dra. Carla Lima', badge: 'profissional',
    content: 'Posição correta para amamentar: costas apoiadas, bebê de frente para o peito, barriga com barriga.',
    likes: 67, replies: 12, time: '4h',
  },
  {
    id: '3', category: 'saúde mental', author: 'Juliana M.',
    content: 'Alguém mais sentiu que a solidão do puerpério é diferente de tudo? Precisava desabafar.',
    likes: 89, replies: 31, time: '5h',
  },
  {
    id: '4', category: 'pós-parto', author: 'Renata P.', badge: 'experiente',
    content: 'Cinta pós-cesárea: comecei a usar no hospital e fez diferença na recuperação.',
    likes: 45, replies: 9, time: '8h',
  },
  {
    id: '5', category: 'amamentação', author: 'Priscila T.',
    content: 'Meu bebê estava com dificuldade de pegar o bico. A fonoaudióloga resolveu em 2 sessões!',
    likes: 33, replies: 14, time: '10h',
  },
];

interface AppState {
  // Auth
  isLoggedIn: boolean;
  onboardingDone: boolean;
  motherProfile: MotherProfile | null;
  // App
  activeTab: TabId;
  phase: PregnancyPhase;
  motherName: string;
  babyName: string;
  selectedDate: string;
  routineEntries: RoutineEntry[];
  babyEntries: BabyEntry[];
  diaperCount: number;
  lastFeedSide: 'left' | 'right';
  communityPosts: CommunityPost[];
  // Actions — Auth
  login: (email: string, password: string) => boolean;
  logout: () => void;
  completeOnboarding: (answers: OnboardingAnswers) => void;
  resetOnboarding: () => void;
  // Actions — App
  setActiveTab: (tab: TabId) => void;
  setSelectedDate: (date: string) => void;
  toggleRoutineDone: (id: string) => void;
  addRoutineEntry: (entry: Omit<RoutineEntry, 'id'>) => void;
  incrementDiaper: () => void;
  toggleFeedSide: () => void;
  setFeedSide: (side: 'left' | 'right') => void;
  addBabyEntry: (entry: BabyEntry) => void;
  addCommunityPost: (post: Omit<CommunityPost, 'id' | 'likes' | 'replies' | 'time'>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth state
      isLoggedIn: false,
      onboardingDone: false,
      motherProfile: null,
      // App state
      activeTab: 'home',
      phase: { stage: 'pregnant', week: 28 },
      motherName: 'Mariana',
      babyName: 'Léo',
      selectedDate: new Date().toISOString().split('T')[0],
      routineEntries: SEED_ROUTINE,
      babyEntries: SEED_BABY,
      diaperCount: 0,
      lastFeedSide: 'left',
      communityPosts: SEED_POSTS,
      // Auth actions
      login: (email, password) => {
        const validEmail = import.meta.env.VITE_NAVIGATION_USER;
        const validPass = import.meta.env.VITE_PWD_NAVIGATION_USER;
        if (email === validEmail && password === validPass) {
          set({ isLoggedIn: true });
          return true;
        }
        return false;
      },
      logout: () => set({ isLoggedIn: false }),
      completeOnboarding: (answers) => {
        const profile = computeProfile(answers);
        set({ onboardingDone: true, motherProfile: profile });
      },
      resetOnboarding: () => set({ onboardingDone: false, motherProfile: null }),
      // App actions
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      toggleRoutineDone: (id) =>
        set((s) => ({
          routineEntries: s.routineEntries.map((e) =>
            e.id === id ? { ...e, done: !e.done } : e,
          ),
        })),
      addRoutineEntry: (entry) =>
        set((s) => ({
          routineEntries: [
            ...s.routineEntries,
            { ...entry, id: Date.now().toString() },
          ],
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
      setFeedSide: (side) => set({ lastFeedSide: side }),
      addBabyEntry: (entry) =>
        set((s) => ({ babyEntries: [...s.babyEntries, entry] })),
      addCommunityPost: (post) =>
        set((s) => ({
          communityPosts: [
            {
              ...post,
              id: Date.now().toString(),
              likes: 0,
              replies: 0,
              time: 'agora',
            },
            ...s.communityPosts,
          ],
        })),
    }),
    { name: 'mothers-team-v1' },
  ),
);
