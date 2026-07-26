import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UpcomingEventsCard } from './UpcomingEventsCard';
import { useAppStore } from '../../store/useAppStore';
import type { ApiRoutineEntry } from '../../lib/types';

const TODAY = '2026-07-26';

// Two events strictly in the future
const FUTURE_EVENTS: ApiRoutineEntry[] = [
  {
    id: 'e1',
    title: 'Consulta obstétrica',
    time: '10:00',
    date: '2026-07-30',
    category: 'appointment',
    done: false,
    notes: 'Trazer exames',
    userId: 'u1',
    createdAt: '2026-07-26T00:00:00Z',
  },
  {
    id: 'e2',
    title: 'Tomar vitamina',
    time: '08:00',
    date: '2026-07-31',
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

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T12:00:00`));
  useAppStore.setState({ isLoggedIn: true, selectedDate: TODAY });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('UpcomingEventsCard', () => {
  it('renders nothing when there are no future events', async () => {
    const { apiFetch } = await import('../../lib/api');
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { container } = render(<UpcomingEventsCard />, { wrapper });
    // Give time for query to settle
    expect(container.firstChild).toBeNull();
  });

  it('renders up to 2 upcoming events', async () => {
    const { apiFetch } = await import('../../lib/api');
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue(FUTURE_EVENTS);

    const { rerender } = render(<UpcomingEventsCard />, { wrapper });

    // Manually inject data into cache
    const qc = new QueryClient();
    qc.setQueryData(['routine', 'future'], FUTURE_EVENTS);

    // Re-render with pre-seeded cache
    function wrapperWithData({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    }
    rerender(<UpcomingEventsCard />);

    // Verify the section heading is present once data exists
    // (the card is null when 0 future events, truthy structure when >0)
    // We test the logic separately with pre-seeded cache:
    const { getByText } = render(<UpcomingEventsCard />, { wrapper: wrapperWithData });
    expect(getByText('Próximos Eventos')).toBeInTheDocument();
    expect(getByText('Consulta obstétrica')).toBeInTheDocument();
    expect(getByText('Tomar vitamina')).toBeInTheDocument();
  });

  it('shows notes snippet when notes is present', async () => {
    const qc = new QueryClient();
    qc.setQueryData(['routine', 'future'], FUTURE_EVENTS);
    function wrapperWithData({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    }
    render(<UpcomingEventsCard />, { wrapper: wrapperWithData });
    expect(screen.getByText('Trazer exames')).toBeInTheDocument();
  });

  it('renders "ver outros eventos" link', async () => {
    const qc = new QueryClient();
    qc.setQueryData(['routine', 'future'], FUTURE_EVENTS);
    function wrapperWithData({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    }
    render(<UpcomingEventsCard />, { wrapper: wrapperWithData });
    expect(screen.getByLabelText('Ver outros eventos')).toBeInTheDocument();
  });

  it('clicking "ver outros eventos" opens AllFutureEventsScreen', async () => {
    const qc = new QueryClient();
    qc.setQueryData(['routine', 'future'], FUTURE_EVENTS);
    function wrapperWithData({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    }
    render(<UpcomingEventsCard />, { wrapper: wrapperWithData });
    fireEvent.click(screen.getByLabelText('Ver outros eventos'));
    expect(screen.getByRole('dialog', { name: /Todos os eventos futuros/i })).toBeInTheDocument();
  });

  it('clicking an event opens EventDetailModal', async () => {
    const qc = new QueryClient();
    qc.setQueryData(['routine', 'future'], FUTURE_EVENTS);
    function wrapperWithData({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    }
    render(<UpcomingEventsCard />, { wrapper: wrapperWithData });
    fireEvent.click(screen.getByLabelText('Detalhe: Consulta obstétrica'));
    expect(screen.getByRole('dialog', { name: /Detalhe: Consulta obstétrica/i })).toBeInTheDocument();
  });
});
