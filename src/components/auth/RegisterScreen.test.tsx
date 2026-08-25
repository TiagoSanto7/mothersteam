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

/** Fills step 1 and clicks Continuar. */
function fillStep1() {
  fireEvent.change(screen.getByLabelText(/^nome$/i), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@test.com' } });
  fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: '12345678' } });
  fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
}

/** Fills step 2 minimum (pregnant + week 28) and clicks Continuar. */
function fillStep2() {
  fireEvent.change(screen.getByLabelText(/semana da gravidez/i), { target: { value: '28' } });
  fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
}

/** Skips step 3. */
function skipStep3() {
  fireEvent.click(screen.getByRole('button', { name: /pular/i }));
}

/** Fills step 4 (mood + support) and clicks Continuar. */
function fillStep4() {
  fireEvent.click(screen.getByLabelText(/cansada mas lidando/i));
  fireEvent.click(screen.getByLabelText(/ajuda em momentos específicos/i));
  fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
}

/** Fills step 5 (goal + concern + terms). Does NOT submit. */
function fillStep5() {
  fireEvent.click(screen.getByLabelText(/melhorar o sono/i));
  fireEvent.click(screen.getByLabelText(/choro, cólicas, sono do bebê/i));
  fireEvent.click(screen.getByLabelText(/li e aceito os termos/i));
}

beforeEach(() => {
  mockApiFetch.mockReset();
  useAppStore.setState({ isLoggedIn: false });
});

describe('RegisterScreen', () => {
  it('renders step 1 fields: Nome, E-mail, Senha', () => {
    wrap(<RegisterScreen onBack={vi.fn()} />);
    expect(screen.getByLabelText(/^nome$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
  });

  it('"Continuar" is disabled until all step 1 fields are valid', () => {
    wrap(<RegisterScreen onBack={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /continuar/i });
    expect(btn).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^nome$/i), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: '12345678' } });
    expect(btn).not.toBeDisabled();
  });

  it('advances to step 2 (Sobre a gestação) after valid step 1 + Continuar click', () => {
    wrap(<RegisterScreen onBack={vi.fn()} />);
    fillStep1();
    expect(screen.getByRole('heading', { name: /sobre a gestação/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/semana da gravidez/i)).toBeInTheDocument();
  });

  it('switching to Pós-parto shows "Dias de vida do bebê" input', () => {
    wrap(<RegisterScreen onBack={vi.fn()} />);
    fillStep1();
    fireEvent.click(screen.getByRole('button', { name: /pós-parto/i }));
    expect(screen.getByLabelText(/dias de vida/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/semana da gravidez/i)).not.toBeInTheDocument();
  });

  it('completes all 5 steps and submits full payload with new fields', async () => {
    const fakeUser = {
      id: '1', email: 'ana@test.com', name: 'Ana',
      pregnancyStage: 'pregnant', pregnancyWeek: 28,
      babyAgeInDays: null, babyName: null,
      onboardingDone: false, profileKey: null, archetypeKey: null,
    };
    mockApiFetch.mockResolvedValueOnce({ accessToken: 'tok', refreshToken: 'ref', user: fakeUser });

    wrap(<RegisterScreen onBack={vi.fn()} />);
    fillStep1();
    // step 2
    expect(screen.getByRole('heading', { name: /sobre a gestação/i })).toBeInTheDocument();
    fillStep2();
    // step 3
    expect(screen.getByRole('heading', { name: /outros filhos/i })).toBeInTheDocument();
    skipStep3();
    // step 4
    expect(screen.getByRole('heading', { name: /como você está/i })).toBeInTheDocument();
    fillStep4();
    // step 5
    expect(screen.getByRole('heading', { name: /objetivos e termos/i })).toBeInTheDocument();
    fillStep5();

    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/auth/register', expect.objectContaining({ method: 'POST' }));
      expect(useAppStore.getState().isLoggedIn).toBe(true);
    });

    // Inspect the body we sent
    const [, options] = mockApiFetch.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body).toMatchObject({
      name: 'Ana',
      email: 'ana@test.com',
      pregnancyStage: 'pregnant',
      pregnancyWeek: 28,
      acceptedTerms: true,
      hasMultiples: false,
      mood: 'B',
      supportNetwork: 'B',
      goal: 'C',
      concern: 'B',
    });
    expect(body.otherChildren).toEqual([]);
  });

  it('"Criar conta" is disabled on step 5 until goal + concern + terms are all set', async () => {
    wrap(<RegisterScreen onBack={vi.fn()} />);
    fillStep1();
    fillStep2();
    skipStep3();
    fillStep4();
    // On step 5
    const submit = screen.getByRole('button', { name: /criar conta/i });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/melhorar o sono/i));
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/choro, cólicas, sono do bebê/i));
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/li e aceito os termos/i));
    expect(submit).not.toBeDisabled();
  });

  it('step 4 "Continuar" is disabled until both mood and support are chosen', () => {
    wrap(<RegisterScreen onBack={vi.fn()} />);
    fillStep1();
    fillStep2();
    skipStep3();
    const btn = screen.getByRole('button', { name: /continuar/i });
    expect(btn).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/confiante e animada/i));
    expect(btn).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/sempre tenho ajuda/i));
    expect(btn).not.toBeDisabled();
  });

  it('sends babies array and hasMultiples when user picks multiples', async () => {
    const fakeUser = {
      id: '1', email: 'ana@test.com', name: 'Ana',
      pregnancyStage: 'pregnant', pregnancyWeek: 28,
      babyAgeInDays: null, babyName: null,
      onboardingDone: false, profileKey: null, archetypeKey: null,
    };
    mockApiFetch.mockResolvedValueOnce({ accessToken: 'tok', refreshToken: 'ref', user: fakeUser });

    wrap(<RegisterScreen onBack={vi.fn()} />);
    fillStep1();
    fireEvent.change(screen.getByLabelText(/semana da gravidez/i), { target: { value: '28' } });
    fireEvent.click(screen.getByLabelText(/mais de um bebê/i));
    // Default count is 2 after toggling
    const nameInputs = screen.getAllByPlaceholderText(/nome do bebê \d/i);
    expect(nameInputs.length).toBe(2);
    fireEvent.change(nameInputs[0], { target: { value: 'Bruno' } });
    fireEvent.change(nameInputs[1], { target: { value: 'Bianca' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    skipStep3();
    fillStep4();
    fillStep5();
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    const [, options] = mockApiFetch.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.hasMultiples).toBe(true);
    expect(body.babies).toEqual([{ name: 'Bruno' }, { name: 'Bianca' }]);
    expect(body.babyName).toBe('Bruno');
  });

  it('sends otherChildren when user adds them on step 3', async () => {
    const fakeUser = {
      id: '1', email: 'ana@test.com', name: 'Ana',
      pregnancyStage: 'pregnant', pregnancyWeek: 28,
      babyAgeInDays: null, babyName: null,
      onboardingDone: false, profileKey: null, archetypeKey: null,
    };
    mockApiFetch.mockResolvedValueOnce({ accessToken: 'tok', refreshToken: 'ref', user: fakeUser });

    wrap(<RegisterScreen onBack={vi.fn()} />);
    fillStep1();
    fillStep2();
    // Step 3: add one child
    fireEvent.click(screen.getByRole('button', { name: /adicionar filho/i }));
    const nameField = screen.getByPlaceholderText('Nome');
    fireEvent.change(nameField, { target: { value: 'Lia' } });
    const dateField = screen.getByLabelText(/data de nascimento de lia/i);
    fireEvent.change(dateField, { target: { value: '2020-05-10' } });
    fireEvent.click(screen.getByRole('button', { name: /^continuar/i }));
    fillStep4();
    fillStep5();
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    const [, options] = mockApiFetch.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.otherChildren).toEqual([{ name: 'Lia', birthDate: '2020-05-10' }]);
  });

  it('shows 409 error when email already registered', async () => {
    const ApiErrorClass = (await import('../../lib/api')).ApiError;
    mockApiFetch.mockRejectedValueOnce(new ApiErrorClass(409, {}));
    wrap(<RegisterScreen onBack={vi.fn()} />);
    fillStep1();
    fillStep2();
    skipStep3();
    fillStep4();
    fillStep5();
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/e-mail já está cadastrado/i);
    });
  });

  it('back button on step 2 returns to step 1', () => {
    wrap(<RegisterScreen onBack={vi.fn()} />);
    fillStep1();
    fireEvent.click(screen.getByLabelText(/voltar/i));
    expect(screen.getByLabelText(/^nome$/i)).toBeInTheDocument();
  });

  it('back button on step 5 returns to step 4', () => {
    wrap(<RegisterScreen onBack={vi.fn()} />);
    fillStep1();
    fillStep2();
    skipStep3();
    fillStep4();
    expect(screen.getByRole('heading', { name: /objetivos e termos/i })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/voltar/i));
    expect(screen.getByRole('heading', { name: /como você está/i })).toBeInTheDocument();
  });

  it('back button on step 1 calls onBack', () => {
    const onBack = vi.fn();
    wrap(<RegisterScreen onBack={onBack} />);
    fireEvent.click(screen.getByLabelText(/voltar/i));
    expect(onBack).toHaveBeenCalledOnce();
  });
});

