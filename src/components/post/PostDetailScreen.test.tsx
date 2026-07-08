import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PostDetailScreen } from './PostDetailScreen';
import { useAppStore } from '../../store/useAppStore';
import type { CommunityPost } from '../../types';

const POST_WITH_IMAGE: CommunityPost = {
  id: '1', category: 'gestação', author: 'Fernanda S.',
  content: 'Dicas para o enjoo', likes: 24, replies: 8, time: '2h',
  imageUrl: 'data:image/png;base64,testimg',
};

const POST_NO_IMAGE: CommunityPost = {
  id: '2', category: 'saúde mental', author: 'Juliana M.',
  content: 'Puerpério é difícil', likes: 10, replies: 3, time: '5h',
};

beforeEach(() => {
  useAppStore.setState({
    motherName: 'Mariana',
    communityPosts: [POST_WITH_IMAGE, POST_NO_IMAGE],
    postComments: {},
    chats: [
      { id: '1', with: 'Ana Oliveira', lastMessage: 'Oi', time: '5min', unread: 0,
        messages: [{ id: '1', from: 'Ana Oliveira', content: 'Oi', time: '14:20' }] },
      { id: '2', with: 'Fernanda S.', lastMessage: 'Ok', time: '2h', unread: 0,
        messages: [{ id: '1', from: 'Fernanda S.', content: 'Ok', time: '12:10' }] },
    ],
  });
});

afterEach(() => {
  useAppStore.setState({ communityPosts: [], postComments: {}, chats: [] });
});

describe('PostDetailScreen', () => {
  it('renders post content', () => {
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />);
    expect(screen.getByText('Dicas para o enjoo')).toBeInTheDocument();
  });

  it('renders image when post has imageUrl', () => {
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />);
    const img = screen.getByAltText('Imagem do post');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,testimg');
  });

  it('does not render image when post has no imageUrl', () => {
    render(<PostDetailScreen post={POST_NO_IMAGE} onBack={() => {}} />);
    expect(screen.queryByAltText('Imagem do post')).not.toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('opens share sheet when Enviar is clicked', () => {
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    expect(screen.getByText('Enviar para')).toBeInTheDocument();
  });

  it('shows all chats in share sheet as checkboxes', () => {
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    expect(screen.getByText('Ana Oliveira')).toBeInTheDocument();
    expect(screen.getByText('Fernanda S.')).toBeInTheDocument();
  });

  it('Enviar button is disabled when no recipient selected', () => {
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    const sendBtn = screen.getByTestId('share-send-btn');
    expect(sendBtn).toBeDisabled();
  });

  it('Enviar button becomes enabled after selecting a recipient', () => {
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    fireEvent.click(screen.getByText('Ana Oliveira'));
    const sendBtn = screen.getByTestId('share-send-btn');
    expect(sendBtn).not.toBeDisabled();
  });

  it('shows a comment textarea in the share sheet', () => {
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    expect(screen.getByPlaceholderText(/adicionar um comentário/i)).toBeInTheDocument();
  });

  it('closes share sheet after sending', () => {
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    fireEvent.click(screen.getByText('Ana Oliveira'));
    fireEvent.click(screen.getByTestId('share-send-btn'));
    expect(screen.queryByText('Enviar para')).not.toBeInTheDocument();
  });
});
