import { render, screen } from '@testing-library/react';
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
    // Return an empty array for all API calls so RoutineTimeline doesn't crash
    // (the global beforeEach mock returns an object which causes apiEntries.map to throw)
    mockApiFetch.mockResolvedValue([]);
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
    // → setProfileUserId(currentUserId) → ProfileRouter → ProfileScreen (self).
    // Both MobileShell and WebLayout render the screen, so use findAllByRole.
    const avatarBtns = await screen.findAllByRole('button', { name: /abrir perfil/i });
    avatarBtns[0].click();
    expect(await screen.findByRole('button', { name: /editar perfil/i })).toBeInTheDocument();
  });
});
