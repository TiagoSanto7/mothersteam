import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostDetailScreen } from './PostDetailScreen';
import { useAppStore } from '../../store/useAppStore';
import type { CommunityPost } from '../../types';
import type { ApiChat, ApiFollowUser, PaginatedResult } from '../../lib/types';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', async () => ({
  ...(await vi.importActual<typeof import('../../lib/api')>('../../lib/api')),
  apiFetch: mockApiFetch,
}));

const POST_WITH_IMAGE: CommunityPost = {
  id: '1', category: 'gestação', author: 'Fernanda S.',
  content: 'Dicas para o enjoo', likes: 24, replies: 8, reposts: 0, time: '2h',
  imageUrl: 'data:image/png;base64,testimg',
};

const POST_NO_IMAGE: CommunityPost = {
  id: '2', category: 'saúde mental', author: 'Juliana M.',
  content: 'Puerpério é difícil', likes: 10, replies: 3, reposts: 0, time: '5h',
};

const MOCK_API_CHATS: ApiChat[] = [
  {
    id: '1',
    participants: [
      { userId: 'u1', chatId: '1', user: { id: 'u1', name: 'Mariana' } },
      { userId: 'u2', chatId: '1', user: { id: 'u2', name: 'Ana Oliveira' } },
    ],
    messages: [],
    createdAt: '2024-01-01T10:00:00Z',
  },
  {
    id: '2',
    participants: [
      { userId: 'u1', chatId: '2', user: { id: 'u1', name: 'Mariana' } },
      { userId: 'u3', chatId: '2', user: { id: 'u3', name: 'Juliana M.' } },
    ],
    messages: [],
    createdAt: '2024-01-01T09:00:00Z',
  },
];

const MOCK_FOLLOWING: PaginatedResult<ApiFollowUser> = {
  items: [
    { id: 'u2', name: 'Ana Oliveira', isFollowedByCurrentUser: false, isSelf: false },
    { id: 'u3', name: 'Juliana M.', isFollowedByCurrentUser: false, isSelf: false },
  ],
  hasMore: false,
};

function makeWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    qc.setQueryData<ApiChat[]>(['chats'], MOCK_API_CHATS);
    qc.setQueryData<PaginatedResult<ApiFollowUser>>(['users', 'u1', 'following'], MOCK_FOLLOWING);
    qc.setQueryData(['comments', '1'], { items: [], hasMore: false });
    qc.setQueryData(['comments', '2'], { items: [], hasMore: false });
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  mockApiFetch.mockClear();
  mockApiFetch.mockResolvedValue([]);
  useAppStore.setState({
    motherName: 'Mariana',
    currentUserId: 'u1',
    isLoggedIn: true,
  });
});

describe('PostDetailScreen', () => {
  it('renders post content', () => {
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />, { wrapper: makeWrapper() });
    expect(screen.getByText('Dicas para o enjoo')).toBeInTheDocument();
  });

  it('renders image when post has imageUrl', () => {
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />, { wrapper: makeWrapper() });
    const img = screen.getByAltText('Imagem do post');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,testimg');
  });

  it('does not render image when post has no imageUrl', () => {
    render(<PostDetailScreen post={POST_NO_IMAGE} onBack={() => {}} />, { wrapper: makeWrapper() });
    expect(screen.queryByAltText('Imagem do post')).not.toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={onBack} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('opens share sheet when Enviar is clicked', () => {
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    expect(screen.getByText('Enviar para')).toBeInTheDocument();
  });

  it('shows following users in share sheet as checkboxes', () => {
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    const list = screen.getByRole('list');
    expect(within(list).getByText('Ana Oliveira')).toBeInTheDocument();
    expect(within(list).getByText('Juliana M.')).toBeInTheDocument();
  });

  it('Enviar button is disabled when no recipient selected', () => {
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    const sendBtn = screen.getByTestId('share-send-btn');
    expect(sendBtn).toBeDisabled();
  });

  it('Enviar button becomes enabled after selecting a recipient', () => {
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    fireEvent.click(screen.getByText('Ana Oliveira'));
    const sendBtn = screen.getByTestId('share-send-btn');
    expect(sendBtn).not.toBeDisabled();
  });

  it('shows a comment textarea in the share sheet', () => {
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    expect(screen.getByPlaceholderText(/adicionar um comentário/i)).toBeInTheDocument();
  });

  it('closes share sheet after sending', () => {
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    fireEvent.click(screen.getByText('Ana Oliveira'));
    fireEvent.click(screen.getByTestId('share-send-btn'));
    expect(screen.queryByText('Enviar para')).not.toBeInTheDocument();
  });

  it('calls apiFetch for each selected recipient when sending', async () => {
    mockApiFetch.mockClear();
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />, { wrapper: makeWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    fireEvent.click(screen.getByText('Ana Oliveira'));
    const list = screen.getByRole('list');
    fireEvent.click(within(list).getByText('Juliana M.'));
    fireEvent.click(screen.getByTestId('share-send-btn'));
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/chats/1/messages',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/chats/2/messages',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
