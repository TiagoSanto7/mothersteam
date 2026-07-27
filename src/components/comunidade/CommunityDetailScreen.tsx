import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Pencil, Lock, EyeOff, UserCheck, X } from 'lucide-react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, resolveMediaUrl } from '../../lib/api';
import type { ApiCommunityDetail, ApiCommunityMember, ApiPost } from '../../lib/types';
import { apiPostToCommunityPost } from '../../lib/helpers';
import { useIntersection } from '../../lib/useIntersection';
import { getAvatarColor } from '../../utils/avatar';
import { PostDetailScreen } from '../post/PostDetailScreen';
import { CreatePostScreen } from './CreatePostScreen';
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

// Maps memberId → true once the current user successfully followed that member (optimistic).
type MemberFollowedMap = Record<string, boolean>;

// ---------------------------------------------------------------------------
// MemberRow — renders one member with avatar, name/username, role badge and
// a Seguir/Seguindo chip (hidden when isSelf).
// ---------------------------------------------------------------------------
interface MemberRowProps {
  member: ApiCommunityMember;
  isFollowing: boolean;
  onFollow: (memberId: string) => void;
  onOpenProfile?: (userId: string) => void;
  isPending?: boolean;
}

function MemberRow({ member, isFollowing, onFollow, onOpenProfile, isPending }: MemberRowProps) {
  return (
    <div className="flex items-center gap-2.5 w-full">
      <button
        onClick={() => onOpenProfile?.(member.id)}
        className="flex items-center gap-2.5 flex-1 min-w-0 text-left active:opacity-70 transition-opacity"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
          style={{ background: getAvatarColor(member.archetypeKey) }}
        >
          {member.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-graphite truncate">{member.name}</p>
          {member.username && (
            <p className="text-[10px] text-graphite-muted truncate">@{member.username}</p>
          )}
        </div>
        {(member.role === 'owner' || member.role === 'admin') && (
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
              member.role === 'owner'
                ? 'bg-sara-gold/20 text-sara-gold'
                : 'bg-sara-terracotta/20 text-sara-terracotta'
            }`}
          >
            {member.role === 'owner' ? 'Criadora' : 'Admin'}
          </span>
        )}
      </button>

      {/* Follow chip — hidden for self */}
      {!member.isSelf && (
        <button
          type="button"
          disabled={isFollowing || isPending}
          onClick={(e) => {
            e.stopPropagation();
            if (!isFollowing) onFollow(member.id);
          }}
          className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full active:scale-95 transition-all flex-shrink-0 ${
            isFollowing
              ? 'bg-transparent border border-sara-gold text-sara-gold cursor-default'
              : 'bg-sara-gold text-white'
          }`}
        >
          <UserCheck size={11} />
          {isFollowing ? 'Seguindo' : 'Seguir'}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CommunityMembersModal — full list of all members in a bottom-sheet modal
// ---------------------------------------------------------------------------
interface CommunityMembersModalProps {
  members: ApiCommunityMember[];
  followedMap: MemberFollowedMap;
  onFollow: (memberId: string) => void;
  onClose: () => void;
  onOpenProfile?: (userId: string) => void;
  isPending?: boolean;
}

function CommunityMembersModal({
  members,
  followedMap,
  onFollow,
  onClose,
  onOpenProfile,
  isPending,
}: CommunityMembersModalProps) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3 flex-shrink-0 border-b border-sara-linen/60">
        <p className="text-sm font-semibold text-graphite">
          Membros ({members.length})
        </p>
        <button
          onClick={onClose}
          aria-label="Fechar lista de membros"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen"
        >
          <X size={18} className="text-graphite" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-2">
          {members.map((member) => {
            const isFollowing = followedMap[member.id] ?? member.isFollowedByCurrentUser;
            return (
              <MemberRow
                key={member.id}
                member={member}
                isFollowing={isFollowing}
                onFollow={onFollow}
                onOpenProfile={onOpenProfile}
                isPending={isPending}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CommunityDetailScreen
// ---------------------------------------------------------------------------
const MEMBERS_PREVIEW_COUNT = 3;

export function CommunityDetailScreen({ communityId, onBack, onOpenProfile }: CommunityDetailScreenProps) {
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [followedMap, setFollowedMap] = useState<MemberFollowedMap>({});

  const sentinelRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useIntersection(sentinelRef);

  const { data: community } = useQuery({
    queryKey: ['community', communityId],
    queryFn: () => apiFetch<ApiCommunityDetail>(`/communities/${communityId}`),
  });

  const {
    data: postsPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['communityPosts', communityId],
    queryFn: ({ pageParam }) =>
      apiFetch<{ items: ApiPost[]; hasMore: boolean; nextCursor?: string }>(
        `/communities/${communityId}/posts?cursor=${pageParam ?? ''}&limit=20`
      ),
    initialPageParam: '',
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: !!communityId,
  });

  useEffect(() => {
    if (isAtBottom && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [isAtBottom, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { data: members } = useQuery({
    queryKey: ['communityMembers', communityId],
    queryFn: () => apiFetch<ApiCommunityMember[]>(`/communities/${communityId}/members`),
    enabled: !!communityId,
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
      queryClient.invalidateQueries({ queryKey: ['communityMembers', communityId] });
    },
  });

  const followMutation = useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/users/${userId}/follow`, { method: 'POST' }),
    onSuccess: (_data, userId) => {
      setFollowedMap((prev) => ({ ...prev, [userId]: true }));
    },
  });

  function handleFollow(memberId: string) {
    if (!followedMap[memberId]) {
      followMutation.mutate(memberId);
    }
  }

  if (showCreate) {
    return (
      <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
        <CreatePostScreen onBack={() => setShowCreate(false)} initialCommunityId={communityId} />
      </div>
    );
  }

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

  const posts = postsPages?.pages.flatMap((p) => p.items.map(apiPostToCommunityPost)) ?? [];
  const previewMembers = members ? members.slice(0, MEMBERS_PREVIEW_COUNT) : [];
  const hasMoreMembers = members ? members.length > MEMBERS_PREVIEW_COUNT : false;

  return (
    <div className="relative flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-6 pb-3 flex-shrink-0">
        <button onClick={onBack} aria-label="Voltar" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <p className="text-sm font-semibold text-graphite">{community.category}</p>
        <div className="w-8" />
      </div>

      <div className="relative flex-shrink-0">
        {community.imageUrl ? (
          <img
            src={resolveMediaUrl(community.imageUrl)}
            alt={`Capa de ${community.name}`}
            className="w-full h-24 object-cover"
          />
        ) : (
          <div className={`h-24 ${COLOR_MAP[community.colorKey] ?? 'bg-sara-gold'}`} />
        )}
        <div className={`absolute left-4 -bottom-6 w-12 h-12 rounded-full border-4 border-white ${COLOR_MAP[community.colorKey] ?? 'bg-sara-gold'} flex items-center justify-center shadow-sm`}>
          <span className="text-white text-base font-bold">{community.name.charAt(0).toUpperCase()}</span>
        </div>
      </div>

      <div className="px-4 pt-8 pb-4 flex-shrink-0 bg-white/40">
        <h1 className="text-base font-bold text-graphite">{community.name}</h1>
        <p className="text-xs text-graphite-muted mt-1">{community._count.members} membros · {community.category}</p>

        {/* Privacy badges */}
        {(community.isPrivate || !community.isOpen) && (
          <div className="flex gap-1.5 mt-2">
            {community.isPrivate && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-graphite/10 text-graphite text-[10px] font-medium">
                <EyeOff size={10} />
                Posts privados
              </span>
            )}
            {!community.isOpen && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-graphite/10 text-graphite text-[10px] font-medium">
                <Lock size={10} />
                Comunidade fechada
              </span>
            )}
          </div>
        )}

        <p className="text-sm text-graphite mt-3 leading-relaxed">{community.description}</p>

        <div className="flex gap-2 mt-4">
          {/* Join/leave button — disabled with tooltip when community is closed and user is not a member */}
          {!community.isOpen && !community.isMember ? (
            <div className="flex-1 relative group">
              <button
                disabled
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-graphite/10 text-graphite-muted cursor-not-allowed flex items-center justify-center gap-1"
              >
                <Lock size={12} />
                Comunidade fechada
              </button>
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-lg bg-graphite text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                Comunidade fechada
              </span>
            </div>
          ) : (
            <button
              onClick={() => joinMutation.mutate(!community.isMember)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold active:scale-95 transition-transform ${
                community.isMember
                  ? 'bg-white text-graphite-muted border border-sara-linen'
                  : 'bg-sara-gold text-white'
              }`}
            >
              {community.isMember ? 'Sair' : 'Entrar'}
            </button>
          )}
          {community.isMember && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-sara-terracotta text-white active:scale-95 transition-transform flex items-center justify-center gap-1.5"
            >
              <Pencil size={12} strokeWidth={2.5} />
              Publicar
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {/* Members section */}
        <div className="bg-white/50 rounded-2xl p-3">
          <p className="text-xs font-semibold text-graphite mb-2">
            Membros{members ? ` (${members.length})` : ''}
          </p>
          {!members ? (
            <p className="text-xs text-graphite-muted text-center py-2">Carregando...</p>
          ) : (
            <div className="flex flex-col gap-2">
              {previewMembers.map((member) => {
                const isFollowing = followedMap[member.id] ?? member.isFollowedByCurrentUser;
                return (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isFollowing={isFollowing}
                    onFollow={handleFollow}
                    onOpenProfile={onOpenProfile}
                    isPending={followMutation.isPending}
                  />
                );
              })}

              {hasMoreMembers && (
                <button
                  type="button"
                  onClick={() => setShowAllMembers(true)}
                  className="text-[11px] text-sara-gold font-semibold text-left mt-1 hover:underline"
                >
                  ver mais... ({members.length} membros)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Posts section */}
        <p className="text-xs font-semibold text-graphite px-1">Publicações</p>
        {posts.length === 0 ? (
          <p className="text-sm text-graphite-muted text-center py-8">Nenhuma publicação ainda</p>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onOpen={() => setSelectedPost(post)}
              onOpenProfile={() => post.authorId && onOpenProfile?.(post.authorId)}
              onOpenUser={(id) => onOpenProfile?.(id)}
            />
          ))
        )}
        <div ref={sentinelRef} className="h-4" />
        {isFetchingNextPage && (
          <p className="text-center text-xs text-graphite-muted py-2">Carregando...</p>
        )}
      </div>

      {/* Full members modal — layered on top */}
      {showAllMembers && members && (
        <CommunityMembersModal
          members={members}
          followedMap={followedMap}
          onFollow={handleFollow}
          onClose={() => setShowAllMembers(false)}
          onOpenProfile={onOpenProfile}
          isPending={followMutation.isPending}
        />
      )}
    </div>
  );
}
