import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ChatScreen } from './ChatScreen';
import { useAppStore } from '../../store/useAppStore';
import type { Chat } from '../../types';

const PLAIN_CHAT: Chat = {
  id: '1',
  with: 'Ana',
  lastMessage: 'Olá',
  time: '5min',
  unread: 0,
  messages: [
    { id: '1', from: 'Ana', content: 'Olá!', time: '10:00' },
    { id: '2', from: 'Mariana', content: 'Oi!', time: '10:01' },
  ],
};

const SHARED_CHAT: Chat = {
  id: '2',
  with: 'Fernanda',
  lastMessage: 'veja',
  time: '1h',
  unread: 0,
  messages: [
    {
      id: '1',
      from: 'Mariana',
      content: 'Olha isso!',
      time: '09:00',
      sharedPost: { id: 'p1', author: 'Juliana M.', excerpt: 'Puerpério é difícil' },
    },
    {
      id: '2',
      from: 'Mariana',
      content: '',
      time: '09:01',
      sharedPost: { id: 'p2', author: 'Fernanda S.', excerpt: 'Dica de amamentação' },
    },
  ],
};

beforeEach(() => {
  useAppStore.setState({
    motherName: 'Mariana',
    chats: [PLAIN_CHAT, SHARED_CHAT],
    communityPosts: [
      {
        id: 'p1',
        category: 'pós-parto' as const,
        author: 'Juliana M.',
        content: 'Puerpério é difícil',
        likes: 10,
        replies: 3,
        time: '1h',
        imageUrl: 'data:image/png;base64,abc',
      },
    ],
  });
});

describe('ChatScreen', () => {
  it('renders plain text messages as bubbles', () => {
    render(<ChatScreen chat={PLAIN_CHAT} onBack={() => {}} />);
    expect(screen.getByText('Olá!')).toBeInTheDocument();
    expect(screen.getByText('Oi!')).toBeInTheDocument();
  });

  it('renders "Post compartilhado" label for sharedPost messages', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />);
    expect(screen.getAllByText('Post compartilhado').length).toBe(2);
  });

  it('renders the shared post author name', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />);
    expect(screen.getByText('Juliana M.')).toBeInTheDocument();
  });

  it('renders the shared post excerpt', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />);
    expect(screen.getByText('Puerpério é difícil')).toBeInTheDocument();
  });

  it('renders image when linkedPost has imageUrl', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />);
    const img = screen.getByAltText('Imagem do post');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,abc');
  });

  it('renders comment text when sharedPost message also has content', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />);
    expect(screen.getByText('Olha isso!')).toBeInTheDocument();
  });

  it('clicking shared post card opens PostDetailScreen', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /ver post de Juliana M\./i }));
    expect(screen.getByText('Publicação')).toBeInTheDocument();
  });

  it('does not open PostDetailScreen when shared post is not in communityPosts', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />);
    // p2 is NOT in communityPosts (only p1 is) — button is disabled
    fireEvent.click(screen.getByRole('button', { name: /ver post de Fernanda S\./i }));
    expect(screen.queryByText('Publicação')).not.toBeInTheDocument();
  });
});
