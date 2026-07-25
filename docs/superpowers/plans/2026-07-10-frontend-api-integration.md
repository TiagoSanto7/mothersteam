# Frontend → Backend API Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the React frontend to the local Fastify/MySQL backend, replacing all Zustand fake-data with real API calls via React Query, while keeping access tokens in memory only (never localStorage).

**Architecture:** Vite proxy routes `/api/*` → `http://localhost:3001/*` (drops `/api` prefix). A central `apiFetch` wrapper attaches the Bearer token from Zustand memory and auto-refreshes on 401 via the HttpOnly cookie. React Query (`@tanstack/react-query`) handles caching and mutations for every server-owned data collection. Zustand retains only UI state (activeTab, selectedDate, lastFeedSide) and auth-profile state (onboardingDone, motherProfile, followedCommunityIds). Access tokens are excluded from the Zustand `persist` layer via `partialize`.

**Tech Stack:** React 18, Zustand 5 (persist + partialize), @tanstack/react-query 5, Fastify 4 (local, port 3001), MySQL 8 (Docker, port 3307), Vite proxy, vitest + @testing-library/react.

**Security constraint (mandatory):** Access tokens MUST live in Zustand memory only — never written to `localStorage` or `sessionStorage`. Refresh tokens stay in the HttpOnly cookie managed by the server. The frontend never reads or stores refresh tokens.

---

## File Map

**New files:**
- `src/lib/api.ts` — fetch wrapper with Bearer auth + auto-refresh on 401
- `src/lib/types.ts` — API response shape types (ApiPost, ApiChat, etc.)
- `src/lib/helpers.ts` — relativeTime(), buildPhase(), apiPostToCommunityPost(), apiCommunityToCommunity(), apiChatToChat()

**Modified files:**
- `vite.config.ts` — add `/api` proxy
- `src/main.tsx` — wrap in QueryClientProvider
- `src/store/useAppStore.ts` — strip server-data state, add auth slice (accessToken NOT persisted via partialize)
- `src/App.tsx` — session restore on mount, unread badge counts from query cache
- `src/components/auth/LoginScreen.tsx` — useMutation POST /auth/login
- `src/components/layout/SideDrawer.tsx` — logout calls API, remove post-count (store field gone)
- `src/components/comunidade/ComunidadeScreen.tsx` — useQuery for posts
- `src/components/comunidade/CreatePostScreen.tsx` — useMutation POST /posts
- `src/components/comunidade/ComunidadesScreen.tsx` — useQuery for communities, keep Zustand for followedCommunityIds
- `src/components/notifications/NotificationsScreen.tsx` — useQuery + useMutation
- `src/components/chat/ChatListScreen.tsx` — useQuery for chats
- `src/components/chat/ChatScreen.tsx` — useQuery for messages + useMutation to send
- `src/components/home/RoutineTimeline.tsx` — useQuery + toggle mutation
- `src/components/home/AddRoutineModal.tsx` — useMutation
- `src/components/baby/BabyTimeline.tsx` — useQuery
- `src/components/baby/DiaperCard.tsx` — useMutation
- `src/components/baby/SleepCard.tsx` — useMutation
- Test files (updated alongside their component)

---

## Task 1: Foundation — proxy + api.ts + types.ts + helpers.ts + QueryClientProvider

**Files:**
- Modify: `vite.config.ts`
- Create: `src/lib/api.ts`
- Create: `src/lib/types.ts`
- Create: `src/lib/helpers.ts`
- Modify: `src/main.tsx`

- [ ] **Step 1: Add Vite proxy**

Edit `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
})
```

- [ ] **Step 2: Create API response types**

Create `src/lib/types.ts`:

```ts
export interface ApiUser {
  id: string
  email: string
  name: string
  babyName?: string | null
  pregnancyStage: 'pregnant' | 'postpartum'
  pregnancyWeek?: number | null
  babyAgeInDays?: number | null
  onboardingDone: boolean
  profileKey?: string | null
  archetypeKey?: string | null
}

export interface ApiPost {
  id: string
  content: string
  category: 'gestação' | 'pós-parto' | 'amamentação' | 'saúde mental'
  imageUrl?: string | null
  authorId: string
  author: { id: string; name: string }
  communityId?: string | null
  isRepost: boolean
  repostFromId?: string | null
  _count: { likes: number; comments: number }
  createdAt: string
}

export interface ApiCommunity {
  id: string
  name: string
  description: string
  category: 'gestação' | 'pós-parto' | 'amamentação' | 'saúde mental'
  colorKey: 'gold' | 'terracotta' | 'warm' | 'linen' | 'cream'
  creatorId: string
  _count: { members: number }
  createdAt: string
}

export interface ApiNotification {
  id: string
  type: 'like' | 'follow' | 'comment'
  text: string
  read: boolean
  recipientId: string
  createdAt: string
}

export interface ApiMessage {
  id: string
  content: string
  chatId: string
  senderId: string
  sender: { id: string; name: string }
  sharedPostId?: string | null
  sharedPostAuthor?: string | null
  sharedPostExcerpt?: string | null
  read: boolean
  createdAt: string
}

export interface ApiChat {
  id: string
  participants: Array<{ userId: string; chatId: string; user: { id: string; name: string } }>
  messages: ApiMessage[]
  createdAt: string
}

export interface ApiRoutineEntry {
  id: string
  time: string
  date: string
  title: string
  category: 'task' | 'appointment' | 'medication'
  done: boolean
  userId: string
  createdAt: string
}

export interface ApiBabyEntry {
  id: string
  time: string
  type: 'sleep' | 'feed' | 'diaper'
  detail: string
  userId: string
  createdAt: string
}

export interface PaginatedResult<T> {
  items: T[]
  hasMore: boolean
}
```

- [ ] **Step 3: Create helpers**

Create `src/lib/helpers.ts`:

```ts
import type { ApiPost, ApiCommunity, ApiChat, ApiUser } from './types'
import type { CommunityPost, Community, Chat, PregnancyPhase } from '../types'

export function relativeTime(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function buildPhase(user: Pick<ApiUser, 'pregnancyStage' | 'pregnancyWeek' | 'babyAgeInDays'>): PregnancyPhase {
  if (user.pregnancyStage === 'pregnant') {
    return { stage: 'pregnant', week: user.pregnancyWeek ?? 28 }
  }
  return { stage: 'postpartum', ageInDays: user.babyAgeInDays ?? 0 }
}

export function apiPostToCommunityPost(post: ApiPost): CommunityPost {
  return {
    id: post.id,
    category: post.category,
    author: post.author.name,
    content: post.content,
    imageUrl: post.imageUrl ?? undefined,
    likes: post._count.likes,
    replies: post._count.comments,
    time: relativeTime(post.createdAt),
    communityId: post.communityId ?? undefined,
    isRepost: post.isRepost,
  }
}

export function apiCommunityToCommunity(c: ApiCommunity): Community {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    category: c.category,
    memberCount: c._count.members,
    colorKey: c.colorKey,
  }
}

export function apiChatToChat(c: ApiChat, currentUserId: string): Chat {
  const other = c.participants.find((p) => p.userId !== currentUserId)
  const lastMsg = c.messages[0]
  return {
    id: c.id,
    with: other?.user.name ?? 'Usuária',
    lastMessage: lastMsg?.content ?? '',
    time: lastMsg ? relativeTime(lastMsg.createdAt) : relativeTime(c.createdAt),
    unread: lastMsg && lastMsg.senderId !== currentUserId && !lastMsg.read ? 1 : 0,
    messages: [],
  }
}
```

- [ ] **Step 4: Create api.ts**

Create `src/lib/api.ts`:

```ts
import { useAppStore } from '../store/useAppStore'

const BASE = '/api'

export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API ${status}`)
  }
}

let refreshPromise: Promise<string | null> | null = null

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
    if (!res.ok) return null
    const { accessToken } = (await res.json()) as { accessToken: string }
    useAppStore.getState().setAccessToken(accessToken)
    return accessToken
  } catch {
    return null
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAppStore.getState().accessToken
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' })

  if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
    if (!refreshPromise) refreshPromise = doRefresh()
    const newToken = await refreshPromise
    refreshPromise = null

    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      const retry = await fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' })
      if (!retry.ok) throw new ApiError(retry.status, await retry.json().catch(() => ({})))
      if (retry.status === 204) return undefined as T
      return retry.json() as T
    }

    useAppStore.getState().clearAuth()
    throw new ApiError(401, { message: 'Session expired' })
  }

  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})))
  if (res.status === 204) return undefined as T
  return res.json() as T
}
```

- [ ] **Step 5: Install @tanstack/react-query**

Run: `npm install @tanstack/react-query`

Expected: `added X packages`

- [ ] **Step 6: Wrap app in QueryClientProvider**

Edit `src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 7: Run existing tests to get baseline**

Run: `npx vitest run`

Note failures — many will exist until the store is refactored. Record the count.

- [ ] **Step 8: Commit foundation**

```bash
git add vite.config.ts src/main.tsx src/lib/api.ts src/lib/types.ts src/lib/helpers.ts
git commit -m "feat: add api.ts, types.ts, helpers.ts, Vite proxy, QueryClientProvider"
```

---

## Task 2: Zustand Store Refactor

**Files:**
- Modify: `src/store/useAppStore.ts`

The new store keeps only UI + auth state. Server-data fields (communityPosts, routineEntries, babyEntries, diaperCount, chats, notifications, postComments, communities) are removed. Auth tokens are excluded from persist via `partialize`.

- [ ] **Step 1: Rewrite useAppStore.ts**

Replace `src/store/useAppStore.ts` entirely:

```ts
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
```

Note: store key changed from `mothers-team-v2` to `mothers-team-v3` to avoid stale persisted data conflicts.

- [ ] **Step 2: Fix App.test.tsx to not use removed store fields**

Replace `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { useAppStore } from './store/useAppStore';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  useAppStore.setState({
    isLoggedIn: true,
    onboardingDone: true,
    activeTab: 'home',
    motherName: 'Mariana',
    phase: { stage: 'pregnant', week: 28 },
    followedCommunityIds: [],
    motherProfile: null,
  });
});

describe('App routing', () => {
  it('home tab renders ComunidadeScreen (Para Você tab visible)', () => {
    useAppStore.setState({ activeTab: 'home' });
    render(<App />, { wrapper });
    expect(screen.getByRole('button', { name: /para você/i })).toBeInTheDocument();
  });

  it('rotina tab renders HomeScreen (Para Você tab absent)', () => {
    useAppStore.setState({ activeTab: 'rotina' });
    render(<App />, { wrapper });
    expect(screen.queryByRole('button', { name: /para você/i })).not.toBeInTheDocument();
  });

  it('comunidade tab renders ComunidadeScreen (alias for stale state)', () => {
    useAppStore.setState({ activeTab: 'comunidade' });
    render(<App />, { wrapper });
    expect(screen.getByRole('button', { name: /para você/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Fix SideDrawer.test.tsx**

Remove `communityPosts` from beforeEach and remove the post-count test. The SideDrawer will no longer show post count (the communityPosts field no longer exists in the store).

Replace `src/components/layout/SideDrawer.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SideDrawer } from './SideDrawer';
import { useAppStore } from '../../store/useAppStore';

vi.mock('../../lib/api', () => ({ apiFetch: vi.fn().mockResolvedValue({ ok: true }) }));

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      ...actual.motion,
      div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
        <div {...props}>{children}</div>
      ),
    },
  };
});

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  useAppStore.setState({ motherName: 'Mariana', currentUserId: 'u1' });
});

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onOpenProfile: vi.fn(),
  onOpenSettings: vi.fn(),
};

describe('SideDrawer', () => {
  it('renders the drawer panel when isOpen is true', () => {
    render(<SideDrawer {...defaultProps} />, { wrapper });
    expect(screen.getByTestId('side-drawer')).toBeInTheDocument();
  });

  it('does not render the drawer panel when isOpen is false', () => {
    render(<SideDrawer {...defaultProps} isOpen={false} />, { wrapper });
    expect(screen.queryByTestId('side-drawer')).not.toBeInTheDocument();
  });

  it('renders the user name', () => {
    render(<SideDrawer {...defaultProps} />, { wrapper });
    expect(screen.getByText('Mariana')).toBeInTheDocument();
  });

  it('renders Perfil navigation item', () => {
    render(<SideDrawer {...defaultProps} />, { wrapper });
    expect(screen.getByRole('button', { name: /perfil/i })).toBeInTheDocument();
  });

  it('renders Configurações navigation item', () => {
    render(<SideDrawer {...defaultProps} />, { wrapper });
    expect(screen.getByRole('button', { name: /configurações/i })).toBeInTheDocument();
  });

  it('renders Sair da conta button', () => {
    render(<SideDrawer {...defaultProps} />, { wrapper });
    expect(screen.getByRole('button', { name: /sair da conta/i })).toBeInTheDocument();
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    render(<SideDrawer {...defaultProps} onClose={onClose} />, { wrapper });
    fireEvent.click(screen.getByTestId('drawer-overlay'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Fechar menu button is clicked', () => {
    const onClose = vi.fn();
    render(<SideDrawer {...defaultProps} onClose={onClose} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /fechar menu/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose and onOpenProfile when Perfil is clicked', () => {
    const onClose = vi.fn();
    const onOpenProfile = vi.fn();
    render(<SideDrawer {...defaultProps} onClose={onClose} onOpenProfile={onOpenProfile} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /perfil/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onOpenProfile).toHaveBeenCalledOnce();
  });

  it('calls onClose and onOpenSettings when Configurações is clicked', () => {
    const onClose = vi.fn();
    const onOpenSettings = vi.fn();
    render(<SideDrawer {...defaultProps} onClose={onClose} onOpenSettings={onOpenSettings} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it('calls onClose when Sair da conta is clicked', () => {
    const onClose = vi.fn();
    render(<SideDrawer {...defaultProps} onClose={onClose} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /sair da conta/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/store src/App.test.tsx src/components/layout/SideDrawer.test.tsx`

Expected: store tests pass, App tests pass, SideDrawer tests pass. Many other tests will still fail — that's expected at this stage.

- [ ] **Step 5: Commit**

```bash
git add src/store/useAppStore.ts src/App.test.tsx src/components/layout/SideDrawer.test.tsx
git commit -m "refactor: strip server-data from Zustand store, add auth slice with partialize"
```

---

## Task 3: Auth Flow — Login + Session Restore + Logout

**Files:**
- Modify: `src/components/auth/LoginScreen.tsx`
- Modify: `src/components/layout/SideDrawer.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update LoginScreen.tsx**

Replace `src/components/auth/LoginScreen.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiUser } from '../../lib/types';

export function LoginScreen() {
  const setAuth = useAppStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showComingSoon, setShowComingSoon] = useState(false);

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: () =>
      apiFetch<{ accessToken: string; user: ApiUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      }),
    onSuccess: ({ accessToken, user }) => {
      setAuth(accessToken, user);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutate();
  }

  const errorMsg =
    isError && error instanceof ApiError && error.status === 401
      ? 'E-mail ou senha incorretos. Tente novamente.'
      : isError
      ? 'Erro de conexão. Tente novamente.'
      : '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-sara-cream sm:bg-[#EDE6DC]">
      <div className="w-full min-h-screen sm:w-[390px] sm:min-h-[844px] sm:max-h-[844px] bg-sara-cream flex flex-col items-center justify-center px-8 gap-8 sm:rounded-[44px] sm:shadow-2xl overflow-y-auto">
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-sara-terracotta flex items-center justify-center text-2xl">
            🤱
          </div>
          <h1 className="text-xl font-bold text-graphite">Mothers Team</h1>
          <p className="text-xs text-graphite-muted text-center">
            Seu espaço de cuidado e acolhimento na maternidade
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-graphite-muted" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-sara-muted focus:outline-none focus:border-sara-gold"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-graphite-muted" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-sara-muted focus:outline-none focus:border-sara-gold"
            />
          </div>

          {errorMsg && (
            <p role="alert" className="text-xs text-sara-terracotta text-center">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
            disabled={!email || !password || isPending}
          >
            {isPending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <div className="w-full flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-sara-linen" />
            <span className="text-xs text-graphite-muted">ou</span>
            <div className="flex-1 h-px bg-sara-linen" />
          </div>

          <button
            type="button"
            onClick={() => setShowComingSoon(true)}
            className="w-full py-3 rounded-2xl bg-white border border-sara-linen text-sm font-medium text-graphite flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continuar com Google
          </button>

          <button
            type="button"
            onClick={() => setShowComingSoon(true)}
            className="w-full py-3 rounded-2xl bg-graphite text-white text-sm font-medium flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <svg width="17" height="20" viewBox="0 0 17 20" fill="currentColor">
              <path d="M13.636 10.595c-.022-2.59 2.117-3.844 2.215-3.909-1.207-1.764-3.083-2.006-3.75-2.031-1.594-.163-3.117.946-3.925.946-.808 0-2.055-.924-3.38-.9-1.737.025-3.341 1.013-4.233 2.566-1.806 3.132-.463 7.771 1.297 10.312.862 1.24 1.89 2.637 3.237 2.585 1.301-.052 1.793-.838 3.367-.838 1.574 0 2.02.838 3.394.812 1.397-.025 2.284-1.265 3.138-2.511.99-1.44 1.396-2.833 1.42-2.905-.031-.013-2.727-1.046-2.78-4.127zM11.178 3.044C11.888 2.18 12.37.997 12.237 0c-1.027.042-2.27.684-3.007 1.548-.659.759-1.237 1.974-1.081 3.138 1.147.088 2.32-.583 3.029-1.642z"/>
            </svg>
            Continuar com Apple
          </button>

          {showComingSoon && (
            <p className="text-xs text-sara-gold text-center font-medium">
              🚀 Login social disponível em breve
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update SideDrawer.tsx to use clearAuth + API logout**

In `src/components/layout/SideDrawer.tsx`, change the logout handler. Read the current file first. Find the logout logic and replace it with:

```tsx
// Add these imports at the top:
import { apiFetch } from '../../lib/api';

// Change this in the component:
const clearAuth = useAppStore((s) => s.clearAuth);
// Remove: const logout = useAppStore((s) => s.logout);

// Replace handleItem(logout) with:
function handleLogout() {
  onClose();
  apiFetch('/auth/logout', { method: 'POST' }).catch(() => {/* ignore */});
  clearAuth();
}

// And in the Sair da conta button:
onClick={handleLogout}
// Instead of: onClick={() => handleItem(logout)}
```

Also remove `communityPosts` from the store selector and delete the post count display. Remove:
```tsx
const communityPosts = useAppStore((s) => s.communityPosts);
// and:
const postCount = communityPosts.filter(...).length;
// and the JSX that renders the post count
```

- [ ] **Step 3: Update App.tsx with session restore**

Replace `src/App.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from './store/useAppStore';
import type { TabId } from './types';
import type { ApiNotification, ApiChat } from './lib/types';
import { apiFetch } from './lib/api';
import type { ApiUser } from './lib/types';
import { buildPhase } from './lib/helpers';
import { MobileShell } from './components/layout/MobileShell';
import { HomeScreen } from './components/home/HomeScreen';
import { BabyScreen } from './components/baby/BabyScreen';
import { MaeIAScreen } from './components/maeIA/MaeIAScreen';
import { ComunidadeScreen } from './components/comunidade/ComunidadeScreen';
import { ShoppingScreen } from './components/shopping/ShoppingScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { OnboardingScreen } from './components/auth/OnboardingScreen';
import { ProfileScreen } from './components/profile/ProfileScreen';
import { SettingsScreen } from './components/profile/SettingsScreen';
import { NotificationsScreen } from './components/notifications/NotificationsScreen';
import { ChatListScreen } from './components/chat/ChatListScreen';

export default function App() {
  const isLoggedIn     = useAppStore((s) => s.isLoggedIn);
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const activeTab      = useAppStore((s) => s.activeTab);
  const currentUserId  = useAppStore((s) => s.currentUserId);
  const setAccessToken = useAppStore((s) => s.setAccessToken);
  const setAuth        = useAppStore((s) => s.setAuth);

  const [restoring,         setRestoring]         = useState(true);
  const [drawerOpen,        setDrawerOpen]        = useState(false);
  const [showProfile,       setShowProfile]       = useState(false);
  const [showSettings,      setShowSettings]      = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChat,          setShowChat]          = useState(false);

  // Session restore: try refresh cookie on first load
  useEffect(() => {
    if (useAppStore.getState().isLoggedIn) {
      setRestoring(false);
      return;
    }
    (async () => {
      try {
        const { accessToken } = await apiFetch<{ accessToken: string }>('/auth/refresh', { method: 'POST' });
        setAccessToken(accessToken);
        const user = await apiFetch<ApiUser>('/auth/me');
        useAppStore.getState().setAuth(accessToken, user);
      } catch {
        // no valid session — stay at login
      } finally {
        setRestoring(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiFetch<ApiNotification[]>('/notifications'),
    enabled: isLoggedIn,
    staleTime: 60_000,
  });

  const { data: chats } = useQuery({
    queryKey: ['chats'],
    queryFn: () => apiFetch<ApiChat[]>('/chats'),
    enabled: isLoggedIn,
    staleTime: 30_000,
  });

  if (restoring) return null;
  if (!isLoggedIn) return <LoginScreen />;
  if (!onboardingDone) return <OnboardingScreen />;

  const unreadNotifs = (notifications ?? []).filter((n) => !n.read).length;
  const unreadChats  = (chats ?? []).filter((c) => {
    const last = c.messages[0];
    return last && last.senderId !== currentUserId && !last.read;
  }).length;

  const isHomeTab = activeTab === 'home' || activeTab === 'comunidade';

  const headerRightSlot = isHomeTab ? (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setShowChat(true)}
        aria-label="Mensagens"
        className="relative w-9 h-9 rounded-xl bg-white/70 backdrop-blur-sm border border-white/50 flex items-center justify-center"
      >
        <MessageSquare size={18} className="text-graphite-light" strokeWidth={1.8} />
        {unreadChats > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-sara-gold rounded-full flex items-center justify-center text-[9px] font-bold text-white">
            {unreadChats}
          </span>
        )}
      </button>
      <button
        onClick={() => setShowNotifications(true)}
        aria-label="Notificações"
        className="relative w-9 h-9 rounded-xl bg-white/70 backdrop-blur-sm border border-white/50 flex items-center justify-center"
      >
        <Bell size={18} className="text-graphite-light" strokeWidth={1.8} />
        {unreadNotifs > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-sara-terracotta rounded-full flex items-center justify-center text-[9px] font-bold text-white">
            {unreadNotifs}
          </span>
        )}
      </button>
    </div>
  ) : undefined;

  const screens: Record<TabId, React.ReactElement> = {
    home:       <ComunidadeScreen />,
    maeIA:      <MaeIAScreen />,
    baby:       <BabyScreen />,
    rotina:     <HomeScreen onOpenProfile={() => setShowProfile(true)} />,
    comunidade: <ComunidadeScreen />,
    shopping:   <ShoppingScreen />,
  };

  return (
    <>
      <MobileShell
        drawerOpen={drawerOpen}
        onOpenDrawer={() => setDrawerOpen(true)}
        onCloseDrawer={() => setDrawerOpen(false)}
        onOpenProfile={() => setShowProfile(true)}
        onOpenSettings={() => setShowSettings(true)}
        headerRightSlot={headerRightSlot}
      >
        {screens[activeTab]}
      </MobileShell>

      {showProfile && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <ProfileScreen onClose={() => setShowProfile(false)} />
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <SettingsScreen
            onBack={() => setShowSettings(false)}
            onClose={() => setShowSettings(false)}
          />
        </div>
      )}

      {showNotifications && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <NotificationsScreen onBack={() => setShowNotifications(false)} />
        </div>
      )}

      {showChat && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <ChatListScreen onBack={() => setShowChat(false)} />
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Run auth-related tests**

Run: `npx vitest run src/App.test.tsx src/components/layout/SideDrawer.test.tsx`

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/LoginScreen.tsx src/components/layout/SideDrawer.tsx src/App.tsx
git commit -m "feat: real auth — POST /auth/login, session restore via refresh cookie, API logout"
```

---

## Task 4: Posts Feed + CreatePost

**Files:**
- Modify: `src/components/comunidade/ComunidadeScreen.tsx`
- Modify: `src/components/comunidade/CreatePostScreen.tsx`
- Modify: `src/components/comunidade/CreatePostScreen.test.tsx`

- [ ] **Step 1: Update ComunidadeScreen.tsx**

In `src/components/comunidade/ComunidadeScreen.tsx`, replace the store-based posts with a query. Change the top of the component:

```tsx
// Remove:
// import { useAppStore } from '../../store/useAppStore';
// const communityPosts = useAppStore((s) => s.communityPosts);
// const repost = useAppStore((s) => s.repost);

// Add:
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { PaginatedResult, ApiPost } from '../../lib/types';
import { apiPostToCommunityPost } from '../../lib/helpers';
```

Inside `ComunidadeScreen()`:

```tsx
export function ComunidadeScreen() {
  const followedCommunityIds = useAppStore((s) => s.followedCommunityIds);
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => apiFetch<PaginatedResult<ApiPost>>('/posts'),
    enabled: isLoggedIn,
  });

  const repostMutation = useMutation({
    mutationFn: (postId: string) =>
      apiFetch(`/posts/${postId}/repost`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });

  const communityPosts = (data?.items ?? []).map(apiPostToCommunityPost);

  // ... rest of component unchanged, but:
  // - repost(post) → repostMutation.mutate(post.id)
  // - loading state: if (isLoading) return <LoadingSpinner />
```

Add a minimal loading state before the main return:

```tsx
  if (isLoading && communityPosts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-sara-gold border-t-transparent animate-spin" />
      </div>
    );
  }
```

In `PostCard`, the like mutation is local-first (toggled in local state) + fires the API in the background. Add `useMutation` for like inside PostCard:

```tsx
// Inside PostCard component:
const likeMutation = useMutation({
  mutationFn: (liked: boolean) =>
    apiFetch(`/posts/${post.id}/like`, { method: liked ? 'POST' : 'DELETE' }),
});

// Update the like button handler:
onClick={(e) => {
  e.stopPropagation();
  const next = !liked;
  setLiked(next);
  likeMutation.mutate(next);
}}
```

- [ ] **Step 2: Update CreatePostScreen.tsx**

Replace the `addCommunityPost` store action with a mutation:

```tsx
// Remove:
// const addCommunityPost = useAppStore((s) => s.addCommunityPost);

// Add:
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { ApiPost } from '../../lib/types';
```

Inside `CreatePostScreen`:

```tsx
const queryClient = useQueryClient();

const { mutate: publish, isPending } = useMutation({
  mutationFn: () =>
    apiFetch<ApiPost>('/posts', {
      method: 'POST',
      body: JSON.stringify({ content: content.trim(), category, imageUrl: imagePreview ?? undefined }),
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    onBack();
  },
});

function handlePublish() {
  if (!content.trim() && !imagePreview) return;
  publish();
}
```

Disable the Publicar button while pending:

```tsx
disabled={(!content.trim() && !imagePreview) || isPending}
```

- [ ] **Step 3: Update CreatePostScreen.test.tsx**

The tests that checked `useAppStore.getState().communityPosts` will fail because the store no longer has that field. Replace with mock-based tests.

Replace `src/components/comunidade/CreatePostScreen.test.tsx`:

```tsx
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreatePostScreen } from './CreatePostScreen';
import { useAppStore } from '../../store/useAppStore';

const mockApiFetch = vi.fn();
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

class MockFileReader {
  result = 'data:image/png;base64,fakedata';
  onload: ((e: any) => void) | null = null;
  readAsDataURL(_file: File) { this.onload?.({ target: this }); }
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  useAppStore.setState({ motherName: 'Mariana', isLoggedIn: true });
  vi.stubGlobal('FileReader', MockFileReader);
  mockApiFetch.mockResolvedValue({ id: 'new-post', content: 'test', category: 'saúde mental', author: { id: 'u1', name: 'Mariana' }, _count: { likes: 0, comments: 0 }, createdAt: new Date().toISOString(), authorId: 'u1', isRepost: false });
});

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('CreatePostScreen', () => {
  it('renders textarea and publish button', () => {
    render(<CreatePostScreen onBack={vi.fn()} />, { wrapper });
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /publicar/i })).toBeInTheDocument();
  });

  it('renders Adicionar foto button', () => {
    render(<CreatePostScreen onBack={vi.fn()} />, { wrapper });
    expect(screen.getByRole('button', { name: /adicionar foto/i })).toBeInTheDocument();
  });

  it('shows image preview after file is selected', async () => {
    render(<CreatePostScreen onBack={vi.fn()} />, { wrapper });
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File(['hello'], 'photo.png', { type: 'image/png' });
    await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });
    expect(screen.getByRole('img', { name: 'Preview' })).toHaveAttribute('src', 'data:image/png;base64,fakedata');
  });

  it('removes preview when X button is clicked', async () => {
    render(<CreatePostScreen onBack={vi.fn()} />, { wrapper });
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File(['hello'], 'photo.png', { type: 'image/png' });
    await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });
    fireEvent.click(screen.getByRole('button', { name: 'Remover imagem' }));
    expect(screen.queryByRole('img', { name: 'Preview' })).not.toBeInTheDocument();
  });

  it('calls apiFetch with content and category on publish', async () => {
    render(<CreatePostScreen onBack={vi.fn()} />, { wrapper });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Meu desabafo' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /publicar/i })); });
    expect(mockApiFetch).toHaveBeenCalledWith('/posts', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body);
    expect(body.content).toBe('Meu desabafo');
  });

  it('renders Cancelar button', () => {
    render(<CreatePostScreen onBack={() => {}} />, { wrapper });
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('enables Publicar when only imagePreview is set', async () => {
    render(<CreatePostScreen onBack={() => {}} />, { wrapper });
    const input = screen.getByTestId('file-input');
    await act(async () => { fireEvent.change(input, { target: { files: [new File(['img'], 'photo.png', { type: 'image/png' })] } }); });
    expect(screen.getAllByRole('button', { name: /publicar/i })[0]).not.toBeDisabled();
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/comunidade/ComunidadeScreen.test.tsx src/components/comunidade/CreatePostScreen.test.tsx`

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/comunidade/ComunidadeScreen.tsx src/components/comunidade/CreatePostScreen.tsx src/components/comunidade/CreatePostScreen.test.tsx
git commit -m "feat: posts feed and create post use API via React Query"
```

---

## Task 5: Communities

**Files:**
- Modify: `src/components/comunidade/ComunidadesScreen.tsx`
- Modify: `src/components/comunidade/ComunidadesScreen.test.tsx`

- [ ] **Step 1: Update ComunidadesScreen.tsx**

Replace the store-based communities with a query. `followedCommunityIds` stays in Zustand (optimistic local toggle):

```tsx
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { CommunityCard } from './CommunityCard';
import { apiFetch } from '../../lib/api';
import type { ApiCommunity } from '../../lib/types';
import { apiCommunityToCommunity } from '../../lib/helpers';
import type { Community, ArchetypeKey, PregnancyPhase } from '../../types';
import { useState } from 'react';

type SubFilter = 'seguindo' | 'sugestoes';

function getSuggestionScore(community: Community, phase: PregnancyPhase, archetypeKey: ArchetypeKey | undefined): number {
  let score = 0;
  if (phase.stage === 'pregnant' && community.category === 'gestação') score += 3;
  if (phase.stage === 'postpartum' && (community.category === 'pós-parto' || community.category === 'amamentação')) score += 3;
  if (archetypeKey === 'ana' && community.category === 'saúde mental') score += 2;
  if (archetypeKey === 'rute' && community.id === 'maes-solo') score += 2;
  return score;
}

export function ComunidadesScreen() {
  const followedCommunityIds = useAppStore((s) => s.followedCommunityIds);
  const joinCommunity  = useAppStore((s) => s.joinCommunity);
  const leaveCommunity = useAppStore((s) => s.leaveCommunity);
  const phase          = useAppStore((s) => s.phase);
  const motherProfile  = useAppStore((s) => s.motherProfile);
  const isLoggedIn     = useAppStore((s) => s.isLoggedIn);
  const [subFilter, setSubFilter] = useState<SubFilter>('seguindo');

  const { data: apiCommunities = [] } = useQuery({
    queryKey: ['communities'],
    queryFn: () => apiFetch<ApiCommunity[]>('/communities'),
    enabled: isLoggedIn,
  });

  const communities = apiCommunities.map(apiCommunityToCommunity);

  const joinMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/communities/${id}/join`, { method: 'POST' }),
  });

  const leaveMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/communities/${id}/join`, { method: 'DELETE' }),
  });

  function handleToggle(id: string) {
    if (followedCommunityIds.includes(id)) {
      leaveCommunity(id);
      leaveMutation.mutate(id);
    } else {
      joinCommunity(id);
      joinMutation.mutate(id);
    }
  }

  const followed    = communities.filter((c) => followedCommunityIds.includes(c.id));
  const suggestions = communities
    .filter((c) => !followedCommunityIds.includes(c.id))
    .sort((a, b) =>
      getSuggestionScore(b, phase, motherProfile?.archetypeKey) -
      getSuggestionScore(a, phase, motherProfile?.archetypeKey)
    );
  const displayList = subFilter === 'seguindo' ? followed : suggestions;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 px-4">
        {(['seguindo', 'sugestoes'] as SubFilter[]).map((f) => {
          const label = f === 'seguindo' ? 'Seguindo' : 'Sugestões';
          return (
            <button
              key={f}
              aria-pressed={subFilter === f}
              onClick={() => setSubFilter(f)}
              aria-label={label}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                subFilter === f
                  ? 'bg-sara-gold text-white'
                  : 'bg-white/70 text-graphite-muted border border-white/50'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 px-4">
        {displayList.length === 0 ? (
          <p className="text-sm text-graphite-muted text-center py-8">
            {subFilter === 'seguindo'
              ? 'Você ainda não segue nenhuma comunidade. Explore as sugestões!'
              : 'Todas as comunidades disponíveis já estão no seu feed.'}
          </p>
        ) : (
          displayList.map((community) => (
            <CommunityCard
              key={community.id}
              community={community}
              isFollowing={followedCommunityIds.includes(community.id)}
              onToggle={handleToggle}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update ComunidadesScreen.test.tsx**

Replace `src/components/comunidade/ComunidadesScreen.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ComunidadesScreen } from './ComunidadesScreen';
import { useAppStore } from '../../store/useAppStore';
import type { ApiCommunity } from '../../lib/types';

const MOCK_COMMUNITIES: ApiCommunity[] = [
  { id: 'amamentacao-apoio', name: 'Amamentação com Apoio', description: 'Dúvidas da amamentação.', category: 'amamentação', colorKey: 'warm', creatorId: 'u0', _count: { members: 3210 }, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'pos-parto-real',    name: 'Pós-parto Real',        description: 'O quarto trimestre.',     category: 'pós-parto',   colorKey: 'linen', creatorId: 'u0', _count: { members: 2670 }, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'saude-mental',      name: 'Saúde Mental na Maternidade', description: 'Espaço seguro.', category: 'saúde mental', colorKey: 'cream', creatorId: 'u0', _count: { members: 4120 }, createdAt: '2024-01-01T00:00:00Z' },
];

vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue(MOCK_COMMUNITIES),
  ApiError: class extends Error {},
}));

function makeWrapper(initialFollowed: string[] = ['amamentacao-apoio']) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(['communities'], MOCK_COMMUNITIES);
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  useAppStore.setState({
    followedCommunityIds: ['amamentacao-apoio'],
    phase: { stage: 'postpartum', ageInDays: 30 },
    motherProfile: null,
    isLoggedIn: true,
  });
});

describe('ComunidadesScreen', () => {
  it('renders Seguindo and Sugestões sub-filter buttons', () => {
    render(<ComunidadesScreen />, { wrapper: makeWrapper() });
    expect(screen.getByRole('button', { name: /seguindo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sugestões/i })).toBeInTheDocument();
  });

  it('shows only followed communities in Seguindo tab', () => {
    render(<ComunidadesScreen />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /seguindo/i }));
    expect(screen.getByText('Amamentação com Apoio')).toBeInTheDocument();
    expect(screen.queryByText('Pós-parto Real')).not.toBeInTheDocument();
  });

  it('shows only non-followed communities in Sugestões tab', () => {
    render(<ComunidadesScreen />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /sugestões/i }));
    expect(screen.queryByText('Amamentação com Apoio')).not.toBeInTheDocument();
    expect(screen.getByText('Pós-parto Real')).toBeInTheDocument();
  });

  it('defaults to Seguindo sub-filter', () => {
    render(<ComunidadesScreen />, { wrapper: makeWrapper() });
    expect(screen.getByRole('button', { name: /seguindo/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows empty state message when following no communities', () => {
    useAppStore.setState({ followedCommunityIds: [] });
    render(<ComunidadesScreen />, { wrapper: makeWrapper([]) });
    expect(screen.getByText(/você ainda não segue/i)).toBeInTheDocument();
  });

  it('clicking Seguir on a suggestion adds it to followedCommunityIds in store', () => {
    render(<ComunidadesScreen />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /sugestões/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /^seguir$/i })[0]);
    expect(useAppStore.getState().followedCommunityIds).toContain('pos-parto-real');
  });

  it('suggestions show postpartum communities first for a postpartum phase', () => {
    render(<ComunidadesScreen />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /sugestões/i }));
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings.indexOf('Pós-parto Real')).toBeLessThan(headings.indexOf('Saúde Mental na Maternidade'));
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/components/comunidade/ComunidadesScreen.test.tsx`

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/comunidade/ComunidadesScreen.tsx src/components/comunidade/ComunidadesScreen.test.tsx
git commit -m "feat: communities list from API, join/leave calls API + Zustand optimistic"
```

---

## Task 6: Notifications

**Files:**
- Modify: `src/components/notifications/NotificationsScreen.tsx`

- [ ] **Step 1: Update NotificationsScreen.tsx**

Replace the component:

```tsx
import { ChevronLeft, Heart, UserPlus, MessageCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiNotification } from '../../lib/types';
import { relativeTime } from '../../lib/helpers';

interface NotificationsScreenProps {
  onBack: () => void;
}

const ICON: Record<ApiNotification['type'], React.ReactElement> = {
  like:    <Heart size={16} className="text-sara-terracotta" />,
  follow:  <UserPlus size={16} className="text-sara-gold" />,
  comment: <MessageCircle size={16} className="text-sara-warm" />,
};

export function NotificationsScreen({ onBack }: NotificationsScreenProps) {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiFetch<ApiNotification[]>('/notifications'),
    enabled: isLoggedIn,
  });

  const readAllMutation = useMutation({
    mutationFn: () => apiFetch('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-sara-linen/60">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <p className="text-sm font-semibold text-graphite">Notificações</p>
        {unreadCount > 0 ? (
          <button
            onClick={() => readAllMutation.mutate()}
            className="text-[11px] text-sara-gold font-semibold"
          >
            Marcar lidas
          </button>
        ) : (
          <div className="w-20" />
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-graphite-muted">
            <p className="text-sm">Nenhuma notificação</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`flex items-start gap-3 px-4 py-4 ${!n.read ? 'bg-sara-linen' : 'bg-white'}`}
              >
                <div className="w-9 h-9 rounded-full bg-sara-cream flex items-center justify-center flex-shrink-0">
                  {ICON[n.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-graphite leading-snug">{n.text}</p>
                  <p className="text-[11px] text-graphite-muted mt-0.5">{relativeTime(n.createdAt)} atrás</p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-sara-gold flex-shrink-0 mt-1.5" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run ComunidadeScreen tests (regression check)**

Run: `npx vitest run src/components/comunidade/ComunidadeScreen.test.tsx`

These tests use Zustand state set directly and may need the QueryClientProvider wrapper. If they fail due to missing QueryClientProvider, read the test file and add the wrapper.

- [ ] **Step 3: Commit**

```bash
git add src/components/notifications/NotificationsScreen.tsx
git commit -m "feat: notifications from API, mark-all-read mutation"
```

---

## Task 7: Chats

**Files:**
- Modify: `src/components/chat/ChatListScreen.tsx`
- Modify: `src/components/chat/ChatScreen.tsx`
- Modify: `src/components/chat/ChatScreen.test.tsx`

- [ ] **Step 1: Update ChatListScreen.tsx**

```tsx
import { useState } from 'react';
import { ChevronLeft, Search, Edit } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import { ChatScreen } from './ChatScreen';
import type { ApiChat } from '../../lib/types';
import { apiChatToChat } from '../../lib/helpers';
import type { Chat } from '../../types';

interface ChatListScreenProps {
  onBack: () => void;
}

export function ChatListScreen({ onBack }: ChatListScreenProps) {
  const isLoggedIn    = useAppStore((s) => s.isLoggedIn);
  const currentUserId = useAppStore((s) => s.currentUserId) ?? '';
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

  const { data: apiChats = [] } = useQuery({
    queryKey: ['chats'],
    queryFn: () => apiFetch<ApiChat[]>('/chats'),
    enabled: isLoggedIn,
  });

  const chats = apiChats.map((c) => apiChatToChat(c, currentUserId));

  if (selectedChat) {
    return (
      <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
        <ChatScreen chat={selectedChat} onBack={() => setSelectedChat(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-sara-linen/60 flex-shrink-0">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <p className="text-sm font-semibold text-graphite">Mensagens</p>
        <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <Edit size={16} className="text-graphite" />
        </button>
      </div>

      <div className="px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
          <Search size={14} className="text-graphite-muted flex-shrink-0" />
          <input type="text" placeholder="Buscar conversa..." className="flex-1 bg-transparent text-sm text-graphite placeholder:text-graphite-muted outline-none" readOnly />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-graphite-muted">
            <p className="text-sm">Nenhuma conversa ainda</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {chats.map((chat) => (
              <li key={chat.id}>
                <button
                  onClick={() => setSelectedChat(chat)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-sara-linen transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {chat.with.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`text-sm truncate ${chat.unread > 0 ? 'font-semibold text-graphite' : 'font-medium text-graphite'}`}>{chat.with}</p>
                      <span className="text-[10px] text-graphite-muted flex-shrink-0">{chat.time}</span>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${chat.unread > 0 ? 'text-graphite font-medium' : 'text-graphite-muted'}`}>{chat.lastMessage}</p>
                  </div>
                  {chat.unread > 0 && (
                    <div className="w-5 h-5 rounded-full bg-sara-gold flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-white">{chat.unread}</span>
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update ChatScreen.tsx**

Replace with a version that fetches messages from the API and uses mutations to send:

```tsx
import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import { PostDetailScreen } from '../post/PostDetailScreen';
import { apiPostToCommunityPost } from '../../lib/helpers';
import type { ApiMessage, ApiPost, PaginatedResult } from '../../lib/types';
import type { Chat } from '../../types';

interface ChatScreenProps {
  chat: Chat;
  onBack: () => void;
}

export function ChatScreen({ chat, onBack }: ChatScreenProps) {
  const motherName    = useAppStore((s) => s.motherName);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const isLoggedIn    = useAppStore((s) => s.isLoggedIn);
  const queryClient   = useQueryClient();

  const [text, setText] = useState('');
  const [viewingPostId, setViewingPostId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messagesData } = useQuery({
    queryKey: ['messages', chat.id],
    queryFn: () => apiFetch<PaginatedResult<ApiMessage>>(`/chats/${chat.id}/messages`),
    enabled: isLoggedIn,
  });

  const messages = messagesData?.items ?? [];

  const { data: viewingApiPost } = useQuery({
    queryKey: ['post', viewingPostId],
    queryFn: () => apiFetch<ApiPost>(`/posts/${viewingPostId}`),
    enabled: viewingPostId !== null,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      apiFetch<ApiMessage>(`/chats/${chat.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', chat.id] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });

  useEffect(() => {
    if (typeof bottomRef.current?.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  function handleSend() {
    if (!text.trim()) return;
    sendMutation.mutate(text.trim());
    setText('');
  }

  if (viewingApiPost) {
    return <PostDetailScreen post={apiPostToCommunityPost(viewingApiPost)} onBack={() => setViewingPostId(null)} />;
  }

  return (
    <div className="flex flex-col w-full h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-sara-linen/60 flex-shrink-0">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <div className="w-8 h-8 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {chat.with.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-graphite truncate">{chat.with}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className="w-7 h-7 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mr-2 mt-1">
                  {msg.sender.name.charAt(0)}
                </div>
              )}
              <div className={`max-w-[72%] rounded-2xl overflow-hidden ${
                isMe
                  ? 'bg-sara-gold text-white rounded-br-sm'
                  : 'bg-white text-graphite shadow-sm rounded-bl-sm'
              }`}>
                {msg.sharedPostId ? (
                  <button
                    aria-label={`Ver post de ${msg.sharedPostAuthor}`}
                    onClick={() => setViewingPostId(msg.sharedPostId!)}
                    className="p-3 flex flex-col gap-1.5 w-full text-left"
                  >
                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${isMe ? 'text-white/70' : 'text-graphite-muted'}`}>
                      Post compartilhado
                    </p>
                    <p className={`text-[11px] font-semibold ${isMe ? 'text-white' : 'text-graphite'}`}>
                      {msg.sharedPostAuthor}
                    </p>
                    <p className={`text-xs leading-relaxed ${isMe ? 'text-white/90' : 'text-graphite-light'}`}>
                      {msg.sharedPostExcerpt}
                    </p>
                    {msg.content && (
                      <p className={`text-xs pt-1.5 border-t ${isMe ? 'border-white/30 text-white/90' : 'border-sara-linen text-graphite-light'}`}>
                        {msg.content}
                      </p>
                    )}
                  </button>
                ) : (
                  <div className="px-4 py-2.5">
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-sara-linen/60 flex-shrink-0 bg-sara-linen/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-sara-linen px-3 py-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escreva uma mensagem..."
            className="flex-1 bg-transparent text-sm text-graphite placeholder:text-sara-muted outline-none focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="w-8 h-8 rounded-full bg-sara-gold flex items-center justify-center disabled:opacity-40 transition-opacity active:scale-95"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update ChatScreen.test.tsx**

The test previously used `chats` and `communityPosts` from the Zustand store. The new ChatScreen fetches messages via `useQuery(['messages', chat.id])`. Seed the QueryClient with messages and mock the API.

Replace `src/components/chat/ChatScreen.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatScreen } from './ChatScreen';
import { useAppStore } from '../../store/useAppStore';
import type { Chat } from '../../types';
import type { ApiMessage, ApiPost, PaginatedResult } from '../../lib/types';

const mockApiFetch = vi.fn();
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

const PLAIN_CHAT: Chat = { id: '1', with: 'Ana', lastMessage: 'Olá', time: '5min', unread: 0, messages: [] };
const SHARED_CHAT: Chat = { id: '2', with: 'Fernanda', lastMessage: 'veja', time: '1h', unread: 0, messages: [] };

const PLAIN_MESSAGES: ApiMessage[] = [
  { id: '1', content: 'Olá!', chatId: '1', senderId: 'other', sender: { id: 'other', name: 'Ana' }, read: true, createdAt: '2024-01-01T10:00:00Z' },
  { id: '2', content: 'Oi!',  chatId: '1', senderId: 'u1',    sender: { id: 'u1',    name: 'Mariana' }, read: true, createdAt: '2024-01-01T10:01:00Z' },
];

const SHARED_MESSAGES: ApiMessage[] = [
  {
    id: '1', content: 'Olha isso!', chatId: '2', senderId: 'u1', sender: { id: 'u1', name: 'Mariana' },
    sharedPostId: 'p1', sharedPostAuthor: 'Juliana M.', sharedPostExcerpt: 'Puerpério é difícil',
    read: true, createdAt: '2024-01-01T09:00:00Z',
  },
  {
    id: '2', content: '', chatId: '2', senderId: 'u1', sender: { id: 'u1', name: 'Mariana' },
    sharedPostId: 'p2', sharedPostAuthor: 'Fernanda S.', sharedPostExcerpt: 'Dica de amamentação',
    read: true, createdAt: '2024-01-01T09:01:00Z',
  },
];

const MOCK_POST: ApiPost = {
  id: 'p1', content: 'Puerpério é difícil', category: 'saúde mental', authorId: 'other',
  author: { id: 'other', name: 'Juliana M.' }, isRepost: false,
  _count: { likes: 10, comments: 3 }, createdAt: '2024-01-01T08:00:00Z',
};

function makeWrapper(chatId: string, msgs: ApiMessage[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData<PaginatedResult<ApiMessage>>(['messages', chatId], { items: msgs, hasMore: false });
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  useAppStore.setState({ motherName: 'Mariana', currentUserId: 'u1', isLoggedIn: true });
  mockApiFetch.mockResolvedValue(MOCK_POST);
});

describe('ChatScreen', () => {
  it('renders plain text messages as bubbles', () => {
    render(<ChatScreen chat={PLAIN_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('1', PLAIN_MESSAGES) });
    expect(screen.getByText('Olá!')).toBeInTheDocument();
    expect(screen.getByText('Oi!')).toBeInTheDocument();
  });

  it('renders "Post compartilhado" label for sharedPost messages', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('2', SHARED_MESSAGES) });
    expect(screen.getAllByText('Post compartilhado').length).toBe(2);
  });

  it('renders the shared post author name', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('2', SHARED_MESSAGES) });
    expect(screen.getByText('Juliana M.')).toBeInTheDocument();
  });

  it('renders the shared post excerpt', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('2', SHARED_MESSAGES) });
    expect(screen.getByText('Puerpério é difícil')).toBeInTheDocument();
  });

  it('clicking shared post card fetches the post and opens PostDetailScreen', async () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('2', SHARED_MESSAGES) });
    fireEvent.click(screen.getByRole('button', { name: /ver post de Juliana M\./i }));
    await waitFor(() => expect(screen.getByText('Publicação')).toBeInTheDocument());
  });

  it('renders comment text when sharedPost message also has content', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('2', SHARED_MESSAGES) });
    expect(screen.getByText('Olha isso!')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/chat/ChatScreen.test.tsx`

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/ChatListScreen.tsx src/components/chat/ChatScreen.tsx src/components/chat/ChatScreen.test.tsx
git commit -m "feat: chats and messages from API via React Query"
```

---

## Task 8: Routine

**Files:**
- Modify: `src/components/home/RoutineTimeline.tsx`
- Modify: `src/components/home/AddRoutineModal.tsx`

- [ ] **Step 1: Update RoutineTimeline.tsx**

```tsx
import { motion } from 'framer-motion';
import { Check, Pill, Calendar, CheckSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiRoutineEntry } from '../../lib/types';
import type { RoutineEntry } from '../../types';

const CATEGORY_CONFIG = {
  medication:  { icon: Pill,        color: 'text-sara-terracotta', bg: 'bg-sara-linen' },
  appointment: { icon: Calendar,    color: 'text-sara-gold',       bg: 'bg-sara-cream' },
  task:        { icon: CheckSquare, color: 'text-sara-warm',       bg: 'bg-sara-linen' },
} as const;

function apiToRoutineEntry(e: ApiRoutineEntry): RoutineEntry {
  return { id: e.id, time: e.time, date: e.date, title: e.title, category: e.category, done: e.done };
}

function EntryCard({ entry, onToggle }: { entry: RoutineEntry; onToggle: (id: string) => void }) {
  const cfg = CATEGORY_CONFIG[entry.category];
  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/50 transition-opacity ${entry.done ? 'opacity-50' : 'opacity-100'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
        <cfg.icon size={18} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${entry.done ? 'line-through text-graphite-muted' : 'text-graphite'}`}>{entry.title}</p>
        <p className="text-xs text-graphite-muted">{entry.time}</p>
      </div>
      <button
        onClick={() => onToggle(entry.id)}
        aria-label={entry.done ? `Desmarcar: ${entry.title}` : `Marcar como feita: ${entry.title}`}
        className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
          entry.done ? 'bg-sara-gold border-sara-gold' : 'border-sara-linen bg-sara-cream'
        }`}
      >
        {entry.done && <Check size={14} className="text-white" strokeWidth={2.5} />}
      </button>
    </div>
  );
}

export function RoutineTimeline() {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const isLoggedIn   = useAppStore((s) => s.isLoggedIn);
  const queryClient  = useQueryClient();

  const { data: apiEntries = [] } = useQuery({
    queryKey: ['routine', selectedDate],
    queryFn: () => apiFetch<ApiRoutineEntry[]>(`/routine?date=${selectedDate}`),
    enabled: isLoggedIn,
  });

  const entries = apiEntries.map(apiToRoutineEntry)
    .sort((a, b) => a.time.localeCompare(b.time));

  const toggleMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      apiFetch(`/routine/${id}`, { method: 'PATCH', body: JSON.stringify({ done }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routine', selectedDate] }),
  });

  function handleToggle(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    toggleMutation.mutate({ id, done: !entry.done });
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10">
        <span className="text-4xl">🌿</span>
        <p className="text-sm text-graphite-muted">Nenhuma tarefa para hoje</p>
        <p className="text-xs text-graphite-muted">Toque em + para adicionar</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-4">
      {entries.map((entry, index) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06, duration: 0.3 }}
        >
          <EntryCard entry={entry} onToggle={handleToggle} />
        </motion.div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update AddRoutineModal.tsx**

Replace the `addRoutineEntry` store action with a mutation:

```tsx
// Change imports:
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
// Remove: import { useAppStore } from '../../store/useAppStore'; (for addRoutineEntry)

// Inside AddRoutineModal:
const selectedDate = useAppStore((s) => s.selectedDate);
const queryClient  = useQueryClient();

const { mutate: addEntry, isPending } = useMutation({
  mutationFn: () =>
    apiFetch('/routine', {
      method: 'POST',
      body: JSON.stringify({ title: title.trim(), time, category, date }),
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['routine', date] });
    onClose();
  },
});

function handleAdd() {
  if (!title.trim()) return;
  addEntry();
}
```

- [ ] **Step 3: Run tests (regression check)**

Run: `npx vitest run src/components/home/`

Expected: WeekCalendar tests pass. Routine tests (if any) should pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/home/RoutineTimeline.tsx src/components/home/AddRoutineModal.tsx
git commit -m "feat: routine entries from API, toggle-done and add-entry via mutations"
```

---

## Task 9: Baby + DiaperCard + SleepCard + Test Fixes

**Files:**
- Modify: `src/components/baby/BabyTimeline.tsx`
- Modify: `src/components/baby/DiaperCard.tsx`
- Modify: `src/components/baby/SleepCard.tsx`
- Modify: `src/components/baby/DiaperCard.test.tsx`

- [ ] **Step 1: Update BabyTimeline.tsx**

```tsx
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiBabyEntry } from '../../lib/types';

const TYPE_EMOJI: Record<ApiBabyEntry['type'], string> = { sleep: '😴', feed: '🤱', diaper: '🧷' };
const TYPE_LABEL: Record<ApiBabyEntry['type'], string> = { sleep: 'Sono', feed: 'Amamentação', diaper: 'Fralda' };

export function BabyTimeline() {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);

  const { data: entries = [] } = useQuery({
    queryKey: ['baby'],
    queryFn: () => apiFetch<ApiBabyEntry[]>('/baby'),
    enabled: isLoggedIn,
  });

  const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="flex flex-col gap-2 px-4">
      <h3 className="text-sm font-semibold font-serif text-graphite">Timeline de hoje</h3>
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <span className="text-3xl">🌙</span>
          <p className="text-xs text-graphite-muted">Nenhuma atividade registrada</p>
        </div>
      ) : (
        sorted.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.3 }}
            className="flex items-center gap-3 bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-3"
          >
            <div className="w-8 h-8 rounded-xl bg-sara-linen flex items-center justify-center text-lg flex-shrink-0">
              {TYPE_EMOJI[entry.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-graphite-muted font-medium">{TYPE_LABEL[entry.type]}</p>
              <p className="text-sm font-medium text-graphite truncate">{entry.detail}</p>
            </div>
            <span className="text-xs text-graphite-muted flex-shrink-0">{entry.time}</span>
          </motion.div>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update DiaperCard.tsx**

```tsx
import { Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiBabyEntry } from '../../lib/types';

export function DiaperCard() {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const queryClient = useQueryClient();

  const { data: entries = [] } = useQuery({
    queryKey: ['baby'],
    queryFn: () => apiFetch<ApiBabyEntry[]>('/baby'),
    enabled: isLoggedIn,
  });

  const diaperCount = entries.filter((e) => e.type === 'diaper').length;

  const { mutate: increment } = useMutation({
    mutationFn: () => {
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return apiFetch<ApiBabyEntry>('/baby', {
        method: 'POST',
        body: JSON.stringify({ time: now, type: 'diaper', detail: 'Fralda trocada' }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['baby'] }),
  });

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧷</span>
          <span className="text-sm font-semibold text-graphite">Fraldas</span>
        </div>
        <span className="text-xs text-graphite-muted">hoje</span>
      </div>

      <div className="flex items-center justify-between">
        <span data-testid="diaper-count" className="text-4xl font-bold text-graphite tabular-nums">
          {diaperCount}
        </span>
        <button
          aria-label="Registrar troca de fralda"
          onClick={() => increment()}
          className="w-11 h-11 rounded-2xl bg-sara-linen flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus size={20} className="text-sara-gold" strokeWidth={2.5} />
        </button>
      </div>

      <p className="text-xs text-graphite-muted">
        {diaperCount === 0
          ? 'Nenhuma troca registrada'
          : `${diaperCount} troca${diaperCount > 1 ? 's' : ''} registrada${diaperCount > 1 ? 's' : ''}`}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Update SleepCard.tsx**

```tsx
import { Moon, Plus } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiBabyEntry } from '../../lib/types';

export function SleepCard() {
  const isLoggedIn  = useAppStore((s) => s.isLoggedIn);
  const queryClient = useQueryClient();
  const [minutes, setMinutes] = useState(45);

  const { data: entries = [] } = useQuery({
    queryKey: ['baby'],
    queryFn: () => apiFetch<ApiBabyEntry[]>('/baby'),
    enabled: isLoggedIn,
  });

  const totalMinutes = entries
    .filter((e) => e.type === 'sleep')
    .reduce((acc, e) => {
      const match = e.detail.match(/(\d+)\s*min/);
      return acc + (match ? parseInt(match[1], 10) : 0);
    }, 0);

  const hours = Math.floor(totalMinutes / 60);
  const mins  = totalMinutes % 60;
  const totalLabel = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;

  const { mutate: addSleep } = useMutation({
    mutationFn: () => {
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return apiFetch<ApiBabyEntry>('/baby', {
        method: 'POST',
        body: JSON.stringify({ time: now, type: 'sleep', detail: `Dormiu por ${minutes} min` }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['baby'] }),
  });

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Moon size={18} className="text-sara-gold" strokeWidth={1.8} />
        <span className="text-sm font-semibold text-graphite">Sono</span>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-bold text-graphite tabular-nums">
          {totalMinutes === 0 ? '0m' : totalLabel.trim()}
        </span>
        <span className="text-xs text-graphite-muted">hoje</span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="range"
          min={5}
          max={180}
          step={5}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="flex-1 accent-sara-gold"
          aria-label="Duração da soneca em minutos"
        />
        <span className="text-xs text-graphite-muted w-10 text-right">{minutes}m</span>
      </div>

      <button
        onClick={() => addSleep()}
        aria-label="Registrar soneca"
        className="w-full py-2.5 rounded-2xl bg-sara-linen text-sara-gold text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
      >
        <Plus size={16} strokeWidth={2.5} />
        Registrar soneca
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Update DiaperCard.test.tsx**

The old tests used `diaperCount` and `babyEntries` from Zustand. The new component derives count from `['baby']` query data.

Replace `src/components/baby/DiaperCard.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DiaperCard } from './DiaperCard';
import { useAppStore } from '../../store/useAppStore';
import type { ApiBabyEntry, PaginatedResult } from '../../lib/types';

const mockApiFetch = vi.fn();
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

const DIAPER_ENTRY: ApiBabyEntry = {
  id: '1', time: '10:00', type: 'diaper', detail: 'Fralda trocada',
  userId: 'u1', createdAt: new Date().toISOString(),
};

function makeWrapper(initialEntries: ApiBabyEntry[] = []) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    qc.setQueryData<ApiBabyEntry[]>(['baby'], initialEntries);
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  useAppStore.setState({ isLoggedIn: true });
  mockApiFetch.mockResolvedValue({ ...DIAPER_ENTRY, id: Date.now().toString() });
});

describe('DiaperCard', () => {
  it('shows initial count of 0 when no diaper entries', () => {
    render(<DiaperCard />, { wrapper: makeWrapper([]) });
    expect(screen.getByTestId('diaper-count')).toHaveTextContent('0');
  });

  it('shows count matching diaper entries in query cache', () => {
    render(<DiaperCard />, { wrapper: makeWrapper([DIAPER_ENTRY, DIAPER_ENTRY]) });
    expect(screen.getByTestId('diaper-count')).toHaveTextContent('2');
  });

  it('calls apiFetch POST /baby on button click', async () => {
    render(<DiaperCard />, { wrapper: makeWrapper([]) });
    fireEvent.click(screen.getByRole('button', { name: /registrar troca de fralda/i }));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(
      '/baby',
      expect.objectContaining({ method: 'POST' }),
    ));
  });

  it('shows correct singular text for 1 diaper', () => {
    render(<DiaperCard />, { wrapper: makeWrapper([DIAPER_ENTRY]) });
    expect(screen.getByText('1 troca registrada')).toBeInTheDocument();
  });

  it('shows correct plural text for 3 diapers', () => {
    render(<DiaperCard />, { wrapper: makeWrapper([DIAPER_ENTRY, DIAPER_ENTRY, DIAPER_ENTRY]) });
    expect(screen.getByText('3 trocas registradas')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`

Expected: all 127 tests (minus removed ones) pass. The total may be slightly lower if some test cases were removed (e.g. the `communityPosts`-dependent ones).

- [ ] **Step 6: Commit**

```bash
git add src/components/baby/BabyTimeline.tsx src/components/baby/DiaperCard.tsx src/components/baby/SleepCard.tsx src/components/baby/DiaperCard.test.tsx
git commit -m "feat: baby timeline, diaper and sleep tracking from API via React Query"
```

---

## Task 10: ComunidadeScreen Test + Final Cleanup

**Files:**
- Modify: `src/components/comunidade/ComunidadeScreen.test.tsx`
- Possibly modify any remaining test that references removed store fields

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run 2>&1`

Collect all failing tests.

- [ ] **Step 2: Fix ComunidadeScreen.test.tsx**

Read `src/components/comunidade/ComunidadeScreen.test.tsx`. It uses `communityPosts`, `communities`, `followedCommunityIds` from the store. After the refactor, posts and communities come from the query. Seed the QueryClient in each test.

Add `QueryClientProvider` wrapper and seed `['posts']` query with mock posts. Wrap all renders with the wrapper. Remove any `communityPosts` or `communities` from `useAppStore.setState`.

The test structure will look like:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PaginatedResult, ApiPost } from '../../lib/types';

const MOCK_POSTS: ApiPost[] = [
  {
    id: '1', category: 'gestação', content: 'Dicas enjoo', authorId: 'u2',
    author: { id: 'u2', name: 'Fernanda S.' }, isRepost: false,
    communityId: 'gestacao-primeiro-tri',
    _count: { likes: 24, comments: 8 },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  // ... more posts matching what tests expect
];

vi.mock('../../lib/api', () => ({ apiFetch: vi.fn(), ApiError: class extends Error {} }));

function makeWrapper(posts: ApiPost[] = MOCK_POSTS) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData<PaginatedResult<ApiPost>>(['posts'], { items: posts, hasMore: false });
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
```

Read the actual test file before editing it and apply the wrapper to each `render()` call. The test logic (what buttons exist, what filtering does) should remain the same.

- [ ] **Step 3: Fix any other failing tests**

Read each remaining failing test file. Common fixes:
- Add `QueryClientProvider` wrapper if component now uses `useQuery`
- Remove references to deleted store fields (`communityPosts`, `chats`, `notifications`, `routineEntries`, `babyEntries`, `diaperCount`, `postComments`, `communities`)
- Replace store-data checks with API mock checks

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`

Expected: all tests pass with at most a small reduction in count (tests that were deleted for removed features).

- [ ] **Step 5: Manual smoke test**

Prerequisites: Docker MySQL running on port 3307, server running on port 3001.

Start Docker: `docker compose up -d`
Start server: in `server/` run `npx tsx src/index.ts`
Start frontend: `npm run dev`

Test flow:
1. Open http://localhost:5173
2. Should see login screen
3. Log in with `mariana@mothersteam.com` / `senha123`
4. Should redirect to onboarding or main app
5. Go to Comunidade tab → should see seeded posts from DB
6. Create a post → verify it appears in the feed
7. Go to Bebê tab → count fraldas
8. Go to Rotina tab → add a routine entry
9. Refresh the page → should restore session automatically (no login required)
10. Click hamburger → SideDrawer opens → click Sair da conta → should go back to login

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete frontend→backend integration — all screens connected to API"
```

---

## Self-Review

**Spec coverage:**
- ✅ @tanstack/react-query installed (Task 1)
- ✅ Vite proxy `/api/*` → `http://localhost:3001` (Task 1)
- ✅ `apiFetch` wrapper with Bearer token + auto-refresh on 401 (Task 1)
- ✅ Access token in Zustand memory only, excluded from persist via `partialize` (Task 2)
- ✅ Refresh token stays in HttpOnly cookie — never touched by frontend (Task 1 api.ts)
- ✅ POST /auth/login connected (Task 3)
- ✅ Session restore on page refresh via POST /auth/refresh (Task 3)
- ✅ POST /auth/logout called on logout (Task 3)
- ✅ Posts feed from API (Task 4)
- ✅ Create post via API (Task 4)
- ✅ Communities from API (Task 5)
- ✅ Notifications from API (Task 6)
- ✅ Mark-all-read via API (Task 6)
- ✅ Chats from API (Task 7)
- ✅ Messages from API (Task 7)
- ✅ Send message via API (Task 7)
- ✅ Routine entries from API (Task 8)
- ✅ Toggle routine done via API (Task 8)
- ✅ Add routine entry via API (Task 8)
- ✅ Baby entries (sleep, diaper) from API (Task 9)
- ✅ Register diaper via API (Task 9)
- ✅ Register sleep via API (Task 9)
- ✅ Test suite updated for all modified components (Tasks 2, 3, 4, 5, 7, 9, 10)

**Type consistency check:**
- `ApiPost._count.likes` used in `apiPostToCommunityPost` ✅
- `ApiChat.participants` iterated in `apiChatToChat` ✅
- `ApiBabyEntry` used consistently across BabyTimeline, DiaperCard, SleepCard ✅
- `buildPhase` takes `ApiUser` subset ✅
- Store `setAuth` takes `ApiUser` ✅
