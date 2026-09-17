import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BabyEntryEditSheet } from './BabyEntryEditSheet';
import type { ApiBabyEntry } from '../../lib/types';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

const base = { userId: 'u1', createdAt: new Date(2026, 8, 16, 9, 0).toISOString() };
const diaper: ApiBabyEntry = { ...base, id: 'd1', time: '09:00', type: 'diaper', detail: 'Xixi' };
const feed: ApiBabyEntry = { ...base, id: 'f1', time: '09:00', type: 'feed', detail: 'Mamou — seio esquerdo' };
const sleep: ApiBabyEntry = { ...base, id: 's1', time: '09:00', type: 'sleep', detail: 'Dormiu por 45 min' };

function renderSheet(entry: ApiBabyEntry, onClose = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <BabyEntryEditSheet entry={entry} onClose={onClose} />
    </QueryClientProvider>,
  );
  return onClose;
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockResolvedValue({ ok: true });
});

describe('BabyEntryEditSheet', () => {
  it('começa com o registro atual e sem nada para salvar', () => {
    renderSheet(feed);
    expect(screen.getByRole('dialog', { name: 'Editar amamentação' })).toBeInTheDocument();
    expect(screen.getByLabelText('Horário')).toHaveValue('09:00');
    expect(screen.getByRole('button', { name: /esquerdo/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  });

  it('corrige o tipo da fralda e fecha', async () => {
    const onClose = renderSheet(diaper);
    fireEvent.click(screen.getByRole('button', { name: /cocô/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockApiFetch).toHaveBeenCalledWith('/baby/d1', {
      method: 'PATCH',
      body: JSON.stringify({ detail: 'Coco' }),
    });
  });

  it('ao mudar o horário, mantém o mesmo dia e envia o novo createdAt', async () => {
    renderSheet(diaper);
    fireEvent.change(screen.getByLabelText('Horário'), { target: { value: '07:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body);
    expect(body.time).toBe('07:30');
    expect(new Date(body.createdAt).getTime()).toBe(new Date(2026, 8, 16, 7, 30).getTime());
    expect(body.detail).toBeUndefined();
  });

  it('edita a duração da soneca', async () => {
    renderSheet(sleep);
    fireEvent.click(screen.getByLabelText('Aumentar h'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/baby/s1', {
      method: 'PATCH',
      body: JSON.stringify({ detail: 'Dormiu por 105 min' }),
    }));
  });

  it('pede confirmação antes de excluir', async () => {
    const onClose = renderSheet(diaper);
    fireEvent.click(screen.getByLabelText('Excluir registro'));
    expect(mockApiFetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Excluir registro'));
    fireEvent.click(screen.getByRole('button', { name: 'Sim, excluir' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockApiFetch).toHaveBeenCalledWith('/baby/d1', { method: 'DELETE' });
  });

  it('mostra erro e não fecha quando a API falha', async () => {
    mockApiFetch.mockRejectedValue(new Error('offline'));
    const onClose = renderSheet(diaper);
    fireEvent.click(screen.getByRole('button', { name: /ambos/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar');
    expect(onClose).not.toHaveBeenCalled();
  });
});
