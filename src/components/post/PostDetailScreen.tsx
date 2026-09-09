import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimate } from 'framer-motion';
import { ChevronLeft, Heart, MessageCircle, Share2, Repeat2, Send, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { apiFetch, resolveMediaUrl } from '../../lib/api';
import { patchPostLikeInAllCaches, apiPostToCommunityPost } from '../../lib/helpers';
import { SharePostSheet } from '../comunidade/SharePostSheet';
import { QuoteRepostSheet } from '../comunidade/QuoteRepostSheet';
import { PostActionsMenu } from '../comunidade/PostActionsMenu';
import { getAvatarColor } from '../../utils/avatar';
import { UserAvatar } from '../shared/UserAvatar';
import type { CommunityPost } from '../../types';
import type { ApiPost, PaginatedResult } from '../../lib/types';
import { MentionText } from '../shared/MentionText';
import { MentionInput } from '../shared/MentionInput';

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins}min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

async function lookupAndOpen(username: string, onOpenProfile?: (id: string) => void) {
  if (!onOpenProfile) return;
  try {
    const res = await apiFetch<{ items: { id: string; username: string | null }[] }>(
      `/users?q=${encodeURIComponent(username)}&limit=10`
    );
    const match = res.items.find((u) => u.username?.toLowerCase() === username.toLowerCase());
    if (match) onOpenProfile(match.id);
  } catch { /* ignore */ }
}

const BADGE_CONFIG = {
  experiente:   { label: 'Mãe Experiente',       color: 'bg-mt-linen text-mt-rose-dark' },
  profissional: { label: 'Profissional de Saúde', color: 'bg-mt-cream text-mt-muted' },
} as const;

interface ApiReply {
  id: string;
  content: string;
  author: { id: string; name: string; archetypeKey?: string | null; avatarUrl?: string | null };
  likes: number;
  likedByCurrentUser: boolean;
  createdAt: string;
}

interface ApiComment extends ApiReply {
  replies: ApiReply[];
}

interface PostDetailScreenProps {
  post: CommunityPost;
  onBack: () => void;
  onOpenProfile?: (userId: string) => void;
}

export function PostDetailScreen({ post, onBack, onOpenProfile }: PostDetailScreenProps) {
  const motherName    = useAppStore((s) => s.motherName);
  const motherProfile = useAppStore((s) => s.motherProfile);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const queryClient = useQueryClient();
  const [scope, animate] = useAnimate();

  useEffect(() => {
    animate(scope.current, { x: 0 }, { duration: 0.28, ease: [0.4, 0, 0.2, 1] });
  }, []);

  const [liked, setLiked] = useState(post.likedByCurrentUser ?? false);
  const [bounceKey, setBounceKey] = useState(0);
  const [showParticle, setShowParticle] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showRepostSheet, setShowRepostSheet] = useState(false);
  const [viewingOriginalId, setViewingOriginalId] = useState<string | null>(null);
  const [commentLikeState, setCommentLikeState] = useState<Record<string, { likes: number; liked: boolean }>>({})
  const [commentBounceKey, setCommentBounceKey] = useState<Record<string, number>>({});
  const [commentParticle, setCommentParticle] = useState<Record<string, boolean>>({});
  const [pendingCommentIds, setPendingCommentIds] = useState<Record<string, boolean>>({});
  const pendingCommentIdsRef = useRef<Record<string, boolean>>({});
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);

  const { data: commentsData } = useQuery<PaginatedResult<ApiComment>>({
    queryKey: ['comments', post.id],
    queryFn: () => apiFetch<PaginatedResult<ApiComment>>(`/posts/${post.id}/comments`),
    placeholderData: { items: [], hasMore: false },
  });

  const likeCommentMutation = useMutation({
    mutationFn: ({ commentId, isLiked }: { commentId: string; isLiked: boolean }) =>
      apiFetch<{ id: string; likes: number; likedByCurrentUser: boolean }>(
        `/posts/${post.id}/comments/${commentId}/like`,
        { method: isLiked ? 'POST' : 'DELETE' },
      ),
    onMutate: async ({ commentId, isLiked }) => {
      setPendingCommentIds((prev) => {
        const next = { ...prev, [commentId]: true }
        pendingCommentIdsRef.current = next
        return next
      })
      const prev = commentLikeState[commentId]
      const prevLiked = prev?.liked ?? false
      const prevCount = prev?.likes ?? 0
      setCommentLikeState((p) => ({
        ...p,
        [commentId]: { likes: prevCount + (isLiked ? 1 : -1), liked: isLiked },
      }))
      return { prevLiked, prevCount }
    },
    onError: (_err, { commentId }, ctx) => {
      if (!ctx) return
      setCommentLikeState((p) => ({
        ...p,
        [commentId]: { likes: ctx.prevCount, liked: ctx.prevLiked },
      }))
    },
    onSettled: (_data, _err, { commentId }) => {
      setPendingCommentIds((prev) => {
        const { [commentId]: _, ...rest } = prev
        pendingCommentIdsRef.current = rest
        return rest
      })
    },
    onSuccess: (data) => {
      setCommentLikeState((prev) => ({
        ...prev,
        [data.id]: { likes: data.likes, liked: data.likedByCurrentUser },
      }))
    },
  });

  useEffect(() => {
    if (!commentsData?.items) return
    const nextState: Record<string, { likes: number; liked: boolean }> = {}
    for (const c of commentsData.items) {
      if (!pendingCommentIdsRef.current[c.id]) {
        nextState[c.id] = { likes: c.likes, liked: c.likedByCurrentUser }
      }
      for (const r of c.replies ?? []) {
        if (!pendingCommentIdsRef.current[r.id]) {
          nextState[r.id] = { likes: r.likes, liked: r.likedByCurrentUser }
        }
      }
    }
    setCommentLikeState((prev) => ({ ...prev, ...nextState }))
  }, [commentsData]);

  const { data: originalApiPost } = useQuery({
    queryKey: ['posts', viewingOriginalId],
    queryFn: () => apiFetch<ApiPost>(`/posts/${viewingOriginalId}`),
    enabled: !!viewingOriginalId,
  });

  const likeMutation = useMutation({
    mutationFn: (isLiked: boolean) =>
      apiFetch(`/posts/${post.id}/like`, { method: isLiked ? 'POST' : 'DELETE' }),
    onSuccess: (_, isLiked) => {
      patchPostLikeInAllCaches(queryClient, post.id, isLiked, isLiked ? 1 : -1);
    },
  });

  const repostMutation = useMutation({
    mutationFn: (quoteText?: string) =>
      apiFetch(`/posts/${post.id}/repost`, {
        method: 'POST',
        body: quoteText ? JSON.stringify({ content: quoteText }) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setShowRepostSheet(false);
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) =>
      apiFetch(`/posts/${post.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, ...(parentId ? { parentId } : {}) }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', post.id] }),
  });

  const badge = post.badge ? BADGE_CONFIG[post.badge] : null;

  // When the original post loads, render PostDetailScreen for it
  if (viewingOriginalId && originalApiPost) {
    return (
      <PostDetailScreen
        post={apiPostToCommunityPost(originalApiPost)}
        onBack={() => setViewingOriginalId(null)}
        onOpenProfile={onOpenProfile}
      />
    );
  }

  async function handleBack() {
    await animate(scope.current, { x: '100%' }, { duration: 0.28, ease: [0.4, 0, 0.2, 1] });
    onBack();
  }

  function handleLike() {
    const next = !liked;
    setLiked(next);
    if (next) {
      setBounceKey((k) => k + 1);
      setShowParticle(true);
      setTimeout(() => setShowParticle(false), 700);
    }
    likeMutation.mutate(next);
  }

  function handleRepost() {
    if (!reposted) setShowRepostSheet(true);
  }

  function handleComment() {
    if (!commentText.trim()) return;
    commentMutation.mutate({ content: commentText.trim(), parentId: replyingTo?.id });
    setCommentText('');
    setReplyingTo(null);
  }

  return (
    <motion.div
      ref={scope}
      initial={{ x: '100%' }}
      className="flex flex-col w-full h-full bg-mt-cream overflow-hidden relative"
    >
      <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 pt-6 pb-4 border-b border-mt-linen/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} aria-label="Voltar" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mt-linen">
            <ChevronLeft size={20} className="text-mt-charcoal" />
          </button>
          <p className="text-sm font-semibold text-mt-charcoal">Publicação</p>
        </div>
        <PostActionsMenu
          postId={post.id}
          isOwner={post.authorId === currentUserId}
          onDeleted={onBack}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Post */}
        <div className="bg-white px-4 py-4 border-b border-mt-linen/60">
          {post.isRepost && (
            <div className="flex items-center gap-1.5 mb-2">
              <Repeat2 size={12} className="text-mt-muted" />
              <span className="text-[11px] text-mt-muted">
                {post.quoteContent ? 'Citou' : 'Republicado'}
              </span>
            </div>
          )}

          <div className="flex items-start justify-between gap-2 mb-3">
            <button
              type="button"
              onClick={() => post.authorId && onOpenProfile?.(post.authorId)}
              aria-label={`Ver perfil de ${post.author}`}
              className="flex items-center gap-2.5 text-left"
            >
              <UserAvatar
                name={post.author}
                archetypeKey={post.authorArchetypeKey}
                avatarUrl={post.authorAvatarUrl}
                size={40}
              />
              <div>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-sm font-semibold text-mt-charcoal">{post.author}</p>
                  {post.authorUsername && (
                    <span className="text-xs text-mt-muted/70">@{post.authorUsername}</span>
                  )}
                </div>
                {badge && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                    {badge.label}
                  </span>
                )}
              </div>
            </button>
            <span className="text-xs text-mt-muted flex-shrink-0">{post.time}</span>
          </div>

          {/* Repost / quote post */}
          {post.isRepost && post.repostOriginal ? (
            <div className="mb-4">
              {/* Quote comment — shown above the quoted block when present */}
              {post.quoteContent && (
                <p className="text-sm text-mt-charcoal leading-relaxed mb-3">{post.quoteContent}</p>
              )}
              <button
                type="button"
                onClick={() => post.repostOriginal?.originalPostId && setViewingOriginalId(post.repostOriginal.originalPostId)}
                className="w-full text-left border border-mt-linen rounded-2xl p-3 bg-white/60 active:bg-mt-linen/50 transition-colors"
              >
                <div className="flex items-baseline gap-1.5 mb-1">
                  <p className="text-[11px] font-semibold text-mt-charcoal">{post.repostOriginal.author}</p>
                  {post.repostOriginal.authorUsername && (
                    <span className="text-[10px] text-mt-muted/70">@{post.repostOriginal.authorUsername}</span>
                  )}
                </div>
                <p className="text-sm text-mt-charcoal leading-relaxed">{post.repostOriginal.content}</p>
                {post.repostOriginal.originalPostId && (
                  <p className="text-[10px] text-mt-rose mt-1.5">Toque para ver a publicação original →</p>
                )}
              </button>
            </div>
          ) : (
            <MentionText text={post.content} className="text-sm text-mt-charcoal leading-relaxed mb-4 block" onMentionPress={(u) => lookupAndOpen(u, onOpenProfile)} />
          )}

          {post.imageUrl && (
            <img
              src={resolveMediaUrl(post.imageUrl)}
              alt="Imagem do post"
              className="w-full rounded-xl object-cover max-h-64 mb-4"
            />
          )}

          <div className="flex items-center gap-6 pt-3 border-t border-mt-linen/60">
            <div className="relative inline-flex">
              <motion.button
                key={bounceKey}
                onClick={handleLike}
                aria-label={liked ? 'Descurtir' : 'Curtir'}
                aria-pressed={liked}
                animate={liked ? { scale: [1, 1.4, 0.9, 1.15, 1] } : { scale: [1, 0.85, 1] }}
                transition={{ duration: liked ? 0.4 : 0.2, ease: 'easeOut' }}
                className={`flex items-center gap-1.5 text-xs transition-colors ${liked ? 'text-mt-rose-dark' : 'text-mt-muted'}`}
              >
                <Heart size={16} fill={liked ? 'currentColor' : 'none'} strokeWidth={1.8} />
                <span>{post.likes - (post.likedByCurrentUser ? 1 : 0) + (liked ? 1 : 0)}</span>
              </motion.button>
              <AnimatePresence>
                {showParticle && (
                  <motion.span
                    initial={{ opacity: 0, y: 0, x: -4 }}
                    animate={{ opacity: [0, 1, 1, 0], y: -20 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="absolute -top-1 left-3 text-[10px] font-bold text-mt-rose-dark pointer-events-none"
                  >
                    +1
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <button className="flex items-center gap-1.5 text-xs text-mt-muted">
              <MessageCircle size={16} strokeWidth={1.8} />
              <span>{(commentsData?.items ?? []).length > 0 ? (commentsData?.items ?? []).length : post.replies}</span>
            </button>
            <button
              onClick={handleRepost}
              className={`flex items-center gap-1.5 text-xs transition-colors ${reposted ? 'text-mt-rose-dark' : 'text-mt-muted'}`}
            >
              <Repeat2 size={16} strokeWidth={1.8} />
              <span>{reposted ? 'Republicado' : 'Republicar'}</span>
            </button>
            <button
              onClick={() => setShowShareSheet(true)}
              className="flex items-center gap-1.5 text-xs text-mt-muted active:text-mt-rose transition-colors"
            >
              <Share2 size={16} strokeWidth={1.8} />
              <span>Enviar</span>
            </button>
          </div>
        </div>

        {/* Comments */}
        <div className="px-4 py-4 flex flex-col gap-3">
          {(commentsData?.items ?? []).length === 0 && (
            <p className="text-xs text-mt-muted text-center py-6">Seja a primeira a comentar</p>
          )}
          {(commentsData?.items ?? []).map((c) => {
            const isLiked = commentLikeState[c.id]?.liked ?? false;
            const likeCount = commentLikeState[c.id]?.likes ?? c.likes;
            return (
            <div key={c.id} className="flex flex-col gap-1">
              <div className="flex items-start gap-2.5">
                <UserAvatar
                  name={c.author.name}
                  archetypeKey={c.author.archetypeKey ?? null}
                  avatarUrl={c.author.avatarUrl}
                  size={32}
                />
                <div className="flex-1 bg-white rounded-mt px-3 py-2.5 shadow-mt">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[11px] font-semibold text-mt-charcoal">{c.author.name}</p>
                    <span className="text-[10px] text-mt-muted">{relativeTime(c.createdAt)}</span>
                  </div>
                  <MentionText text={c.content} className="text-xs text-mt-charcoal leading-relaxed mt-0.5 block" onMentionPress={(u) => lookupAndOpen(u, onOpenProfile)} />
                </div>
              </div>
              {/* Actions row — Reply on left, Like on right */}
              <div className="ml-10 flex items-center justify-between mt-0.5">
                <button
                  onClick={() => setReplyingTo({ id: c.id, authorName: c.author.name })}
                  className="text-[11px] font-semibold text-mt-muted hover:text-mt-rose transition-colors"
                >
                  Responder
                </button>
                <div className="relative inline-flex flex-shrink-0">
                  <motion.button
                    key={commentBounceKey[c.id] ?? 0}
                    onClick={() => {
                      const next = !isLiked;
                      likeCommentMutation.mutate({ commentId: c.id, isLiked: next });
                      if (next) {
                        setCommentBounceKey((prev) => ({ ...prev, [c.id]: (prev[c.id] ?? 0) + 1 }));
                        setCommentParticle((prev) => ({ ...prev, [c.id]: true }));
                        setTimeout(() => {
                          setCommentParticle((prev) => ({ ...prev, [c.id]: false }));
                        }, 700);
                      }
                    }}
                    aria-label={isLiked ? 'Descurtir comentário' : 'Curtir comentário'}
                    aria-pressed={isLiked}
                    disabled={!!pendingCommentIds[c.id]}
                    animate={isLiked ? { scale: [1, 1.4, 0.9, 1.15, 1] } : { scale: [1, 0.85, 1] }}
                    transition={{ duration: isLiked ? 0.4 : 0.2, ease: 'easeOut' }}
                    className={`flex items-center gap-1 transition-colors ${isLiked ? 'text-mt-rose-dark' : 'text-mt-muted'}`}
                  >
                    <Heart size={13} fill={isLiked ? 'currentColor' : 'none'} strokeWidth={1.8} />
                    <span className="text-[11px] tabular-nums">{likeCount}</span>
                  </motion.button>
                  <AnimatePresence>
                    {commentParticle[c.id] && (
                      <motion.span
                        initial={{ opacity: 0, y: 0, x: -4 }}
                        animate={{ opacity: [0, 1, 1, 0], y: -20 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="absolute -top-1 left-3 text-[10px] font-bold text-mt-rose-dark pointer-events-none"
                      >
                        +1
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              {/* Nested replies */}
              {c.replies && c.replies.length > 0 && (
                <div className="ml-10 flex flex-col gap-2 mt-1">
                  {c.replies.map((r) => {
                    const rIsLiked = commentLikeState[r.id]?.liked ?? false;
                    const rLikeCount = commentLikeState[r.id]?.likes ?? r.likes;
                    return (
                      <div key={r.id} className="flex flex-col gap-1">
                        <div className="flex items-start gap-2">
                          <UserAvatar
                            name={r.author.name}
                            archetypeKey={r.author.archetypeKey ?? null}
                            avatarUrl={r.author.avatarUrl}
                            size={24}
                          />
                          <div className="flex-1 bg-white/85 rounded-mt px-3 py-2 shadow-mt">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-[10px] font-semibold text-mt-charcoal">{r.author.name}</p>
                              <span className="text-[9px] text-mt-muted">{relativeTime(r.createdAt)}</span>
                            </div>
                            <MentionText text={r.content} className="text-[11px] text-mt-charcoal leading-relaxed mt-0.5 block" onMentionPress={(u) => lookupAndOpen(u, onOpenProfile)} />
                          </div>
                        </div>
                        <div className="ml-8 flex items-center justify-between mt-0.5">
                          <button
                            onClick={() => setReplyingTo({ id: c.id, authorName: r.author.name })}
                            className="text-[10px] font-semibold text-mt-muted hover:text-mt-rose transition-colors"
                          >
                            Responder
                          </button>
                          <div className="relative inline-flex flex-shrink-0">
                            <motion.button
                              key={commentBounceKey[r.id] ?? 0}
                              onClick={() => {
                                const next = !rIsLiked;
                                likeCommentMutation.mutate({ commentId: r.id, isLiked: next });
                                if (next) {
                                  setCommentBounceKey((prev) => ({ ...prev, [r.id]: (prev[r.id] ?? 0) + 1 }));
                                  setCommentParticle((prev) => ({ ...prev, [r.id]: true }));
                                  setTimeout(() => setCommentParticle((prev) => ({ ...prev, [r.id]: false })), 700);
                                }
                              }}
                              aria-label={rIsLiked ? 'Descurtir' : 'Curtir'}
                              aria-pressed={rIsLiked}
                              disabled={!!pendingCommentIds[r.id]}
                              animate={rIsLiked ? { scale: [1, 1.4, 0.9, 1.15, 1] } : { scale: [1, 0.85, 1] }}
                              transition={{ duration: rIsLiked ? 0.4 : 0.2, ease: 'easeOut' }}
                              className={`flex items-center gap-1 transition-colors ${rIsLiked ? 'text-mt-rose-dark' : 'text-mt-muted'}`}
                            >
                              <Heart size={11} fill={rIsLiked ? 'currentColor' : 'none'} strokeWidth={1.8} />
                              <span className="text-[10px] tabular-nums">{rLikeCount}</span>
                            </motion.button>
                            <AnimatePresence>
                              {commentParticle[r.id] && (
                                <motion.span
                                  initial={{ opacity: 0, y: 0, x: -4 }}
                                  animate={{ opacity: [0, 1, 1, 0], y: -20 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.6, ease: 'easeOut' }}
                                  className="absolute -top-1 left-3 text-[10px] font-bold text-mt-rose-dark pointer-events-none"
                                >
                                  +1
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>

      {/* Comment input */}
      <div className="px-4 py-3 border-t border-mt-linen/60 flex-shrink-0 bg-mt-linen/80 backdrop-blur-sm">
        {replyingTo && (
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[11px] text-mt-muted">
              Respondendo a <span className="font-semibold text-mt-charcoal">{replyingTo.authorName}</span>
            </p>
            <button onClick={() => setReplyingTo(null)} aria-label="Cancelar resposta">
              <X size={14} className="text-mt-muted" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div
            style={{ background: getAvatarColor(motherProfile?.archetypeKey ?? null) }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
          >
            {motherName.charAt(0)}
          </div>
          <div className="flex-1 flex items-center gap-2 bg-white rounded-2xl border border-mt-linen px-3 py-2">
            <div className="flex-1 min-w-0">
              <MentionInput
                value={commentText}
                onChange={setCommentText}
                onSubmit={handleComment}
                placeholder={replyingTo ? `Responder a ${replyingTo.authorName}...` : 'Adicionar comentário...'}
                rows={1}
                className="w-full bg-transparent text-sm text-mt-charcoal placeholder:text-mt-muted outline-none resize-none"
              />
            </div>
            <button
              onClick={handleComment}
              disabled={!commentText.trim()}
              className="w-7 h-7 rounded-full bg-mt-rose flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
            >
              <Send size={12} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      </div>

      {showShareSheet && (
        <SharePostSheet post={post} onClose={() => setShowShareSheet(false)} />
      )}
      {showRepostSheet && (
        <QuoteRepostSheet
          post={post}
          onClose={() => setShowRepostSheet(false)}
          onConfirm={(quoteText) => {
            repostMutation.mutate(quoteText);
            setReposted(true);
          }}
          isPending={repostMutation.isPending}
        />
      )}
    </motion.div>
  );
}
