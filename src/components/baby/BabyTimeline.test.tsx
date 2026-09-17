import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BabyTimeline } from './BabyTimeline';
import { useAppStore } from '../../store/useAppStore';
import { format } from 'date-fns';
import { formatShortDate, localDayRange, parseLocalDate, shiftISODate, todayISO } from '../../lib/dateUtils';
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

const dayLabel = () => screen.getByTestId('timeline-day-label');

describe('BabyTimeline', () => {
  it('mostra só os registros de hoje por padrão', async () => {
    render(<BabyTimeline />, { wrapper });
    expect(dayLabel()).toHaveTextContent('Hoje');
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
    expect(dayLabel()).toHaveTextContent('Ontem');
    expect(await screen.findByText('Fralda de ontem')).toBeInTheDocument();
    expect(screen.queryByText('Fralda de hoje')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Próximo dia')).toBeEnabled();

    fireEvent.click(screen.getByLabelText('Próximo dia'));
    expect(dayLabel()).toHaveTextContent('Hoje');
    await waitFor(() => expect(screen.getByText('Fralda de hoje')).toBeInTheDocument());
  });

  it('botão Hoje só aparece fora de hoje e volta direto para hoje', async () => {
    render(<BabyTimeline />, { wrapper });
    expect(screen.queryByLabelText('Voltar para hoje')).not.toBeInTheDocument();

    for (let i = 0; i < 10; i++) fireEvent.click(screen.getByLabelText('Dia anterior'));
    expect(dayLabel()).toHaveTextContent(formatShortDate(shiftISODate(todayISO(), -10)));

    fireEvent.click(screen.getByLabelText('Voltar para hoje'));
    expect(dayLabel()).toHaveTextContent('Hoje');
    expect(screen.queryByLabelText('Voltar para hoje')).not.toBeInTheDocument();
    expect(await screen.findByText('Fralda de hoje')).toBeInTheDocument();
  });

  it('tocar na data abre o calendário do app e escolher um dia pula para ele', async () => {
    render(<BabyTimeline />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /escolher data/i }));
    const calendar = screen.getByRole('dialog', { name: 'Selecionar data' });

    const yesterday = parseLocalDate(shiftISODate(todayISO(), -1));
    const tomorrow = parseLocalDate(shiftISODate(todayISO(), 1));
    const dayButton = (d: Date) =>
      within(calendar).queryAllByRole('button').find((b) => b.closest('[data-day]')?.getAttribute('data-day') === format(d, 'yyyy-MM-dd'));

    // Future days are not selectable.
    const future = dayButton(tomorrow);
    if (future) expect(future).toBeDisabled();

    // Yesterday may sit in the previous month page; go back if needed.
    if (!dayButton(yesterday)) fireEvent.click(within(calendar).getAllByRole('button', { name: /anterior|previous/i })[0]);
    fireEvent.click(dayButton(yesterday)!);

    expect(screen.queryByRole('dialog', { name: 'Selecionar data' })).not.toBeInTheDocument();
    expect(dayLabel()).toHaveTextContent('Ontem');
    expect(await screen.findByText('Fralda de ontem')).toBeInTheDocument();
  });

  it('tocar num registro abre a edição dele', async () => {
    render(<BabyTimeline />, { wrapper });
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Fralda das 10:00' }));
    expect(screen.getByRole('dialog', { name: 'Editar fralda' })).toBeInTheDocument();
  });

  it('salvar atualiza a lista na hora, antes da resposta da API', async () => {
    let resolvePatch!: (v: unknown) => void;
    const base = mockApiFetch.getMockImplementation()!;
    mockApiFetch.mockImplementation((url: string, opts?: RequestInit) =>
      opts?.method === 'PATCH' ? new Promise((r) => { resolvePatch = r; }) : base(url, opts),
    );
    render(<BabyTimeline />, { wrapper });
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Fralda das 10:00' }));
    fireEvent.click(screen.getByRole('button', { name: /ambos/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    // API still pending: the sheet is closing and the row already shows the new detail.
    expect(screen.getByRole('button', { name: 'Editar Fralda das 10:00' })).toHaveTextContent('Ambos');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar fralda' })).not.toBeInTheDocument());
    resolvePatch({ ok: true });
  });

  it('se a API falhar, o registro volta como estava e aparece um aviso', async () => {
    const base = mockApiFetch.getMockImplementation()!;
    mockApiFetch.mockImplementation((url: string, opts?: RequestInit) =>
      opts?.method === 'PATCH' ? Promise.reject(new Error('offline')) : base(url, opts),
    );
    render(<BabyTimeline />, { wrapper });
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Fralda das 10:00' }));
    fireEvent.click(screen.getByRole('button', { name: /ambos/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar');
    expect(await screen.findByText('Fralda de hoje')).toBeInTheDocument();
    expect(screen.queryByText('Ambos')).not.toBeInTheDocument();
  });

  it('excluir tira o registro da lista na hora', async () => {
    const base = mockApiFetch.getMockImplementation()!;
    mockApiFetch.mockImplementation((url: string, opts?: RequestInit) =>
      opts?.method === 'DELETE' ? new Promise(() => {}) : base(url, opts),
    );
    render(<BabyTimeline />, { wrapper });
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Fralda das 10:00' }));
    fireEvent.click(screen.getByLabelText('Excluir registro'));
    fireEvent.click(screen.getByRole('button', { name: 'Sim, excluir' }));

    await waitFor(() => expect(screen.queryByText('Fralda de hoje')).not.toBeInTheDocument());
    expect(await screen.findByText('Nenhuma atividade registrada')).toBeInTheDocument();
    expect(mockApiFetch).toHaveBeenCalledWith('/baby/t1', { method: 'DELETE' });
  });

  it('mostra a data para dias mais antigos', async () => {
    render(<BabyTimeline />, { wrapper });
    fireEvent.click(screen.getByLabelText('Dia anterior'));
    fireEvent.click(screen.getByLabelText('Dia anterior'));
    expect(dayLabel()).toHaveTextContent(formatShortDate(shiftISODate(todayISO(), -2)));
    expect(await screen.findByText('Nenhuma atividade registrada neste dia')).toBeInTheDocument();
  });
});
