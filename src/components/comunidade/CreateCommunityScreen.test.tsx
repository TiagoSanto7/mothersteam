import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateCommunityScreen } from './CreateCommunityScreen';
import * as api from '../../lib/api';

vi.mock('../../lib/api', async () => ({
  ...(await vi.importActual('../../lib/api')),
  apiFetch: vi.fn(),
}));

function renderScreen(onCreated = vi.fn(), onBack = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CreateCommunityScreen onCreated={onCreated} onBack={onBack} />
    </QueryClientProvider>
  );
}

beforeEach(() => vi.clearAllMocks());

describe('CreateCommunityScreen', () => {
  it('disables Criar until name and description filled', async () => {
    renderScreen();
    expect(screen.getByRole('button', { name: 'Criar comunidade' })).toBeDisabled();
  });

  it('enables Criar when name + description provided', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByLabelText('Nome'), 'Gestantes 2027');
    await user.type(screen.getByLabelText('Descrição'), 'Um lugar seguro');
    expect(screen.getByRole('button', { name: 'Criar comunidade' })).toBeEnabled();
  });

  it('POSTs to /communities and calls onCreated with new id', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ id: 'new1', name: 'x' });
    const onCreated = vi.fn();
    const user = userEvent.setup();
    renderScreen(onCreated);
    await user.type(screen.getByLabelText('Nome'), 'Gestantes 2027');
    await user.type(screen.getByLabelText('Descrição'), 'Um lugar seguro');
    await user.click(screen.getByRole('button', { name: 'Criar comunidade' }));
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith('new1'));
  });
});
