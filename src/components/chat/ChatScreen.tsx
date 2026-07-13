import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import { PostDetailScreen } from '../post/PostDetailScreen';
import { apiPostToCommunityPost } from '../../lib/helpers';
import type { ApiMessage, ApiPost, PaginatedResult } from '../../lib/types';
import type { Chat } from '../../types';

interface ChatScreenProps {
  chat: Chat;
  onBack: () => void;
}

export function ChatScreen({ chat, onBack }: ChatScreenProps) {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const isLoggedIn    = useAppStore((s) => s.isLoggedIn);
  const queryClient   = useQueryClient();

  const [text, setText] = useState('');
  const [viewingPostId, setViewingPostId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messagesData } = useQuery({
    queryKey: ['messages', chat.id],
    queryFn: () => apiFetch<PaginatedResult<ApiMessage>>(`/chats/${chat.id}/messages`),
    enabled: isLoggedIn,
  });

  const messages = messagesData?.items ?? [];

  const { data: viewingApiPost } = useQuery({
    queryKey: ['post', viewingPostId],
    queryFn: () => apiFetch<ApiPost>(`/posts/${viewingPostId}`),
    enabled: viewingPostId !== null,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      apiFetch<ApiMessage>(`/chats/${chat.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', chat.id] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });

  // Mark messages as read when the chat is opened
  useEffect(() => {
    apiFetch(`/chats/${chat.id}/read`, { method: 'POST' }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    }).catch(() => {/* ignore */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id]);

  useEffect(() => {
    if (typeof bottomRef.current?.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  function handleSend() {
    if (!text.trim()) return;
    sendMutation.mutate(text.trim());
    setText('');
  }

  if (viewingApiPost) {
    return <PostDetailScreen post={apiPostToCommunityPost(viewingApiPost)} onBack={() => setViewingPostId(null)} />;
  }

  return (
    <div className="flex flex-col w-full h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-sara-linen/60 flex-shrink-0">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <div className="w-8 h-8 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {chat.with.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-graphite truncate">{chat.with}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className="w-7 h-7 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mr-2 mt-1">
                  {msg.sender.name.charAt(0)}
                </div>
              )}
              <div className={`max-w-[72%] rounded-2xl overflow-hidden ${
                isMe
                  ? 'bg-sara-gold text-white rounded-br-sm'
                  : 'bg-white text-graphite shadow-sm rounded-bl-sm'
              }`}>
                {msg.sharedPostId ? (
                  <button
                    aria-label={`Ver post de ${msg.sharedPostAuthor}`}
                    onClick={() => setViewingPostId(msg.sharedPostId!)}
                    className="p-3 flex flex-col gap-1.5 w-full text-left"
                  >
                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${isMe ? 'text-white/70' : 'text-graphite-muted'}`}>
                      Post compartilhado
                    </p>
                    <p className={`text-[11px] font-semibold ${isMe ? 'text-white' : 'text-graphite'}`}>
                      {msg.sharedPostAuthor}
                    </p>
                    <p className={`text-xs leading-relaxed ${isMe ? 'text-white/90' : 'text-graphite-light'}`}>
                      {msg.sharedPostExcerpt}
                    </p>
                    {msg.content && (
                      <p className={`text-xs pt-1.5 border-t ${isMe ? 'border-white/30 text-white/90' : 'border-sara-linen text-graphite-light'}`}>
                        {msg.content}
                      </p>
                    )}
                  </button>
                ) : (
                  <div className="px-4 py-2.5">
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-sara-linen/60 flex-shrink-0 bg-sara-linen/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-sara-linen px-3 py-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escreva uma mensagem..."
            className="flex-1 bg-transparent text-sm text-graphite placeholder:text-sara-muted outline-none focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="w-8 h-8 rounded-full bg-sara-gold flex items-center justify-center disabled:opacity-40 transition-opacity active:scale-95"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
