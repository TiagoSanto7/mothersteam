import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatListScreen } from './ChatListScreen';
import { useAppStore } from '../../store/useAppStore';
import type { ApiChat, PaginatedResult, ApiFollowUser } from '../../lib/types';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

const ME = 'u1';
const OTHER = 'u2';

function makeApiChat(overrides: Partial<ApiChat> = {}): ApiChat {
  return {
    id: 'chat-1',
    participants: [
      { userId: ME,    chatId: 'chat-1', user: { id: ME,    name: 'Mariana' } },
      { userId: OTHER, chatId: 'chat-1', user: { id: OTHER, name: 'Ana' } },
    ],
    messages: [],
    createdAt: '2024-01-01T10:00:00Z',
    ...overrides,
  }
}

function makeWrapper(apiChats: ApiChat[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    qc.setQueryData<ApiChat[]>(['chats'], apiChats);
    qc.setQueryData<PaginatedResult<ApiFollowUser>>(['users', ME, 'following'], {
      items: [],
      hasMore: false,
    });
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  useAppStore.setState({
    isLoggedIn: true,
    currentUserId: ME,
    motherName: 'Mariana',
  });
  mockApiFetch.mockResolvedValue({ ok: true });
});

describe('ChatListScreen — lastMessage preview', () => {
  it('shows the last message preview when the message is unread', () => {
    const apiChats = [
      makeApiChat({
        messages: [
          {
            id: 'msg-1',
            content: 'Olá, tudo bem?',
            chatId: 'chat-1',
            senderId: OTHER,
            sender: { id: OTHER, name: 'Ana' },
            read: false,
            createdAt: '2024-01-01T10:05:00Z',
          },
        ],
      }),
    ];

    render(<ChatListScreen onBack={() => {}} />, { wrapper: makeWrapper(apiChats) });

    expect(screen.getByText('Olá, tudo bem?')).toBeInTheDocument();
  });

  it('still shows the last message preview after the message is marked as read', () => {
    // Simulates the state AFTER POST /chats/:id/read + re-fetch:
    // the message exists in the DB with read: true — preview must still appear.
    const apiChats = [
      makeApiChat({
        messages: [
          {
            id: 'msg-1',
            content: 'Olá, tudo bem?',
            chatId: 'chat-1',
            senderId: OTHER,
            sender: { id: OTHER, name: 'Ana' },
            read: true, // <-- already read
            createdAt: '2024-01-01T10:05:00Z',
          },
        ],
      }),
    ];

    render(<ChatListScreen onBack={() => {}} />, { wrapper: makeWrapper(apiChats) });

    expect(screen.getByText('Olá, tudo bem?')).toBeInTheDocument();
  });

  it('shows no preview text when there are no messages in the chat', () => {
    const apiChats = [makeApiChat({ messages: [] })];

    render(<ChatListScreen onBack={() => {}} />, { wrapper: makeWrapper(apiChats) });

    // Ana's name should appear, but no message text
    expect(screen.getByText('Ana')).toBeInTheDocument();
    // The lastMessage element should be empty (render p tag with empty string)
    const listItem = screen.getByText('Ana').closest('li');
    expect(listItem).toBeInTheDocument();
    // The paragraph for lastMessage should have empty content
    const paragraphs = listItem!.querySelectorAll('p');
    const lastMsgParagraph = paragraphs[paragraphs.length - 1];
    expect(lastMsgParagraph.textContent).toBe('');
  });

  it('does not show the unread badge after a message is marked as read', () => {
    const apiChats = [
      makeApiChat({
        messages: [
          {
            id: 'msg-1',
            content: 'Chegou!',
            chatId: 'chat-1',
            senderId: OTHER,
            sender: { id: OTHER, name: 'Ana' },
            read: true,
            createdAt: '2024-01-01T10:05:00Z',
          },
        ],
      }),
    ];

    render(<ChatListScreen onBack={() => {}} />, { wrapper: makeWrapper(apiChats) });

    // The unread badge "1" must NOT appear
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('shows the unread badge when there is an unread message', () => {
    const apiChats = [
      makeApiChat({
        messages: [
          {
            id: 'msg-1',
            content: 'Chegou!',
            chatId: 'chat-1',
            senderId: OTHER,
            sender: { id: OTHER, name: 'Ana' },
            read: false,
            createdAt: '2024-01-01T10:05:00Z',
          },
        ],
      }),
    ];

    render(<ChatListScreen onBack={() => {}} />, { wrapper: makeWrapper(apiChats) });

    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
