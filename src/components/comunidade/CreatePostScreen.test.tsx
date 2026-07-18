import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreatePostScreen } from './CreatePostScreen';
import { useAppStore } from '../../store/useAppStore';

const mockApiFetch = vi.hoisted(() => vi.fn());
const mockUploadImage = vi.hoisted(() => vi.fn());
vi.mock('../../lib/api', () => ({
  apiFetch: mockApiFetch,
  uploadImage: mockUploadImage,
  ApiError: class extends Error {},
}));

const FAKE_OBJECT_URL = 'blob:http://localhost/fake-object-url';

// Patch URL methods that jsdom doesn't implement
const createObjectURLMock = vi.fn(() => FAKE_OBJECT_URL);
const revokeObjectURLMock = vi.fn();

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  useAppStore.setState({ motherName: 'Mariana', isLoggedIn: true, accessToken: 'token123' });
  // Patch URL static methods — jsdom doesn't implement them
  Object.defineProperty(URL, 'createObjectURL', { writable: true, configurable: true, value: createObjectURLMock });
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, configurable: true, value: revokeObjectURLMock });
  createObjectURLMock.mockReturnValue(FAKE_OBJECT_URL);
  mockApiFetch.mockResolvedValue({
    id: 'new-post',
    content: 'test',
    category: 'saúde mental',
    author: { id: 'u1', name: 'Mariana' },
    _count: { likes: 0, comments: 0 },
    createdAt: new Date().toISOString(),
    authorId: 'u1',
    isRepost: false,
  });
  mockUploadImage.mockResolvedValue('https://cdn.example.com/uploaded.png');
});

afterEach(() => { vi.clearAllMocks(); });

describe('CreatePostScreen', () => {
  it('renders textarea and publish button', () => {
    render(<CreatePostScreen onBack={vi.fn()} />, { wrapper });
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /publicar/i })).toBeInTheDocument();
  });

  it('renders Adicionar foto button', () => {
    render(<CreatePostScreen onBack={vi.fn()} />, { wrapper });
    expect(screen.getByRole('button', { name: /adicionar foto/i })).toBeInTheDocument();
  });

  it('shows image preview after file is selected', async () => {
    render(<CreatePostScreen onBack={vi.fn()} />, { wrapper });
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File(['hello'], 'photo.png', { type: 'image/png' });
    await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });
    expect(screen.getByRole('img', { name: 'Preview' })).toHaveAttribute('src', FAKE_OBJECT_URL);
  });

  it('removes preview when X button is clicked', async () => {
    render(<CreatePostScreen onBack={vi.fn()} />, { wrapper });
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File(['hello'], 'photo.png', { type: 'image/png' });
    await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });
    fireEvent.click(screen.getByRole('button', { name: 'Remover imagem' }));
    expect(screen.queryByRole('img', { name: 'Preview' })).not.toBeInTheDocument();
  });

  it('calls apiFetch with content and category on publish', async () => {
    render(<CreatePostScreen onBack={vi.fn()} />, { wrapper });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Meu desabafo' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /publicar/i })); });
    expect(mockApiFetch).toHaveBeenCalledWith('/posts', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body);
    expect(body.content).toBe('Meu desabafo');
  });

  it('calls uploadImage then apiFetch with imageUrl when a file is selected', async () => {
    render(<CreatePostScreen onBack={vi.fn()} />, { wrapper });
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File(['img'], 'photo.png', { type: 'image/png' });
    await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Com imagem' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /publicar/i })); });
    expect(mockUploadImage).toHaveBeenCalledWith(file, 'token123');
    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body);
    expect(body.imageUrl).toBe('https://cdn.example.com/uploaded.png');
  });

  it('renders Cancelar button', () => {
    render(<CreatePostScreen onBack={() => {}} />, { wrapper });
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('enables Publicar when only imagePreview is set', async () => {
    render(<CreatePostScreen onBack={() => {}} />, { wrapper });
    const input = screen.getByTestId('file-input');
    await act(async () => { fireEvent.change(input, { target: { files: [new File(['img'], 'photo.png', { type: 'image/png' })] } }); });
    expect(screen.getAllByRole('button', { name: /publicar/i })[0]).not.toBeDisabled();
  });

  describe('initialContent', () => {
    it('pre-fills the textarea when initialContent is provided', () => {
      render(
        <CreatePostScreen onBack={vi.fn()} initialContent='"Verso" — Referência' />,
        { wrapper }
      );
      const textarea = screen.getByRole('textbox');
      expect((textarea as HTMLTextAreaElement).value).toBe('"Verso" — Referência');
    });

    it('starts with empty textarea when initialContent is not provided', () => {
      render(<CreatePostScreen onBack={vi.fn()} />, { wrapper });
      const textarea = screen.getByRole('textbox');
      expect((textarea as HTMLTextAreaElement).value).toBe('');
    });
  });
});
