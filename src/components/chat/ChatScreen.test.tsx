import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatScreen } from './ChatScreen';
import { useAppStore } from '../../store/useAppStore';
import type { Chat } from '../../types';
import type { ApiMessage, ApiPost, PaginatedResult } from '../../lib/types';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

const PLAIN_CHAT: Chat = { id: '1', with: 'Ana', lastMessage: 'Olá', time: '5min', unread: 0, messages: [] };
const SHARED_CHAT: Chat = { id: '2', with: 'Fernanda', lastMessage: 'veja', time: '1h', unread: 0, messages: [] };

const PLAIN_MESSAGES: ApiMessage[] = [
  { id: '1', content: 'Olá!', chatId: '1', senderId: 'other', sender: { id: 'other', name: 'Ana' }, read: true, createdAt: '2024-01-01T10:00:00Z' },
  { id: '2', content: 'Oi!',  chatId: '1', senderId: 'u1',    sender: { id: 'u1',    name: 'Mariana' }, read: true, createdAt: '2024-01-01T10:01:00Z' },
];

const SHARED_MESSAGES: ApiMessage[] = [
  {
    id: '1', content: 'Olha isso!', chatId: '2', senderId: 'u1', sender: { id: 'u1', name: 'Mariana' },
    sharedPostId: 'p1', sharedPostAuthor: 'Juliana M.', sharedPostExcerpt: 'Puerpério é difícil',
    read: true, createdAt: '2024-01-01T09:00:00Z',
  },
  {
    id: '2', content: '', chatId: '2', senderId: 'u1', sender: { id: 'u1', name: 'Mariana' },
    sharedPostId: 'p2', sharedPostAuthor: 'Fernanda S.', sharedPostExcerpt: 'Dica de amamentação',
    read: true, createdAt: '2024-01-01T09:01:00Z',
  },
];

const MOCK_POST: ApiPost = {
  id: 'p1', content: 'Puerpério é difícil', category: 'saúde mental', authorId: 'other',
  author: { id: 'other', name: 'Juliana M.' }, isRepost: false,
  _count: { likes: 10, comments: 3, reposts: 0 }, createdAt: '2024-01-01T08:00:00Z',
  likedByCurrentUser: false,
};

function makeWrapper(chatId: string, msgs: ApiMessage[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData<PaginatedResult<ApiMessage>>(['messages', chatId], { items: msgs, hasMore: false });
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  useAppStore.setState({
    motherName: 'Mariana',
    currentUserId: 'u1',
    isLoggedIn: true,
    communityPosts: [],
    postComments: {},
  });
  mockApiFetch.mockResolvedValue(MOCK_POST);
});

describe('ChatScreen', () => {
  it('renders plain text messages as bubbles', () => {
    render(<ChatScreen chat={PLAIN_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('1', PLAIN_MESSAGES) });
    expect(screen.getByText('Olá!')).toBeInTheDocument();
    expect(screen.getByText('Oi!')).toBeInTheDocument();
  });

  it('renders "Post compartilhado" label for sharedPost messages', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('2', SHARED_MESSAGES) });
    expect(screen.getAllByText('Post compartilhado').length).toBe(2);
  });

  it('renders the shared post author name', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('2', SHARED_MESSAGES) });
    expect(screen.getByText('Juliana M.')).toBeInTheDocument();
  });

  it('renders the shared post excerpt', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('2', SHARED_MESSAGES) });
    expect(screen.getByText('Puerpério é difícil')).toBeInTheDocument();
  });

  it('clicking shared post card fetches the post and opens PostDetailScreen', async () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('2', SHARED_MESSAGES) });
    fireEvent.click(screen.getByRole('button', { name: /ver post de Juliana M\./i }));
    await waitFor(() => expect(screen.getByText('Publicação')).toBeInTheDocument());
  });

  it('renders comment text when sharedPost message also has content', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('2', SHARED_MESSAGES) });
    expect(screen.getByText('Olha isso!')).toBeInTheDocument();
  });
});
