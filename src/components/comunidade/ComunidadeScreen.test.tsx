import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ComunidadeScreen } from './ComunidadeScreen';

describe('ComunidadeScreen', () => {
  it('renders category filter buttons', () => {
    render(<ComunidadeScreen />);
    expect(screen.getByRole('button', { name: /todos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /gestação/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pós-parto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /amamentação/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /saúde mental/i })).toBeInTheDocument();
  });

  it('shows all posts when Todos is selected', () => {
    render(<ComunidadeScreen />);
    fireEvent.click(screen.getByRole('button', { name: /todos/i }));
    expect(screen.getAllByTestId('post-card').length).toBeGreaterThan(1);
  });

  it('filters posts by category', () => {
    render(<ComunidadeScreen />);
    fireEvent.click(screen.getByRole('button', { name: /amamentação/i }));
    const posts = screen.getAllByTestId('post-card');
    posts.forEach((post) => {
      expect(post.getAttribute('data-category')).toBe('amamentação');
    });
  });

  it('shows Desabafar button', () => {
    render(<ComunidadeScreen />);
    expect(screen.getByRole('button', { name: /desabafar/i })).toBeInTheDocument();
  });
});
