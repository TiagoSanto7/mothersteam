import { useState, useRef } from 'react';
import { usePullToRefresh } from '../../lib/usePullToRefresh';
import { SaraPullIndicator } from '../shared/SaraPullIndicator';
import { ChevronLeft, Search, Edit, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import { ChatScreen } from './ChatScreen';
import { UserAvatar } from '../shared/UserAvatar';
import type { ApiChat, ApiFollowUser, PaginatedResult } from '../../lib/types';
import { apiChatToChat } from '../../lib/helpers';
import type { Chat } from '../../types';

interface ChatListScreenProps {
  onBack: () => void;
  onOpenProfile?: (userId: string) => void;
}

export function ChatListScreen({ onBack, onOpenProfile }: ChatListScreenProps) {
  const isLoggedIn    = useAppStore((s) => s.isLoggedIn);
  const currentUserId = useAppStore((s) => s.currentUserId) ?? '';
  const queryClient   = useQueryClient();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isPulling, pullY, isLoading } = usePullToRefresh(scrollRef, async () => {
    await queryClient.invalidateQueries({ queryKey: ['chats'] });
  });

  const { data: apiChats = [] } = useQuery({
    queryKey: ['chats'],
    queryFn: () => apiFetch<ApiChat[]>('/chats'),
    enabled: isLoggedIn,
  });

  const { data: followingData } = useQuery({
    queryKey: ['users', currentUserId, 'following'],
    queryFn: () => apiFetch<PaginatedResult<ApiFollowUser>>(`/users/${currentUserId}/following`),
    enabled: isLoggedIn && showNewChat && !!currentUserId,
  });

  const chats = apiChats
    .filter((c) => c.messages.length > 0)
    .map((c) => apiChatToChat(c, currentUserId));
  const filteredChats = searchQuery.trim()
    ? chats.filter((c) =>
        c.with.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.withUsername ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chats;

  const createChatMutation = useMutation({
    mutationFn: (userId: string) =>
      apiFetch<ApiChat>('/chats', { method: 'POST', body: JSON.stringify({ userId }) }),
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      setShowNewChat(false);
      setSelectedChat(apiChatToChat(newChat, currentUserId));
    },
  });

  if (selectedChat) {
    return (
      <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
        <ChatScreen chat={selectedChat} onBack={() => setSelectedChat(null)} onOpenProfile={onOpenProfile} />
      </div>
    );
  }

  const followingUsers = followingData?.items ?? [];

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden relative">
      <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-sara-linen/60 flex-shrink-0">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <p className="text-sm font-semibold text-graphite">Mensagens</p>
        <button
          onClick={() => setShowNewChat(true)}
          aria-label="Nova conversa"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen"
        >
          <Edit size={16} className="text-graphite" />
        </button>
      </div>

      <div className="px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
          <Search size={14} className="text-graphite-muted flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar conversa..."
            className="flex-1 bg-transparent text-sm text-graphite placeholder:text-graphite-muted outline-none"
          />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {(isPulling || isLoading) && (
          <SaraPullIndicator pullY={pullY} isLoading={isLoading} />
        )}
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-graphite-muted">
            <p className="text-sm">Nenhuma conversa ainda</p>
            <button
              onClick={() => setShowNewChat(true)}
              className="text-xs text-sara-gold font-semibold mt-1"
            >
              Iniciar uma conversa
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredChats.map((chat) => (
              <li key={chat.id}>
                <button
                  onClick={() => setSelectedChat(chat)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-sara-linen transition-colors text-left"
                >
                  <UserAvatar
                    name={chat.with}
                    archetypeKey={chat.withArchetypeKey}
                    size={48}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`text-sm truncate ${chat.unread > 0 ? 'font-semibold text-graphite' : 'font-medium text-graphite'}`}>{chat.with}</p>
                      <span className="text-[10px] text-graphite-muted flex-shrink-0">{chat.time}</span>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${chat.unread > 0 ? 'text-graphite font-medium' : 'text-graphite-muted'}`}>{chat.lastMessage}</p>
                  </div>
                  {chat.unread > 0 && (
                    <div className="w-5 h-5 rounded-full bg-sara-gold flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-white">{chat.unread}</span>
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showNewChat && (
        <div className="absolute inset-0 z-20 flex flex-col bg-white/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 flex-shrink-0">
            <p className="text-sm font-semibold text-graphite">Nova conversa</p>
            <button
              onClick={() => setShowNewChat(false)}
              aria-label="Fechar"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <X size={18} className="text-graphite" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {followingUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-graphite-muted px-4 text-center">
                <p className="text-sm">Siga alguém para iniciar uma conversa</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {followingUsers.map((user) => (
                  <li key={user.id}>
                    <button
                      onClick={() => createChatMutation.mutate(user.id)}
                      disabled={createChatMutation.isPending}
                      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-sara-linen transition-colors text-left"
                    >
                      <UserAvatar
                        name={user.name}
                        archetypeKey={null}
                        size={40}
                      />
                      <p className="text-sm font-medium text-graphite">{user.name}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
