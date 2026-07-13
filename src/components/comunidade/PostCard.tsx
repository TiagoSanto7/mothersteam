import { useState } from 'react';
import { MessageCircle, Heart, Repeat2, Share2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { patchPostLikeInAllCaches } from '../../lib/helpers';
import { SharePostSheet } from './SharePostSheet';
import type { CommunityPost } from '../../types';

const BADGE_CONFIG = {
  experiente:   { label: 'Mãe Experiente',       color: 'bg-sara-linen text-sara-terracotta' },
  profissional: { label: 'Profissional de Saúde', color: 'bg-sara-cream text-sara-warm' },
} as const;

interface PostCardProps {
  post: CommunityPost;
  onOpen: () => void;
  onOpenProfile: () => void;
}

export function PostCard({ post, onOpen, onOpenProfile }: PostCardProps) {
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(post.likedByCurrentUser ?? false);
  const [reposted, setReposted] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const badge = post.badge ? BADGE_CONFIG[post.badge] : null;

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

  return (
    <>
      <div
        data-testid="post-card"
        data-category={post.category}
        className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-3"
      >
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenProfile(); }}
            aria-label={`Ver perfil de ${post.author}`}
            className="flex items-center gap-2.5 text-left"
          >
            <div
              data-testid="post-avatar"
              aria-hidden="true"
              className="w-10 h-10 rounded-full bg-sara-terracotta flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            >
              {post.author.charAt(0)}
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-1.5">
                <p className="text-sm font-semibold text-graphite">{post.author}</p>
                {post.authorUsername && (
                  <span className="text-xs text-graphite-muted/70">@{post.authorUsername}</span>
                )}
              </div>
              {badge && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full w-fit ${badge.color}`}>
                  {badge.label}
                </span>
              )}
            </div>
          </button>
          <span className="text-xs text-graphite-muted flex-shrink-0">{post.time}</span>
        </div>

        {post.isRepost && post.repostOriginal ? (
          <button onClick={onOpen} aria-label={`Ver post de ${post.author}`} className="text-left w-full">
            <div className="flex items-center gap-1 mb-2">
              <Repeat2 size={12} className="text-graphite-muted" />
              <span className="text-[11px] text-graphite-muted">Republicou</span>
            </div>
            <div className="border border-sara-linen rounded-2xl p-3 bg-white/60">
              <p className="text-[11px] font-semibold text-graphite mb-1">{post.repostOriginal.author}</p>
              <p className="text-sm text-graphite-light leading-relaxed">{post.repostOriginal.content}</p>
            </div>
          </button>
        ) : (
          <button onClick={onOpen} aria-label={`Ver post de ${post.author}`} className="text-left flex flex-col gap-2">
            <p className="text-sm text-graphite-light leading-relaxed">{post.content}</p>
            {post.imageUrl && (
              <img
                src={post.imageUrl}
                alt="Imagem do post"
                className="w-full rounded-xl object-cover max-h-64 mt-2"
              />
            )}
          </button>
        )}

        <div className="flex items-center gap-4 pt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const next = !liked;
              setLiked(next);
              likeMutation.mutate(next);
            }}
            aria-label={liked ? 'Descurtir' : 'Curtir'}
            aria-pressed={liked}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              liked ? 'text-sara-terracotta' : 'text-graphite-muted'
            }`}
          >
            <Heart size={14} fill={liked ? 'currentColor' : 'none'} strokeWidth={1.8} />
            {post.likes}
          </button>
          <button
            onClick={onOpen}
            aria-label={`Ver ${post.replies} respostas`}
            className="flex items-center gap-1.5 text-xs text-graphite-muted"
          >
            <MessageCircle size={14} strokeWidth={1.8} />
            {post.replies}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!reposted) { repostMutation.mutate(); setReposted(true); }
            }}
            aria-label={reposted ? 'Republicado' : 'Republicar'}
            aria-pressed={reposted}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              reposted ? 'text-sara-warm' : 'text-graphite-muted'
            }`}
          >
            <Repeat2 size={14} strokeWidth={1.8} />
            {(post.reposts ?? 0) + (reposted ? 1 : 0)}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowShare(true); }}
            aria-label="Enviar post"
            className="flex items-center gap-1.5 text-xs text-graphite-muted"
          >
            <Share2 size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {showShare && <SharePostSheet post={post} onClose={() => setShowShare(false)} />}
    </>
  );
}
