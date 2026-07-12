import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { ApiCommunityDetail, PaginatedResult, ApiPost } from '../../lib/types';
import { apiPostToCommunityPost } from '../../lib/helpers';
import { PostDetailScreen } from '../post/PostDetailScreen';
import { PostCard } from './PostCard';
import type { CommunityPost } from '../../types';

interface CommunityDetailScreenProps {
  communityId: string;
  onBack: () => void;
  onOpenProfile?: (userId: string) => void;
}

const COLOR_MAP: Record<string, string> = {
  gold:       'bg-sara-gold',
  terracotta: 'bg-sara-terracotta',
  warm:       'bg-sara-warm',
  linen:      'bg-sara-linen',
  cream:      'bg-sara-cream',
};

export function CommunityDetailScreen({ communityId, onBack, onOpenProfile }: CommunityDetailScreenProps) {
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

  const { data: community } = useQuery({
    queryKey: ['community', communityId],
    queryFn: () => apiFetch<ApiCommunityDetail>(`/communities/${communityId}`),
  });

  const { data: postsData } = useQuery({
    queryKey: ['community', communityId, 'posts'],
    queryFn: () => apiFetch<PaginatedResult<ApiPost>>(`/communities/${communityId}/posts`),
    enabled: !!community,
  });

  const joinMutation = useMutation({
    mutationFn: (isJoining: boolean) =>
      apiFetch(`/communities/${communityId}/join`, { method: isJoining ? 'POST' : 'DELETE' }),
    onSuccess: (_, isJoining) => {
      queryClient.setQueryData<ApiCommunityDetail>(['community', communityId], (old) =>
        old
          ? {
              ...old,
              isMember: isJoining,
              role: isJoining ? 'member' : null,
              _count: { ...old._count, members: old._count.members + (isJoining ? 1 : -1) },
            }
          : old
      );
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });

  if (selectedPost) {
    return (
      <PostDetailScreen
        post={selectedPost}
        onBack={() => setSelectedPost(null)}
        onOpenProfile={(id) => { setSelectedPost(null); onOpenProfile?.(id); }}
      />
    );
  }

  if (!community) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="w-8 h-8 rounded-full border-2 border-sara-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  const posts = (postsData?.items ?? []).map(apiPostToCommunityPost);

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-6 pb-3 flex-shrink-0">
        <button onClick={onBack} aria-label="Voltar" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <p className="text-sm font-semibold text-graphite">{community.category}</p>
        <div className="w-8" />
      </div>

      <div className={`h-24 ${COLOR_MAP[community.colorKey] ?? 'bg-sara-gold'} flex-shrink-0`} />

      <div className="px-4 py-4 flex-shrink-0 bg-white/40">
        <h1 className="text-base font-bold text-graphite">{community.name}</h1>
        <p className="text-xs text-graphite-muted mt-1">{community._count.members} membros · {community.category}</p>
        <p className="text-sm text-graphite mt-3 leading-relaxed">{community.description}</p>

        <button
          onClick={() => joinMutation.mutate(!community.isMember)}
          className={`w-full mt-4 py-2.5 rounded-xl text-xs font-semibold active:scale-95 transition-transform ${
            community.isMember
              ? 'bg-white text-graphite-muted border border-sara-linen'
              : 'bg-sara-gold text-white'
          }`}
        >
          {community.isMember ? 'Sair' : 'Entrar'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {posts.length === 0 ? (
          <p className="text-sm text-graphite-muted text-center py-8">Nenhuma publicação ainda</p>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onOpen={() => setSelectedPost(post)}
              onOpenProfile={() => post.authorId && onOpenProfile?.(post.authorId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
