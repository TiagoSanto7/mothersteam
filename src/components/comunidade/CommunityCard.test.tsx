import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommunityCard } from './CommunityCard';
import type { Community } from '../../types';

const MOCK_COMMUNITY: Community = {
  id: 'amamentacao-apoio',
  name: 'Amamentação com Apoio',
  description: 'Dúvidas, desafios e conquistas da amamentação, sem julgamentos.',
  category: 'amamentação',
  memberCount: 3210,
  colorKey: 'warm',
};

describe('CommunityCard', () => {
  it('renders community name with serif font class', () => {
    render(<CommunityCard community={MOCK_COMMUNITY} isFollowing={false} onToggle={vi.fn()} />);
    const title = screen.getByText('Amamentação com Apoio');
    expect(title).toBeInTheDocument();
    expect(title.className).toMatch(/font-serif/);
  });

  it('renders description and member count', () => {
    render(<CommunityCard community={MOCK_COMMUNITY} isFollowing={false} onToggle={vi.fn()} />);
    expect(screen.getByText(/dúvidas, desafios/i)).toBeInTheDocument();
    expect(screen.getByText(/3\.210/)).toBeInTheDocument();
  });

  it('shows "Seguir" button when not following', () => {
    render(<CommunityCard community={MOCK_COMMUNITY} isFollowing={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('button', { name: /seguir/i })).toBeInTheDocument();
  });

  it('shows "Seguindo" button when following', () => {
    render(<CommunityCard community={MOCK_COMMUNITY} isFollowing={true} onToggle={vi.fn()} />);
    expect(screen.getByRole('button', { name: /deixar de seguir/i })).toBeInTheDocument();
  });

  it('calls onToggle with community id on button click', () => {
    const onToggle = vi.fn();
    render(<CommunityCard community={MOCK_COMMUNITY} isFollowing={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: /seguir/i }));
    expect(onToggle).toHaveBeenCalledWith('amamentacao-apoio');
  });
});
