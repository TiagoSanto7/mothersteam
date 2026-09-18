import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditProfileScreen } from './EditProfileScreen';
import { useAppStore } from '../../store/useAppStore';
import * as api from '../../lib/api';

const { mockUploadImage, mockResizeImage } = vi.hoisted(() => ({
  mockUploadImage: vi.fn(),
  mockResizeImage: vi.fn(async (file: File) => file),
}));

vi.mock('../../lib/api', async () => ({
  ...(await vi.importActual('../../lib/api')),
  apiFetch: vi.fn(),
  uploadImage: mockUploadImage,
}));

vi.mock('../../lib/imageUtils', () => ({
  resizeImage: mockResizeImage,
}));

// ImageCropModal has its own test suite (image decode, canvas). Here we only
// care what EditProfileScreen does with the blob/error it hands back.
vi.mock('../shared/ImageCropModal', () => ({
  ImageCropModal: ({ onConfirm, onError }: { onConfirm: (b: Blob) => void; onError?: () => void }) => (
    <div>
      <button onClick={() => onConfirm(new Blob(['fake-jpeg-bytes'], { type: 'image/jpeg' }))}>
        mock-confirm-crop
      </button>
      <button onClick={() => onError?.()}>mock-crop-error</button>
    </div>
  ),
}));

beforeAll(() => {
  // jsdom doesn't implement the Blob URL registry
  URL.createObjectURL = vi.fn(() => 'blob:http://localhost/fake');
  URL.revokeObjectURL = vi.fn();
});

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

function makeFile(name: string, sizeBytes: number, type: string): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe('EditProfileScreen — foto de perfil (TIA-56)', () => {
  it('rejects a file over 20MB before ever opening the crop modal', async () => {
    const user = userEvent.setup();
    renderScreen();
    const tooBig = makeFile('foto.jpg', 21 * 1024 * 1024, 'image/jpeg');
    await user.upload(screen.getByLabelText('Selecionar foto da galeria'), tooBig);

    expect(screen.getByRole('alert')).toHaveTextContent(/muito grande/i);
    expect(screen.queryByText('mock-confirm-crop')).not.toBeInTheDocument();
  });

  it('rejects a non-image file before opening the crop modal', async () => {
    renderScreen();
    const notImage = makeFile('curriculo.pdf', 1024, 'application/pdf');
    // userEvent.upload() enforces the input's accept="image/*" itself (a real OS
    // picker mostly does too) — fireEvent bypasses that to exercise the JS-level
    // safety net directly, since not every picker/WebView honors `accept`.
    fireEvent.change(screen.getByLabelText('Selecionar foto da galeria'), { target: { files: [notImage] } });

    expect(screen.getByRole('alert')).toHaveTextContent(/não é uma imagem/i);
    expect(screen.queryByText('mock-confirm-crop')).not.toBeInTheDocument();
  });

  it('opens the crop modal for a valid small image', async () => {
    const user = userEvent.setup();
    renderScreen();
    const small = makeFile('foto.jpg', 500 * 1024, 'image/jpeg');
    await user.upload(screen.getByLabelText('Selecionar foto da galeria'), small);

    expect(screen.getByText('mock-confirm-crop')).toBeInTheDocument();
  });

  it('shows a specific message when the crop modal fails to decode the image', async () => {
    const user = userEvent.setup();
    renderScreen();
    const small = makeFile('foto.jpg', 500 * 1024, 'image/jpeg');
    await user.upload(screen.getByLabelText('Selecionar foto da galeria'), small);
    await user.click(screen.getByText('mock-crop-error'));

    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível abrir essa imagem/i);
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it('surfaces the real server reason when upload rejects with a structured error', async () => {
    mockUploadImage.mockRejectedValueOnce(new Error('Upload failed: {"error":"File too large"}'));
    const user = userEvent.setup();
    renderScreen();
    const small = makeFile('foto.jpg', 500 * 1024, 'image/jpeg');
    await user.upload(screen.getByLabelText('Selecionar foto da galeria'), small);
    await user.click(screen.getByText('mock-confirm-crop'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/muito grande/i);
    });
  });

  it('shows a network-specific message when the upload fetch itself fails', async () => {
    mockUploadImage.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    renderScreen();
    const small = makeFile('foto.jpg', 500 * 1024, 'image/jpeg');
    await user.upload(screen.getByLabelText('Selecionar foto da galeria'), small);
    await user.click(screen.getByText('mock-confirm-crop'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/sem conexão/i);
    });
  });

  it('completes crop → resize → upload → save on the happy path', async () => {
    mockUploadImage.mockResolvedValueOnce('/uploads/new-avatar.jpg');
    const user = userEvent.setup();
    renderScreen();
    const small = makeFile('foto.jpg', 500 * 1024, 'image/jpeg');
    await user.upload(screen.getByLabelText('Selecionar foto da galeria'), small);
    await user.click(screen.getByText('mock-confirm-crop'));

    await waitFor(() => {
      expect(api.apiFetch).toHaveBeenCalledWith(
        '/users/me',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ avatarUrl: '/uploads/new-avatar.jpg' }) })
      );
    });
    expect(mockResizeImage).toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
