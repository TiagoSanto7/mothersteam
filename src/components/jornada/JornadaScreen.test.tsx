import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JornadaScreen } from './JornadaScreen';
import { useAppStore } from '../../store/useAppStore';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', async () => ({
  ...(await vi.importActual<typeof import('../../lib/api')>('../../lib/api')),
  apiFetch: mockApiFetch,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockApiFetch.mockResolvedValue([]);
  useAppStore.setState({
    isLoggedIn: true,
    motherName: 'Ana',
    phase: { stage: 'postpartum', ageInDays: 30 },
    selectedDate: new Date().toISOString().split('T')[0],
  });
});

describe('JornadaScreen', () => {
  it('renders three segment tabs', () => {
    render(<JornadaScreen />, { wrapper });
    expect(screen.getByRole('button', { name: /hoje/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /planejamento/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /evolução/i })).toBeInTheDocument();
  });

  it('defaults to Hoje segment showing baby screen', () => {
    render(<JornadaScreen />, { wrapper });
    expect(screen.getByText('Rotina do Bebê')).toBeInTheDocument();
  });

  it('switches to Planejamento segment', () => {
    render(<JornadaScreen />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /planejamento/i }));
    expect(screen.getByText('Sua Rotina')).toBeInTheDocument();
    expect(screen.queryByText('Rotina do Bebê')).not.toBeInTheDocument();
  });

  it('switches to Evolução segment and hides baby content', () => {
    render(<JornadaScreen />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /evolução/i }));
    expect(screen.queryByText('Rotina do Bebê')).not.toBeInTheDocument();
  });

  it('renders FAB Registrar button', () => {
    render(<JornadaScreen />, { wrapper });
    expect(screen.getByLabelText('Registrar')).toBeInTheDocument();
  });
});
