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
    vi.mocked(api.apiFetch).mockResolvedValue({ id: 'u1', name: 'Ana Maria', bio: 'Nova bio' });
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
    vi.mocked(api.apiFetch).mockResolvedValue({ id: 'u1', name: 'Ana Maria', bio: '' });
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
});
