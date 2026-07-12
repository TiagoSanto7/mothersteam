import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FollowListScreen } from './FollowListScreen';
import * as api from '../../lib/api';

vi.mock('../../lib/api', async () => ({
  ...(await vi.importActual('../../lib/api')),
  apiFetch: vi.fn(),
}));

function renderScreen(mode: 'followers' | 'following' = 'followers', userId = 'u1', onOpen = vi.fn(), onBack = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <FollowListScreen mode={mode} userId={userId} onOpenUser={onOpen} onBack={onBack} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.apiFetch).mockResolvedValue({
    items: [
      { id: 'a', name: 'Ana', isFollowedByCurrentUser: false, isSelf: false },
      { id: 'b', name: 'Bia', isFollowedByCurrentUser: true, isSelf: false },
    ],
    hasMore: false,
  });
});

describe('FollowListScreen', () => {
  it('renders "Seguidoras" title in followers mode', async () => {
    renderScreen('followers');
    await waitFor(() => expect(screen.getByText('Seguidoras')).toBeInTheDocument());
  });

  it('renders "Seguindo" title in following mode', async () => {
    renderScreen('following');
    await waitFor(() => expect(screen.getByText('Seguindo')).toBeInTheDocument());
  });

  it('lists users with follow button state', async () => {
    renderScreen('followers');
    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
      expect(screen.getByText('Bia')).toBeInTheDocument();
    });
    const buttons = screen.getAllByRole('button', { name: /Seguir|Seguindo/i });
    expect(buttons.find((b) => b.textContent === 'Seguir')).toBeTruthy();
    expect(buttons.find((b) => b.textContent === 'Seguindo')).toBeTruthy();
  });

  it('calls onOpenUser when list item clicked', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    renderScreen('followers', 'u1', onOpen);
    await waitFor(() => screen.getByText('Ana'));
    await user.click(screen.getByText('Ana'));
    expect(onOpen).toHaveBeenCalledWith('a');
  });
});
