import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RegisterScreen } from './RegisterScreen';
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

describe('RegisterScreen', () => {
  it('renders step 1 fields: Nome, E-mail, Senha', () => {
    wrap(<RegisterScreen onBack={vi.fn()} />);
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
  });

  it('"Continuar" is disabled until all step 1 fields are valid', () => {
    wrap(<RegisterScreen onBack={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /continuar/i });
    expect(btn).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: '12345678' } });
    expect(btn).not.toBeDisabled();
  });

  it('advances to step 2 after valid step 1 + Continuar click', () => {
    wrap(<RegisterScreen onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByText(/dados gestacionais/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/semana da gravidez/i)).toBeInTheDocument();
  });

  it('switching to Pós-parto shows "Dias de vida do bebê" input', () => {
    wrap(<RegisterScreen onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.click(screen.getByRole('button', { name: /pós-parto/i }));
    expect(screen.getByLabelText(/dias de vida/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/semana da gravidez/i)).not.toBeInTheDocument();
  });

  it('calls POST /auth/register and calls setAuth on success', async () => {
    const fakeUser = {
      id: '1', email: 'ana@test.com', name: 'Ana',
      pregnancyStage: 'pregnant', pregnancyWeek: 28,
      babyAgeInDays: null, babyName: null,
      onboardingDone: false, profileKey: null, archetypeKey: null,
    };
    mockApiFetch.mockResolvedValueOnce({ accessToken: 'tok', user: fakeUser });
    wrap(<RegisterScreen onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.change(screen.getByLabelText(/semana da gravidez/i), { target: { value: '28' } });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/auth/register', expect.objectContaining({ method: 'POST' }));
      expect(useAppStore.getState().isLoggedIn).toBe(true);
    });
  });

  it('shows 409 error when email already registered', async () => {
    const ApiErrorClass = (await import('../../lib/api')).ApiError;
    mockApiFetch.mockRejectedValueOnce(new ApiErrorClass(409, {}));
    wrap(<RegisterScreen onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.change(screen.getByLabelText(/semana da gravidez/i), { target: { value: '28' } });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/e-mail já está cadastrado/i);
    });
  });

  it('back button on step 2 returns to step 1', () => {
    wrap(<RegisterScreen onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.click(screen.getByLabelText(/voltar/i));
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
  });

  it('back button on step 1 calls onBack', () => {
    const onBack = vi.fn();
    wrap(<RegisterScreen onBack={onBack} />);
    fireEvent.click(screen.getByLabelText(/voltar/i));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
