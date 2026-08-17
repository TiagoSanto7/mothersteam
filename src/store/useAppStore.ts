import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TabId, PregnancyPhase, OnboardingAnswers, MotherProfile, Q1Answer } from '../types';
import { computeProfile } from '../utils/onboardingScoring';
import type { ApiUser } from '../lib/types';
import { apiFetch } from '../lib/api';
import { buildPhase } from '../lib/helpers';
import type { ReceptionData } from '../types/reception';

function derivarQ1(phase: PregnancyPhase): Q1Answer {
  if (phase.stage === 'pregnant') return phase.week < 28 ? 'A' : 'B';
  if (phase.ageInDays <= 90) return 'C';
  if (phase.ageInDays <= 365) return 'D';
  return 'E';
}

interface AppState {
  // Auth — NOT persisted (except refreshToken)
  isLoggedIn: boolean;
  accessToken: string | null;
  refreshToken: string | null;
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
  /** @deprecated use versesByUser — kept only for v1→v2 migration */
  savedVerses: string[];
  /** Verses keyed by userId so different users don't share verse lists */
  versesByUser: Record<string, string[]>;
  /** User-written prayer texts keyed by userId → verse-ref */
  prayersByUser: Record<string, Record<string, string>>;
  // UI — NOT persisted
  pendingShareContent: string | null;
  // Auth actions
  setAccessToken: (token: string) => void;
  setAuth: (token: string, user: ApiUser, refreshToken?: string) => void;
  clearAuth: () => void;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  // Profile actions
  completeOnboarding: (answers: OnboardingAnswers) => void;
  applyReceptionData: (data: ReceptionData) => void;
  completeReception: () => void;
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
  savePrayer: (ref: string, text: string) => void;
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

const OLD_TAB_MAP: Record<string, TabId> = {
  home:       'hoje',
  maeIA:      'maeIA',
  baby:       'jornada',
  rotina:     'jornada',
  shopping:   'hoje',
};

export function migrateAppState(
  persistedState: unknown,
  fromVersion: number,
): Partial<AppState> {
  const state = persistedState as Partial<AppState>;
  if (fromVersion === 0) {
    const oldTab = state.activeTab as string | undefined;
    const newTab = oldTab ? (OLD_TAB_MAP[oldTab] ?? oldTab) : 'hoje';
    return {
      ...state,
      activeTab: newTab as TabId,
      versesByUser: {},
      prayersByUser: {},
    };
  }
  if (fromVersion === 1) {
    // Migrate flat savedVerses to versesByUser under a legacy bucket so
    // pre-login verses are not lost but also not mixed with other users.
    const legacyVerses: string[] = (state as any).savedVerses ?? [];
    return {
      ...state,
      savedVerses: [],
      versesByUser: legacyVerses.length > 0 ? { '__legacy__': legacyVerses } : {},
      prayersByUser: {},
    };
  }
  return state;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth — memory only (except refreshToken which is persisted)
      isLoggedIn: false,
      accessToken: null,
      refreshToken: null,
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
      activeTab: 'hoje',
      selectedDate: new Date().toISOString().split('T')[0],
      lastFeedSide: 'left',
      savedVerses: [],
      versesByUser: {},
      prayersByUser: {},
      pendingShareContent: null,
      // Auth actions
      setAccessToken: (token) => set({ accessToken: token }),
      setAuth: (token, user, refreshTok) =>
        set((s) => {
          // Consolidate __legacy__ verse bucket into this user's bucket on login.
          // Removes the need for the selector to merge on every read (React #185
          // trap: derived arrays in Zustand selectors return unstable references).
          const legacy = s.versesByUser['__legacy__'];
          let versesByUser = s.versesByUser;
          if (legacy && legacy.length > 0) {
            const existing = s.versesByUser[user.id] ?? [];
            const merged = Array.from(new Set([...existing, ...legacy]));
            const { ['__legacy__']: _drop, ...rest } = s.versesByUser;
            versesByUser = { ...rest, [user.id]: merged };
          }
          return {
            accessToken: token,
            // Preserve existing refreshToken if a new one is not provided (session restore path)
            refreshToken: refreshTok !== undefined ? refreshTok : s.refreshToken,
            currentUserId: user.id,
            isLoggedIn: true,
            email: user.email,
            motherName: user.name,
            babyName: user.babyName ?? '',
            phase: buildPhase(user),
            onboardingDone: user.onboardingDone,
            versesByUser,
          };
        }),
      clearAuth: () => {
        set({ accessToken: null, refreshToken: null, currentUserId: null, isLoggedIn: false, email: '' })
        import('../lib/queryClient').then(({ queryClient }) => queryClient.clear())
      },
      logout: () => {
        const { refreshToken } = get()
        apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }).catch(() => {})
        get().clearAuth()
      },
      refreshAccessToken: async () => {
        const { refreshToken } = get()
        if (!refreshToken) return
        try {
          const data = await apiFetch<{ accessToken: string }>('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          })
          set({ accessToken: data.accessToken, isLoggedIn: true })
        } catch {
          get().clearAuth()
        }
      },
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
          motherName: data.motherName || get().motherName,
          babyName: data.babyName || get().babyName,
          phase,
          motherProfile: profile,
        });
      },
      completeReception: () => set({ onboardingDone: true }),
      resetOnboarding: () => set({ onboardingDone: false, motherProfile: null }),
      completeSocialOnboarding: () => set({ socialOnboardingDone: true }),
      // UI actions
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      toggleFeedSide: () =>
        set((s) => ({ lastFeedSide: s.lastFeedSide === 'left' ? 'right' : 'left' })),
      setFeedSide: (side) => set({ lastFeedSide: side }),
      saveVerse: (ref) =>
        set((s) => {
          const uid = s.currentUserId ?? '__anon__';
          const current = s.versesByUser[uid] ?? [];
          if (current.includes(ref)) return {};
          // If the verse was in the __legacy__ bucket, remove it from there
          // so the progressive migration moves it to the current user's bucket.
          const legacy = s.versesByUser['__legacy__'] ?? [];
          const newLegacy = legacy.filter((r) => r !== ref);
          const newVersesByUser: Record<string, string[]> = {
            ...s.versesByUser,
            [uid]: [...current, ref],
          };
          if (newLegacy.length !== legacy.length) {
            newVersesByUser['__legacy__'] = newLegacy;
          }
          if (uid !== '__anon__') {
            apiFetch('/users/me/verses', { method: 'POST', body: JSON.stringify({ verseRef: ref }) }).catch(() => {
              set((s) => ({
                versesByUser: {
                  ...s.versesByUser,
                  [uid]: (s.versesByUser[uid] ?? []).filter((r) => r !== ref),
                },
              }));
            });
          }
          return { versesByUser: newVersesByUser };
        }),
      unsaveVerse: (ref) =>
        set((s) => {
          const uid = s.currentUserId ?? '__anon__';
          const current = s.versesByUser[uid] ?? [];
          if (uid !== '__anon__') {
            apiFetch(`/users/me/verses/${encodeURIComponent(ref)}`, { method: 'DELETE' }).catch(() => {
              set((s) => ({
                versesByUser: {
                  ...s.versesByUser,
                  [uid]: [...(s.versesByUser[uid] ?? []), ref],
                },
              }));
            });
          }
          return { versesByUser: { ...s.versesByUser, [uid]: current.filter((r) => r !== ref) } };
        }),
      setPendingShareContent: (content) => set({ pendingShareContent: content }),
      savePrayer: (ref, text) =>
        set((s) => {
          const uid = s.currentUserId ?? '__anon__';
          const userPrayers = s.prayersByUser[uid] ?? {};
          return {
            prayersByUser: {
              ...s.prayersByUser,
              [uid]: { ...userPrayers, [ref]: text },
            },
          };
        }),
    }),
    {
      name: 'mothers-team-v3',
      storage: createJSONStorage(() => safeLocalStorage),
      version: 2,
      migrate: migrateAppState,
      partialize: (state) => ({
        onboardingDone: state.onboardingDone,
        motherProfile: state.motherProfile,
        motherName: state.motherName,
        babyName: state.babyName,
        phase: state.phase,
        socialOnboardingDone: state.socialOnboardingDone,
        activeTab: state.activeTab,
        lastFeedSide: state.lastFeedSide,
        versesByUser: state.versesByUser,
        prayersByUser: state.prayersByUser,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);

// Stable fallback references — never create new objects in selector hot path
const EMPTY_VERSES: string[] = [];
const EMPTY_PRAYERS: Record<string, string> = {};

/**
 * Selector: returns the saved verse refs for the currently logged-in user.
 * Reference-stable — returns the same array until versesByUser[userId] changes.
 * The __legacy__ bucket is consumed eagerly in setAuth, so this reader never
 * has to merge derivatives at read time.
 */
export const selectSavedVerses = (s: AppState): string[] =>
  s.versesByUser[s.currentUserId ?? '__anon__'] ?? EMPTY_VERSES

/**
 * Selector: returns the prayer map (ref → text) for the current user.
 */
export function selectPrayersByVerse(s: AppState): Record<string, string> {
  const uid = s.currentUserId ?? '__anon__';
  return s.prayersByUser[uid] ?? EMPTY_PRAYERS;
}
