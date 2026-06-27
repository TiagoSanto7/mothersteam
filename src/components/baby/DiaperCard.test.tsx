import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DiaperCard } from './DiaperCard';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  useAppStore.setState({ diaperCount: 0, babyEntries: [] });
});

describe('DiaperCard', () => {
  it('shows initial count of 0', () => {
    render(<DiaperCard />);
    expect(screen.getByTestId('diaper-count')).toHaveTextContent('0');
  });

  it('increments count on button click', () => {
    render(<DiaperCard />);
    fireEvent.click(screen.getByRole('button', { name: /registrar troca de fralda/i }));
    expect(useAppStore.getState().diaperCount).toBe(1);
    expect(screen.getByTestId('diaper-count')).toHaveTextContent('1');
  });

  it('increments multiple times correctly', () => {
    render(<DiaperCard />);
    const btn = screen.getByRole('button', { name: /registrar troca de fralda/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(useAppStore.getState().diaperCount).toBe(3);
  });

  it('adds a baby entry on click', () => {
    render(<DiaperCard />);
    fireEvent.click(screen.getByRole('button', { name: /registrar troca de fralda/i }));
    expect(useAppStore.getState().babyEntries).toHaveLength(1);
    expect(useAppStore.getState().babyEntries[0].type).toBe('diaper');
  });
});
