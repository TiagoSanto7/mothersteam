import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  JUST_PUBLISHED_KEY,
  NOTICE_KEY,
  PENDING_KEY,
  usePendingPosts,
  usePublishPost,
  type PendingPost,
} from './publishing';
import { useAppStore } from '../../store/useAppStore';
import type { ApiPost } from '../../lib/types';

const { mockApiFetch, mockUpload } = vi.hoisted(() => ({ mockApiFetch: vi.fn(), mockUpload: vi.fn() }));
vi.mock('../../lib/api', () => ({
  apiFetch: mockApiFetch,
  uploadImageWithProgress: mockUpload,
  ApiError: class extends Error {},
}));

const realPost = (id: string, extra: Partial<ApiPost> = {}): ApiPost => ({
  id, content: 'Oi', category: 'gestação', authorId: 'me', author: { id: 'me', name: 'Fernanda' },
  isRepost: false, _count: { likes: 0, comments: 0, reposts: 0 }, createdAt: new Date().toISOString(),
  likedByCurrentUser: false, isSuggestion: false, ...extra,
});

type Feed = InfiniteData<{ items: ApiPost[]; hasMore: boolean }>;

let qc: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
const pending = () => qc.getQueryData<PendingPost[]>(PENDING_KEY) ?? [];
const feedIds = (key: unknown[] = ['posts']) => qc.getQueryData<Feed>(key)?.pages[0].items.map((i) => i.id);

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData<Feed>(['posts'], { pages: [{ items: [realPost('old')], hasMore: false }], pageParams: [''] });
  mockApiFetch.mockReset();
  mockUpload.mockReset();
  vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() });
  useAppStore.setState({ accessToken: 'tok', currentUserId: 'me', motherName: 'Fernanda' });
});

afterEach(() => vi.unstubAllGlobals());

describe('usePublishPost', () => {
  it('mostra o post pendente na hora e, confirmado, troca pelo post real no topo com realce e aviso', async () => {
    let resolve!: (p: ApiPost) => void;
    mockApiFetch.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { result } = renderHook(() => usePublishPost(), { wrapper });

    act(() => result.current.publish({ content: 'Oi', category: 'gestação' }));
    expect(pending()).toHaveLength(1);
    expect(pending()[0]).toMatchObject({ status: 'sending', progress: null });
    expect(feedIds()).toEqual(['old']);

    await act(async () => resolve(realPost('new')));
    await waitFor(() => expect(pending()).toHaveLength(0));
    expect(feedIds()).toEqual(['new', 'old']);
    expect(qc.getQueryData(JUST_PUBLISHED_KEY)).toEqual(['new']);
    expect(qc.getQueryData(NOTICE_KEY)).toBe('Publicado');
  });

  it('acompanha o progresso do envio da foto', async () => {
    let finishUpload!: (url: string) => void;
    mockUpload.mockImplementation((_f: File, _t: string, onProgress: (n: number) => void) => {
      onProgress(0.4);
      return new Promise((r) => { finishUpload = r; });
    });
    mockApiFetch.mockResolvedValue(realPost('com-foto'));
    const { result } = renderHook(() => usePublishPost(), { wrapper });
    const file = new File(['x'], 'a.png', { type: 'image/png' });

    act(() => result.current.publish({ content: '', category: 'gestação', imageFile: file }));
    await waitFor(() => expect(pending()[0].progress).toBe(0.4));
    expect(pending()[0].previewUrl).toBe('blob:preview');

    await act(async () => finishUpload('/uploads/a.png'));
    await waitFor(() => expect(pending()).toHaveLength(0));
    expect(JSON.parse(mockApiFetch.mock.calls[0][1].body).imageUrl).toBe('/uploads/a.png');
  });

  it('se falhar, fica como "não publicado"; tentar de novo publica', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(realPost('retry-ok'));
    const { result } = renderHook(() => usePublishPost(), { wrapper });

    act(() => result.current.publish({ content: 'Oi', category: 'gestação' }));
    await waitFor(() => expect(pending()[0]?.status).toBe('failed'));
    expect(feedIds()).toEqual(['old']);

    act(() => result.current.retry(pending()[0].tempId));
    expect(pending()[0].status).toBe('sending');
    await waitFor(() => expect(pending()).toHaveLength(0));
    expect(feedIds()).toEqual(['retry-ok', 'old']);
  });

  it('descartar remove o post que falhou', async () => {
    mockApiFetch.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => usePublishPost(), { wrapper });
    act(() => result.current.publish({ content: 'Oi', category: 'gestação' }));
    await waitFor(() => expect(pending()[0]?.status).toBe('failed'));

    act(() => result.current.discard(pending()[0].tempId));
    expect(pending()).toHaveLength(0);
  });

  it('post de comunidade entra também na lista daquela comunidade', async () => {
    qc.setQueryData<Feed>(['communityPosts', 'c1'], { pages: [{ items: [], hasMore: false }], pageParams: [''] });
    mockApiFetch.mockResolvedValue(realPost('na-comunidade', { communityId: 'c1' }));
    const { result } = renderHook(() => usePublishPost(), { wrapper });

    act(() => result.current.publish({ content: 'Oi', category: 'gestação', communityId: 'c1' }));
    await waitFor(() => expect(feedIds(['communityPosts', 'c1'])).toEqual(['na-comunidade']));
  });
});

describe('usePendingPosts', () => {
  it('filtra por comunidade', () => {
    qc.setQueryData<PendingPost[]>(PENDING_KEY, [
      { tempId: 'a', status: 'sending', progress: null, payload: { content: '', category: 'gestação' }, createdAt: '' },
      { tempId: 'b', status: 'sending', progress: null, payload: { content: '', category: 'gestação', communityId: 'c1' }, createdAt: '' },
    ]);
    const all = renderHook(() => usePendingPosts(), { wrapper });
    const c1 = renderHook(() => usePendingPosts('c1'), { wrapper });
    expect(all.result.current.map((p) => p.tempId)).toEqual(['a', 'b']);
    expect(c1.result.current.map((p) => p.tempId)).toEqual(['b']);
  });
});
