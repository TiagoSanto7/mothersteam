import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommunityDetailScreen } from './CommunityDetailScreen';
import * as api from '../../lib/api';

vi.mock('../../lib/api', async () => ({
  ...(await vi.importActual('../../lib/api')),
  apiFetch: vi.fn(),
}));

vi.mock('../../store/useAppStore', () => ({
  useAppStore: (sel: (s: { currentUserId: string }) => unknown) =>
    sel({ currentUserId: 'self-user' }),
}));

function renderScreen(id = 'c1', onBack = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CommunityDetailScreen communityId={id} onBack={onBack} />
    </QueryClientProvider>
  );
}

const mockCommunity = {
  id: 'c1', name: 'Gestantes 2026', description: 'Um espaço para gestantes',
  category: 'gestação', colorKey: 'gold', creatorId: 'x', createdAt: '2026-01-01',
  isPrivate: false, isOpen: true,
  _count: { members: 42 }, isMember: false, role: null,
};

const mockMembers = [
  { id: 'u1', name: 'Ana', username: 'ana', archetypeKey: null, role: 'owner', isFollowedByCurrentUser: false, isSelf: false },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.apiFetch).mockImplementation(async (path: string) => {
    if (path.includes('/posts')) return { items: [], hasMore: false };
    if (path.includes('/members')) return mockMembers;
    return mockCommunity;
  });
});

describe('CommunityDetailScreen', () => {
  it('renders community name and description', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('Gestantes 2026')).toBeInTheDocument());
    expect(screen.getByText('Um espaço para gestantes')).toBeInTheDocument();
  });

  it('shows member count', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText(/42 membros/i)).toBeInTheDocument());
  });

  it('shows "Entrar" when not a member', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument());
  });

  it('shows "Sair" when already a member', async () => {
    vi.mocked(api.apiFetch).mockImplementation(async (path: string) => {
      if (path.includes('/posts')) return { items: [], hasMore: false };
      if (path.includes('/members')) return mockMembers;
      return { ...mockCommunity, isMember: true, role: 'member' };
    });
    renderScreen();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument());
  });

  it('calls join endpoint when Entrar clicked', async () => {
    const user = userEvent.setup();
    renderScreen();
    await waitFor(() => screen.getByRole('button', { name: 'Entrar' }));
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() =>
      expect(api.apiFetch).toHaveBeenCalledWith('/communities/c1/join', { method: 'POST' })
    );
  });
});

// ---------------------------------------------------------------------------
// Members section — new TDD tests
// ---------------------------------------------------------------------------

function make5Members() {
  return [
    { id: 'm1', name: 'Alice',   username: 'alice',   archetypeKey: null, role: 'owner'  as const, isFollowedByCurrentUser: false, isSelf: false },
    { id: 'm2', name: 'Beatriz', username: 'beatriz', archetypeKey: null, role: 'member' as const, isFollowedByCurrentUser: true,  isSelf: false },
    { id: 'm3', name: 'Carla',   username: 'carla',   archetypeKey: null, role: 'member' as const, isFollowedByCurrentUser: false, isSelf: true  },
    { id: 'm4', name: 'Diana',   username: 'diana',   archetypeKey: null, role: 'member' as const, isFollowedByCurrentUser: false, isSelf: false },
    { id: 'm5', name: 'Eva',     username: 'eva',     archetypeKey: null, role: 'member' as const, isFollowedByCurrentUser: false, isSelf: false },
  ];
}

function mockWith5Members() {
  vi.mocked(api.apiFetch).mockImplementation(async (path: string) => {
    if (path.includes('/posts')) return { items: [], hasMore: false };
    if (path.includes('/members')) return make5Members();
    return mockCommunity;
  });
}

describe('CommunityDetailScreen — members preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWith5Members();
  });

  it('shows only first 3 members when there are more than 3', async () => {
    renderScreen();
    await waitFor(() => screen.getByText('Alice'));

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Beatriz')).toBeInTheDocument();
    expect(screen.getByText('Carla')).toBeInTheDocument();
    expect(screen.queryByText('Diana')).not.toBeInTheDocument();
    expect(screen.queryByText('Eva')).not.toBeInTheDocument();
  });

  it('shows "ver mais... (5 membros)" link when members > 3', async () => {
    renderScreen();
    await waitFor(() => screen.getByText('Alice'));

    const link = screen.getByRole('button', { name: /ver mais/i });
    expect(link).toBeInTheDocument();
    expect(link.textContent).toMatch(/5/);
  });

  it('does NOT show "ver mais" when members <= 3', async () => {
    vi.mocked(api.apiFetch).mockImplementation(async (path: string) => {
      if (path.includes('/posts')) return { items: [], hasMore: false };
      if (path.includes('/members')) return [mockMembers[0], make5Members()[1], make5Members()[2]];
      return mockCommunity;
    });
    renderScreen();
    await waitFor(() => screen.getByText('Ana'));

    expect(screen.queryByRole('button', { name: /ver mais/i })).not.toBeInTheDocument();
  });

  it('shows "Seguir" chip for non-followed, non-self members in preview', async () => {
    renderScreen();
    await waitFor(() => screen.getByText('Alice'));

    // Alice (m1): not followed, not self → Seguir
    const chips = screen.getAllByRole('button', { name: /^Seguir$/i });
    expect(chips.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Seguindo" chip for already-followed members in preview', async () => {
    renderScreen();
    await waitFor(() => screen.getByText('Beatriz'));

    // Beatriz (m2): isFollowedByCurrentUser=true
    expect(screen.getByRole('button', { name: /^Seguindo$/i })).toBeInTheDocument();
  });

  it('does NOT show a follow chip for isSelf member', async () => {
    renderScreen();
    await waitFor(() => screen.getByText('Carla'));

    // Carla (m3): isSelf=true → no chip
    // Only Alice and Beatriz are in preview (non-self) — Carla IS in preview (pos 3)
    // but must not have a Seguir chip
    // We count: Alice(Seguir) + Beatriz(Seguindo) = 2, Carla = 0 for her row
    const seguirChips = screen.queryAllByRole('button', { name: /^seguir$|^seguindo$/i });
    // At most 2 (Alice + Beatriz), because Carla (isSelf) has no chip
    expect(seguirChips.length).toBeLessThanOrEqual(2);
  });

  it('clicking "ver mais" reveals all members including Diana and Eva', async () => {
    renderScreen();
    await waitFor(() => screen.getByText('Alice'));

    const verMaisBtn = screen.getByRole('button', { name: /ver mais/i });
    await userEvent.setup().click(verMaisBtn);

    await waitFor(() => expect(screen.getByText('Diana')).toBeInTheDocument());
    expect(screen.getByText('Eva')).toBeInTheDocument();
  });

  it('clicking Seguir optimistically shows Seguindo without waiting for server', async () => {
    vi.mocked(api.apiFetch).mockImplementation(async (path: string, opts?: { method?: string }) => {
      if (opts?.method === 'POST' && path.includes('/follow')) return { ok: true };
      if (path.includes('/posts')) return { items: [], hasMore: false };
      if (path.includes('/members')) return make5Members();
      return mockCommunity;
    });

    renderScreen();
    await waitFor(() => screen.getByText('Alice'));

    // Alice has Seguir chip
    const seguirBtn = screen.getAllByRole('button', { name: /^Seguir$/i })[0];
    await userEvent.setup().click(seguirBtn);

    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /^Seguindo$/i }).length).toBeGreaterThan(1)
    );
  });
});
