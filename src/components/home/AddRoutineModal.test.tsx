import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddRoutineModal } from './AddRoutineModal';
import { useAppStore } from '../../store/useAppStore';
import type { RoutineEntry } from '../../types';

vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({}),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const DEFAULT_DATE = '2026-07-26';

beforeEach(() => {
  useAppStore.setState({ selectedDate: DEFAULT_DATE });
  vi.clearAllMocks();
});

describe('AddRoutineModal — notas', () => {
  it('renders the Observação textarea', () => {
    render(<AddRoutineModal onClose={vi.fn()} defaultDate={DEFAULT_DATE} />, { wrapper });
    expect(screen.getByLabelText(/Observação/i)).toBeInTheDocument();
  });

  it('shows character counter starting at 0/300', () => {
    render(<AddRoutineModal onClose={vi.fn()} defaultDate={DEFAULT_DATE} />, { wrapper });
    expect(screen.getByText('0/300')).toBeInTheDocument();
  });

  it('updates counter as user types notes', () => {
    render(<AddRoutineModal onClose={vi.fn()} defaultDate={DEFAULT_DATE} />, { wrapper });
    const textarea = screen.getByLabelText(/Observação/i);
    fireEvent.change(textarea, { target: { value: 'Beber água' } });
    expect(screen.getByText('10/300')).toBeInTheDocument();
  });

  it('adds button is labelled "Adicionar" in create mode', () => {
    render(<AddRoutineModal onClose={vi.fn()} defaultDate={DEFAULT_DATE} />, { wrapper });
    expect(screen.getByRole('button', { name: /Adicionar/i })).toBeInTheDocument();
  });

  it('dialog label changes to "Editar evento" in edit mode', () => {
    const editEntry: RoutineEntry = {
      id: 'e1',
      title: 'Consulta pré-natal',
      time: '09:00',
      date: DEFAULT_DATE,
      category: 'appointment',
      done: false,
      notes: 'Trazer exames',
    };
    render(
      <AddRoutineModal onClose={vi.fn()} defaultDate={DEFAULT_DATE} editEntry={editEntry} />,
      { wrapper },
    );
    expect(screen.getByRole('dialog', { name: /Editar evento/i })).toBeInTheDocument();
  });

  it('pre-fills notes textarea when in edit mode', () => {
    const editEntry: RoutineEntry = {
      id: 'e2',
      title: 'Vitamina D',
      time: '08:00',
      date: DEFAULT_DATE,
      category: 'medication',
      done: false,
      notes: 'Tomar com água',
    };
    render(
      <AddRoutineModal onClose={vi.fn()} defaultDate={DEFAULT_DATE} editEntry={editEntry} />,
      { wrapper },
    );
    const textarea = screen.getByLabelText(/Observação/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Tomar com água');
  });

  it('calls apiFetch POST when submitting in create mode', async () => {
    const { apiFetch } = await import('../../lib/api');
    render(<AddRoutineModal onClose={vi.fn()} defaultDate={DEFAULT_DATE} />, { wrapper });

    fireEvent.change(screen.getByLabelText(/O que você precisa fazer/i), { target: { value: 'Tarefa teste' } });
    fireEvent.change(screen.getByLabelText(/Observação/i), { target: { value: 'nota aqui' } });
    fireEvent.click(screen.getByRole('button', { name: /Adicionar/i }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/routine',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    const callArg = JSON.parse((apiFetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(callArg.notes).toBe('nota aqui');
  });

  it('calls apiFetch PATCH when submitting in edit mode', async () => {
    const { apiFetch } = await import('../../lib/api');
    const editEntry: RoutineEntry = {
      id: 'e3',
      title: 'Consulta',
      time: '10:00',
      date: DEFAULT_DATE,
      category: 'appointment',
      done: false,
    };
    render(
      <AddRoutineModal onClose={vi.fn()} defaultDate={DEFAULT_DATE} editEntry={editEntry} />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole('button', { name: /Salvar/i }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        `/routine/${editEntry.id}`,
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });
});
