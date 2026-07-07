import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { ComunidadeScreen } from './ComunidadeScreen';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  useAppStore.setState({
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

  it('shows Desabafar button in Para Você tab', () => {
    render(<ComunidadeScreen />);
    expect(screen.getByRole('button', { name: 'Desabafar' })).toBeInTheDocument();
  });

  it('hides Desabafar button when on Comunidades tab', () => {
    render(<ComunidadeScreen />);
    fireEvent.click(screen.getByRole('button', { name: /comunidades/i }));
    expect(screen.queryByRole('button', { name: 'Desabafar' })).not.toBeInTheDocument();
  });
});
