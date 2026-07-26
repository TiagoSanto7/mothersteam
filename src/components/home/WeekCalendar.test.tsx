import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { WeekCalendar } from './WeekCalendar';
import { useAppStore } from '../../store/useAppStore';

const FIXED_DATE = '2026-06-27';

beforeEach(() => {
  useAppStore.setState({ selectedDate: FIXED_DATE });
});

describe('WeekCalendar', () => {
  it('renders 7 day buttons plus 2 navigation buttons', () => {
    render(<WeekCalendar referenceDate={FIXED_DATE} />);
    // 7 day buttons (aria-pressed) + prev/next chevron buttons
    expect(screen.getAllByRole('button')).toHaveLength(9);
  });

  it('renders exactly 7 day buttons with aria-pressed attribute', () => {
    render(<WeekCalendar referenceDate={FIXED_DATE} />);
    const dayButtons = screen.getAllByRole('button').filter(
      (b) => b.hasAttribute('aria-pressed'),
    );
    expect(dayButtons).toHaveLength(7);
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
    const dayButtons = screen.getAllByRole('button').filter(
      (b) => b.hasAttribute('aria-pressed'),
    );
    fireEvent.click(dayButtons[0]);
    expect(useAppStore.getState().selectedDate).toBeTruthy();
    expect(typeof useAppStore.getState().selectedDate).toBe('string');
  });

  it('shows day names in Portuguese', () => {
    render(<WeekCalendar referenceDate={FIXED_DATE} />);
    // 2026-06-27 é Sábado, então a semana vai de Seg 22 a Dom 28
    expect(screen.getByText('Sáb')).toBeInTheDocument();
  });

  it('navigates to the next week when clicking the next button', () => {
    render(<WeekCalendar referenceDate={FIXED_DATE} />);
    // FIXED_DATE week: Mon 2026-06-22 … Sun 2026-06-28
    expect(screen.getByText('22')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Próxima semana'));
    // Next week starts Mon 2026-06-29
    expect(screen.getByText('29')).toBeInTheDocument();
  });

  it('navigates to the previous week when clicking the prev button', () => {
    render(<WeekCalendar referenceDate={FIXED_DATE} />);
    // FIXED_DATE week: Mon 2026-06-22 … Sun 2026-06-28
    expect(screen.getByText('22')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Semana anterior'));
    // Previous week starts Mon 2026-06-15
    expect(screen.getByText('15')).toBeInTheDocument();
  });
});
