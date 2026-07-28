import { useState, useRef, useEffect } from 'react';
import { usePullToRefresh } from '../../lib/usePullToRefresh';
import { ChevronLeft, Settings, Bell } from 'lucide-react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore, selectSavedVerses } from '../../store/useAppStore';
import { ARCHETYPES } from '../../utils/onboardingScoring';
import { getAvatarColor } from '../../utils/avatar';
import { SettingsScreen } from './SettingsScreen';
import { EditProfileScreen } from './EditProfileScreen';
import { PostDetailScreen } from '../post/PostDetailScreen';
import { FollowListScreen } from './FollowListScreen';
import { PostCard } from '../comunidade/PostCard';
import { apiFetch, resolveMediaUrl } from '../../lib/api';
import { apiPostToCommunityPost } from '../../lib/helpers';
import { useIntersection } from '../../lib/useIntersection';
import type { ApiPost, ApiUserProfile } from '../../lib/types';
import type { CommunityPost } from '../../types';
import { SavedVersesScreen } from '../home/SavedVersesScreen';

interface ProfileScreenProps {
  onClose?: () => void;                   // optional now
  userId?: string;                        // NEW — when omitted, falls back to currentUserId (backward-compat with old callers)
  onOpenProfile?: (id: string) => void;   // NEW
  isTab?: boolean;                        // NEW — when true, hides back button
}

export function ProfileScreen({ onClose, userId, onOpenProfile, isTab = false }: ProfileScreenProps) {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const savedVerses = useAppStore(selectSavedVerses);
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);

  const effectiveUserId = userId ?? currentUserId ?? '';

  const queryClient = useQueryClient();

  const [showSettings, setShowSettings] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [followList, setFollowList] = useState<'followers' | 'following' | null>(null);
  const [showSavedVerses, setShowSavedVerses] = useState(false);
  const [showOtherVerses, setShowOtherVerses] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useIntersection(sentinelRef);
  const { isPulling, pullY } = usePullToRefresh(scrollRef, async () => {
    await queryClient.invalidateQueries({ queryKey: ['user', effectiveUserId] });
    await queryClient.invalidateQueries({ queryKey: ['userPosts', effectiveUserId] });
  });

  const { data: profile } = useQuery({
    queryKey: ['user', effectiveUserId],
    queryFn: () => apiFetch<ApiUserProfile>(`/users/${effectiveUserId}`),
    enabled: isLoggedIn && !!effectiveUserId,
  });

  const { data: otherVerses } = useQuery({
    queryKey: ['userVerses', effectiveUserId],
    queryFn: () => apiFetch<string[]>(`/users/${effectiveUserId}/verses`),
    enabled: isLoggedIn && !!effectiveUserId && !!profile && !profile.isSelf && (profile.versesPublic ?? false),
    retry: false,
  });

  const {
    data: postsPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['userPosts', effectiveUserId],
    queryFn: ({ pageParam }) =>
      apiFetch<{ items: ApiPost[]; hasMore: boolean; nextCursor?: string }>(
        `/users/${effectiveUserId}/posts?cursor=${pageParam ?? ''}&limit=20`
      ),
    initialPageParam: '',
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: isLoggedIn && !!effectiveUserId,
  });

  useEffect(() => {
    if (isAtBottom && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [isAtBottom, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const followMutation = useMutation({
    mutationFn: (isFollowing: boolean) =>
      apiFetch(`/users/${effectiveUserId}/follow`, { method: isFollowing ? 'POST' : 'DELETE' }),
    onSuccess: (_, isFollowing) => {
      queryClient.setQueryData<ApiUserProfile>(['user', effectiveUserId], (old) =>
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

  // Sub-screens
  if (showEdit) {
    return <EditProfileScreen onBack={() => setShowEdit(false)} />;
  }

  if (selectedPost) {
    return (
      <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
        <PostDetailScreen
          post={selectedPost}
          onBack={() => setSelectedPost(null)}
          onOpenProfile={(id) => { setSelectedPost(null); onOpenProfile?.(id); }}
        />
      </div>
    );
  }

  if (followList && effectiveUserId) {
    return (
      <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
        <FollowListScreen
          mode={followList}
          userId={effectiveUserId}
          onOpenUser={(id) => {
            setFollowList(null);
            onOpenProfile?.(id);
          }}
          onBack={() => setFollowList(null)}
        />
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
        <SettingsScreen onBack={() => setShowSettings(false)} onClose={onClose ?? (() => setShowSettings(false))} />
      </div>
    );
  }

  // Loading state — wait for profile before rendering
  if (!profile) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="w-8 h-8 rounded-full border-2 border-sara-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  const isSelf = profile.isSelf; // backend is the source of truth

  const archetypeKey = profile.archetypeKey ?? null;
  const archetype = archetypeKey ? ARCHETYPES[archetypeKey as keyof typeof ARCHETYPES] : null;
  const avatarColor = getAvatarColor(archetypeKey);
  const bio = profile.bio ?? archetype?.phrases[1] ?? 'Maternidade com presença e intenção.';

  const posts = postsPages?.pages.flatMap((p) => p.items.map(apiPostToCommunityPost)) ?? [];

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3 flex-shrink-0">
        {isTab ? (
          <div className="w-8" />
        ) : (
          <button
            onClick={onClose}
            aria-label="Voltar"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen"
          >
            <ChevronLeft size={20} className="text-graphite" />
          </button>
        )}
        <div className="flex flex-col items-center">
          <p className="text-sm font-semibold font-serif text-graphite">{profile.name}</p>
          {profile.username && (
            <p className="text-xs text-graphite-muted">@{profile.username}</p>
          )}
        </div>
        {isSelf ? (
          <button
            onClick={() => setShowSettings(true)}
            aria-label="Configurações"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen"
          >
            <Settings size={18} className="text-graphite" />
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* Profile info */}
      <div className="px-4 pb-3 flex-shrink-0">
        <div className="flex items-center gap-5">
          {profile.avatarUrl ? (
            <img
              src={resolveMediaUrl(profile.avatarUrl)}
              alt={`Foto de ${profile.name}`}
              className="w-20 h-20 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              style={{ background: avatarColor }}
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0"
            >
              {profile.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex gap-4 flex-1 justify-around">
            {[
              { label: 'Posts',      value: profile._count.posts,     mode: null as 'followers' | 'following' | null },
              { label: 'Seguidoras', value: profile._count.followers, mode: 'followers' as const },
              { label: 'Seguindo',   value: profile._count.following, mode: 'following' as const },
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

        <p className="text-xs text-graphite-muted leading-snug mt-3 italic">
          &ldquo;{bio}&rdquo;
        </p>

        {/* Actions — conditional on isSelf */}
        {isSelf ? (
          <>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowEdit(true)}
                className="flex-1 py-2 rounded-xl bg-sara-linen text-xs font-semibold text-sara-gold active:scale-95 transition-transform"
              >
                Editar perfil
              </button>
            </div>

            {savedVerses.length > 0 && (
              <button
                onClick={() => setShowSavedVerses(true)}
                aria-label="Ver versículos salvos"
                className="w-full flex items-center justify-between mt-2 px-1 py-2 rounded-xl active:bg-sara-linen transition-colors"
              >
                <span className="text-[12px] font-semibold text-graphite flex items-center gap-2">
                  📖 Versículos salvos
                </span>
                <span className="text-[11px] text-sara-gold font-semibold">
                  {savedVerses.length} →
                </span>
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2 mt-3">
            <div className="flex gap-2">
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
              {profile.isFollowedByCurrentUser && (
                <button
                  onClick={() => setNotifying((n) => !n)}
                  aria-label={notifying ? 'Desativar notificações de publicações' : 'Ativar notificações de publicações'}
                  className={`w-9 h-9 flex items-center justify-center rounded-full border transition-colors ${
                    notifying
                      ? 'border-sara-gold bg-sara-gold text-white'
                      : 'border-sara-linen bg-white text-graphite-muted'
                  }`}
                >
                  <Bell size={16} />
                </button>
              )}
            </div>
            {profile.versesPublic && otherVerses && otherVerses.length > 0 && (
              <button
                onClick={() => setShowOtherVerses(true)}
                className="w-full flex items-center justify-between px-1 py-2 rounded-xl active:bg-sara-linen transition-colors"
              >
                <span className="text-[12px] font-semibold text-graphite flex items-center gap-2">
                  📖 Versículos salvos
                </span>
                <span className="text-[11px] text-sara-gold font-semibold">
                  {otherVerses.length} →
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 flex-shrink-0" />

      {/* Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {isPulling && (
          <div className="flex justify-center py-3" style={{ transform: `translateY(${pullY - 40}px)` }}>
            <div className="w-6 h-6 rounded-full border-2 border-sara-gold border-t-transparent animate-spin" />
          </div>
        )}
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-12 text-graphite-muted">
            <p className="text-sm">Nenhuma publicação ainda</p>
            {isSelf && (
              <p className="text-xs text-center px-8">Use o botão Desabafar na Comunidade para compartilhar</p>
            )}
          </div>
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
        <div ref={sentinelRef} className="h-4" />
        {isFetchingNextPage && (
          <p className="text-center text-xs text-graphite-muted py-2">Carregando...</p>
        )}
      </div>

      {/* Self-only: saved verses sheet */}
      {isSelf && (
        <SavedVersesScreen open={showSavedVerses} onClose={() => setShowSavedVerses(false)} />
      )}
      {/* Other user: read-only verses sheet */}
      {!isSelf && (
        <SavedVersesScreen
          open={showOtherVerses}
          onClose={() => setShowOtherVerses(false)}
          readOnlyVerses={otherVerses ?? []}
          readOnlyUserName={profile.name}
        />
      )}
    </div>
  );
}
