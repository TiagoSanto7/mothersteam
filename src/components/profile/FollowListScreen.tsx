import { ChevronLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { getAvatarColor } from '../../utils/avatar';
import type { ApiFollowUser, PaginatedResult } from '../../lib/types';

interface FollowListScreenProps {
  mode: 'followers' | 'following';
  userId: string;
  onOpenUser: (id: string) => void;
  onBack: () => void;
}

export function FollowListScreen({ mode, userId, onOpenUser, onBack }: FollowListScreenProps) {
  const queryClient = useQueryClient();
  const title = mode === 'followers' ? 'Seguidoras' : 'Seguindo';
  const queryKey = ['user', userId, mode];

  const { data } = useQuery({
    queryKey,
    queryFn: () => apiFetch<PaginatedResult<ApiFollowUser>>(`/users/${userId}/${mode}`),
  });

  const followMutation = useMutation({
    mutationFn: ({ id, isFollowing }: { id: string; isFollowing: boolean }) =>
      apiFetch(`/users/${id}/follow`, { method: isFollowing ? 'POST' : 'DELETE' }),
    onSuccess: (_, { id, isFollowing }) => {
      queryClient.setQueryData<PaginatedResult<ApiFollowUser>>(queryKey, (old) =>
        old
          ? { ...old, items: old.items.map((u) => (u.id === id ? { ...u, isFollowedByCurrentUser: isFollowing } : u)) }
          : old
      );
    },
  });

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-6 pb-3 flex-shrink-0">
        <button onClick={onBack} aria-label="Voltar" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <h1 className="text-base font-semibold text-graphite">{title}</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-sm text-graphite-muted text-center py-8">Ninguém aqui ainda</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => onOpenUser(u.id)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <div
                    style={{ background: getAvatarColor(null) }}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-semibold text-graphite">{u.name}</p>
                </button>
                {!u.isSelf && (
                  <button
                    onClick={() => followMutation.mutate({ id: u.id, isFollowing: !u.isFollowedByCurrentUser })}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                      u.isFollowedByCurrentUser
                        ? 'bg-white text-graphite-muted border border-sara-linen'
                        : 'bg-sara-gold text-white'
                    }`}
                  >
                    {u.isFollowedByCurrentUser ? 'Seguindo' : 'Seguir'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
