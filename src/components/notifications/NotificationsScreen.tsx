import { ChevronLeft, Heart, UserPlus, MessageCircle, UserCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiNotification } from '../../lib/types';
import { relativeTime } from '../../lib/helpers';

interface NotificationsScreenProps {
  onBack: () => void;
  onOpenPost?: (postId: string) => void;
  onOpenUser?: (userId: string) => void;
  onOpenCommunity?: (communityId: string) => void;
}

const ICON: Record<ApiNotification['type'], React.ReactElement> = {
  like:    <Heart size={16} className="text-sara-terracotta" />,
  follow:  <UserPlus size={16} className="text-sara-gold" />,
  comment: <MessageCircle size={16} className="text-sara-warm" />,
};

export function NotificationsScreen({ onBack, onOpenPost, onOpenUser, onOpenCommunity }: NotificationsScreenProps) {
  const isLoggedIn    = useAppStore((s) => s.isLoggedIn);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const queryClient   = useQueryClient();

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

  const followMutation = useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/users/${userId}/follow`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
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

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-graphite-muted">
            <p className="text-sm">Nenhuma notificação</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.map((n) => {
              const isFollowBack = n.type === 'follow' && n.actorId && n.actorId !== currentUserId;
              return (
                <li key={n.id}>
                  <button
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-4 text-left ${!n.read ? 'bg-sara-linen' : 'bg-white'} hover:brightness-95 transition-all`}
                  >
                    {/* Actor avatar */}
                    <div className="w-9 h-9 rounded-full bg-sara-cream flex items-center justify-center flex-shrink-0">
                      {ICON[n.type]}
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
                      {/* Follow-back button */}
                      {isFollowBack && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); followMutation.mutate(n.actorId!); }}
                          className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-sara-gold text-white active:scale-95 transition-all"
                        >
                          <UserCheck size={11} />
                          Seguir
                        </button>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
