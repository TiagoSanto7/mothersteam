import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchScreen } from './SearchScreen';
import * as api from '../../lib/api';

vi.mock('../../lib/api', async () => ({
  ...(await vi.importActual('../../lib/api')),
  apiFetch: vi.fn(),
}));

function renderScreen(onUser = vi.fn(), onCommunity = vi.fn(), onBack = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SearchScreen onOpenUser={onUser} onOpenCommunity={onCommunity} onBack={onBack} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.apiFetch).mockResolvedValue({
    users: [{ id: 'u1', name: 'Julia', pregnancyStage: 'pregnant' }],
    communities: [{ id: 'c1', name: 'Gestantes', description: 'x', category: 'gestação', colorKey: 'gold', _count: { members: 5 } }],
  });
});

describe('SearchScreen', () => {
  it('renders search input', () => {
    renderScreen();
    expect(screen.getByPlaceholderText(/Buscar/i)).toBeInTheDocument();
  });

  it('shows results after typing', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByPlaceholderText(/Buscar/i), 'jul');
    await waitFor(() => {
      expect(screen.getByText('Julia')).toBeInTheDocument();
      expect(screen.getByText('Gestantes')).toBeInTheDocument();
    });
  });

  it('does not search for queries under 2 chars', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByPlaceholderText(/Buscar/i), 'j');
    // small delay to guarantee debounce did not fire
    await new Promise((r) => setTimeout(r, 250));
    expect(api.apiFetch).not.toHaveBeenCalled();
  });

  it('calls onOpenUser when user result clicked', async () => {
    const onOpenUser = vi.fn();
    const user = userEvent.setup();
    renderScreen(onOpenUser);
    await user.type(screen.getByPlaceholderText(/Buscar/i), 'jul');
    await waitFor(() => screen.getByText('Julia'));
    await user.click(screen.getByText('Julia'));
    expect(onOpenUser).toHaveBeenCalledWith('u1');
  });
});
