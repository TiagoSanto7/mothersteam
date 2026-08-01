import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimate } from 'framer-motion';
import { ChevronLeft, Heart, MessageCircle, Share2, Repeat2, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { apiFetch, resolveMediaUrl } from '../../lib/api';
import { patchPostLikeInAllCaches, apiPostToCommunityPost } from '../../lib/helpers';
import { SharePostSheet } from '../comunidade/SharePostSheet';
import { QuoteRepostSheet } from '../comunidade/QuoteRepostSheet';
import { PostActionsMenu } from '../comunidade/PostActionsMenu';
import { getAvatarColor } from '../../utils/avatar';
import { UserAvatar } from '../shared/UserAvatar';
import type { CommunityPost, PostComment } from '../../types';
import type { ApiPost, PaginatedResult } from '../../lib/types';
import { MentionText } from '../shared/MentionText';
import { MentionInput } from '../shared/MentionInput';

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
  experiente:   { label: 'Mãe Experiente',       color: 'bg-sara-linen text-sara-terracotta' },
  profissional: { label: 'Profissional de Saúde', color: 'bg-sara-cream text-sara-warm' },
} as const;

interface ApiComment {
  id: string;
  content: string;
  author: { id: string; name: string; archetypeKey?: string | null; avatarUrl?: string | null };
  likes: number;
  likedByCurrentUser: boolean;
  createdAt: string;
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
      setPendingCommentIds((prev) => ({ ...prev, [commentId]: true }))
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
      if (pendingCommentIds[c.id]) continue
      nextState[c.id] = { likes: c.likes, liked: c.likedByCurrentUser }
    }
    setCommentLikeState((prev) => ({ ...prev, ...nextState }))
  }, [commentsData, pendingCommentIds]);

  const { data: originalApiPost } = useQuery({
    queryKey: ['posts', viewingOriginalId],
    queryFn: () => apiFetch<ApiPost>(`/posts/${viewingOriginalId}`),
    enabled: !!viewingOriginalId,
  });

  const comments: PostComment[] = (commentsData?.items ?? []).map((c) => ({
    id: c.id,
    author: c.author.name,
    authorArchetypeKey: c.author.archetypeKey ?? null,
    authorAvatarUrl: c.author.avatarUrl ?? null,
    content: c.content,
    time: '',
    likes: c.likes,
  }));

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
    mutationFn: (content: string) =>
      apiFetch(`/posts/${post.id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
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
    commentMutation.mutate(commentText.trim());
    setCommentText('');
  }

  return (
    <motion.div
      ref={scope}
      initial={{ x: '100%' }}
      className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden relative"
    >
      <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 pt-6 pb-4 border-b border-sara-linen/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} aria-label="Voltar" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
            <ChevronLeft size={20} className="text-graphite" />
          </button>
          <p className="text-sm font-semibold text-graphite">Publicação</p>
        </div>
        <PostActionsMenu
          postId={post.id}
          isOwner={post.authorId === currentUserId}
          onDeleted={onBack}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Post */}
        <div className="bg-white px-4 py-4 border-b border-sara-linen/60">
          {post.isRepost && (
            <div className="flex items-center gap-1.5 mb-2">
              <Repeat2 size={12} className="text-graphite-muted" />
              <span className="text-[11px] text-graphite-muted">
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
                  <p className="text-sm font-semibold text-graphite">{post.author}</p>
                  {post.authorUsername && (
                    <span className="text-xs text-graphite-muted/70">@{post.authorUsername}</span>
                  )}
                </div>
                {badge && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                    {badge.label}
                  </span>
                )}
              </div>
            </button>
            <span className="text-xs text-graphite-muted flex-shrink-0">{post.time}</span>
          </div>

          {/* Repost / quote post */}
          {post.isRepost && post.repostOriginal ? (
            <div className="mb-4">
              {/* Quote comment — shown above the quoted block when present */}
              {post.quoteContent && (
                <p className="text-sm text-graphite leading-relaxed mb-3">{post.quoteContent}</p>
              )}
              <button
                type="button"
                onClick={() => post.repostOriginal?.originalPostId && setViewingOriginalId(post.repostOriginal.originalPostId)}
                className="w-full text-left border border-sara-linen rounded-2xl p-3 bg-white/60 active:bg-sara-linen/50 transition-colors"
              >
                <div className="flex items-baseline gap-1.5 mb-1">
                  <p className="text-[11px] font-semibold text-graphite">{post.repostOriginal.author}</p>
                  {post.repostOriginal.authorUsername && (
                    <span className="text-[10px] text-graphite-muted/70">@{post.repostOriginal.authorUsername}</span>
                  )}
                </div>
                <p className="text-sm text-graphite leading-relaxed">{post.repostOriginal.content}</p>
                {post.repostOriginal.originalPostId && (
                  <p className="text-[10px] text-sara-gold mt-1.5">Toque para ver a publicação original →</p>
                )}
              </button>
            </div>
          ) : (
            <MentionText text={post.content} className="text-sm text-graphite leading-relaxed mb-4 block" onMentionPress={(u) => lookupAndOpen(u, onOpenProfile)} />
          )}

          {post.imageUrl && (
            <img
              src={resolveMediaUrl(post.imageUrl)}
              alt="Imagem do post"
              className="w-full rounded-xl object-cover max-h-64 mb-4"
            />
          )}

          <div className="flex items-center gap-6 pt-3 border-t border-sara-linen/60">
            <div className="relative inline-flex">
              <motion.button
                key={bounceKey}
                onClick={handleLike}
                aria-label={liked ? 'Descurtir' : 'Curtir'}
                aria-pressed={liked}
                animate={liked ? { scale: [1, 1.4, 0.9, 1.15, 1] } : { scale: [1, 0.85, 1] }}
                transition={{ duration: liked ? 0.4 : 0.2, ease: 'easeOut' }}
                className={`flex items-center gap-1.5 text-xs transition-colors ${liked ? 'text-sara-terracotta' : 'text-graphite-muted'}`}
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
                    className="absolute -top-1 left-3 text-[10px] font-bold text-sara-terracotta pointer-events-none"
                  >
                    +1
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <button className="flex items-center gap-1.5 text-xs text-graphite-muted">
              <MessageCircle size={16} strokeWidth={1.8} />
              <span>{comments.length > 0 ? comments.length : post.replies}</span>
            </button>
            <button
              onClick={handleRepost}
              className={`flex items-center gap-1.5 text-xs transition-colors ${reposted ? 'text-sara-warm' : 'text-graphite-muted'}`}
            >
              <Repeat2 size={16} strokeWidth={1.8} />
              <span>{reposted ? 'Republicado' : 'Republicar'}</span>
            </button>
            <button
              onClick={() => setShowShareSheet(true)}
              className="flex items-center gap-1.5 text-xs text-graphite-muted active:text-sara-gold transition-colors"
            >
              <Share2 size={16} strokeWidth={1.8} />
              <span>Enviar</span>
            </button>
          </div>
        </div>

        {/* Comments */}
        <div className="px-4 py-4 flex flex-col gap-3">
          {comments.length === 0 && (
            <p className="text-xs text-graphite-muted text-center py-6">Seja a primeira a comentar</p>
          )}
          {comments.map((c) => {
            const isLiked = commentLikeState[c.id]?.liked ?? false;
            const likeCount = commentLikeState[c.id]?.likes ?? c.likes;
            return (
            <div key={c.id} className="flex items-start gap-2.5">
              <UserAvatar
                name={c.author}
                archetypeKey={c.authorArchetypeKey}
                avatarUrl={c.authorAvatarUrl}
                size={32}
              />
              <div className="flex-1 bg-white rounded-2xl px-3 py-2.5 shadow-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-semibold text-graphite">{c.author}</p>
                  <span className="text-[10px] text-graphite-muted">{c.time}</span>
                </div>
                <MentionText text={c.content} className="text-xs text-graphite leading-relaxed mt-0.5 block" onMentionPress={(u) => lookupAndOpen(u, onOpenProfile)} />
                <div className="relative inline-flex">
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
                    className={`flex items-center gap-1 mt-2 transition-colors ${isLiked ? 'text-sara-terracotta' : 'text-graphite-muted'}`}
                  >
                    <Heart size={10} fill={isLiked ? 'currentColor' : 'none'} />
                    <span className="text-[10px]">{likeCount}</span>
                  </motion.button>
                  <AnimatePresence>
                    {commentParticle[c.id] && (
                      <motion.span
                        initial={{ opacity: 0, y: 0, x: -4 }}
                        animate={{ opacity: [0, 1, 1, 0], y: -20 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="absolute -top-1 left-3 text-[10px] font-bold text-sara-terracotta pointer-events-none"
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
      </div>

      {/* Comment input */}
      <div className="px-4 py-3 border-t border-sara-linen/60 flex-shrink-0 bg-sara-linen/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div
            style={{ background: getAvatarColor(motherProfile?.archetypeKey ?? null) }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
          >
            {motherName.charAt(0)}
          </div>
          <div className="flex-1 flex items-center gap-2 bg-white rounded-2xl border border-sara-linen px-3 py-2">
            <div className="flex-1 min-w-0">
              <MentionInput
                value={commentText}
                onChange={setCommentText}
                onSubmit={handleComment}
                placeholder="Adicionar comentário..."
                rows={1}
                className="w-full bg-transparent text-sm text-graphite placeholder:text-sara-muted outline-none resize-none"
              />
            </div>
            <button
              onClick={handleComment}
              disabled={!commentText.trim()}
              className="w-7 h-7 rounded-full bg-sara-gold flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
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
