import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { getAvatarColor } from '../../utils/avatar';
import type { ApiUserProfile } from '../../lib/types';

interface ChatProfilePreviewModalProps {
  name: string;
  username?: string | null;
  archetypeKey?: string | null;
  userId: string;
  messageCount: number;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
}

export function ChatProfilePreviewModal({
  name,
  username,
  archetypeKey,
  userId,
  messageCount,
  onClose,
  onOpenProfile,
}: ChatProfilePreviewModalProps) {
  const { data: profile } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => apiFetch<ApiUserProfile>(`/users/${userId}`),
    enabled: !!userId,
  });

  function handleVisitProfile() {
    onClose();
    onOpenProfile(userId);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Modal sheet */}
      <div
        role="dialog"
        aria-label="Preview de perfil"
        aria-modal="true"
        className="relative w-full max-w-sm bg-white rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen text-graphite"
        >
          <X size={18} />
        </button>

        {/* Avatar */}
        <div
          style={{ background: getAvatarColor(archetypeKey) }}
          className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-3xl"
        >
          {name.charAt(0).toUpperCase()}
        </div>

        {/* Name */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-lg font-semibold text-graphite">{name}</p>
          {username && (
            <p className="text-sm text-sara-muted">@{username}</p>
          )}
          {profile?.bio && (
            <p className="text-sm text-graphite-muted text-center leading-relaxed px-2">
              {profile.bio}
            </p>
          )}
          <p className="text-xs text-sara-muted mt-1">
            {messageCount} {messageCount === 1 ? 'mensagem' : 'mensagens'}
          </p>
        </div>

        {/* Visit profile button */}
        <button
          onClick={handleVisitProfile}
          aria-label="Visitar perfil"
          className="w-full py-3 rounded-2xl bg-sara-gold text-white font-semibold text-sm active:scale-95 transition-transform"
        >
          Visitar perfil
        </button>
      </div>
    </div>
  );
}
