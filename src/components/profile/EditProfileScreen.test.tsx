import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditProfileScreen } from './EditProfileScreen';
import { useAppStore } from '../../store/useAppStore';
import * as api from '../../lib/api';

vi.mock('../../lib/api', async () => ({
  ...(await vi.importActual('../../lib/api')),
  apiFetch: vi.fn(),
}));

function renderScreen(onBack = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <EditProfileScreen onBack={onBack} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.setState({
    currentUserId: 'u1',
    motherName: 'Ana',
    isLoggedIn: true,
  });
  vi.mocked(api.apiFetch).mockImplementation(async (_path, options) => {
    if (options?.method === 'PATCH') {
      return { id: 'u1', name: 'Ana Maria', bio: 'Nova bio' };
    }
    return {
      id: 'u1', name: 'Ana', bio: null,
      pregnancyStage: 'pregnant', _count: { posts: 0, followers: 0, following: 0 },
      isSelf: true, isFollowedByCurrentUser: false,
    };
  });
});

describe('EditProfileScreen', () => {
  it('prefills name from store', () => {
    renderScreen();
    expect(screen.getByLabelText(/Nome/i)).toHaveValue('Ana');
  });

  it('disables Salvar when name is empty', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.clear(screen.getByLabelText(/Nome/i));
    expect(screen.getByRole('button', { name: /Salvar/i })).toBeDisabled();
  });

  it('calls PATCH /users/me on save', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.clear(screen.getByLabelText(/Nome/i));
    await user.type(screen.getByLabelText(/Nome/i), 'Ana Maria');
    await user.type(screen.getByLabelText(/Bio/i), 'Nova bio');
    await user.click(screen.getByRole('button', { name: /Salvar/i }));
    expect(api.apiFetch).toHaveBeenCalledWith(
      '/users/me',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('calls onBack after successful save', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    renderScreen(onBack);
    await user.click(screen.getByRole('button', { name: /Salvar/i }));
    await vi.waitFor(() => expect(onBack).toHaveBeenCalled());
  });

  it('respects 280-char limit on bio', async () => {
    renderScreen();
    const bioInput = screen.getByLabelText(/Bio/i) as HTMLTextAreaElement;
    expect(bioInput.maxLength).toBe(280);
  });

  it('shows error message on save failure', async () => {
    vi.mocked(api.apiFetch).mockImplementation(async (_path, options) => {
      if (options?.method === 'PATCH') throw new Error('Server down');
      return { id: 'u1', name: 'Ana', bio: null, pregnancyStage: 'pregnant', _count: { posts: 0, followers: 0, following: 0 }, isSelf: true, isFollowedByCurrentUser: false };
    });
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole('button', { name: /Salvar/i }));
    await vi.waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Não foi possível salvar/i);
    });
  });

  it('prefills bio from existing profile', async () => {
    vi.mocked(api.apiFetch).mockImplementation(async () => ({
      id: 'u1', name: 'Ana', bio: 'Bio existente',
      pregnancyStage: 'pregnant', _count: { posts: 0, followers: 0, following: 0 },
      isSelf: true, isFollowedByCurrentUser: false,
    }));
    renderScreen();
    await vi.waitFor(() => {
      expect(screen.getByLabelText(/Bio/i)).toHaveValue('Bio existente');
    });
  });
});
