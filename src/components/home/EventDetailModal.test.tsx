import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EventDetailModal } from './EventDetailModal';
import { useAppStore } from '../../store/useAppStore';
import type { ApiRoutineEntry } from '../../lib/types';

vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({ ok: true }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const ENTRY: ApiRoutineEntry = {
  id: 'abc123',
  title: 'Consulta pré-natal',
  time: '14:00',
  date: '2026-08-10',
  category: 'appointment',
  done: false,
  notes: 'Trazer carteira de vacinação',
  userId: 'u1',
  createdAt: '2026-07-26T10:00:00Z',
};

beforeEach(() => {
  useAppStore.setState({ selectedDate: '2026-07-26' });
  vi.clearAllMocks();
});

describe('EventDetailModal', () => {
  it('renders the event title', () => {
    render(<EventDetailModal entry={ENTRY} onClose={vi.fn()} />, { wrapper });
    expect(screen.getByText('Consulta pré-natal')).toBeInTheDocument();
  });

  it('renders the time', () => {
    render(<EventDetailModal entry={ENTRY} onClose={vi.fn()} />, { wrapper });
    expect(screen.getByText('14:00')).toBeInTheDocument();
  });

  it('renders the category label', () => {
    render(<EventDetailModal entry={ENTRY} onClose={vi.fn()} />, { wrapper });
    // The category label is "📅 Consulta" — query by exact emoji+label text
    expect(screen.getByText('📅 Consulta')).toBeInTheDocument();
  });

  it('renders notes when present', () => {
    render(<EventDetailModal entry={ENTRY} onClose={vi.fn()} />, { wrapper });
    expect(screen.getByText('Trazer carteira de vacinação')).toBeInTheDocument();
  });

  it('does not render notes section when notes is absent', () => {
    const entryNoNotes = { ...ENTRY, notes: null };
    render(<EventDetailModal entry={entryNoNotes} onClose={vi.fn()} />, { wrapper });
    expect(screen.queryByText('Observação')).toBeNull();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<EventDetailModal entry={ENTRY} onClose={onClose} />, { wrapper });
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows delete confirmation on clicking Excluir', () => {
    render(<EventDetailModal entry={ENTRY} onClose={vi.fn()} />, { wrapper });
    fireEvent.click(screen.getByLabelText('Excluir evento'));
    expect(screen.getByText('Excluir este evento?')).toBeInTheDocument();
  });

  it('calls DELETE API on confirming delete', async () => {
    const { apiFetch } = await import('../../lib/api');
    render(<EventDetailModal entry={ENTRY} onClose={vi.fn()} />, { wrapper });
    fireEvent.click(screen.getByLabelText('Excluir evento'));
    fireEvent.click(screen.getByRole('button', { name: /^Excluir$/ }));
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        `/routine/${ENTRY.id}`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  it('"ir para a data" sets selectedDate in store', () => {
    render(<EventDetailModal entry={ENTRY} onClose={vi.fn()} />, { wrapper });
    fireEvent.click(screen.getByText(/ir para a data/i));
    expect(useAppStore.getState().selectedDate).toBe('2026-08-10');
  });

  it('opens AddRoutineModal in edit mode on clicking Editar', () => {
    render(<EventDetailModal entry={ENTRY} onClose={vi.fn()} />, { wrapper });
    fireEvent.click(screen.getByLabelText('Editar evento'));
    expect(screen.getByRole('dialog', { name: /Editar evento/i })).toBeInTheDocument();
  });
});
