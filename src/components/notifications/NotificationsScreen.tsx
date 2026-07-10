import { ChevronLeft, Heart, UserPlus, MessageCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiNotification } from '../../lib/types';
import { relativeTime } from '../../lib/helpers';

interface NotificationsScreenProps {
  onBack: () => void;
}

const ICON: Record<ApiNotification['type'], React.ReactElement> = {
  like:    <Heart size={16} className="text-sara-terracotta" />,
  follow:  <UserPlus size={16} className="text-sara-gold" />,
  comment: <MessageCircle size={16} className="text-sara-warm" />,
};

export function NotificationsScreen({ onBack }: NotificationsScreenProps) {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiFetch<ApiNotification[]>('/notifications'),
    enabled: isLoggedIn,
  });

  const readAllMutation = useMutation({
    mutationFn: () => apiFetch('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

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
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`flex items-start gap-3 px-4 py-4 ${!n.read ? 'bg-sara-linen' : 'bg-white'}`}
              >
                <div className="w-9 h-9 rounded-full bg-sara-cream flex items-center justify-center flex-shrink-0">
                  {ICON[n.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-graphite leading-snug">{n.text}</p>
                  <p className="text-[11px] text-graphite-muted mt-0.5">{relativeTime(n.createdAt)} atrás</p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-sara-gold flex-shrink-0 mt-1.5" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
