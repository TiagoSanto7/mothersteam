import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { CreatePostScreen } from './CreatePostScreen';
import { useAppStore } from '../../store/useAppStore';

// Synchronous FileReader mock: readAsDataURL immediately fires onload
class MockFileReader {
  result = 'data:image/png;base64,fakedata';
  onload: ((e: any) => void) | null = null;
  readAsDataURL(_file: File) {
    this.onload?.({ target: this });
  }
}

beforeEach(() => {
  useAppStore.setState({ motherName: 'Mariana', communityPosts: [] });
  vi.stubGlobal('FileReader', MockFileReader);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CreatePostScreen', () => {
  it('renders textarea and publish button', () => {
    render(<CreatePostScreen onBack={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /publicar/i })).toBeInTheDocument();
  });

  it('renders Adicionar foto button', () => {
    render(<CreatePostScreen onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /adicionar foto/i })).toBeInTheDocument();
  });

  it('shows image preview after file is selected', async () => {
    render(<CreatePostScreen onBack={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['hello'], 'photo.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    const preview = screen.getByRole('img', { name: 'Preview' });
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveAttribute('src', 'data:image/png;base64,fakedata');
  });

  it('removes preview when X button is clicked', async () => {
    render(<CreatePostScreen onBack={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['hello'], 'photo.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect(screen.getByRole('img', { name: 'Preview' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remover imagem' }));
    expect(screen.queryByRole('img', { name: 'Preview' })).not.toBeInTheDocument();
  });

  it('submits post with imageUrl when image is selected', async () => {
    render(<CreatePostScreen onBack={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['hello'], 'photo.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Meu desabafo' } });
    fireEvent.click(screen.getByRole('button', { name: /publicar/i }));
    const posts = useAppStore.getState().communityPosts;
    expect(posts[0].imageUrl).toBe('data:image/png;base64,fakedata');
    expect(posts[0].content).toBe('Meu desabafo');
  });

  it('submits post without imageUrl when no image selected', () => {
    render(<CreatePostScreen onBack={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Só texto' } });
    fireEvent.click(screen.getByRole('button', { name: /publicar/i }));
    const posts = useAppStore.getState().communityPosts;
    expect(posts[0].imageUrl).toBeUndefined();
  });
});
