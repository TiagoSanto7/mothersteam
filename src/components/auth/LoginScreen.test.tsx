import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginScreen } from './LoginScreen';
import { useAppStore } from '../../store/useAppStore';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', () => ({
  apiFetch: mockApiFetch,
  ApiError: class extends Error {
    constructor(public status: number, public body: unknown) { super(`API ${status}`); }
  },
}));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  mockApiFetch.mockReset();
  useAppStore.setState({ isLoggedIn: false });
});

describe('LoginScreen', () => {
  it('renders "Criar conta" button', () => {
    wrap(<LoginScreen />);
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument();
  });

  it('clicking "Criar conta" shows RegisterScreen step 1', () => {
    wrap(<LoginScreen />);
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    expect(screen.getByLabelText(/^nome$/i)).toBeInTheDocument();
  });

  it('RegisterScreen back button returns to LoginScreen', () => {
    wrap(<LoginScreen />);
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    fireEvent.click(screen.getByLabelText(/voltar/i));
    expect(screen.getByRole('button', { name: /^entrar$/i })).toBeInTheDocument();
  });
});
