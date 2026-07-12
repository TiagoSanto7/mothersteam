import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProfileScreen } from './UserProfileScreen';
import * as api from '../../lib/api';

vi.mock('../../lib/api', async () => ({
  ...(await vi.importActual('../../lib/api')),
  apiFetch: vi.fn(),
}));

function renderScreen(userId = 'u1', onBack = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <UserProfileScreen userId={userId} onBack={onBack} />
    </QueryClientProvider>
  );
}

const mockProfile = {
  id: 'u1', name: 'Julia', bio: 'Mãe de primeira viagem',
  pregnancyStage: 'postpartum', pregnancyWeek: null, babyAgeInDays: 30,
  profileKey: null, archetypeKey: 'ana',
  _count: { posts: 3, followers: 12, following: 8 },
  isSelf: false, isFollowedByCurrentUser: false,
};

const mockPosts = { items: [], hasMore: false };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.apiFetch).mockImplementation(async (path: string) => {
    if (path.includes('/posts')) return mockPosts;
    return mockProfile;
  });
});

describe('UserProfileScreen', () => {
  it('renders name, bio and counts', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('Julia')).toBeInTheDocument());
    expect(screen.getByText('Mãe de primeira viagem')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('shows "Seguir" button when not following', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Seguir' })).toBeInTheDocument());
  });

  it('shows "Seguindo" button when already following', async () => {
    vi.mocked(api.apiFetch).mockImplementation(async (path: string) => {
      if (path.includes('/posts')) return mockPosts;
      return { ...mockProfile, isFollowedByCurrentUser: true };
    });
    renderScreen();
    // Two elements share the "Seguindo" accessible name: the follow toggle button
    // and the "Seguindo" count button (aria-label). Pick the follow toggle (last).
    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: 'Seguindo' });
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
    const followToggles = screen.getAllByRole('button', { name: 'Seguindo' });
    // The follow toggle has the sara-gold-style class; simpler: it's the one not styled with items-center layout only.
    const followToggle = followToggles.find((b) => !b.className.includes('items-center'));
    expect(followToggle).toBeDefined();
  });

  it('hides follow button when isSelf', async () => {
    vi.mocked(api.apiFetch).mockImplementation(async (path: string) => {
      if (path.includes('/posts')) return mockPosts;
      return { ...mockProfile, isSelf: true };
    });
    renderScreen();
    await waitFor(() => expect(screen.getByText('Julia')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Seguir/i })).not.toBeInTheDocument();
  });

  it('calls follow endpoint when Seguir clicked', async () => {
    const user = userEvent.setup();
    renderScreen();
    await waitFor(() => screen.getByRole('button', { name: 'Seguir' }));
    await user.click(screen.getByRole('button', { name: 'Seguir' }));
    await waitFor(() =>
      expect(api.apiFetch).toHaveBeenCalledWith('/users/u1/follow', { method: 'POST' })
    );
  });

  it('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    renderScreen('u1', onBack);
    await waitFor(() => screen.getByText('Julia'));
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(onBack).toHaveBeenCalled();
  });
});
