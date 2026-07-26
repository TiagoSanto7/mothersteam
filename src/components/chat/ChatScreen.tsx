import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Send, Smile, ImagePlus, Mic } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import { PostDetailScreen } from '../post/PostDetailScreen';
import { apiPostToCommunityPost } from '../../lib/helpers';
import { getAvatarColor } from '../../utils/avatar';
import { ChatProfilePreviewModal } from './ChatProfilePreviewModal';
import type { ApiMessage, ApiPost, PaginatedResult } from '../../lib/types';
import type { Chat } from '../../types';

// ---------------------------------------------------------------------------
// Emoji picker — hardcoded grid, no external dependency
// ---------------------------------------------------------------------------
const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: 'Amor',
    emojis: ['❤️', '🥰', '😍', '💕', '💖', '💗', '💓', '🤍', '💛', '🧡'],
  },
  {
    label: 'Expressões',
    emojis: ['😊', '😂', '🥹', '😭', '😅', '🤣', '😇', '🥺', '😢', '😌'],
  },
  {
    label: 'Maternidade',
    emojis: ['🤱', '👶', '🍼', '🌸', '🌺', '💪', '🙏', '✨', '🌙', '🌈'],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Seletor de emoji"
      className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-2xl shadow-lg border border-sara-linen p-3 z-50"
    >
      {EMOJI_CATEGORIES.map((cat) => (
        <div key={cat.label} className="mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-sara-muted mb-1 px-1">
            {cat.label}
          </p>
          <div className="flex flex-wrap gap-1">
            {cat.emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onSelect(emoji)}
                className="text-xl p-1 rounded-lg hover:bg-sara-linen active:scale-90 transition-transform"
                aria-label={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// "Em breve" tooltip — shown for features not yet supported by the backend
// ---------------------------------------------------------------------------
interface ComingSoonTooltipProps {
  label: string;
  onClose: () => void;
}

function ComingSoonTooltip({ label, onClose }: ComingSoonTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="tooltip"
      className="absolute bottom-full mb-2 left-0 bg-graphite text-white text-xs rounded-xl px-3 py-2 whitespace-nowrap shadow-lg z-50"
    >
      {label} em breve ✨
      <div className="absolute top-full left-4 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-graphite" />
    </div>
  );
}

// ---------------------------------------------------------------------------

interface ChatScreenProps {
  chat: Chat;
  onBack: () => void;
  onOpenProfile?: (userId: string) => void;
}

type ActivePanel = 'emoji' | 'photo' | 'audio' | null;

export function ChatScreen({ chat, onBack, onOpenProfile }: ChatScreenProps) {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const isLoggedIn    = useAppStore((s) => s.isLoggedIn);
  const queryClient   = useQueryClient();

  const [text, setText] = useState('');
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [viewingPostId, setViewingPostId] = useState<string | null>(null);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

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
    setActivePanel(null);
  }

  function handleEmojiSelect(emoji: string) {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart ?? text.length;
      const end   = input.selectionEnd   ?? text.length;
      const next  = text.slice(0, start) + emoji + text.slice(end);
      setText(next);
      // Restore cursor after the inserted emoji
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      });
    } else {
      setText((t) => t + emoji);
    }
    setActivePanel(null);
  }

  function togglePanel(panel: ActivePanel) {
    setActivePanel((prev) => (prev === panel ? null : panel));
  }

  if (viewingApiPost) {
    return <PostDetailScreen post={apiPostToCommunityPost(viewingApiPost)} onBack={() => setViewingPostId(null)} />;
  }

  return (
    <div className="flex flex-col w-full h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-sara-linen/60 flex-shrink-0">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <button
          aria-label={`Ver perfil de ${chat.with}`}
          onClick={() => setShowProfilePreview(true)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <div
            style={{ background: getAvatarColor(chat.withArchetypeKey) }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          >
            {chat.with.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-graphite truncate">{chat.with}</p>
          </div>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div
                  style={{ background: getAvatarColor(msg.sender.archetypeKey ?? null) }}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mr-2 mt-1"
                >
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

      {/* Profile preview modal */}
      {showProfilePreview && chat.withUserId && (
        <ChatProfilePreviewModal
          name={chat.with}
          username={chat.withUsername}
          archetypeKey={chat.withArchetypeKey}
          userId={chat.withUserId}
          messageCount={messages.length}
          onClose={() => setShowProfilePreview(false)}
          onOpenProfile={onOpenProfile ?? (() => {})}
        />
      )}

      {/* Input area */}
      <div className="px-4 py-3 border-t border-sara-linen/60 flex-shrink-0 bg-sara-linen/80 backdrop-blur-sm">
        {/* Panels (emoji picker / tooltips) rendered above the input row */}
        <div className="relative">
          {activePanel === 'emoji' && (
            <EmojiPicker
              onSelect={handleEmojiSelect}
              onClose={() => setActivePanel(null)}
            />
          )}
          {activePanel === 'photo' && (
            <ComingSoonTooltip
              label="Fotos"
              onClose={() => setActivePanel(null)}
            />
          )}
          {activePanel === 'audio' && (
            <ComingSoonTooltip
              label="Áudio"
              onClose={() => setActivePanel(null)}
            />
          )}
        </div>

        <div className="flex items-center gap-2 bg-white rounded-2xl border border-sara-linen px-3 py-2">
          {/* Emoji button */}
          <button
            onClick={() => togglePanel('emoji')}
            aria-label="Emojis"
            className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${
              activePanel === 'emoji' ? 'text-sara-gold' : 'text-sara-muted hover:text-graphite'
            }`}
          >
            <Smile size={18} />
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            onFocus={() => setActivePanel(null)}
            placeholder="Escreva uma mensagem..."
            className="flex-1 bg-transparent text-sm text-graphite placeholder:text-sara-muted outline-none focus:outline-none"
          />

          {/* Photo button — Em breve */}
          <button
            onClick={() => togglePanel('photo')}
            aria-label="Enviar foto"
            className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${
              activePanel === 'photo' ? 'text-sara-gold' : 'text-sara-muted hover:text-graphite'
            }`}
          >
            <ImagePlus size={18} />
          </button>

          {/* Microphone button — Em breve */}
          <button
            onClick={() => togglePanel('audio')}
            aria-label="Mensagem de voz"
            className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${
              activePanel === 'audio' ? 'text-sara-gold' : 'text-sara-muted hover:text-graphite'
            }`}
          >
            <Mic size={18} />
          </button>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="w-8 h-8 rounded-full bg-sara-gold flex items-center justify-center disabled:opacity-40 transition-opacity active:scale-95 flex-shrink-0"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
