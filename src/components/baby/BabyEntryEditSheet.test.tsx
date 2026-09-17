import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BabyEntryEditSheet } from './BabyEntryEditSheet';
import type { ApiBabyEntry } from '../../lib/types';

const base = { userId: 'u1', createdAt: new Date(2026, 8, 16, 9, 0).toISOString() };
const diaper: ApiBabyEntry = { ...base, id: 'd1', time: '09:00', type: 'diaper', detail: 'Xixi' };
const feed: ApiBabyEntry = { ...base, id: 'f1', time: '09:00', type: 'feed', detail: 'Mamou — seio esquerdo' };
const sleep: ApiBabyEntry = { ...base, id: 's1', time: '09:00', type: 'sleep', detail: 'Dormiu por 45 min' };

function renderSheet(entry: ApiBabyEntry) {
  const props = { onClose: vi.fn(), onSave: vi.fn(), onDelete: vi.fn() };
  render(<BabyEntryEditSheet entry={entry} {...props} />);
  return props;
}

describe('BabyEntryEditSheet', () => {
  it('começa com o registro atual e sem nada para salvar', () => {
    renderSheet(feed);
    expect(screen.getByRole('dialog', { name: 'Editar amamentação' })).toBeInTheDocument();
    expect(screen.getByLabelText('Horário')).toHaveValue('09:00');
    expect(screen.getByRole('button', { name: /esquerdo/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  });

  it('salvar entrega só o que mudou e fecha na hora', () => {
    const { onSave, onClose } = renderSheet(diaper);
    fireEvent.click(screen.getByRole('button', { name: /cocô/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(onSave).toHaveBeenCalledWith('d1', { detail: 'Coco' });
    expect(onClose).toHaveBeenCalled();
  });

  it('ao mudar o horário, mantém o mesmo dia e envia o novo createdAt', () => {
    const { onSave } = renderSheet(diaper);
    fireEvent.change(screen.getByLabelText('Horário'), { target: { value: '07:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    const [, changes] = onSave.mock.calls[0];
    expect(changes.time).toBe('07:30');
    expect(new Date(changes.createdAt).getTime()).toBe(new Date(2026, 8, 16, 7, 30).getTime());
    expect(changes.detail).toBeUndefined();
  });

  it('edita a duração da soneca', () => {
    const { onSave } = renderSheet(sleep);
    fireEvent.click(screen.getByLabelText('Aumentar h'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(onSave).toHaveBeenCalledWith('s1', { detail: 'Dormiu por 105 min' });
  });

  it('pede confirmação antes de excluir', () => {
    const { onDelete, onClose } = renderSheet(diaper);
    fireEvent.click(screen.getByLabelText('Excluir registro'));
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Excluir registro'));
    fireEvent.click(screen.getByRole('button', { name: 'Sim, excluir' }));
    expect(onDelete).toHaveBeenCalledWith('d1');
    expect(onClose).toHaveBeenCalled();
  });
});
