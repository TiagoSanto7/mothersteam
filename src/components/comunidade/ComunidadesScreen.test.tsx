import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ComunidadesScreen } from './ComunidadesScreen';
import { useAppStore } from '../../store/useAppStore';
import type { ApiCommunity } from '../../lib/types';

const MOCK_COMMUNITIES: ApiCommunity[] = [
  { id: 'amamentacao-apoio', name: 'Amamentação com Apoio', description: 'Dúvidas da amamentação.', category: 'amamentação', colorKey: 'warm', creatorId: 'u0', _count: { members: 3210 }, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'pos-parto-real',    name: 'Pós-parto Real',        description: 'O quarto trimestre.',     category: 'pós-parto',   colorKey: 'linen', creatorId: 'u0', _count: { members: 2670 }, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'saude-mental',      name: 'Saúde Mental na Maternidade', description: 'Espaço seguro.', category: 'saúde mental', colorKey: 'cream', creatorId: 'u0', _count: { members: 4120 }, createdAt: '2024-01-01T00:00:00Z' },
];

vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue([
    { id: 'amamentacao-apoio', name: 'Amamentação com Apoio', description: 'Dúvidas da amamentação.', category: 'amamentação', colorKey: 'warm', creatorId: 'u0', _count: { members: 3210 }, createdAt: '2024-01-01T00:00:00Z' },
    { id: 'pos-parto-real',    name: 'Pós-parto Real',        description: 'O quarto trimestre.',     category: 'pós-parto',   colorKey: 'linen', creatorId: 'u0', _count: { members: 2670 }, createdAt: '2024-01-01T00:00:00Z' },
    { id: 'saude-mental',      name: 'Saúde Mental na Maternidade', description: 'Espaço seguro.', category: 'saúde mental', colorKey: 'cream', creatorId: 'u0', _count: { members: 4120 }, createdAt: '2024-01-01T00:00:00Z' },
  ]),
  ApiError: class extends Error {},
}));

function makeWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(['communities'], MOCK_COMMUNITIES);
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  useAppStore.setState({
    followedCommunityIds: ['amamentacao-apoio'],
    phase: { stage: 'postpartum', ageInDays: 30 },
    motherProfile: null,
    isLoggedIn: true,
  });
});

describe('ComunidadesScreen', () => {
  it('renders Seguindo and Sugestões sub-filter buttons', () => {
    render(<ComunidadesScreen />, { wrapper: makeWrapper() });
    expect(screen.getByRole('button', { name: /seguindo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sugestões/i })).toBeInTheDocument();
  });

  it('shows only followed communities in Seguindo tab', () => {
    render(<ComunidadesScreen />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /seguindo/i }));
    expect(screen.getByText('Amamentação com Apoio')).toBeInTheDocument();
    expect(screen.queryByText('Pós-parto Real')).not.toBeInTheDocument();
  });

  it('shows only non-followed communities in Sugestões tab', () => {
    render(<ComunidadesScreen />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /sugestões/i }));
    expect(screen.queryByText('Amamentação com Apoio')).not.toBeInTheDocument();
    expect(screen.getByText('Pós-parto Real')).toBeInTheDocument();
  });

  it('defaults to Seguindo sub-filter', () => {
    render(<ComunidadesScreen />, { wrapper: makeWrapper() });
    expect(screen.getByRole('button', { name: /seguindo/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows empty state message when following no communities', () => {
    useAppStore.setState({ followedCommunityIds: [] });
    render(<ComunidadesScreen />, { wrapper: makeWrapper() });
    expect(screen.getByText(/você ainda não segue/i)).toBeInTheDocument();
  });

  it('clicking Seguir on a suggestion adds it to followedCommunityIds in store', () => {
    render(<ComunidadesScreen />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /sugestões/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /^seguir$/i })[0]);
    expect(useAppStore.getState().followedCommunityIds).toContain('pos-parto-real');
  });

  it('suggestions show postpartum communities first for a postpartum phase', () => {
    render(<ComunidadesScreen />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /sugestões/i }));
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings.indexOf('Pós-parto Real')).toBeLessThan(headings.indexOf('Saúde Mental na Maternidade'));
  });
});
