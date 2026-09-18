import { useCallback } from 'react';
import { useQuery, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { apiFetch, uploadImageWithProgress } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiPost } from '../../lib/types';
import type { CommunityPost } from '../../types';

/**
 * Optimistic publishing, like big feeds: the post shows up at the top of the author's feed the
 * moment she taps "Publicar", with a "Publicando…" state (and real upload progress for photos).
 * When the server confirms, it becomes the real post in place, briefly highlighted, and a short
 * "Publicado" notice shows. If it fails it stays as "Não publicado · Tentar de novo".
 *
 * Client-only state lives in its own React Query keys (outside ['posts']), so feed refetches
 * never wipe a post that is still being sent.
 */

export interface PublishPayload {
  content: string;
  category: CommunityPost['category'];
  communityId?: string;
  imageFile?: File | null;
}

export interface PendingPost {
  tempId: string;
  status: 'sending' | 'failed';
  /** Upload progress 0–1 while a photo is sent; null when there is no photo. */
  progress: number | null;
  payload: PublishPayload;
  previewUrl?: string;
  createdAt: string;
}

type FeedPage = { items: ApiPost[]; hasMore: boolean; nextCursor?: string };

export const PENDING_KEY = ['publishing', 'pending'] as const;
export const JUST_PUBLISHED_KEY = ['publishing', 'justPublished'] as const;
export const NOTICE_KEY = ['publishing', 'notice'] as const;

// How long a freshly published post counts as "just published" (drives the one-off highlight).
export const HIGHLIGHT_MS = 2500;
const NOTICE_MS = 2500;

const EMPTY_PENDING: PendingPost[] = [];
const EMPTY_IDS: string[] = [];

const readOnly = { queryFn: () => Promise.resolve(null), staleTime: Infinity, gcTime: Infinity, enabled: false } as const;

export function usePendingPosts(communityId?: string): PendingPost[] {
  const { data } = useQuery({ queryKey: PENDING_KEY, ...readOnly, initialData: EMPTY_PENDING });
  const list = data ?? EMPTY_PENDING;
  return communityId === undefined ? list : list.filter((p) => p.payload.communityId === communityId);
}

export function useJustPublishedIds(): string[] {
  const { data } = useQuery({ queryKey: JUST_PUBLISHED_KEY, ...readOnly, initialData: EMPTY_IDS });
  return data ?? EMPTY_IDS;
}

export function usePublishNotice(): string | null {
  const { data } = useQuery<string | null>({ queryKey: NOTICE_KEY, ...readOnly, initialData: null });
  return data ?? null;
}

function setPending(qc: QueryClient, update: (list: PendingPost[]) => PendingPost[]) {
  qc.setQueryData<PendingPost[]>(PENDING_KEY, (old) => update(old ?? EMPTY_PENDING));
}

function patchPending(qc: QueryClient, tempId: string, patch: Partial<PendingPost>) {
  setPending(qc, (list) => list.map((p) => (p.tempId === tempId ? { ...p, ...patch } : p)));
}

/** Puts the confirmed post at the top of a cached infinite list, without refetching it. */
function prependToFeed(qc: QueryClient, key: readonly unknown[], post: ApiPost) {
  qc.setQueryData<InfiniteData<FeedPage>>(key, (old) => {
    if (!old || old.pages.length === 0) return old;
    const [first, ...rest] = old.pages;
    return { ...old, pages: [{ ...first, items: [post, ...first.items.filter((i) => i.id !== post.id)] }, ...rest] };
  });
}

function flash<T>(qc: QueryClient, key: readonly unknown[], add: (old: T) => T, remove: (old: T) => T, ms: number) {
  qc.setQueryData<T>(key, (old) => add(old as T));
  window.setTimeout(() => qc.setQueryData<T>(key, (old) => remove(old as T)), ms);
}

/** Builds the card shown while the post is still being sent. */
export function pendingToCommunityPost(pending: PendingPost, authorName: string, authorId: string | null): CommunityPost {
  return {
    id: pending.tempId,
    authorId: authorId ?? undefined,
    author: authorName || 'Você',
    category: pending.payload.category,
    content: pending.payload.content,
    imageUrl: pending.previewUrl,
    likes: 0,
    replies: 0,
    reposts: 0,
    time: 'agora',
    communityId: pending.payload.communityId,
    isSuggestion: false,
  };
}

async function send(qc: QueryClient, pending: PendingPost) {
  const { payload, tempId } = pending;
  const accessToken = useAppStore.getState().accessToken;
  try {
    let imageUrl: string | undefined;
    if (payload.imageFile) {
      imageUrl = await uploadImageWithProgress(payload.imageFile, accessToken, (progress) =>
        patchPending(qc, tempId, { progress }),
      );
    }
    const post = await apiFetch<ApiPost>('/posts', {
      method: 'POST',
      body: JSON.stringify({
        content: payload.content,
        category: payload.category,
        imageUrl,
        communityId: payload.communityId,
      }),
    });

    // Swap the pending card for the real post in the same render.
    prependToFeed(qc, ['posts'], post);
    if (payload.communityId) prependToFeed(qc, ['communityPosts', payload.communityId], post);
    setPending(qc, (list) => list.filter((p) => p.tempId !== tempId));
    if (pending.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    void qc.invalidateQueries({ queryKey: ['userPosts'] });

    flash<string[]>(qc, JUST_PUBLISHED_KEY, (old) => [...(old ?? []), post.id], (old) => (old ?? []).filter((id) => id !== post.id), HIGHLIGHT_MS);
    flash<string | null>(qc, NOTICE_KEY, () => 'Publicado', (old) => (old === 'Publicado' ? null : old), NOTICE_MS);
  } catch {
    patchPending(qc, tempId, { status: 'failed', progress: null });
  }
}

export function usePublishPost() {
  const qc = useQueryClient();

  const publish = useCallback(
    (payload: PublishPayload) => {
      const pending: PendingPost = {
        tempId: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        status: 'sending',
        progress: payload.imageFile ? 0 : null,
        payload,
        previewUrl: payload.imageFile ? URL.createObjectURL(payload.imageFile) : undefined,
        createdAt: new Date().toISOString(),
      };
      setPending(qc, (list) => [pending, ...list]);
      void send(qc, pending);
    },
    [qc],
  );

  const retry = useCallback(
    (tempId: string) => {
      const pending = qc.getQueryData<PendingPost[]>(PENDING_KEY)?.find((p) => p.tempId === tempId);
      if (!pending || pending.status !== 'failed') return;
      const again = { ...pending, status: 'sending' as const, progress: pending.payload.imageFile ? 0 : null };
      patchPending(qc, tempId, again);
      void send(qc, again);
    },
    [qc],
  );

  const discard = useCallback(
    (tempId: string) => {
      const pending = qc.getQueryData<PendingPost[]>(PENDING_KEY)?.find((p) => p.tempId === tempId);
      if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
      setPending(qc, (list) => list.filter((p) => p.tempId !== tempId));
    },
    [qc],
  );

  return { publish, retry, discard };
}
