import { useState } from 'react';
import { ChevronLeft, Heart, MessageCircle, Share2, Repeat2, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { apiFetch } from '../../lib/api';
import { SharePostSheet } from '../comunidade/SharePostSheet';
import type { CommunityPost, PostComment } from '../../types';
import type { PaginatedResult, ApiPost } from '../../lib/types';

const BADGE_CONFIG = {
  experiente:   { label: 'Mãe Experiente',       color: 'bg-sara-linen text-sara-terracotta' },
  profissional: { label: 'Profissional de Saúde', color: 'bg-sara-cream text-sara-warm' },
} as const;

interface ApiComment {
  id: string;
  content: string;
  author: { id: string; name: string };
  _count: { likes: number };
  createdAt: string;
}

interface PostDetailScreenProps {
  post: CommunityPost;
  onBack: () => void;
}

export function PostDetailScreen({ post, onBack }: PostDetailScreenProps) {
  const motherName = useAppStore((s) => s.motherName);
  const queryClient = useQueryClient();

  const [liked, setLiked] = useState(post.likedByCurrentUser ?? false);
  const [reposted, setReposted] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showShareSheet, setShowShareSheet] = useState(false);

  const { data: commentsData } = useQuery<ApiComment[]>({
    queryKey: ['comments', post.id],
    queryFn: () => apiFetch<ApiComment[]>(`/posts/${post.id}/comments`),
    initialData: [],
  });

  const comments: PostComment[] = (commentsData ?? []).map((c) => ({
    id: c.id,
    author: c.author.name,
    content: c.content,
    time: '',
    likes: c._count.likes,
  }));

  const likeMutation = useMutation({
    mutationFn: (isLiked: boolean) =>
      apiFetch(`/posts/${post.id}/like`, { method: isLiked ? 'POST' : 'DELETE' }),
    onSuccess: (_, isLiked) => {
      queryClient.setQueryData<PaginatedResult<ApiPost>>(['posts'], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  likedByCurrentUser: isLiked,
                  _count: { ...p._count, likes: p._count.likes + (isLiked ? 1 : -1) },
                }
              : p
          ),
        };
      });
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
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-sara-linen/60 flex-shrink-0">
        <button onClick={onBack} aria-label="Voltar" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <p className="text-sm font-semibold text-graphite">Publicação</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Post */}
        <div className="bg-white px-4 py-4 border-b border-sara-linen/60">
          {post.isRepost && (
            <div className="flex items-center gap-1.5 mb-2">
              <Repeat2 size={12} className="text-graphite-muted" />
              <span className="text-[11px] text-graphite-muted">Republicado de {post.repostFrom}</span>
            </div>
          )}

          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {post.author.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-graphite">{post.author}</p>
                {badge && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                    {badge.label}
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs text-graphite-muted flex-shrink-0">{post.time}</span>
          </div>

          <p className="text-sm text-graphite leading-relaxed mb-4">{post.content}</p>

          {post.imageUrl && (
            <img
              src={post.imageUrl}
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
              <div className="w-8 h-8 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
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
          <div className="w-8 h-8 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
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
