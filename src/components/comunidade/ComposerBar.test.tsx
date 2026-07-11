import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ComposerBar } from './ComposerBar';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  useAppStore.setState({ motherName: 'Mariana' });
});

describe('ComposerBar', () => {
  it('renders avatar initial from motherName', () => {
    render(<ComposerBar onOpen={vi.fn()} />);
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('renders placeholder text', () => {
    render(<ComposerBar onOpen={vi.fn()} />);
    expect(screen.getByText('O que você está sentindo hoje?')).toBeInTheDocument();
  });

  it('clicking text button calls onOpen', () => {
    const onOpen = vi.fn();
    render(<ComposerBar onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Escrever post' }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('camera button calls onOpenWithImage when provided', () => {
    const onOpenWithImage = vi.fn();
    render(<ComposerBar onOpen={vi.fn()} onOpenWithImage={onOpenWithImage} />);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar foto' }));
    expect(onOpenWithImage).toHaveBeenCalledOnce();
  });

  it('camera button falls back to onOpen when onOpenWithImage not provided', () => {
    const onOpen = vi.fn();
    render(<ComposerBar onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar foto' }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('uses first letter of a different motherName as initial', () => {
    useAppStore.setState({ motherName: 'Fernanda' });
    render(<ComposerBar onOpen={vi.fn()} />);
    expect(screen.getByText('F')).toBeInTheDocument();
  });
});
