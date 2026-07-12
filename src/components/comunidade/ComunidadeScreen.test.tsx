import { render, screen, fireEvent, waitForElementToBeRemoved } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ComunidadeScreen } from './ComunidadeScreen';
import { useAppStore } from '../../store/useAppStore';

// Make AnimatePresence synchronous so exit tests work without awaiting animations
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

const mockApiFetch = vi.hoisted(() => vi.fn());
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

const API_POSTS = [
  {
    id: '1',
    category: 'gestação',
    author: { id: 'u1', name: 'Fernanda S.' },
    content: 'Post de gestação',
    imageUrl: null,
    authorId: 'u1',
    communityId: 'gestacao-primeiro-tri',
    isRepost: false,
    _count: { likes: 24, comments: 8 },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    likedByCurrentUser: false,
  },
  {
    id: '2',
    category: 'amamentação',
    author: { id: 'u2', name: 'Dra. Carla Lima' },
    content: 'Post de amamentação',
    imageUrl: 'data:image/png;base64,fakedata',
    authorId: 'u2',
    communityId: 'amamentacao-apoio',
    isRepost: false,
    _count: { likes: 67, comments: 12 },
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    likedByCurrentUser: false,
  },
];

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

/** Wait until the loading spinner is gone (query resolved) */
async function waitForFeed() {
  // The spinner has class animate-spin; wait until it's removed from the DOM
  const spinner = document.querySelector('.animate-spin');
  if (spinner) {
    await waitForElementToBeRemoved(() => document.querySelector('.animate-spin'));
  }
}

beforeEach(() => {
  useAppStore.setState({
    motherName: 'Mariana',
    isLoggedIn: true,
    phase: { stage: 'pregnant', week: 28 },
    motherProfile: null,
  });
  mockApiFetch.mockResolvedValue({ items: API_POSTS, hasMore: false });
});

describe('ComunidadeScreen', () => {
  it('renders Para Você and Comunidades top tabs', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await waitForFeed();
    expect(screen.getByRole('button', { name: /para você/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /comunidades/i })).toBeInTheDocument();
  });

  it('defaults to Para Você tab showing the feed', async () => {
    render(<ComunidadeScreen />, { wrapper });
    expect(await screen.findAllByTestId('post-card')).toHaveLength(2);
  });

  it('switches to communities list when Comunidades tab is clicked', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await waitForFeed();
    fireEvent.click(screen.getByRole('button', { name: /comunidades/i }));
    expect(screen.getByRole('button', { name: /seguindo/i })).toBeInTheDocument();
    expect(screen.queryAllByTestId('post-card')).toHaveLength(0);
  });

  it('shows category filter buttons in Para Você tab', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await waitForFeed();
    expect(screen.getByRole('button', { name: /todos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /amamentação/i })).toBeInTheDocument();
  });

  it('filters posts by category in Para Você', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await screen.findAllByTestId('post-card');
    fireEvent.click(screen.getByRole('button', { name: /amamentação/i }));
    const posts = screen.getAllByTestId('post-card');
    posts.forEach((post) => {
      expect(post.getAttribute('data-category')).toBe('amamentação');
    });
  });

  it('does not show Desabafar button', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await waitForFeed();
    expect(screen.queryByRole('button', { name: 'Desabafar' })).not.toBeInTheDocument();
  });

  it('shows ComposerBar in Para Você tab', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await waitForFeed();
    expect(screen.getByText('O que você está sentindo hoje?')).toBeInTheDocument();
  });

  it('hides ComposerBar in Comunidades tab', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await waitForFeed();
    fireEvent.click(screen.getByRole('button', { name: /comunidades/i }));
    expect(screen.queryByText('O que você está sentindo hoje?')).not.toBeInTheDocument();
  });

  it('shows FAB in Para Você tab', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await waitForFeed();
    expect(screen.getByRole('button', { name: 'Criar post' })).toBeInTheDocument();
  });

  it('hides FAB in Comunidades tab', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await waitForFeed();
    fireEvent.click(screen.getByRole('button', { name: /comunidades/i }));
    expect(screen.queryByRole('button', { name: 'Criar post' })).not.toBeInTheDocument();
  });

  it('renders image when post has imageUrl', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await screen.findAllByTestId('post-card');
    const img = screen.getByAltText('Imagem do post');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'data:image/png;base64,fakedata');
  });

  it('renders exactly one image for the one post with imageUrl', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await screen.findAllByTestId('post-card');
    expect(screen.getAllByAltText('Imagem do post')).toHaveLength(1);
  });

  it('renders avatar with author initial inside each PostCard', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await screen.findAllByTestId('post-card');
    const cards = screen.getAllByTestId('post-card');
    expect(cards.length).toBeGreaterThan(0);
    expect(document.querySelector('[data-testid="post-avatar"]')).toBeTruthy();
  });

  it('renders Republicar button in every PostCard', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await screen.findAllByTestId('post-card');
    const btns = screen.getAllByRole('button', { name: /republicar/i });
    expect(btns.length).toBeGreaterThan(0);
  });

  it('renders Enviar post button in every PostCard', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await screen.findAllByTestId('post-card');
    const btns = screen.getAllByRole('button', { name: /enviar post/i });
    expect(btns.length).toBeGreaterThan(0);
  });

  it('clicking Enviar post opens share sheet without navigating to post', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await screen.findAllByTestId('post-card');
    const [firstEnviar] = screen.getAllByRole('button', { name: /enviar post/i });
    fireEvent.click(firstEnviar);
    expect(screen.getByText('Enviar para')).toBeInTheDocument();
  });

  it('clicking Republicar toggles aria-label to Republicado', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await screen.findAllByTestId('post-card');
    const [firstRepost] = screen.getAllByRole('button', { name: /republicar/i });
    fireEvent.click(firstRepost);
    expect(screen.getAllByRole('button', { name: /republicado/i })[0]).toBeInTheDocument();
  });

  it('shows CreatePost modal when ComposerBar is clicked (feed still mounted)', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await waitForFeed();
    fireEvent.click(screen.getByRole('button', { name: /escrever post/i }));
    expect(screen.getByText('O que você está sentindo hoje?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('closes CreatePost modal when Cancelar is clicked', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await waitForFeed();
    fireEvent.click(screen.getByRole('button', { name: /escrever post/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
  });

  it('feed share sheet shows comment textarea', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await screen.findAllByTestId('post-card');
    const [firstEnviar] = screen.getAllByRole('button', { name: /enviar post/i });
    fireEvent.click(firstEnviar);
    expect(screen.getByPlaceholderText(/adicionar um comentário/i)).toBeInTheDocument();
  });

  it('feed share sheet has disabled Enviar button until recipient selected', async () => {
    render(<ComunidadeScreen />, { wrapper });
    await screen.findAllByTestId('post-card');
    const [firstEnviar] = screen.getAllByRole('button', { name: /enviar post/i });
    fireEvent.click(firstEnviar);
    expect(screen.getByTestId('share-send-btn')).toBeDisabled();
  });

  it('PostCard starts as liked when post.likedByCurrentUser is true', async () => {
    const likedPost = {
      id: '3',
      category: 'gestação',
      author: { id: 'u3', name: 'Bia' },
      content: 'Post já curtido',
      imageUrl: null,
      authorId: 'u3',
      communityId: null,
      isRepost: false,
      _count: { likes: 10, comments: 0 },
      createdAt: new Date().toISOString(),
      likedByCurrentUser: true,
    };
    mockApiFetch.mockResolvedValue({ items: [likedPost], hasMore: false });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    qc.setQueryData(['posts'], {
      pages: [{ items: [likedPost], hasMore: false }],
      pageParams: [''],
    });
    render(
      <QueryClientProvider client={qc}><ComunidadeScreen /></QueryClientProvider>
    );
    await screen.findAllByTestId('post-card');
    expect(screen.getByRole('button', { name: 'Descurtir' })).toBeInTheDocument();
  });
});
