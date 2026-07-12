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
  _count: { members: 42 }, isMember: false, role: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.apiFetch).mockImplementation(async (path: string) => {
    if (path.endsWith('/posts')) return { items: [], hasMore: false };
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
      if (path.endsWith('/posts')) return { items: [], hasMore: false };
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
