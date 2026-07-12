import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ComunidadesScreen } from './ComunidadesScreen';
import { useAppStore } from '../../store/useAppStore';

type ApiCommunityWithMember = {
  id: string;
  name: string;
  description: string;
  category: string;
  colorKey: string;
  creatorId: string;
  _count: { members: number };
  createdAt: string;
  isMember?: boolean;
};

const MOCK_COMMUNITIES: ApiCommunityWithMember[] = [
  { id: 'amamentacao-apoio', name: 'Amamentação com Apoio', description: 'Dúvidas da amamentação.', category: 'amamentação', colorKey: 'warm', creatorId: 'u0', _count: { members: 3210 }, createdAt: '2024-01-01T00:00:00Z', isMember: true },
  { id: 'pos-parto-real',    name: 'Pós-parto Real',        description: 'O quarto trimestre.',     category: 'pós-parto',   colorKey: 'linen', creatorId: 'u0', _count: { members: 2670 }, createdAt: '2024-01-01T00:00:00Z', isMember: false },
  { id: 'saude-mental',      name: 'Saúde Mental na Maternidade', description: 'Espaço seguro.', category: 'saúde mental', colorKey: 'cream', creatorId: 'u0', _count: { members: 4120 }, createdAt: '2024-01-01T00:00:00Z', isMember: false },
];

const mockApiFetch = vi.fn().mockResolvedValue(MOCK_COMMUNITIES);

vi.mock('../../lib/api', () => ({
  apiFetch: (...args: Parameters<typeof mockApiFetch>) => mockApiFetch(...args),
  ApiError: class extends Error {},
}));

function makeWrapper(initialData = MOCK_COMMUNITIES) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(['communities'], initialData);
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  mockApiFetch.mockResolvedValue(MOCK_COMMUNITIES);
  useAppStore.setState({
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
    const noMemberData = MOCK_COMMUNITIES.map((c) => ({ ...c, isMember: false }));
    render(<ComunidadesScreen />, { wrapper: makeWrapper(noMemberData) });
    expect(screen.getByText(/você ainda não segue/i)).toBeInTheDocument();
  });

  it('clicking Seguir on a suggestion calls the join API', async () => {
    mockApiFetch.mockResolvedValue({ ok: true });
    render(<ComunidadesScreen />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /sugestões/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /^seguir$/i })[0]);
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/communities/'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('suggestions show postpartum communities first for a postpartum phase', () => {
    render(<ComunidadesScreen />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /sugestões/i }));
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings.indexOf('Pós-parto Real')).toBeLessThan(headings.indexOf('Saúde Mental na Maternidade'));
  });
});
