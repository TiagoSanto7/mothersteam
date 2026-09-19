import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateCommunityScreen } from './CreateCommunityScreen';
import { useAppStore } from '../../store/useAppStore';
import * as api from '../../lib/api';

vi.mock('../../lib/api', async () => ({
  ...(await vi.importActual('../../lib/api')),
  apiFetch: vi.fn(),
  uploadImage: vi.fn(),
}));

vi.mock('../../lib/imageUtils', () => ({
  resizeImage: vi.fn((file: File) => Promise.resolve(file)),
}));

// A foto de perfil da comunidade usa o mesmo useAvatarPicker (escolher → recortar
// → enviar) do EditProfileScreen — o crop modal tem sua própria suíte de testes,
// aqui só precisamos do blob/erro que ele devolve.
vi.mock('../shared/ImageCropModal', () => ({
  ImageCropModal: ({ onConfirm }: { onConfirm: (b: Blob) => void }) => (
    <button type="button" onClick={() => onConfirm(new Blob(['fake-jpeg-bytes'], { type: 'image/jpeg' }))}>
      mock-confirm-crop
    </button>
  ),
}));

const FAKE_OBJECT_URL = 'blob:http://localhost/fake-object-url';

function renderScreen(onCreated = vi.fn(), onBack = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CreateCommunityScreen onCreated={onCreated} onBack={onBack} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  useAppStore.setState({ motherName: 'Mariana', isLoggedIn: true, accessToken: 'token123' });
  Object.defineProperty(URL, 'createObjectURL', { writable: true, configurable: true, value: vi.fn(() => FAKE_OBJECT_URL) });
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, configurable: true, value: vi.fn() });
  vi.clearAllMocks();
});

afterEach(() => { vi.clearAllMocks(); });

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

  it('shows cover image preview after file selected', async () => {
    renderScreen();
    const input = screen.getByTestId('cover-file-input') as HTMLInputElement;
    const file = new File(['img'], 'cover.png', { type: 'image/png' });
    await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });
    expect(screen.getByRole('img', { name: /capa/i })).toHaveAttribute('src', FAKE_OBJECT_URL);
  });

  it('calls uploadImage when file selected and form submitted', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ id: 'new2', name: 'x' });
    vi.mocked(api.uploadImage).mockResolvedValue('/uploads/cover.jpg');
    const onCreated = vi.fn();
    const user = userEvent.setup();
    renderScreen(onCreated);
    const input = screen.getByTestId('cover-file-input') as HTMLInputElement;
    const file = new File(['img'], 'cover.png', { type: 'image/png' });
    await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });
    await user.type(screen.getByLabelText('Nome'), 'Gestantes 2027');
    await user.type(screen.getByLabelText('Descrição'), 'Um lugar seguro');
    await user.click(screen.getByRole('button', { name: 'Criar comunidade' }));
    await vi.waitFor(() => expect(api.uploadImage).toHaveBeenCalledWith(file, 'token123'));
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith('new2'));
  });

  it('uploads the avatar immediately after crop confirm — preview shows the real URL', async () => {
    vi.mocked(api.uploadImage).mockResolvedValue('/uploads/avatar.jpg');
    const user = userEvent.setup();
    renderScreen();
    const input = screen.getByTestId('avatar-picker-gallery-input') as HTMLInputElement;
    const file = new File(['img'], 'avatar.png', { type: 'image/png' });
    await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });
    await user.click(screen.getByText('mock-confirm-crop'));

    await vi.waitFor(() => expect(api.uploadImage).toHaveBeenCalled());
    const img = await screen.findByRole('img', { name: /perfil da comunidade/i });
    expect(img.getAttribute('src')).toContain('/uploads/avatar.jpg');
  });

  it('sends the already-uploaded avatarUrl when the form is submitted', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ id: 'new3', name: 'x' });
    vi.mocked(api.uploadImage).mockResolvedValue('/uploads/avatar.jpg');
    const onCreated = vi.fn();
    const user = userEvent.setup();
    renderScreen(onCreated);
    const input = screen.getByTestId('avatar-picker-gallery-input') as HTMLInputElement;
    const file = new File(['img'], 'avatar.png', { type: 'image/png' });
    await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });
    await user.click(screen.getByText('mock-confirm-crop'));
    await vi.waitFor(() => expect(api.uploadImage).toHaveBeenCalled());

    await user.type(screen.getByLabelText('Nome'), 'Gestantes 2027');
    await user.type(screen.getByLabelText('Descrição'), 'Um lugar seguro');
    await user.click(screen.getByRole('button', { name: 'Criar comunidade' }));
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith('new3'));
    const body = JSON.parse(vi.mocked(api.apiFetch).mock.calls[0][1]!.body as string);
    expect(body.avatarUrl).toBe('/uploads/avatar.jpg');
  });

  it('removes the avatar preview when "Remover foto de perfil" is clicked', async () => {
    vi.mocked(api.uploadImage).mockResolvedValue('/uploads/avatar.jpg');
    const user = userEvent.setup();
    renderScreen();
    const input = screen.getByTestId('avatar-picker-gallery-input') as HTMLInputElement;
    const file = new File(['img'], 'avatar.png', { type: 'image/png' });
    await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });
    await user.click(screen.getByText('mock-confirm-crop'));
    expect(await screen.findByRole('img', { name: /perfil da comunidade/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remover foto de perfil' }));
    expect(screen.queryByRole('img', { name: /perfil da comunidade/i })).not.toBeInTheDocument();
  });
});
