import { useState } from 'react';
import { X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { apiFetch } from '../../lib/api';
import { getAvatarColor } from '../../utils/avatar';
import type { ApiChat, ApiFollowUser, PaginatedResult } from '../../lib/types';
import type { CommunityPost } from '../../types';

interface SharePostSheetProps {
  post: CommunityPost;
  onClose: () => void;
}

export function SharePostSheet({ post, onClose }: SharePostSheetProps) {
  const isLoggedIn    = useAppStore((s) => s.isLoggedIn);
  const currentUserId = useAppStore((s) => s.currentUserId) ?? '';
  const queryClient   = useQueryClient();

  const { data: followingData } = useQuery({
    queryKey: ['users', currentUserId, 'following'],
    queryFn: () => apiFetch<PaginatedResult<ApiFollowUser>>(`/users/${currentUserId}/following`),
    enabled: isLoggedIn && !!currentUserId,
  });

  const { data: apiChats = [] } = useQuery({
    queryKey: ['chats'],
    queryFn: () => apiFetch<ApiChat[]>('/chats'),
    enabled: isLoggedIn,
  });

  const chatByUserId = new Map<string, string>();
  for (const chat of apiChats) {
    const other = chat.participants.find((p) => p.userId !== currentUserId);
    if (other) chatByUserId.set(other.userId, chat.id);
  }

  const recipients = (followingData?.items ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    chatId: chatByUserId.get(u.id) ?? null,
  }));

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [shareComment, setShareComment] = useState('');

  function toggleUser(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const sendMutation = useMutation({
    mutationFn: async ({ recipientId, chatId }: { recipientId: string; chatId: string | null }) => {
      let resolvedChatId = chatId;
      if (!resolvedChatId) {
        const newChat = await apiFetch<{ id: string }>('/chats', {
          method: 'POST',
          body: JSON.stringify({ userId: recipientId }),
        });
        resolvedChatId = newChat.id;
        queryClient.invalidateQueries({ queryKey: ['chats'] });
      }
      return apiFetch(`/chats/${resolvedChatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: shareComment.trim() || '',
          sharedPostId: post.id,
          sharedPostAuthor: post.author,
          sharedPostExcerpt: post.content.slice(0, 150),
        }),
      });
    },
  });

  function handleSend() {
    if (selectedIds.length === 0) return;
    selectedIds.forEach((id) => {
      const r = recipients.find((x) => x.id === id);
      if (r) sendMutation.mutate({ recipientId: r.id, chatId: r.chatId });
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end z-30"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Enviar post para conversa"
        className="w-full bg-white rounded-t-3xl px-4 pt-4 pb-10 max-w-[390px] mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-graphite">Enviar para</p>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <X size={14} className="text-graphite" />
          </button>
        </div>

        <textarea
          value={shareComment}
          onChange={(e) => setShareComment(e.target.value)}
          placeholder="Adicionar um comentário..."
          rows={2}
          className="w-full px-3 py-2 rounded-xl border border-sara-linen text-sm text-graphite placeholder:text-graphite-muted resize-none focus:outline-none focus:border-sara-gold mb-3"
        />

        {recipients.length === 0 ? (
          <p className="text-xs text-graphite-muted text-center py-4">
            Siga alguém para poder compartilhar posts
          </p>
        ) : (
          <ul className="flex flex-col gap-1 mb-4 max-h-52 overflow-y-auto">
            {recipients.map((r) => {
              const selected = selectedIds.includes(r.id);
              return (
                <li key={r.id}>
                  <button
                    onClick={() => toggleUser(r.id)}
                    aria-pressed={selected}
                    className={`w-full flex items-center gap-3 px-2 py-3 rounded-xl transition-colors ${
                      selected ? 'bg-sara-linen' : 'active:bg-sara-linen'
                    }`}
                  >
                    <div
                      style={{ background: getAvatarColor(null) }}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                    >
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="flex-1 text-sm font-medium text-graphite text-left">{r.name}</p>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      selected ? 'bg-sara-gold border-sara-gold' : 'border-sara-linen'
                    }`}>
                      {selected && <span className="text-white text-[10px] font-bold">✓</span>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <button
          data-testid="share-send-btn"
          onClick={handleSend}
          disabled={selectedIds.length === 0}
          className="w-full py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
