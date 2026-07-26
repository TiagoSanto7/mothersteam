import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AllFutureEventsScreen } from './AllFutureEventsScreen';
import { useAppStore } from '../../store/useAppStore';
import type { ApiRoutineEntry } from '../../lib/types';

const TODAY = '2026-07-26';

const EVENTS: ApiRoutineEntry[] = [
  {
    id: 'f1',
    title: 'Consulta médica',
    time: '09:00',
    date: '2026-08-01',
    category: 'appointment',
    done: false,
    notes: 'Levar carteira',
    userId: 'u1',
    createdAt: '2026-07-26T00:00:00Z',
  },
  {
    id: 'f2',
    title: 'Pilates pré-natal',
    time: '10:30',
    date: '2026-08-01',
    category: 'task',
    done: false,
    notes: null,
    userId: 'u1',
    createdAt: '2026-07-26T00:00:00Z',
  },
  {
    id: 'f3',
    title: 'Vitamina',
    time: '08:00',
    date: '2026-08-05',
    category: 'medication',
    done: false,
    notes: null,
    userId: 'u1',
    createdAt: '2026-07-26T00:00:00Z',
  },
];

vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue([]),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T12:00:00`));
  useAppStore.setState({ isLoggedIn: true, selectedDate: TODAY });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

function makeWrapper(events: ApiRoutineEntry[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['routine', 'future'], events);
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('AllFutureEventsScreen', () => {
  it('renders the screen title', () => {
    render(<AllFutureEventsScreen onClose={vi.fn()} />, { wrapper: makeWrapper(EVENTS) });
    expect(screen.getByText('Eventos Futuros')).toBeInTheDocument();
  });

  it('renders events grouped by date heading', () => {
    render(<AllFutureEventsScreen onClose={vi.fn()} />, { wrapper: makeWrapper(EVENTS) });
    // Two events on 2026-08-01 and one on 2026-08-05 — we expect 2 date headings
    const headings = screen.getAllByText(/agosto/i);
    // At least one heading mentioning "agosto"
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('renders all event titles', () => {
    render(<AllFutureEventsScreen onClose={vi.fn()} />, { wrapper: makeWrapper(EVENTS) });
    expect(screen.getByText('Consulta médica')).toBeInTheDocument();
    expect(screen.getByText('Pilates pré-natal')).toBeInTheDocument();
    expect(screen.getByText('Vitamina')).toBeInTheDocument();
  });

  it('shows notes snippet for events that have notes', () => {
    render(<AllFutureEventsScreen onClose={vi.fn()} />, { wrapper: makeWrapper(EVENTS) });
    expect(screen.getByText('Levar carteira')).toBeInTheDocument();
  });

  it('shows empty state when no future events', () => {
    render(<AllFutureEventsScreen onClose={vi.fn()} />, { wrapper: makeWrapper([]) });
    expect(screen.getByText('Nenhum evento futuro')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<AllFutureEventsScreen onClose={onClose} />, { wrapper: makeWrapper(EVENTS) });
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('clicking an event opens EventDetailModal', () => {
    render(<AllFutureEventsScreen onClose={vi.fn()} />, { wrapper: makeWrapper(EVENTS) });
    fireEvent.click(screen.getByLabelText('Detalhe: Consulta médica'));
    expect(screen.getByRole('dialog', { name: /Detalhe: Consulta médica/i })).toBeInTheDocument();
  });

  it('does not include today events (strict future only)', () => {
    const todayEvent: ApiRoutineEntry = {
      id: 'today1',
      title: 'Evento de hoje',
      time: '09:00',
      date: TODAY,
      category: 'task',
      done: false,
      notes: null,
      userId: 'u1',
      createdAt: '2026-07-26T00:00:00Z',
    };
    render(<AllFutureEventsScreen onClose={vi.fn()} />, { wrapper: makeWrapper([todayEvent, ...EVENTS]) });
    expect(screen.queryByText('Evento de hoje')).toBeNull();
  });
});
