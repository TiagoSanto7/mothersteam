import { useState, useRef, useEffect } from 'react';
import { usePullToRefresh } from '../../lib/usePullToRefresh';
import { SaraPullIndicator } from '../shared/SaraPullIndicator';
import { ChevronLeft, Search, Edit, X, Trash2, Check, BellOff } from 'lucide-react';
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
  initialChatUserId?: string;
}

export function ChatListScreen({ onBack, onOpenProfile, initialChatUserId }: ChatListScreenProps) {
  const isLoggedIn    = useAppStore((s) => s.isLoggedIn);
  const currentUserId = useAppStore((s) => s.currentUserId) ?? '';
  const queryClient   = useQueryClient();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMenu, setChatMenu] = useState<Chat | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Chat | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeStartX = useRef<number | null>(null);
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

  const deleteChatMutation = useMutation({
    mutationFn: (chatId: string) =>
      apiFetch(`/chats/${chatId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      setConfirmDelete(null);
      setChatMenu(null);
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (chatId: string) =>
      apiFetch(`/chats/${chatId}/read`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      setChatMenu(null);
    },
  });

  function handleChatLongPressStart(chat: Chat) {
    longPressTimerRef.current = setTimeout(() => {
      setChatMenu(chat);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
    }, 450);
  }

  function handleChatLongPressEnd() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleListSwipeStart(e: React.PointerEvent) {
    swipeStartX.current = e.clientX;
  }

  function handleListSwipeEnd(e: React.PointerEvent) {
    if (swipeStartX.current === null) return;
    const dx = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (dx > 80) onBack();
  }

  useEffect(() => {
    if (initialChatUserId && isLoggedIn) {
      createChatMutation.mutate(initialChatUserId);
    }
  // Run once on mount when initialChatUserId is provided
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (selectedChat) {
    return (
      <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-mt-gradient-pastel sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
        <ChatScreen chat={selectedChat} onBack={() => setSelectedChat(null)} onOpenProfile={onOpenProfile} />
      </div>
    );
  }

  const followingUsers = followingData?.items ?? [];

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-mt-gradient-pastel sm:rounded-[44px] sm:shadow-2xl overflow-hidden relative">
      <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-mt-linen/60 flex-shrink-0">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mt-linen">
          <ChevronLeft size={20} className="text-mt-charcoal" />
        </button>
        <p className="text-sm font-semibold text-mt-charcoal">Mensagens</p>
        <button
          onClick={() => setShowNewChat(true)}
          aria-label="Nova conversa"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mt-linen"
        >
          <Edit size={16} className="text-mt-charcoal" />
        </button>
      </div>

      <div className="px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
          <Search size={14} className="text-mt-muted flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar conversa..."
            className="flex-1 bg-transparent text-sm text-mt-charcoal placeholder:text-mt-muted outline-none"
          />
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onPointerDown={handleListSwipeStart}
        onPointerUp={handleListSwipeEnd}
        onPointerCancel={() => { swipeStartX.current = null; }}
      >
        {(isPulling || isLoading) && (
          <SaraPullIndicator pullY={pullY} isLoading={isLoading} />
        )}
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-mt-muted">
            <p className="text-sm">Nenhuma conversa ainda</p>
            <button
              onClick={() => setShowNewChat(true)}
              className="text-xs text-mt-rose font-semibold mt-1"
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
                  onPointerDown={() => handleChatLongPressStart(chat)}
                  onPointerUp={handleChatLongPressEnd}
                  onPointerCancel={handleChatLongPressEnd}
                  className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-mt-linen transition-colors text-left"
                >
                  <UserAvatar
                    name={chat.with}
                    archetypeKey={chat.withArchetypeKey}
                    avatarUrl={chat.withAvatarUrl}
                    size={48}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`text-sm truncate ${chat.unread > 0 ? 'font-semibold text-mt-charcoal' : 'font-medium text-mt-charcoal'}`}>{chat.with}</p>
                      <span className="text-[10px] text-mt-muted flex-shrink-0">{chat.time}</span>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${chat.unread > 0 ? 'text-mt-charcoal font-medium' : 'text-mt-muted'}`}>{chat.lastMessage}</p>
                  </div>
                  {chat.unread > 0 && (
                    <div className="w-5 h-5 rounded-full bg-mt-rose flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-white">{chat.unread}</span>
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {chatMenu && !confirmDelete && (
        <div
          className="absolute inset-0 z-30 flex flex-col justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setChatMenu(null)}
        >
          <div
            className="bg-white rounded-t-3xl pb-safe shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-2" />
            <p className="text-center text-[11px] font-semibold text-mt-muted uppercase tracking-wide mb-2">
              {chatMenu.with}
            </p>
            {chatMenu.unread > 0 && (
              <button
                onClick={() => markReadMutation.mutate(chatMenu.id)}
                disabled={markReadMutation.isPending}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 text-mt-charcoal text-sm font-medium"
              >
                <Check size={18} className="text-mt-muted" />
                Marcar como lida
              </button>
            )}
            <button
              onClick={() => setChatMenu(null)}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 text-mt-charcoal text-sm font-medium opacity-60"
              disabled
              title="Em breve"
            >
              <BellOff size={18} className="text-mt-muted" />
              Silenciar
              <span className="ml-auto text-[10px] text-mt-muted">em breve</span>
            </button>
            <button
              onClick={() => setConfirmDelete(chatMenu)}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-red-50 text-red-500 text-sm font-medium"
            >
              <Trash2 size={18} />
              Apagar conversa
            </button>
            <div className="h-4" />
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          className="absolute inset-0 z-40 flex flex-col justify-end bg-black/50 backdrop-blur-sm"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-t-3xl p-5 flex flex-col gap-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-1" />
            <p className="text-sm font-semibold text-mt-charcoal">Apagar conversa com {confirmDelete.with}?</p>
            <p className="text-xs text-mt-muted mb-2">A conversa não aparecerá mais para você.</p>
            <button
              onClick={() => deleteChatMutation.mutate(confirmDelete.id)}
              disabled={deleteChatMutation.isPending}
              className="w-full py-3 rounded-2xl bg-red-500 text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-60"
            >
              Apagar
            </button>
            <button
              onClick={() => { setConfirmDelete(null); setChatMenu(null); }}
              className="w-full py-3 rounded-2xl bg-mt-linen text-mt-charcoal text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showNewChat && (
        <div className="absolute inset-0 z-20 flex flex-col bg-white/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 flex-shrink-0">
            <p className="text-sm font-semibold text-mt-charcoal">Nova conversa</p>
            <button
              onClick={() => setShowNewChat(false)}
              aria-label="Fechar"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <X size={18} className="text-mt-charcoal" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {followingUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-mt-muted px-4 text-center">
                <p className="text-sm">Siga alguém para iniciar uma conversa</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {followingUsers.map((user) => (
                  <li key={user.id}>
                    <button
                      onClick={() => createChatMutation.mutate(user.id)}
                      disabled={createChatMutation.isPending}
                      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-mt-linen transition-colors text-left"
                    >
                      <UserAvatar
                        name={user.name}
                        archetypeKey={null}
                        size={40}
                      />
                      <p className="text-sm font-medium text-mt-charcoal">{user.name}</p>
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
