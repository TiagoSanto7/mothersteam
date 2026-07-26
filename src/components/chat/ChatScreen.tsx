import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, Send, Smile, ImagePlus, Mic, Square, Play, Pause } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, resolveMediaUrl } from '../../lib/api';
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
// Recording indicator shown above the input while mic is held
// ---------------------------------------------------------------------------
interface RecordingIndicatorProps {
  durationSecs: number;
}

function RecordingIndicator({ durationSecs }: RecordingIndicatorProps) {
  const mins = Math.floor(durationSecs / 60);
  const secs = durationSecs % 60;
  const formatted = `${mins}:${String(secs).padStart(2, '0')}`;
  return (
    <div className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-2xl shadow-lg border border-red-200 px-4 py-3 z-50 flex items-center gap-3">
      <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
      <span className="text-sm font-medium text-graphite flex-1">Gravando...</span>
      <span className="text-sm tabular-nums text-red-500 font-semibold">{formatted}</span>
      <span className="text-xs text-sara-muted">Solte para enviar</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audio message player component
// ---------------------------------------------------------------------------
interface AudioPlayerProps {
  src: string;
  isMe: boolean;
}

function AudioPlayer({ src, isMe }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [duration, setDuration] = useState(0);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => {/* user gesture required — ignore */});
    }
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setProgress(audio.currentTime / audio.duration);
  }

  function handleEnded() {
    setPlaying(false);
    setProgress(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  }

  function handleLoaded() {
    if (audioRef.current) setDuration(audioRef.current.duration);
  }

  function handleSeek(e: React.PointerEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio);
  }

  const displaySecs = duration > 0
    ? Math.round(playing ? (progress * duration) : duration)
    : 0;
  const mins = Math.floor(displaySecs / 60);
  const secs = displaySecs % 60;
  const timeLabel = duration > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : '—:——';

  return (
    <div className="flex items-center gap-2 px-3 py-2 min-w-[180px]">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoaded}
        preload="metadata"
      />
      <button
        onClick={togglePlay}
        aria-label={playing ? 'Pausar' : 'Reproduzir áudio'}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-sara-gold/10 hover:bg-sara-gold/20 text-sara-gold'
        }`}
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>

      {/* Progress bar */}
      <div
        className="flex-1 flex flex-col gap-1 cursor-pointer"
        onPointerDown={handleSeek}
        role="slider"
        aria-label="Progresso do áudio"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-1 rounded-full overflow-hidden ${isMe ? 'bg-white/30' : 'bg-sara-linen'}`}>
          <div
            className={`h-full rounded-full transition-all ${isMe ? 'bg-white' : 'bg-sara-gold'}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className={`text-[10px] tabular-nums ${isMe ? 'text-white/70' : 'text-sara-muted'}`}>
          {timeLabel}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface ChatScreenProps {
  chat: Chat;
  onBack: () => void;
  onOpenProfile?: (userId: string) => void;
}

type ActivePanel = 'emoji' | 'photo' | null;

export function ChatScreen({ chat, onBack, onOpenProfile }: ChatScreenProps) {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const accessToken   = useAppStore((s) => s.accessToken);
  const isLoggedIn    = useAppStore((s) => s.isLoggedIn);
  const queryClient   = useQueryClient();

  const [text, setText] = useState('');
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [viewingPostId, setViewingPostId] = useState<string | null>(null);
  const [showProfilePreview, setShowProfilePreview] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);

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
    mutationFn: (payload: { content?: string; audioUrl?: string }) =>
      apiFetch<ApiMessage>(`/chats/${chat.id}/messages`, {
        method: 'POST',
        body: JSON.stringify(payload),
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

  // Clean up recording resources on unmount
  useEffect(() => {
    return () => {
      stopRecordingCleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopRecordingCleanup() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function handleSend() {
    if (!text.trim()) return;
    sendMutation.mutate({ content: text.trim() });
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

  // ---------------------------------------------------------------------------
  // Audio recording logic
  // ---------------------------------------------------------------------------

  const startRecording = useCallback(async () => {
    if (isRecording || isUploadingAudio) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick a supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg')
        ? 'audio/ogg'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100); // collect chunks every 100ms
      setIsRecording(true);
      setRecordingSecs(0);
      setActivePanel(null);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSecs((s) => s + 1);
      }, 1000);
    } catch {
      // Permission denied or not supported — silently ignore
    }
  }, [isRecording, isUploadingAudio]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      stopRecordingCleanup();
      setIsRecording(false);
      return;
    }

    recorder.onstop = async () => {
      stopRecordingCleanup();
      setIsRecording(false);

      const chunks = audioChunksRef.current;
      if (chunks.length === 0) return;

      const mimeType = recorder.mimeType || 'audio/webm';
      const blob = new Blob(chunks, { type: mimeType });
      audioChunksRef.current = [];

      // Upload
      setIsUploadingAudio(true);
      try {
        const ext = mimeType.includes('ogg') ? '.ogg' : mimeType.includes('mp4') ? '.m4a' : '.webm';
        const file = new File([blob], `audio${ext}`, { type: mimeType });
        const formData = new FormData();
        formData.append('file', file);

        const headers: HeadersInit = {};
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

        const API_ORIGIN = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
        const BASE = API_ORIGIN ?? '/api';

        const res = await fetch(`${BASE}/uploads`, {
          method: 'POST',
          headers,
          body: formData,
          credentials: 'include',
        });

        if (!res.ok) throw new Error('Upload failed');
        const data = (await res.json()) as { url: string };
        sendMutation.mutate({ audioUrl: data.url });
      } catch {
        // Upload failed — silently discard
      } finally {
        setIsUploadingAudio(false);
      }
    };

    recorder.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, sendMutation]);

  function handleMicPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault(); // prevent focus/blur side effects
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
    startRecording();
  }

  function handleMicPointerUp() {
    if (isRecording) {
      stopRecording();
    }
  }

  function handleMicPointerCancel() {
    if (isRecording) {
      stopRecording();
    }
  }

  // ---------------------------------------------------------------------------

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
                {msg.audioUrl ? (
                  <AudioPlayer
                    src={resolveMediaUrl(msg.audioUrl) ?? msg.audioUrl}
                    isMe={isMe}
                  />
                ) : msg.sharedPostId ? (
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
        {/* Panels (emoji picker / tooltips / recording indicator) rendered above the input row */}
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
          {isRecording && (
            <RecordingIndicator durationSecs={recordingSecs} />
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
            placeholder={isUploadingAudio ? 'Enviando áudio...' : 'Escreva uma mensagem...'}
            disabled={isUploadingAudio}
            className="flex-1 bg-transparent text-sm text-graphite placeholder:text-sara-muted outline-none focus:outline-none disabled:opacity-50"
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

          {/* Microphone button — hold to record */}
          <button
            aria-label={isRecording ? 'Solte para enviar' : 'Segurar para gravar áudio'}
            onPointerDown={handleMicPointerDown}
            onPointerUp={handleMicPointerUp}
            onPointerCancel={handleMicPointerCancel}
            disabled={isUploadingAudio}
            className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors flex-shrink-0 select-none touch-none ${
              isRecording
                ? 'text-red-500 bg-red-50'
                : 'text-sara-muted hover:text-graphite'
            } disabled:opacity-40`}
          >
            {isRecording ? <Square size={14} /> : <Mic size={18} />}
          </button>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!text.trim() || isUploadingAudio}
            className="w-8 h-8 rounded-full bg-sara-gold flex items-center justify-center disabled:opacity-40 transition-opacity active:scale-95 flex-shrink-0"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
