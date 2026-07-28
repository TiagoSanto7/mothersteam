import { useState, useRef } from 'react';
import { usePullToRefresh } from '../../lib/usePullToRefresh';
import { ChevronLeft, Heart, UserPlus, MessageCircle, UserCheck, AtSign } from 'lucide-react';
import { UserAvatar } from '../shared/UserAvatar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiNotification } from '../../lib/types';
import { relativeTime } from '../../lib/helpers';

// Maps notification id → true once the current user successfully followed that actor.
// This provides optimistic UI without waiting for a full refetch.
type FollowedMap = Record<string, boolean>;

interface NotificationsScreenProps {
  onBack: () => void;
  onOpenPost?: (postId: string) => void;
  onOpenUser?: (userId: string) => void;
  onOpenCommunity?: (communityId: string) => void;
}

const ICON: Record<ApiNotification['type'], React.ReactElement> = {
  like:    <Heart size={14} className="text-sara-terracotta" fill="currentColor" />,
  follow:  <UserPlus size={14} className="text-sara-gold" />,
  comment: <MessageCircle size={14} className="text-sara-warm" />,
  mention: <AtSign size={14} className="text-sara-gold" />,
};

export function NotificationsScreen({ onBack, onOpenPost, onOpenUser, onOpenCommunity }: NotificationsScreenProps) {
  const isLoggedIn    = useAppStore((s) => s.isLoggedIn);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const queryClient   = useQueryClient();

  const scrollRef = useRef<HTMLDivElement>(null);
  const { isPulling, pullY } = usePullToRefresh(scrollRef, async () => {
    await queryClient.invalidateQueries({ queryKey: ['notifications'] });
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiFetch<ApiNotification[]>('/notifications'),
    enabled: isLoggedIn,
  });

  const readAllMutation = useMutation({
    mutationFn: () => apiFetch('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const readMutation = useMutation({
    mutationFn: (notificationId: string) =>
      apiFetch(`/notifications/${notificationId}/read`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const [followError, setFollowError] = useState<string | null>(null);
  // Optimistic local state: notificationId → true means "already following"
  const [followedMap, setFollowedMap] = useState<FollowedMap>({});

  const followMutation = useMutation({
    mutationFn: ({ userId }: { userId: string; notificationId: string }) =>
      apiFetch(`/users/${userId}/follow`, { method: 'POST' }),
    onSuccess: (_data, { userId, notificationId }) => {
      setFollowError(null);
      setFollowedMap((prev) => ({ ...prev, [notificationId]: true }));
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['userPosts', userId] });
    },
    onError: () => setFollowError('Não foi possível seguir. Tente novamente.'),
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleNotificationClick(n: ApiNotification) {
    readMutation.mutate(n.id);
    if (n.targetType === 'post' && n.targetId) {
      onOpenPost?.(n.targetId);
    } else if (n.targetType === 'user' && n.targetId) {
      onOpenUser?.(n.targetId);
    } else if (n.targetType === 'community' && n.targetId) {
      onOpenCommunity?.(n.targetId);
    }
  }

  function handleActorClick(e: React.MouseEvent, actorId: string) {
    e.stopPropagation();
    onOpenUser?.(actorId);
  }

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-sara-linen/60">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <p className="text-sm font-semibold text-graphite">Notificações</p>
        {unreadCount > 0 ? (
          <button
            onClick={() => readAllMutation.mutate()}
            className="text-[11px] text-sara-gold font-semibold"
          >
            Marcar lidas
          </button>
        ) : (
          <div className="w-20" />
        )}
      </div>

      {followError && (
        <p role="alert" className="text-[11px] text-sara-terracotta text-center px-4 py-2 bg-sara-cream border-b border-sara-linen/60">
          {followError}
        </p>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isPulling && (
          <div className="flex justify-center py-3" style={{ transform: `translateY(${pullY - 40}px)` }}>
            <div className="w-6 h-6 rounded-full border-2 border-sara-gold border-t-transparent animate-spin" />
          </div>
        )}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-graphite-muted">
            <p className="text-sm">Nenhuma notificação</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.map((n) => {
              const isFollowNotif = n.type === 'follow' && n.actorId && n.actorId !== currentUserId;
              // Determine whether we are already following this actor:
              // prefer the optimistic local flag, then fall back to the server value.
              const isFollowing = followedMap[n.id] ?? n.isFollowedByCurrentUser ?? false;
              return (
                <li key={n.id}>
                  {/* Bug fix: outer wrapper must NOT be a <button> because it contains
                      a <button> (follow-back). Nested buttons are invalid HTML and cause
                      the inner click to be swallowed in most browsers. Use a div instead. */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleNotificationClick(n)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNotificationClick(n); }}
                    className={`w-full flex items-start gap-3 px-4 py-4 cursor-pointer ${!n.read ? 'bg-sara-linen' : 'bg-white'} hover:brightness-95 transition-all`}
                  >
                    {/* Actor avatar with notification-type badge */}
                    <div className="relative flex-shrink-0">
                      {n.actorId && n.actorName ? (
                        <UserAvatar
                          name={n.actorName}
                          archetypeKey={null}
                          avatarUrl={n.actorAvatarUrl ?? null}
                          size={36}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-sara-cream flex items-center justify-center">
                          {ICON[n.type]}
                        </div>
                      )}
                      {n.actorId && n.actorName && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center">
                          {ICON[n.type]}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Main text — actor name is a tappable link for follow notifications */}
                      {n.type === 'follow' && n.actorId ? (
                        <p className="text-sm text-graphite leading-snug">
                          <button
                            type="button"
                            onClick={(e) => handleActorClick(e, n.actorId!)}
                            className="font-semibold text-graphite hover:underline"
                          >
                            {n.actorName ?? 'Alguém'}
                          </button>
                          {' '}começou a te seguir.
                        </p>
                      ) : (
                        <p className="text-sm text-graphite leading-snug">{n.text}</p>
                      )}

                      {/* Post excerpt for like/comment */}
                      {(n.type === 'like' || n.type === 'comment') && n.postExcerpt && (
                        <p className="text-xs text-graphite-muted mt-1 line-clamp-2 bg-white/60 rounded-lg px-2 py-1">
                          {n.postExcerpt}
                        </p>
                      )}

                      <p className="text-[11px] text-graphite-muted mt-1">{relativeTime(n.createdAt)} atrás</p>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-sara-gold" />
                      )}
                      {/* Follow-back button — only for follow notifications from other users */}
                      {isFollowNotif && (
                        <button
                          type="button"
                          disabled={isFollowing || followMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isFollowing) {
                              followMutation.mutate({ userId: n.actorId!, notificationId: n.id });
                            }
                          }}
                          className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full active:scale-95 transition-all ${
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
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
