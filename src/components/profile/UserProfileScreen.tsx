import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { ApiUserProfile, PaginatedResult, ApiPost } from '../../lib/types';
import { apiPostToCommunityPost } from '../../lib/helpers';
import { FollowListScreen } from './FollowListScreen';
import { PostDetailScreen } from '../post/PostDetailScreen';
import { PostCard } from '../comunidade/PostCard';
import type { CommunityPost } from '../../types';

interface UserProfileScreenProps {
  userId: string;
  onBack: () => void;
  onOpenProfile?: (userId: string) => void;
}

export function UserProfileScreen({ userId, onBack, onOpenProfile }: UserProfileScreenProps) {
  const queryClient = useQueryClient();
  const [followList, setFollowList] = useState<'followers' | 'following' | null>(null);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => apiFetch<ApiUserProfile>(`/users/${userId}`),
  });

  const { data: postsData } = useQuery({
    queryKey: ['user', userId, 'posts'],
    queryFn: () => apiFetch<PaginatedResult<ApiPost>>(`/users/${userId}/posts`),
    enabled: !!profile,
  });

  const followMutation = useMutation({
    mutationFn: (isFollowing: boolean) =>
      apiFetch(`/users/${userId}/follow`, { method: isFollowing ? 'POST' : 'DELETE' }),
    onSuccess: (_, isFollowing) => {
      queryClient.setQueryData<ApiUserProfile>(['user', userId], (old) =>
        old
          ? {
              ...old,
              isFollowedByCurrentUser: isFollowing,
              _count: { ...old._count, followers: old._count.followers + (isFollowing ? 1 : -1) },
            }
          : old
      );
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

  if (followList) {
    return (
      <FollowListScreen
        mode={followList}
        userId={userId}
        onOpenUser={(id) => {
          setFollowList(null);
          onOpenProfile?.(id);
        }}
        onBack={() => setFollowList(null)}
      />
    );
  }

  if (!profile) {
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
        <p className="text-sm font-semibold font-serif text-graphite">{profile.name}</p>
        <div className="w-8" />
      </div>

      <div className="px-4 pb-3 flex-shrink-0">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 bg-sara-terracotta">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex gap-4 flex-1 justify-around">
            {[
              { label: 'Posts', value: profile._count.posts, mode: null as 'followers' | 'following' | null },
              { label: 'Seguidoras', value: profile._count.followers, mode: 'followers' as const },
              { label: 'Seguindo', value: profile._count.following, mode: 'following' as const },
            ].map(({ label, value, mode }) => (
              mode ? (
                <button
                  key={label}
                  type="button"
                  onClick={() => setFollowList(mode)}
                  aria-label={label}
                  className="flex flex-col items-center"
                >
                  <span className="text-base font-bold text-graphite">{value}</span>
                  <span className="text-[10px] text-graphite-muted text-center leading-tight">{label}</span>
                </button>
              ) : (
                <div key={label} className="flex flex-col items-center">
                  <span className="text-base font-bold text-graphite">{value}</span>
                  <span className="text-[10px] text-graphite-muted text-center leading-tight">{label}</span>
                </div>
              )
            ))}
          </div>
        </div>

        {profile.bio && (
          <p className="text-xs text-graphite-muted leading-snug mt-3 italic">{profile.bio}</p>
        )}

        {!profile.isSelf && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => followMutation.mutate(!profile.isFollowedByCurrentUser)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-transform ${
                profile.isFollowedByCurrentUser
                  ? 'bg-white text-graphite-muted border border-sara-linen'
                  : 'bg-sara-gold text-white'
              }`}
            >
              {profile.isFollowedByCurrentUser ? 'Seguindo' : 'Seguir'}
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 flex-shrink-0" />

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-12 text-graphite-muted">
            <p className="text-sm">Nenhuma publicação ainda</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onOpen={() => setSelectedPost(post)}
              onOpenProfile={() => onOpenProfile?.(userId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
