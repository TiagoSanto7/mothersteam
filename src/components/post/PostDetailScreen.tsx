import { useState } from 'react';
import { ChevronLeft, Heart, MessageCircle, Share2, Repeat2, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { apiFetch, resolveMediaUrl } from '../../lib/api';
import { patchPostLikeInAllCaches, apiPostToCommunityPost } from '../../lib/helpers';
import { SharePostSheet } from '../comunidade/SharePostSheet';
import { PostActionsMenu } from '../comunidade/PostActionsMenu';
import { getAvatarColor } from '../../utils/avatar';
import type { CommunityPost, PostComment } from '../../types';
import type { ApiPost, PaginatedResult } from '../../lib/types';

const BADGE_CONFIG = {
  experiente:   { label: 'Mãe Experiente',       color: 'bg-sara-linen text-sara-terracotta' },
  profissional: { label: 'Profissional de Saúde', color: 'bg-sara-cream text-sara-warm' },
} as const;

interface ApiComment {
  id: string;
  content: string;
  author: { id: string; name: string; archetypeKey?: string | null };
  likes: number;
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

  const [liked, setLiked] = useState(post.likedByCurrentUser ?? false);
  const [reposted, setReposted] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [viewingOriginalId, setViewingOriginalId] = useState<string | null>(null);

  const { data: commentsData } = useQuery<PaginatedResult<ApiComment>>({
    queryKey: ['comments', post.id],
    queryFn: () => apiFetch<PaginatedResult<ApiComment>>(`/posts/${post.id}/comments`),
    initialData: { items: [], hasMore: false },
  });

  const { data: originalApiPost } = useQuery({
    queryKey: ['posts', viewingOriginalId],
    queryFn: () => apiFetch<ApiPost>(`/posts/${viewingOriginalId}`),
    enabled: !!viewingOriginalId,
  });

  const comments: PostComment[] = (commentsData?.items ?? []).map((c) => ({
    id: c.id,
    author: c.author.name,
    authorArchetypeKey: c.author.archetypeKey ?? null,
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
    mutationFn: () => apiFetch(`/posts/${post.id}/repost`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
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

  function handleLike() {
    const next = !liked;
    setLiked(next);
    likeMutation.mutate(next);
  }

  function handleRepost() {
    if (!reposted) {
      repostMutation.mutate();
      setReposted(true);
    }
  }

  function handleComment() {
    if (!commentText.trim()) return;
    commentMutation.mutate(commentText.trim());
    setCommentText('');
  }

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden relative">
      <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 pt-6 pb-4 border-b border-sara-linen/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} aria-label="Voltar" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
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
              <span className="text-[11px] text-graphite-muted">Republicado</span>
            </div>
          )}

          <div className="flex items-start justify-between gap-2 mb-3">
            <button
              type="button"
              onClick={() => post.authorId && onOpenProfile?.(post.authorId)}
              aria-label={`Ver perfil de ${post.author}`}
              className="flex items-center gap-2.5 text-left"
            >
              <div
                style={{ background: getAvatarColor(post.authorArchetypeKey) }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              >
                {post.author.charAt(0)}
              </div>
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

          {/* Repost original — clickable to navigate to the original post */}
          {post.isRepost && post.repostOriginal ? (
            <button
              type="button"
              onClick={() => post.repostOriginal?.originalPostId && setViewingOriginalId(post.repostOriginal.originalPostId)}
              className="w-full text-left border border-sara-linen rounded-2xl p-3 mb-4 bg-white/60 active:bg-sara-linen/50 transition-colors"
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
          ) : (
            <p className="text-sm text-graphite leading-relaxed mb-4">{post.content}</p>
          )}

          {post.imageUrl && (
            <img
              src={resolveMediaUrl(post.imageUrl)}
              alt="Imagem do post"
              className="w-full rounded-xl object-cover max-h-64 mb-4"
            />
          )}

          <div className="flex items-center gap-6 pt-3 border-t border-sara-linen/60">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-xs transition-colors ${liked ? 'text-sara-terracotta' : 'text-graphite-muted'}`}
            >
              <Heart size={16} fill={liked ? 'currentColor' : 'none'} strokeWidth={1.8} />
              <span>{post.likes - (post.likedByCurrentUser ? 1 : 0) + (liked ? 1 : 0)}</span>
            </button>
            <button className="flex items-center gap-1.5 text-xs text-graphite-muted">
              <MessageCircle size={16} strokeWidth={1.8} />
              <span>{post.replies + comments.length}</span>
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
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              <div
                style={{ background: getAvatarColor(c.authorArchetypeKey) }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
              >
                {c.author.charAt(0)}
              </div>
              <div className="flex-1 bg-white rounded-2xl px-3 py-2.5 shadow-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-semibold text-graphite">{c.author}</p>
                  <span className="text-[10px] text-graphite-muted">{c.time}</span>
                </div>
                <p className="text-xs text-graphite leading-relaxed mt-0.5">{c.content}</p>
                <button className="flex items-center gap-1 mt-2 text-graphite-muted">
                  <Heart size={10} />
                  <span className="text-[10px]">{c.likes}</span>
                </button>
              </div>
            </div>
          ))}
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
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              placeholder="Adicionar comentário..."
              className="flex-1 bg-transparent text-sm text-graphite placeholder:text-sara-muted outline-none"
            />
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
    </div>
  );
}
