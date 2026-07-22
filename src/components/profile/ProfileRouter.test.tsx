import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileRouter } from './ProfileRouter';
import { useAppStore } from '../../store/useAppStore';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  mockApiFetch.mockResolvedValue({ items: [], hasMore: false });
  useAppStore.setState({
    isLoggedIn: true,
    currentUserId: 'me-123',
    motherName: 'Mariana',
    phase: { stage: 'pregnant', week: 28 },
    motherProfile: null,
    savedVerses: [],
  });
});

describe('ProfileRouter', () => {
  it('renders ProfileScreen (self) when userId === currentUserId', () => {
    wrap(<ProfileRouter userId="me-123" onBack={vi.fn()} onOpenUser={vi.fn()} />);
    expect(screen.getByRole('button', { name: /editar perfil/i })).toBeInTheDocument();
  });

  it('renders UserProfileScreen (visitor) when userId !== currentUserId', async () => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path.includes('/posts')) return { items: [], hasMore: false };
      return {
        id: 'other-999', name: 'Julia', bio: null,
        pregnancyStage: 'postpartum', pregnancyWeek: null, babyAgeInDays: 30,
        profileKey: null, archetypeKey: 'ana',
        _count: { posts: 0, followers: 0, following: 0 },
        isSelf: false, isFollowedByCurrentUser: false,
      };
    });
    wrap(<ProfileRouter userId="other-999" onBack={vi.fn()} onOpenUser={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /editar perfil/i })).not.toBeInTheDocument();
    expect(await screen.findByText('Julia')).toBeInTheDocument();
  });
});
