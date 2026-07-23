import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileScreen } from './ProfileScreen';
import { useAppStore } from '../../store/useAppStore';
import type { ApiUserProfile, ApiPost } from '../../lib/types';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

const EMPTY_POSTS = { items: [] as ApiPost[], hasMore: false };

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const SELF_PROFILE: ApiUserProfile = {
  id: 'me-1',
  name: 'Mariana',
  bio: null,
  pregnancyStage: 'pregnant',
  pregnancyWeek: 28,
  babyAgeInDays: null,
  profileKey: null,
  archetypeKey: null,
  _count: { posts: 7, followers: 42, following: 5 },
  isSelf: true,
  isFollowedByCurrentUser: false,
};

const VISITOR_PROFILE: ApiUserProfile = {
  id: 'julia-1',
  name: 'Julia',
  bio: null,
  pregnancyStage: 'postpartum',
  pregnancyWeek: null,
  babyAgeInDays: 90,
  profileKey: null,
  archetypeKey: null,
  _count: { posts: 3, followers: 10, following: 8 },
  isSelf: false,
  isFollowedByCurrentUser: false,
};

beforeEach(() => {
  useAppStore.setState({
    isLoggedIn: true,
    currentUserId: 'me-1',
    motherName: 'Mariana',
    phase: { stage: 'pregnant', week: 28 },
    motherProfile: null,
    savedVerses: [],
  });
  mockApiFetch.mockResolvedValue(EMPTY_POSTS);
});

// ─── Self chrome ─────────────────────────────────────────────────────────────

describe('ProfileScreen — self chrome (isSelf: true)', () => {
  beforeEach(() => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === '/users/me-1') return SELF_PROFILE;
      if (path.includes('/users/me-1/posts')) return EMPTY_POSTS;
      return EMPTY_POSTS;
    });
  });

  it('renders "Editar perfil" button', async () => {
    wrap(<ProfileScreen onClose={vi.fn()} userId="me-1" />);
    expect(await screen.findByRole('button', { name: /editar perfil/i })).toBeInTheDocument();
  });

  it('renders Settings icon button', async () => {
    wrap(<ProfileScreen onClose={vi.fn()} userId="me-1" />);
    expect(await screen.findByRole('button', { name: /configurações/i })).toBeInTheDocument();
  });

  it('does NOT render Seguir button', async () => {
    wrap(<ProfileScreen onClose={vi.fn()} userId="me-1" />);
    // Wait for profile to load
    await screen.findByRole('button', { name: /editar perfil/i });
    expect(screen.queryByRole('button', { name: /^seguir$/i })).not.toBeInTheDocument();
  });

  it('does NOT show "Ver versículos salvos" when savedVerses is empty', async () => {
    useAppStore.setState({ savedVerses: [] });
    wrap(<ProfileScreen onClose={vi.fn()} userId="me-1" />);
    await screen.findByRole('button', { name: /editar perfil/i });
    expect(screen.queryByRole('button', { name: /ver versículos salvos/i })).not.toBeInTheDocument();
  });

  it('shows "Ver versículos salvos" button when savedVerses has items', async () => {
    useAppStore.setState({ savedVerses: ['Sl 23:1'] });
    wrap(<ProfileScreen onClose={vi.fn()} userId="me-1" />);
    expect(await screen.findByRole('button', { name: /ver versículos salvos/i })).toBeInTheDocument();
  });

  it('shows real follower/following/posts counts from /users/:id', async () => {
    wrap(<ProfileScreen onClose={vi.fn()} userId="me-1" />);
    expect(await screen.findByText('42')).toBeInTheDocument(); // followers
    expect(screen.getByText('5')).toBeInTheDocument();         // following
    expect(screen.getByText('7')).toBeInTheDocument();         // posts
    // Regression guard: hardcoded values must never appear
    expect(screen.queryByText('248')).not.toBeInTheDocument();
    expect(screen.queryByText('31')).not.toBeInTheDocument();
  });

  it('shows name from API', async () => {
    wrap(<ProfileScreen onClose={vi.fn()} userId="me-1" />);
    expect(await screen.findByText('Mariana')).toBeInTheDocument();
  });
});

// ─── Visitor chrome ───────────────────────────────────────────────────────────

describe('ProfileScreen — visitor chrome (isSelf: false)', () => {
  beforeEach(() => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === '/users/julia-1') return VISITOR_PROFILE;
      if (path.includes('/users/julia-1/posts')) return EMPTY_POSTS;
      return EMPTY_POSTS;
    });
  });

  it('renders "Seguir" button', async () => {
    wrap(<ProfileScreen onClose={vi.fn()} userId="julia-1" />);
    expect(await screen.findByRole('button', { name: /^seguir$/i })).toBeInTheDocument();
  });

  it('does NOT render "Editar perfil"', async () => {
    wrap(<ProfileScreen onClose={vi.fn()} userId="julia-1" />);
    // Wait for profile to load (name should appear)
    await screen.findByText('Julia');
    expect(screen.queryByRole('button', { name: /editar perfil/i })).not.toBeInTheDocument();
  });

  it('does NOT render "Ver versículos salvos"', async () => {
    useAppStore.setState({ savedVerses: ['Sl 23:1'] });
    wrap(<ProfileScreen onClose={vi.fn()} userId="julia-1" />);
    await screen.findByText('Julia');
    expect(screen.queryByRole('button', { name: /ver versículos salvos/i })).not.toBeInTheDocument();
  });

  it('shows name from API (Julia)', async () => {
    wrap(<ProfileScreen onClose={vi.fn()} userId="julia-1" />);
    expect(await screen.findByText('Julia')).toBeInTheDocument();
  });

  it('shows counts from API for visitor profile', async () => {
    wrap(<ProfileScreen onClose={vi.fn()} userId="julia-1" />);
    expect(await screen.findByText('10')).toBeInTheDocument(); // followers
    expect(screen.getByText('8')).toBeInTheDocument();          // following
    expect(screen.getByText('3')).toBeInTheDocument();          // posts
  });
});

// ─── Backward-compat: no userId prop falls back to currentUserId ──────────────

describe('ProfileScreen — backward-compat (no userId prop)', () => {
  it('falls back to currentUserId when userId is omitted', async () => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === '/users/me-1') return SELF_PROFILE;
      if (path.includes('/users/me-1/posts')) return EMPTY_POSTS;
      return EMPTY_POSTS;
    });
    wrap(<ProfileScreen onClose={vi.fn()} />);
    expect(await screen.findByRole('button', { name: /editar perfil/i })).toBeInTheDocument();
  });
});

// ─── Backend authority tests ─────────────────────────────────────────────────

describe('ProfileScreen — backend is source of truth for isSelf', () => {
  it('shows visitor chrome when userId === currentUserId but isSelf is false', async () => {
    // Edge case: userId matches current user but API says isSelf: false
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === '/users/me-1') return { ...SELF_PROFILE, isSelf: false };
      if (path.includes('/users/me-1/posts')) return EMPTY_POSTS;
      return EMPTY_POSTS;
    });
    wrap(<ProfileScreen onClose={vi.fn()} userId="me-1" />);
    // Should show Seguir (visitor chrome), not Editar (self chrome)
    expect(await screen.findByRole('button', { name: /^seguir$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /editar perfil/i })).not.toBeInTheDocument();
  });

  it('shows self chrome when userId !== currentUserId but isSelf is true', async () => {
    // Edge case: API says isSelf: true even though userId differs from current user
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === '/users/julia-1') return { ...VISITOR_PROFILE, isSelf: true };
      if (path.includes('/users/julia-1/posts')) return EMPTY_POSTS;
      return EMPTY_POSTS;
    });
    wrap(<ProfileScreen onClose={vi.fn()} userId="julia-1" />);
    // Should show Editar (self chrome), not Seguir (visitor chrome)
    expect(await screen.findByRole('button', { name: /editar perfil/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^seguir$/i })).not.toBeInTheDocument();
  });
});

// ─── Regression guard ─────────────────────────────────────────────────────────

describe('ProfileScreen — regression guard', () => {
  it('248 and 31 must never appear (no hardcoded counts)', async () => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === '/users/me-1') return SELF_PROFILE;
      if (path.includes('/users/me-1/posts')) return EMPTY_POSTS;
      return EMPTY_POSTS;
    });
    wrap(<ProfileScreen onClose={vi.fn()} userId="me-1" />);
    await screen.findByText('42'); // wait for profile to load
    expect(screen.queryByText('248')).not.toBeInTheDocument();
    expect(screen.queryByText('31')).not.toBeInTheDocument();
  });
});
