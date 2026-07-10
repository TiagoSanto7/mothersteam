import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppHeader } from './AppHeader';

describe('AppHeader', () => {
  it("renders Mother's Team logo text", () => {
    render(<AppHeader onOpenDrawer={() => {}} />);
    expect(screen.getByText("Mother's Team")).toBeInTheDocument();
  });

  it('renders hamburger button with correct aria-label', () => {
    render(<AppHeader onOpenDrawer={() => {}} />);
    expect(screen.getByRole('button', { name: /abrir menu/i })).toBeInTheDocument();
  });

  it('calls onOpenDrawer when hamburger button is clicked', () => {
    const fn = vi.fn();
    render(<AppHeader onOpenDrawer={fn} />);
    fireEvent.click(screen.getByRole('button', { name: /abrir menu/i }));
    expect(fn).toHaveBeenCalledOnce();
  });

  it('renders rightSlot when provided', () => {
    render(
      <AppHeader onOpenDrawer={() => {}} rightSlot={<button>Mensagens</button>} />
    );
    expect(screen.getByRole('button', { name: 'Mensagens' })).toBeInTheDocument();
  });

  it('renders only one button when rightSlot is not provided', () => {
    render(<AppHeader onOpenDrawer={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
