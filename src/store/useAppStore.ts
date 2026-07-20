import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TabId, PregnancyPhase, OnboardingAnswers, MotherProfile, Q1Answer } from '../types';
import { computeProfile } from '../utils/onboardingScoring';
import type { ApiUser } from '../lib/types';
import { buildPhase } from '../lib/helpers';
import type { ReceptionData } from '../types/reception';

function derivarQ1(phase: PregnancyPhase): Q1Answer {
  if (phase.stage === 'pregnant') return phase.week < 28 ? 'A' : 'B';
  if (phase.ageInDays <= 90) return 'C';
  if (phase.ageInDays <= 365) return 'D';
  return 'E';
}

interface AppState {
  // Auth — NOT persisted
  isLoggedIn: boolean;
  accessToken: string | null;
  currentUserId: string | null;
  email: string;
  // Profile — persisted
  onboardingDone: boolean;
  motherProfile: MotherProfile | null;
  motherName: string;
  babyName: string;
  phase: PregnancyPhase;
  socialOnboardingDone: boolean;
  // UI — persisted
  activeTab: TabId;
  selectedDate: string;
  lastFeedSide: 'left' | 'right';
  savedVerses: string[];
  // UI — NOT persisted
  pendingShareContent: string | null;
  // Auth actions
  setAccessToken: (token: string) => void;
  setAuth: (token: string, user: ApiUser) => void;
  clearAuth: () => void;
  // Profile actions
  completeOnboarding: (answers: OnboardingAnswers) => void;
  applyReceptionData: (data: ReceptionData) => void;
  resetOnboarding: () => void;
  completeSocialOnboarding: () => void;
  // UI actions
  setActiveTab: (tab: TabId) => void;
  setSelectedDate: (date: string) => void;
  toggleFeedSide: () => void;
  setFeedSide: (side: 'left' | 'right') => void;
  saveVerse: (ref: string) => void;
  unsaveVerse: (ref: string) => void;
  setPendingShareContent: (content: string | null) => void;
}

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch (e) { console.warn('[persist]', e); }
  },
  removeItem: (key: string): void => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth — memory only
      isLoggedIn: false,
      accessToken: null,
      currentUserId: null,
      email: '',
      // Profile
      onboardingDone: false,
      motherProfile: null,
      motherName: '',
      babyName: '',
      phase: { stage: 'pregnant', week: 28 },
      socialOnboardingDone: false,
      // UI
      activeTab: 'home',
      selectedDate: new Date().toISOString().split('T')[0],
      lastFeedSide: 'left',
      savedVerses: [],
      pendingShareContent: null,
      // Auth actions
      setAccessToken: (token) => set({ accessToken: token }),
      setAuth: (token, user) =>
        set({
          accessToken: token,
          currentUserId: user.id,
          isLoggedIn: true,
          email: user.email,
          motherName: user.name,
          babyName: user.babyName ?? '',
          phase: buildPhase(user),
          onboardingDone: user.onboardingDone,
        }),
      clearAuth: () =>
        set({ accessToken: null, currentUserId: null, isLoggedIn: false, email: '' }),
      // Profile actions
      completeOnboarding: (answers) => {
        const profile = computeProfile(answers);
        set({ onboardingDone: true, motherProfile: profile });
      },
      applyReceptionData: (data: ReceptionData) => {
        const phase: PregnancyPhase =
          data.phase === 'pregnant'
            ? { stage: 'pregnant', week: data.week ?? 28 }
            : { stage: 'postpartum', ageInDays: data.ageInDays ?? 0 };
        const answers: OnboardingAnswers = {
          q1: derivarQ1(phase),
          q2: data.mood ?? 'A',
          q3: data.supportNetwork ?? 'A',
          q4: data.goal ?? 'A',
          q5: data.concern ?? 'A',
        };
        const profile = computeProfile(answers);
        set({
          motherName: data.motherName ?? '',
          babyName: data.babyName ?? '',
          phase,
          onboardingDone: true,
          motherProfile: profile,
        });
      },
      resetOnboarding: () => set({ onboardingDone: false, motherProfile: null }),
      completeSocialOnboarding: () => set({ socialOnboardingDone: true }),
      // UI actions
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      toggleFeedSide: () =>
        set((s) => ({ lastFeedSide: s.lastFeedSide === 'left' ? 'right' : 'left' })),
      setFeedSide: (side) => set({ lastFeedSide: side }),
      saveVerse: (ref) => set((s) => ({ savedVerses: s.savedVerses.includes(ref) ? s.savedVerses : [...s.savedVerses, ref] })),
      unsaveVerse: (ref) => set((s) => ({ savedVerses: s.savedVerses.filter((r) => r !== ref) })),
      setPendingShareContent: (content) => set({ pendingShareContent: content }),
    }),
    {
      name: 'mothers-team-v3',
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => ({
        onboardingDone: state.onboardingDone,
        motherProfile: state.motherProfile,
        motherName: state.motherName,
        babyName: state.babyName,
        phase: state.phase,
        socialOnboardingDone: state.socialOnboardingDone,
        activeTab: state.activeTab,
        lastFeedSide: state.lastFeedSide,
        savedVerses: state.savedVerses,
      }),
    },
  ),
);
