import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { ComunidadeScreen } from './ComunidadeScreen';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  useAppStore.setState({
    motherName: 'Mariana',
    communityPosts: [
      {
        id: '1', category: 'gestação', author: 'Fernanda S.', badge: 'experiente',
        content: 'Post de gestação', likes: 24, replies: 8, time: '2h',
        communityId: 'gestacao-primeiro-tri',
      },
      {
        id: '2', category: 'amamentação', author: 'Dra. Carla Lima', badge: 'profissional',
        content: 'Post de amamentação', likes: 67, replies: 12, time: '4h',
        communityId: 'amamentacao-apoio',
        imageUrl: 'data:image/png;base64,fakedata',
      },
    ],
    communities: [
      {
        id: 'amamentacao-apoio',
        name: 'Amamentação com Apoio',
        description: 'Dúvidas da amamentação.',
        category: 'amamentação',
        memberCount: 3210,
        colorKey: 'warm',
      },
    ],
    followedCommunityIds: ['amamentacao-apoio'],
    phase: { stage: 'pregnant', week: 28 },
    motherProfile: null,
  });
});

describe('ComunidadeScreen', () => {
  it('renders Para Você and Comunidades top tabs', () => {
    render(<ComunidadeScreen />);
    expect(screen.getByRole('button', { name: /para você/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /comunidades/i })).toBeInTheDocument();
  });

  it('defaults to Para Você tab showing the feed', () => {
    render(<ComunidadeScreen />);
    expect(screen.getAllByTestId('post-card').length).toBeGreaterThan(0);
  });

  it('switches to communities list when Comunidades tab is clicked', () => {
    render(<ComunidadeScreen />);
    fireEvent.click(screen.getByRole('button', { name: /comunidades/i }));
    expect(screen.getByRole('button', { name: /seguindo/i })).toBeInTheDocument();
    expect(screen.queryAllByTestId('post-card')).toHaveLength(0);
  });

  it('shows category filter buttons in Para Você tab', () => {
    render(<ComunidadeScreen />);
    expect(screen.getByRole('button', { name: /todos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /amamentação/i })).toBeInTheDocument();
  });

  it('filters posts by category in Para Você', () => {
    render(<ComunidadeScreen />);
    fireEvent.click(screen.getByRole('button', { name: /amamentação/i }));
    const posts = screen.getAllByTestId('post-card');
    posts.forEach((post) => {
      expect(post.getAttribute('data-category')).toBe('amamentação');
    });
  });

  it('does not show Desabafar button', () => {
    render(<ComunidadeScreen />);
    expect(screen.queryByRole('button', { name: 'Desabafar' })).not.toBeInTheDocument();
  });

  it('shows ComposerBar in Para Você tab', () => {
    render(<ComunidadeScreen />);
    expect(screen.getByText('O que você está sentindo hoje?')).toBeInTheDocument();
  });

  it('hides ComposerBar in Comunidades tab', () => {
    render(<ComunidadeScreen />);
    fireEvent.click(screen.getByRole('button', { name: /comunidades/i }));
    expect(screen.queryByText('O que você está sentindo hoje?')).not.toBeInTheDocument();
  });

  it('shows FAB in Para Você tab', () => {
    render(<ComunidadeScreen />);
    expect(screen.getByRole('button', { name: 'Criar post' })).toBeInTheDocument();
  });

  it('hides FAB in Comunidades tab', () => {
    render(<ComunidadeScreen />);
    fireEvent.click(screen.getByRole('button', { name: /comunidades/i }));
    expect(screen.queryByRole('button', { name: 'Criar post' })).not.toBeInTheDocument();
  });

  it('renders image when post has imageUrl', () => {
    render(<ComunidadeScreen />);
    const img = screen.getByAltText('Imagem do post');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'data:image/png;base64,fakedata');
  });

  it('renders exactly one image for the one post with imageUrl', () => {
    render(<ComunidadeScreen />);
    expect(screen.getAllByAltText('Imagem do post')).toHaveLength(1);
  });
});
