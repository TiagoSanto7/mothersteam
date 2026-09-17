import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WeekCalendar, pageAfterSwipe } from './WeekCalendar';
import { useAppStore } from '../../store/useAppStore';

// 2026-09-17 is a Thursday; its week (Dom–Sáb) is 2026-09-13 … 2026-09-19.
const FIXED_TODAY = '2026-09-17';

const dayButtons = () => screen.getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 17, 12, 0));
  useAppStore.setState({ selectedDate: FIXED_TODAY });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WeekCalendar — semana deslizável', () => {
  it('mostra os 7 dias de domingo a sábado da semana selecionada', () => {
    render(<WeekCalendar />);
    const days = dayButtons();
    expect(days).toHaveLength(7);
    expect(days[0]).toHaveTextContent('Dom');
    expect(days[0]).toHaveTextContent('13');
    expect(days[6]).toHaveTextContent('Sáb');
    expect(days[6]).toHaveTextContent('19');
  });

  it('marca só o dia selecionado', () => {
    render(<WeekCalendar />);
    const selected = dayButtons().filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent('17');
  });

  it('tocar num dia atualiza a data no store, inclusive dias futuros', () => {
    render(<WeekCalendar />);
    fireEvent.click(dayButtons()[6]);
    expect(useAppStore.getState().selectedDate).toBe('2026-09-19');
  });

  it('mostra o mês e ano da data selecionada', () => {
    render(<WeekCalendar />);
    expect(screen.getByTestId('week-month-label')).toHaveTextContent(/setembro de 2026/i);
  });

  it('botão Hoje só aparece fora de hoje e volta para hoje', () => {
    render(<WeekCalendar />);
    expect(screen.queryByLabelText('Voltar para hoje')).not.toBeInTheDocument();

    fireEvent.click(dayButtons()[0]);
    fireEvent.click(screen.getByLabelText('Voltar para hoje'));
    expect(useAppStore.getState().selectedDate).toBe(FIXED_TODAY);
  });

  it('a semana acompanha a data escolhida', () => {
    useAppStore.setState({ selectedDate: '2026-10-02' });
    render(<WeekCalendar />);
    const days = dayButtons();
    expect(days[0]).toHaveTextContent('27'); // domingo 27/09
    expect(days[6]).toHaveTextContent('3'); // sábado 03/10
    expect(screen.getByTestId('week-month-label')).toHaveTextContent(/outubro de 2026/i);
  });

  it('"ver outras datas" (o mês) abre o calendário do app e permite escolher data futura', async () => {
    render(<WeekCalendar />);
    fireEvent.click(screen.getByRole('button', { name: /ver outras datas/i }));
    const calendar = screen.getByRole('dialog', { name: 'Selecionar data' });

    const target = within(calendar)
      .getAllByRole('button')
      .find((b) => b.closest('[data-day]')?.getAttribute('data-day') === '2026-09-25');
    expect(target).toBeDefined();
    expect(target).toBeEnabled();
    fireEvent.click(target!);

    expect(screen.queryByRole('dialog', { name: 'Selecionar data' })).not.toBeInTheDocument();
    // Next week is adjacent: it pages over with the spring, then commits.
    await waitFor(() => expect(useAppStore.getState().selectedDate).toBe('2026-09-25'));
  });
});

describe('pageAfterSwipe', () => {
  const W = 360;

  it('arrastar mais da metade para a esquerda vai para a próxima semana', () => {
    expect(pageAfterSwipe(-200, 0, W)).toBe(1);
  });

  it('arrastar mais da metade para a direita volta uma semana', () => {
    expect(pageAfterSwipe(200, 0, W)).toBe(-1);
  });

  it('um peteleco rápido troca a semana mesmo com arrasto curto (velocidade projetada)', () => {
    expect(pageAfterSwipe(-60, -1200, W)).toBe(1);
    expect(pageAfterSwipe(60, 1200, W)).toBe(-1);
  });

  it('arrasto curto e lento volta para a mesma semana', () => {
    expect(pageAfterSwipe(-80, -100, W)).toBe(0);
  });

  it('peteleco contra a direção do arrasto não troca a semana', () => {
    expect(pageAfterSwipe(-150, 900, W)).toBe(0);
  });
});
