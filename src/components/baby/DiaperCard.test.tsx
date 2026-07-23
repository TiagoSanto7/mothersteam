import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DiaperCard } from './DiaperCard';
import { useAppStore } from '../../store/useAppStore';
import type { ApiBabyEntry } from '../../lib/types';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
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
  mockApiFetch.mockImplementation((_url: string, opts?: RequestInit) => {
    if (opts?.method === 'POST') {
      return Promise.resolve({ ...DIAPER_ENTRY, id: Date.now().toString() });
    }
    return Promise.resolve([]);
  });
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
