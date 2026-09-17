import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoutineTimeline, REORDER_DELAY_MS, sortRoutine } from './RoutineTimeline';
import { useAppStore } from '../../store/useAppStore';
import type { ApiRoutineEntry } from '../../lib/types';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

const DAY = '2026-09-17';
const vitamina: ApiRoutineEntry = {
  id: 'r1', userId: 'u1', date: DAY, time: '09:00', title: 'Vitamina D', category: 'medication', done: false,
} as ApiRoutineEntry;

let server: ApiRoutineEntry[];
const patchBodies: unknown[] = [];

function renderTimeline() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <RoutineTimeline />
    </QueryClientProvider>,
  );
}

const checkButton = () => screen.getByRole('button', { name: /^(marcar como feita|desmarcar): vitamina d$/i });

beforeEach(() => {
  server = [{ ...vitamina }];
  patchBodies.length = 0;
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation((url: string, opts?: RequestInit) => {
    if (opts?.method === 'PATCH') {
      const body = JSON.parse(String(opts.body));
      const id = url.split('/').pop();
      patchBodies.push(body);
      server = server.map((e) => (e.id === id ? { ...e, ...body } : e));
      return Promise.resolve({ ok: true });
    }
    return Promise.resolve(server.map((e) => ({ ...e })));
  });
  useAppStore.setState({ isLoggedIn: true, selectedDate: DAY });
});

describe('RoutineTimeline — marcar como feito', () => {
  it('o check aparece no mesmo instante do toque, antes da resposta da API', async () => {
    let resolvePatch!: (v: unknown) => void;
    const base = mockApiFetch.getMockImplementation()!;
    mockApiFetch.mockImplementation((url: string, opts?: RequestInit) =>
      opts?.method === 'PATCH' ? new Promise((r) => { resolvePatch = r; }) : base(url, opts),
    );
    renderTimeline();
    await screen.findByText('Vitamina D');

    fireEvent.click(screen.getByLabelText('Marcar como feita: Vitamina D'));

    // The PATCH never resolves here: the check must show up from the cache alone, right away.
    await waitFor(() => expect(checkButton()).toHaveAttribute('aria-pressed', 'true'), { timeout: 50 });
    expect(screen.getByLabelText('Desmarcar: Vitamina D')).toBeInTheDocument();
    expect(patchBodies).toHaveLength(0);
    resolvePatch({ ok: true });
  });

  it('se a API falhar, o lembrete volta como estava e aparece um aviso', async () => {
    const base = mockApiFetch.getMockImplementation()!;
    mockApiFetch.mockImplementation((url: string, opts?: RequestInit) =>
      opts?.method === 'PATCH' ? Promise.reject(new Error('offline')) : base(url, opts),
    );
    renderTimeline();
    await screen.findByText('Vitamina D');

    fireEvent.click(screen.getByLabelText('Marcar como feita: Vitamina D'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível atualizar o lembrete');
    expect(checkButton()).toHaveAttribute('aria-pressed', 'false');
  });

  it('toques rápidos seguidos alternam certo e chegam ao servidor na ordem', async () => {
    renderTimeline();
    await screen.findByText('Vitamina D');

    // Three taps in the same tick, faster than any render or network round-trip.
    const button = checkButton();
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(patchBodies).toEqual([{ done: true }, { done: false }, { done: true }]));
    // After the queue settles and refetches, the UI matches the server.
    await waitFor(() => expect(server[0].done).toBe(true));
    expect(checkButton()).toHaveAttribute('aria-pressed', 'true');
  });

  it('só busca a lista de novo depois do último toque pendente', async () => {
    renderTimeline();
    await screen.findByText('Vitamina D');
    const getsBefore = mockApiFetch.mock.calls.filter(([, o]) => !o?.method).length;

    fireEvent.click(checkButton());
    fireEvent.click(checkButton());

    await waitFor(() => expect(patchBodies).toHaveLength(2));
    await waitFor(() => {
      const gets = mockApiFetch.mock.calls.filter(([, o]) => !o?.method).length;
      expect(gets - getsBefore).toBe(1);
    });
  });
});

const row = (id: string, time: string, title: string, done: boolean) =>
  ({ id, userId: 'u1', date: DAY, time, title, category: 'task', done }) as ApiRoutineEntry;

const titlesInOrder = () =>
  screen.getAllByRole('button', { name: /^ver detalhe: /i }).map((el) => el.getAttribute('aria-label')!.replace('Ver detalhe: ', ''));

describe('sortRoutine', () => {
  it('pendentes em cima, feitos embaixo; cada grupo do horário mais cedo para o mais tarde', () => {
    const sorted = sortRoutine([
      row('a', '16:00', 'Pediatra', true),
      row('b', '18:00', 'Jantar', false),
      row('c', '07:30', 'Banho', true),
      row('d', '09:00', 'Vitamina D', false),
      row('e', '15:00', 'Comprar fraldas', false),
    ]);
    expect(sorted.map((e) => e.title)).toEqual(['Vitamina D', 'Comprar fraldas', 'Jantar', 'Banho', 'Pediatra']);
  });
});

describe('RoutineTimeline — ordem', () => {
  it('ao marcar como feito, o item mostra o check no lugar e só depois desce para o fim', async () => {
    server = [row('a', '09:00', 'Vitamina D', false), row('b', '15:00', 'Comprar fraldas', false)];
    renderTimeline();
    await screen.findByText('Vitamina D');
    expect(titlesInOrder()).toEqual(['Vitamina D', 'Comprar fraldas']);

    const started = Date.now();
    fireEvent.click(screen.getByLabelText('Marcar como feita: Vitamina D'));
    await waitFor(() => expect(screen.getByLabelText('Desmarcar: Vitamina D')).toBeInTheDocument());
    // Still in place while the check animates.
    expect(titlesInOrder()).toEqual(['Vitamina D', 'Comprar fraldas']);

    await waitFor(() => expect(titlesInOrder()).toEqual(['Comprar fraldas', 'Vitamina D']), { timeout: 2000 });
    expect(Date.now() - started).toBeGreaterThanOrEqual(REORDER_DELAY_MS - 50);
  });

  it('desmarcar volta o item para o grupo de pendentes, na posição do horário', async () => {
    server = [row('a', '09:00', 'Vitamina D', true), row('b', '15:00', 'Comprar fraldas', false)];
    renderTimeline();
    await screen.findByText('Vitamina D');
    expect(titlesInOrder()).toEqual(['Comprar fraldas', 'Vitamina D']);

    fireEvent.click(screen.getByLabelText('Desmarcar: Vitamina D'));
    await waitFor(() => expect(titlesInOrder()).toEqual(['Vitamina D', 'Comprar fraldas']), { timeout: 2000 });
  });
});
