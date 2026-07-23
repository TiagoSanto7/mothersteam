import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { useAppStore } from './store/useAppStore';
import type { ApiPost } from './lib/types';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('./lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

function makeWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(['posts'], {
      pages: [{ items: [] as ApiPost[], hasMore: false }],
      pageParams: [''],
    });
    qc.setQueryData(['notifications'], []);
    qc.setQueryData(['chats'], []);
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  mockApiFetch.mockResolvedValue({ items: [], hasMore: false });
  useAppStore.setState({
    isLoggedIn: true,
    onboardingDone: true,
    socialOnboardingDone: true,
    activeTab: 'home',
    motherName: 'Mariana',
    phase: { stage: 'pregnant', week: 28 },
    motherProfile: null,
  });
});

describe('App routing', () => {
  it('home tab renders DashboardScreen (mother name visible in greeting)', () => {
    useAppStore.setState({ activeTab: 'home' });
    render(<App />, { wrapper: makeWrapper() });
    expect(screen.getAllByText('Mariana').length).toBeGreaterThan(0);
  });

  it('rotina tab renders HomeScreen (Para Você tab absent)', () => {
    useAppStore.setState({ activeTab: 'rotina' });
    render(<App />, { wrapper: makeWrapper() });
    expect(screen.queryAllByRole('button', { name: /para você/i })).toHaveLength(0);
  });

  it('comunidade tab renders ComunidadeScreen (alias for stale state)', () => {
    useAppStore.setState({ activeTab: 'comunidade' });
    render(<App />, { wrapper: makeWrapper() });
    expect(screen.getAllByRole('button', { name: /para você/i }).length).toBeGreaterThan(0);
  });
});

describe('App — profile navigation', () => {
  it('opens ProfileScreen (self) when profileUserId matches currentUserId (regression: "meu perfil como visitante")', async () => {
    // Return [] for HomeScreen API calls (RoutineTimeline etc.) and proper
    // shaped data for ProfileScreen's /users/:id and /users/:id/posts queries.
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === '/users/me-1') {
        return {
          id: 'me-1', name: 'Mariana', bio: null,
          pregnancyStage: 'pregnant', pregnancyWeek: 28, babyAgeInDays: null,
          profileKey: null, archetypeKey: null,
          _count: { posts: 0, followers: 0, following: 0 },
          isSelf: true, isFollowedByCurrentUser: false,
        };
      }
      if (typeof path === 'string' && path.includes('/users/me-1/posts')) {
        return { items: [], hasMore: false };
      }
      // Fallback: empty array for HomeScreen timeline calls
      return [];
    });
    useAppStore.setState({
      isLoggedIn: true,
      onboardingDone: true,
      socialOnboardingDone: true,
      activeTab: 'rotina',
      currentUserId: 'me-1',
      motherName: 'Mariana',
      phase: { stage: 'pregnant', week: 28 },
      motherProfile: null,
      savedVerses: [],
    });
    render(<App />, { wrapper: makeWrapper() });

    // Clique no avatar do HomeScreen (aba Rotina) dispara onOpenProfile
    // → setProfileUserId(currentUserId) → ProfileScreen (self, via unified component).
    // Both MobileShell and WebLayout render the screen, so use findAllByRole.
    const avatarBtns = await screen.findAllByRole('button', { name: /abrir perfil/i });
    fireEvent.click(avatarBtns[0]);
    expect(await screen.findByRole('button', { name: /editar perfil/i })).toBeInTheDocument();
  });
});
