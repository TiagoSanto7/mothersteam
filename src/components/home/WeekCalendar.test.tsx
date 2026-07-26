import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WeekCalendar } from './WeekCalendar';
import { useAppStore } from '../../store/useAppStore';

// Fix "today" to a known Saturday so rolling window is predictable.
// 2026-06-27 is a Saturday; last 7 days = Sun 2026-06-21 … Sat 2026-06-27.
const FIXED_TODAY = '2026-06-27';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${FIXED_TODAY}T12:00:00`));
  useAppStore.setState({ selectedDate: FIXED_TODAY });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WeekCalendar — rolling 7-day window', () => {
  it('renders exactly 7 day buttons', () => {
    render(<WeekCalendar />);
    const dayButtons = screen.getAllByRole('button').filter(
      (b) => b.hasAttribute('aria-pressed'),
    );
    expect(dayButtons).toHaveLength(7);
  });

  it('does NOT render prev/next navigation buttons', () => {
    render(<WeekCalendar />);
    expect(screen.queryByLabelText('Semana anterior')).toBeNull();
    expect(screen.queryByLabelText('Próxima semana')).toBeNull();
  });

  it('today is the last (rightmost) day — date 27', () => {
    render(<WeekCalendar />);
    const dayButtons = screen
      .getAllByRole('button')
      .filter((b) => b.hasAttribute('aria-pressed'));
    const lastButton = dayButtons[dayButtons.length - 1];
    expect(lastButton.textContent).toContain('27');
  });

  it('first day of the window is 6 days ago — date 21', () => {
    render(<WeekCalendar />);
    const dayButtons = screen
      .getAllByRole('button')
      .filter((b) => b.hasAttribute('aria-pressed'));
    expect(dayButtons[0].textContent).toContain('21');
  });

  it('highlights the selected date with aria-pressed=true', () => {
    render(<WeekCalendar />);
    const selected = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(selected).toHaveLength(1);
  });

  it('clicking a day updates selectedDate in store', () => {
    render(<WeekCalendar />);
    const dayButtons = screen
      .getAllByRole('button')
      .filter((b) => b.hasAttribute('aria-pressed'));
    fireEvent.click(dayButtons[0]);
    expect(useAppStore.getState().selectedDate).toBe('2026-06-21');
  });

  it('renders "ver outras datas" link', () => {
    render(<WeekCalendar />);
    expect(screen.getByText('ver outras datas')).toBeInTheDocument();
  });

  it('hidden date input is rendered for the picker', () => {
    render(<WeekCalendar />);
    const input = screen.getByLabelText('Selecionar data');
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).type).toBe('date');
  });

  it('changing the hidden date input updates selectedDate', () => {
    render(<WeekCalendar />);
    const input = screen.getByLabelText('Selecionar data') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-07-15' } });
    expect(useAppStore.getState().selectedDate).toBe('2026-07-15');
  });

  it('shows day names in Portuguese', () => {
    render(<WeekCalendar />);
    // 2026-06-21 is a Sunday → first visible day label is "Dom"
    expect(screen.getByText('Dom')).toBeInTheDocument();
    // 2026-06-27 is a Saturday → last visible day label is "Sáb"
    expect(screen.getByText('Sáb')).toBeInTheDocument();
  });
});
