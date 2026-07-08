import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    chats: [],
  });
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
});
