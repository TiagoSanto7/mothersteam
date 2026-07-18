import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileScreen } from './ProfileScreen';
import { useAppStore } from '../../store/useAppStore';
import type { PaginatedResult, ApiPost } from '../../lib/types';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

const EMPTY_POSTS: PaginatedResult<ApiPost> = { items: [], hasMore: false };

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['posts'], EMPTY_POSTS);
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  useAppStore.setState({
    isLoggedIn: true, motherName: 'Mariana',
    phase: { stage: 'pregnant', week: 28 }, motherProfile: null,
    savedVerses: [],
  });
  mockApiFetch.mockResolvedValue(EMPTY_POSTS);
});

describe('ProfileScreen', () => {
  it('does not render visitor toggle buttons', () => {
    wrap(<ProfileScreen onClose={vi.fn()} />);
    expect(screen.queryByText(/como visitante/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/meu perfil/i)).not.toBeInTheDocument();
  });

  it('renders "Editar perfil" button', () => {
    wrap(<ProfileScreen onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /editar perfil/i })).toBeInTheDocument();
  });

  it('does not render Seguir or Mensagem buttons', () => {
    wrap(<ProfileScreen onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /^seguir$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mensagem/i })).not.toBeInTheDocument();
  });

  describe('Versículos salvos row', () => {
    it('does not show button when savedVerses is empty', () => {
      useAppStore.setState({ savedVerses: [] });
      wrap(<ProfileScreen onClose={vi.fn()} />);
      expect(screen.queryByRole('button', { name: /ver versículos salvos/i })).not.toBeInTheDocument();
    });

    it('shows button when savedVerses has items', () => {
      useAppStore.setState({ savedVerses: ['Sl 23:1'] });
      wrap(<ProfileScreen onClose={vi.fn()} />);
      expect(screen.getByRole('button', { name: /ver versículos salvos/i })).toBeInTheDocument();
    });

    it('opens SavedVersesScreen dialog when button is clicked', () => {
      useAppStore.setState({ savedVerses: ['Sl 23:1'] });
      wrap(<ProfileScreen onClose={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: /ver versículos salvos/i }));
      expect(screen.getByRole('dialog', { name: /versículos salvos/i })).toBeInTheDocument();
    });
  });
});
