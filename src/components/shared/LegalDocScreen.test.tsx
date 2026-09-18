import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LegalDocScreen } from './LegalDocScreen';

describe('LegalDocScreen (TIA-49)', () => {
  it('renders termos.html in a local iframe, not an external link', () => {
    render(<LegalDocScreen doc="termos" onBack={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /termos de uso/i })).toBeInTheDocument();
    const frame = screen.getByTitle(/termos de uso/i);
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('src', '/termos.html');
  });

  it('renders privacidade.html in a local iframe', () => {
    render(<LegalDocScreen doc="privacidade" onBack={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /política de privacidade/i })).toBeInTheDocument();
    expect(screen.getByTitle(/política de privacidade/i)).toHaveAttribute('src', '/privacidade.html');
  });

  it('calls onBack when the back button is clicked', () => {
    const onBack = vi.fn();
    render(<LegalDocScreen doc="termos" onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
