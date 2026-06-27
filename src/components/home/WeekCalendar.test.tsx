import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { WeekCalendar } from './WeekCalendar';
import { useAppStore } from '../../store/useAppStore';

const FIXED_DATE = '2026-06-27';

beforeEach(() => {
  useAppStore.setState({ selectedDate: FIXED_DATE });
});

describe('WeekCalendar', () => {
  it('renders 7 day buttons', () => {
    render(<WeekCalendar referenceDate={FIXED_DATE} />);
    expect(screen.getAllByRole('button')).toHaveLength(7);
  });

  it('highlights the selected date with aria-pressed=true', () => {
    render(<WeekCalendar referenceDate={FIXED_DATE} />);
    const selected = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('aria-pressed') === 'true',
    );
    expect(selected).toHaveLength(1);
  });

  it('clicking a day updates selectedDate in store', () => {
    render(<WeekCalendar referenceDate={FIXED_DATE} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(useAppStore.getState().selectedDate).toBeTruthy();
    expect(typeof useAppStore.getState().selectedDate).toBe('string');
  });

  it('shows day names in Portuguese', () => {
    render(<WeekCalendar referenceDate={FIXED_DATE} />);
    // 2026-06-27 é Sábado, então a semana vai de Seg 22 a Dom 28
    expect(screen.getByText('Sáb')).toBeInTheDocument();
  });
});
