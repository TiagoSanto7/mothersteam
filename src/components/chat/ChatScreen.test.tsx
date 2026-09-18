import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatScreen } from './ChatScreen';
import { useAppStore } from '../../store/useAppStore';
import type { Chat } from '../../types';
import type { ApiMessage, ApiPost, PaginatedResult } from '../../lib/types';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

const PLAIN_CHAT: Chat = { id: '1', with: 'Ana', withUserId: 'other', withUsername: 'ana_mae', lastMessage: 'Olá', time: '5min', unread: 0, messages: [] };
const SHARED_CHAT: Chat = { id: '2', with: 'Fernanda', withUserId: 'u2', withUsername: null, lastMessage: 'veja', time: '1h', unread: 0, messages: [] };

const PLAIN_MESSAGES: ApiMessage[] = [
  { id: '1', content: 'Olá!', chatId: '1', senderId: 'other', sender: { id: 'other', name: 'Ana' }, read: true, createdAt: '2024-01-01T10:00:00Z' },
  { id: '2', content: 'Oi!',  chatId: '1', senderId: 'u1',    sender: { id: 'u1',    name: 'Mariana' }, read: true, createdAt: '2024-01-01T10:01:00Z' },
];

const REPLY_MESSAGES: ApiMessage[] = [
  {
    id: 'm1', content: 'Oi, tudo bem?', chatId: '1', senderId: 'other',
    sender: { id: 'other', name: 'Ana' }, read: true, createdAt: '2024-01-01T10:00:00Z',
  },
  {
    id: 'm2', content: 'Tudo sim!', chatId: '1', senderId: 'u1',
    sender: { id: 'u1', name: 'Mariana' }, read: true, createdAt: '2024-01-01T10:01:00Z',
    replyToId: 'm1', replyToSenderName: 'Ana', replyToExcerpt: 'Oi, tudo bem?',
  },
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

describe('ChatScreen — profile preview modal', () => {
  it('tapping the header opens the profile preview modal', () => {
    render(
      <ChatScreen chat={PLAIN_CHAT} onBack={() => {}} onOpenProfile={() => {}} />,
      { wrapper: makeWrapper('1', PLAIN_MESSAGES) },
    );
    // The header button + message avatar buttons all share the "Ver perfil de Ana" aria-label; the header is first
    fireEvent.click(screen.getAllByRole('button', { name: /ver perfil de Ana/i })[0]);
    expect(screen.getByRole('dialog', { name: /preview de perfil/i })).toBeInTheDocument();
  });

  it('modal shows the partner name', () => {
    render(
      <ChatScreen chat={PLAIN_CHAT} onBack={() => {}} onOpenProfile={() => {}} />,
      { wrapper: makeWrapper('1', PLAIN_MESSAGES) },
    );
    // The header button + message avatar buttons all share the "Ver perfil de Ana" aria-label; the header is first
    fireEvent.click(screen.getAllByRole('button', { name: /ver perfil de Ana/i })[0]);
    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0);
  });

  it('modal shows @username when available', () => {
    render(
      <ChatScreen chat={PLAIN_CHAT} onBack={() => {}} onOpenProfile={() => {}} />,
      { wrapper: makeWrapper('1', PLAIN_MESSAGES) },
    );
    // The header button + message avatar buttons all share the "Ver perfil de Ana" aria-label; the header is first
    fireEvent.click(screen.getAllByRole('button', { name: /ver perfil de Ana/i })[0]);
    expect(screen.getByText('@ana_mae')).toBeInTheDocument();
  });

  it('modal shows the message count', () => {
    render(
      <ChatScreen chat={PLAIN_CHAT} onBack={() => {}} onOpenProfile={() => {}} />,
      { wrapper: makeWrapper('1', PLAIN_MESSAGES) },
    );
    // The header button + message avatar buttons all share the "Ver perfil de Ana" aria-label; the header is first
    fireEvent.click(screen.getAllByRole('button', { name: /ver perfil de Ana/i })[0]);
    expect(screen.getByText(/2 mensagens/i)).toBeInTheDocument();
  });

  it('"Visitar perfil" button calls onOpenProfile with the partner userId', () => {
    const onOpenProfile = vi.fn();
    render(
      <ChatScreen chat={PLAIN_CHAT} onBack={() => {}} onOpenProfile={onOpenProfile} />,
      { wrapper: makeWrapper('1', PLAIN_MESSAGES) },
    );
    // The header button + message avatar buttons all share the "Ver perfil de Ana" aria-label; the header is first
    fireEvent.click(screen.getAllByRole('button', { name: /ver perfil de Ana/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /visitar perfil/i }));
    expect(onOpenProfile).toHaveBeenCalledWith('other');
  });

  it('close button dismisses the modal', () => {
    render(
      <ChatScreen chat={PLAIN_CHAT} onBack={() => {}} onOpenProfile={() => {}} />,
      { wrapper: makeWrapper('1', PLAIN_MESSAGES) },
    );
    // The header button + message avatar buttons all share the "Ver perfil de Ana" aria-label; the header is first
    fireEvent.click(screen.getAllByRole('button', { name: /ver perfil de Ana/i })[0]);
    expect(screen.getByRole('dialog', { name: /preview de perfil/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
    expect(screen.queryByRole('dialog', { name: /preview de perfil/i })).not.toBeInTheDocument();
  });

  it('does not show @username when withUsername is null', () => {
    render(
      <ChatScreen chat={SHARED_CHAT} onBack={() => {}} onOpenProfile={() => {}} />,
      { wrapper: makeWrapper('2', SHARED_MESSAGES) },
    );
    fireEvent.click(screen.getByRole('button', { name: /ver perfil de Fernanda/i }));
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });
});

describe('ChatScreen — input bar UX', () => {
  it('has data-testid="chat-input-bar"', () => {
    render(<ChatScreen chat={PLAIN_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('1', PLAIN_MESSAGES) });
    expect(document.querySelector('[data-testid="chat-input-bar"]')).toBeInTheDocument();
  });

  it('send button has aria-label "Enviar mensagem"', () => {
    render(<ChatScreen chat={PLAIN_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('1', PLAIN_MESSAGES) });
    expect(screen.getByRole('button', { name: /enviar mensagem/i })).toBeInTheDocument();
  });

  it('photo and mic buttons are visible when input is empty', () => {
    render(<ChatScreen chat={PLAIN_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('1', PLAIN_MESSAGES) });
    expect(screen.getByRole('button', { name: /enviar foto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /segurar para gravar/i })).toBeInTheDocument();
  });

  it('photo and mic buttons are hidden when user types text', () => {
    render(<ChatScreen chat={PLAIN_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('1', PLAIN_MESSAGES) });
    const input = screen.getByPlaceholderText(/escreva uma mensagem/i);
    fireEvent.change(input, { target: { value: 'olá' } });
    expect(screen.queryByRole('button', { name: /enviar foto/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /segurar para gravar/i })).not.toBeInTheDocument();
  });
});

describe('ChatScreen — referência de resposta (TIA-39)', () => {
  it('mostra a citação com nome e trecho, sem colar no texto da mensagem', () => {
    render(<ChatScreen chat={PLAIN_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('1', REPLY_MESSAGES) });
    // Escopado dentro do bloco de citação — "Ana" também aparece solto no cabeçalho do chat.
    const quoteBlock = screen.getByRole('button', { name: /ver mensagem original/i });
    expect(within(quoteBlock).getByText('Ana')).toBeInTheDocument();
    expect(within(quoteBlock).getByText('Oi, tudo bem?')).toBeInTheDocument();
    // o corpo da mensagem não deve conter o texto colado do jeito antigo
    expect(screen.queryByText(/↪ Ana:/)).not.toBeInTheDocument();
  });

  it('não mostra bloco de citação em mensagens que não são resposta a nada', () => {
    render(<ChatScreen chat={PLAIN_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('1', PLAIN_MESSAGES) });
    expect(screen.queryByRole('button', { name: /ver mensagem original/i })).not.toBeInTheDocument();
  });

  it('toca na citação e rola até a mensagem original', () => {
    render(<ChatScreen chat={PLAIN_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('1', REPLY_MESSAGES) });
    const original = document.getElementById('msg-m1');
    expect(original).not.toBeNull();
    const scrollIntoView = vi.fn();
    original!.scrollIntoView = scrollIntoView;

    fireEvent.click(screen.getByRole('button', { name: /ver mensagem original/i }));
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it('marcar uma mensagem para responder e enviar manda replyToId/replyToSenderName/replyToExcerpt, sem colar texto', async () => {
    // O mock global resolve qualquer chamada como MOCK_POST — inofensivo nos testes síncronos,
    // mas esse aqui espera tempo real (gesto de long-press), dando espaço pro refetch em
    // background de /chats/1/messages completar e sobrescrever o cache com o formato errado
    // (MOCK_POST não tem `.items`), esvaziando `messages` antes do clique em "Responder".
    // Precisa responder certo por URL pra não corromper o próprio estado que o teste depende.
    mockApiFetch.mockImplementation((url: string) => {
      if (url === '/chats/1/messages') return Promise.resolve({ items: PLAIN_MESSAGES, hasMore: false });
      return Promise.resolve(MOCK_POST);
    });

    render(<ChatScreen chat={PLAIN_CHAT} onBack={() => {}} />, { wrapper: makeWrapper('1', PLAIN_MESSAGES) });

    // Long-press na mensagem da Ana pra abrir o menu (o gesto real usa pointer events + timer de 450ms).
    // Timer real em vez de fake timers: a combinação de fake timers com a máquina de estado de
    // gesto (pointer events + act() do React) mostrou-se instável nesta suíte.
    const bubble = screen.getByText('Olá!').closest('[id^="msg-"]') as HTMLElement;
    fireEvent.pointerDown(bubble, { clientX: 100, clientY: 100 });
    await screen.findByRole('button', { name: /^Responder$/ }, { timeout: 1000 });

    fireEvent.click(screen.getByRole('button', { name: /^Responder$/ }));
    await screen.findByText(/Respondendo a Ana/i);

    const input = screen.getByPlaceholderText(/escreva uma mensagem/i);
    fireEvent.change(input, { target: { value: 'Oi de volta!' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar mensagem/i }));

    await waitFor(() => {
      const sendCall = mockApiFetch.mock.calls.find(
        ([url, opts]) => url === '/chats/1/messages' && opts?.method === 'POST',
      );
      expect(sendCall).toBeDefined();
      const payload = JSON.parse(sendCall![1].body);
      expect(payload).toEqual(expect.objectContaining({
        content: 'Oi de volta!',
        replyToId: '1',
        replyToSenderName: 'Ana',
        replyToExcerpt: 'Olá!',
      }));
    });
  });
});
