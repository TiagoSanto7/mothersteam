import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TabId, PregnancyPhase, OnboardingAnswers, MotherProfile } from '../types';
import { computeProfile } from '../utils/onboardingScoring';
import type { ApiUser } from '../lib/types';
import { buildPhase } from '../lib/helpers';

interface AppState {
  // Auth — NOT persisted
  isLoggedIn: boolean;
  accessToken: string | null;
  currentUserId: string | null;
  // Profile — persisted
  onboardingDone: boolean;
  motherProfile: MotherProfile | null;
  motherName: string;
  babyName: string;
  phase: PregnancyPhase;
  // UI — persisted
  activeTab: TabId;
  selectedDate: string;
  lastFeedSide: 'left' | 'right';
  followedCommunityIds: string[];
  // Auth actions
  setAccessToken: (token: string) => void;
  setAuth: (token: string, user: ApiUser) => void;
  clearAuth: () => void;
  // Profile actions
  completeOnboarding: (answers: OnboardingAnswers) => void;
  resetOnboarding: () => void;
  // UI actions
  setActiveTab: (tab: TabId) => void;
  setSelectedDate: (date: string) => void;
  toggleFeedSide: () => void;
  setFeedSide: (side: 'left' | 'right') => void;
  joinCommunity: (id: string) => void;
  leaveCommunity: (id: string) => void;
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
      // Profile
      onboardingDone: false,
      motherProfile: null,
      motherName: '',
      babyName: '',
      phase: { stage: 'pregnant', week: 28 },
      // UI
      activeTab: 'home',
      selectedDate: new Date().toISOString().split('T')[0],
      lastFeedSide: 'left',
      followedCommunityIds: [],
      // Auth actions
      setAccessToken: (token) => set({ accessToken: token }),
      setAuth: (token, user) =>
        set({
          accessToken: token,
          currentUserId: user.id,
          isLoggedIn: true,
          motherName: user.name,
          babyName: user.babyName ?? '',
          phase: buildPhase(user),
          onboardingDone: user.onboardingDone,
        }),
      clearAuth: () =>
        set({ accessToken: null, currentUserId: null, isLoggedIn: false }),
      // Profile actions
      completeOnboarding: (answers) => {
        const profile = computeProfile(answers);
        set({ onboardingDone: true, motherProfile: profile });
      },
      resetOnboarding: () => set({ onboardingDone: false, motherProfile: null }),
      // UI actions
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      toggleFeedSide: () =>
        set((s) => ({ lastFeedSide: s.lastFeedSide === 'left' ? 'right' : 'left' })),
      setFeedSide: (side) => set({ lastFeedSide: side }),
      joinCommunity: (id) =>
        set((s) => ({
          followedCommunityIds: s.followedCommunityIds.includes(id)
            ? s.followedCommunityIds
            : [...s.followedCommunityIds, id],
        })),
      leaveCommunity: (id) =>
        set((s) => ({
          followedCommunityIds: s.followedCommunityIds.filter((cid) => cid !== id),
        })),
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
        activeTab: state.activeTab,
        selectedDate: state.selectedDate,
        lastFeedSide: state.lastFeedSide,
        followedCommunityIds: state.followedCommunityIds,
      }),
    },
  ),
);
