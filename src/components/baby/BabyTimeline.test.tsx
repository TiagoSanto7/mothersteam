import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BabyTimeline } from './BabyTimeline';
import { useAppStore } from '../../store/useAppStore';
import { localDayRange, shiftISODate, todayISO } from '../../lib/dateUtils';
import type { ApiBabyEntry } from '../../lib/types';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

const entry = (id: string, detail: string): ApiBabyEntry => ({
  id, time: '10:00', type: 'diaper', detail, userId: 'u1', createdAt: new Date().toISOString(),
});

function urlFor(day: string) {
  const { from, to } = localDayRange(day);
  return `/baby?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockApiFetch.mockReset();
  useAppStore.setState({ isLoggedIn: true });
  const today = todayISO();
  const yesterday = shiftISODate(today, -1);
  mockApiFetch.mockImplementation((url: string) => {
    if (url === urlFor(today)) return Promise.resolve([entry('t1', 'Fralda de hoje')]);
    if (url === urlFor(yesterday)) return Promise.resolve([entry('y1', 'Fralda de ontem')]);
    return Promise.resolve([]);
  });
});

describe('BabyTimeline', () => {
  it('mostra só os registros de hoje por padrão', async () => {
    render(<BabyTimeline />, { wrapper });
    expect(screen.getByText('Timeline de hoje')).toBeInTheDocument();
    expect(await screen.findByText('Fralda de hoje')).toBeInTheDocument();
    expect(screen.queryByText('Fralda de ontem')).not.toBeInTheDocument();
    expect(mockApiFetch).toHaveBeenCalledWith(urlFor(todayISO()));
  });

  it('não deixa avançar além de hoje', () => {
    render(<BabyTimeline />, { wrapper });
    expect(screen.getByLabelText('Próximo dia')).toBeDisabled();
  });

  it('navega para ontem e volta para hoje', async () => {
    render(<BabyTimeline />, { wrapper });
    await screen.findByText('Fralda de hoje');

    fireEvent.click(screen.getByLabelText('Dia anterior'));
    expect(screen.getByText('Timeline de ontem')).toBeInTheDocument();
    expect(await screen.findByText('Fralda de ontem')).toBeInTheDocument();
    expect(screen.queryByText('Fralda de hoje')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Próximo dia')).toBeEnabled();

    fireEvent.click(screen.getByLabelText('Próximo dia'));
    expect(screen.getByText('Timeline de hoje')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Fralda de hoje')).toBeInTheDocument());
  });

  it('mostra a data no título para dias mais antigos', async () => {
    render(<BabyTimeline />, { wrapper });
    fireEvent.click(screen.getByLabelText('Dia anterior'));
    fireEvent.click(screen.getByLabelText('Dia anterior'));
    expect(screen.getByText(/^Timeline · /)).toBeInTheDocument();
    expect(await screen.findByText('Nenhuma atividade registrada neste dia')).toBeInTheDocument();
  });
});
