import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, Send, ImagePlus, Mic, Square, Play, Pause, Copy, Trash2, MessageCircle, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, resolveMediaUrl, uploadImage } from '../../lib/api';
import { resizeImage } from '../../lib/imageUtils';
import { useAppStore } from '../../store/useAppStore';
import { PostDetailScreen } from '../post/PostDetailScreen';
import { apiPostToCommunityPost } from '../../lib/helpers';
import { UserAvatar } from '../shared/UserAvatar';
import { ChatProfilePreviewModal } from './ChatProfilePreviewModal';
import { ImageSourceSheet } from '../shared/ImageSourceSheet';
import type { ApiMessage, ApiPost, PaginatedResult } from '../../lib/types';
import type { Chat } from '../../types';

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

export function ChatScreen({ chat, onBack, onOpenProfile }: ChatScreenProps) {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const accessToken   = useAppStore((s) => s.accessToken);
  const isLoggedIn    = useAppStore((s) => s.isLoggedIn);
  const queryClient   = useQueryClient();

  const [text, setText] = useState('');
  const [viewingPostId, setViewingPostId] = useState<string | null>(null);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [visibleTimestampId, setVisibleTimestampId] = useState<string | null>(null);
  const [messageMenu, setMessageMenu] = useState<{ messageId: string; isMe: boolean; content: string; senderName: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; senderName: string; excerpt: string } | null>(null);
  const [swipedMessageId, setSwipedMessageId] = useState<string | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const swipeStartMessageId = useRef<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStartPos = useRef<{ x: number; y: number } | null>(null);

  // Audio recording state
  const [micState, setMicState] = useState<'idle' | 'preparing' | 'recording'>('idle');
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const releasedBeforeReadyRef = useRef(false);

  // Photo upload state
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showImageSheet, setShowImageSheet] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<{ file: File; url: string } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
    mutationFn: (payload: { content?: string; audioUrl?: string; imageUrl?: string }) =>
      apiFetch<ApiMessage>(`/chats/${chat.id}/messages`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', chat.id] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) =>
      apiFetch(`/chats/${chat.id}/messages/${messageId}`, { method: 'DELETE' }),
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

  function dismissAudioError() {
    setAudioError(null);
  }

  function handleSend() {
    if (!text.trim()) return;
    const content = replyingTo
      ? `↪ ${replyingTo.senderName}: "${replyingTo.excerpt}"\n${text.trim()}`
      : text.trim();
    sendMutation.mutate({ content });
    setText('');
    setReplyingTo(null);
  }

  function handleFileSelected(file: File) {
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview({ file, url: objectUrl });
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) (e.target as HTMLInputElement).value = '';
    if (file) handleFileSelected(file);
  }

  async function handlePhotoConfirm() {
    if (!photoPreview) return;
    setIsUploadingPhoto(true);
    const preview = photoPreview;
    setPhotoPreview(null);
    URL.revokeObjectURL(preview.url);
    try {
      const resized = await resizeImage(preview.file, 1200, 1200, 0.85);
      const url = await uploadImage(resized, accessToken);
      sendMutation.mutate({ imageUrl: url });
    } catch {
      // silently discard on failure
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  function handlePhotoCancelPreview() {
    if (photoPreview) URL.revokeObjectURL(photoPreview.url);
    setPhotoPreview(null);
  }

  // ---------------------------------------------------------------------------
  // Audio recording logic
  // ---------------------------------------------------------------------------

  const startRecording = useCallback(async () => {
    if (micState !== 'idle' || isUploadingAudio) return;

    // Guardrails: browser support
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setAudioError('Seu navegador não suporta gravação de áudio.');
      setMicState('idle');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setAudioError('Gravação de áudio não suportada neste dispositivo.');
      setMicState('idle');
      return;
    }

    releasedBeforeReadyRef.current = false;
    setMicState('preparing');
    setAudioError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // User released the mic before the permission prompt resolved — abort silently
      if (releasedBeforeReadyRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        setMicState('idle');
        return;
      }

      streamRef.current = stream;

      // Pick a supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
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
      setMicState('recording');
      setRecordingSecs(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSecs((s) => s + 1);
      }, 1000);
    } catch (err) {
      stopRecordingCleanup();
      setMicState('idle');
      const name = (err as { name?: string })?.name ?? '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setAudioError('Permita o acesso ao microfone nas configurações do app.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setAudioError('Nenhum microfone encontrado neste dispositivo.');
      } else {
        setAudioError('Não foi possível iniciar a gravação. Tente novamente.');
      }
    }
  }, [micState, isUploadingAudio]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      stopRecordingCleanup();
      setMicState('idle');
      return;
    }

    // Too short — treat as cancel, don't send
    const durationSecs = recordingSecs;

    recorder.onstop = async () => {
      stopRecordingCleanup();
      setMicState('idle');

      const chunks = audioChunksRef.current;
      audioChunksRef.current = [];
      if (chunks.length === 0 || durationSecs < 1) return;

      const mimeType = recorder.mimeType || 'audio/webm';
      const blob = new Blob(chunks, { type: mimeType });

      // Upload
      setIsUploadingAudio(true);
      try {
        const ext = mimeType.includes('ogg') ? '.ogg' : mimeType.includes('mp4') ? '.m4a' : '.webm';
        const file = new File([blob], `audio${ext}`, { type: mimeType });
        const url = await uploadImage(file, accessToken);
        sendMutation.mutate({ audioUrl: url });
      } catch {
        setAudioError('Falha ao enviar o áudio. Tente novamente.');
      } finally {
        setIsUploadingAudio(false);
      }
    };

    recorder.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, sendMutation, recordingSecs]);

  function handleMicPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault(); // prevent focus/blur side effects
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
    setAudioError(null);
    startRecording();
  }

  function handleMicPointerUp() {
    if (micState === 'preparing') {
      // User released before mic was ready — flag so startRecording aborts
      releasedBeforeReadyRef.current = true;
      return;
    }
    if (micState === 'recording') {
      stopRecording();
    }
  }

  function handleMicPointerCancel() {
    if (micState === 'preparing') {
      releasedBeforeReadyRef.current = true;
      return;
    }
    if (micState === 'recording') {
      stopRecording();
    }
  }

  function handleMessagePressStart(e: React.PointerEvent, msg: ApiMessage) {
    longPressStartPos.current = { x: e.clientX, y: e.clientY };
    swipeStartX.current = e.clientX;
    swipeStartY.current = e.clientY;
    swipeStartMessageId.current = msg.id;
    longPressTimerRef.current = setTimeout(() => {
      const senderName = msg.senderId === currentUserId ? 'Você' : (msg.sender?.name ?? 'Contato');
      setMessageMenu({ messageId: msg.id, isMe: msg.senderId === currentUserId, content: msg.content, senderName });
      // vibrate for feedback on native
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
    }, 450);
  }

  function handleMessagePressEnd(e?: React.PointerEvent, msg?: ApiMessage) {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    // Complete swipe-to-reply gesture if user swiped RTL far enough
    if (e && msg && swipeStartX.current !== null && !messageMenu) {
      const dx = e.clientX - swipeStartX.current;
      if (dx < -60) {
        setReplyingTo({
          id: msg.id,
          senderName: msg.senderId === currentUserId ? 'você' : (msg.sender?.name ?? 'Contato'),
          excerpt: msg.content?.slice(0, 80) ?? (msg.audioUrl ? 'Áudio' : msg.imageUrl ? 'Foto' : ''),
        });
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
      }
    }
    setSwipedMessageId(null);
    longPressStartPos.current = null;
    swipeStartX.current = null;
    swipeStartY.current = null;
    swipeStartMessageId.current = null;
  }

  function handleMessagePressMove(e: React.PointerEvent, msg: ApiMessage) {
    if (!longPressStartPos.current) return;
    const dx = e.clientX - longPressStartPos.current.x;
    const dy = e.clientY - longPressStartPos.current.y;
    // Cancel long press when moving beyond threshold
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
    // Live swipe-to-reply visual feedback for horizontal swipes
    if (Math.abs(dx) > Math.abs(dy) && dx < -20 && !messageMenu) {
      setSwipedMessageId(msg.id);
    }
  }

  function handleSwipeStart(e: React.PointerEvent) {
    swipeStartX.current = e.clientX;
  }

  function handleSwipeEnd(e: React.PointerEvent) {
    if (swipeStartX.current === null) return;
    if (messageMenu !== null) { swipeStartX.current = null; return; }
    const deltaX = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (deltaX > 80) onBack();
  }

  // ---------------------------------------------------------------------------

  if (viewingApiPost) {
    return <PostDetailScreen post={apiPostToCommunityPost(viewingApiPost)} onBack={() => setViewingPostId(null)} />;
  }

  return (
    <div className="flex flex-col w-full h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] overflow-hidden relative">
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
          <UserAvatar
            name={chat.with}
            archetypeKey={chat.withArchetypeKey}
            avatarUrl={chat.withAvatarUrl}
            size={32}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-graphite truncate">{chat.with}</p>
          </div>
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
        onPointerDown={handleSwipeStart}
        onPointerUp={handleSwipeEnd}
        onPointerCancel={() => { swipeStartX.current = null; }}
      >
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          const showTs = visibleTimestampId === msg.id;
          const isBeingSwiped = swipedMessageId === msg.id;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-transform duration-150`}
              style={isBeingSwiped ? { transform: 'translateX(-40px)' } : undefined}
              onClick={() => setVisibleTimestampId((id) => id === msg.id ? null : msg.id)}
              onPointerDown={(e) => handleMessagePressStart(e, msg)}
              onPointerUp={(e) => handleMessagePressEnd(e, msg)}
              onPointerCancel={() => handleMessagePressEnd()}
              onPointerMove={(e) => handleMessagePressMove(e, msg)}
            >
              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full`}>
              {!isMe && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowProfilePreview(true); }}
                  className="flex-shrink-0 mr-2 mt-1 rounded-full"
                  aria-label={`Ver perfil de ${msg.sender.name}`}
                >
                  <UserAvatar
                    name={msg.sender.name}
                    archetypeKey={msg.sender.archetypeKey ?? null}
                    avatarUrl={msg.sender.avatarUrl}
                    size={28}
                  />
                </button>
              )}
              <div className={`${msg.imageUrl ? 'max-w-[85%]' : 'max-w-[72%]'} rounded-2xl overflow-hidden ${
                isMe
                  ? 'bg-sara-gold text-white rounded-br-sm'
                  : 'bg-white text-graphite shadow-sm rounded-bl-sm'
              }`}>
                {msg.imageUrl ? (
                  <img
                    src={resolveMediaUrl(msg.imageUrl) ?? msg.imageUrl}
                    alt="Imagem enviada"
                    className="w-full object-cover rounded-2xl"
                    style={{ maxHeight: '320px', minWidth: '200px' }}
                  />
                ) : msg.audioUrl ? (
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
              {showTs && (
                <span className="text-[9px] text-graphite-muted mt-0.5 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Image source sheet */}
      {showImageSheet && (
        <ImageSourceSheet
          onCamera={() => { setShowImageSheet(false); cameraInputRef.current?.click(); }}
          onGallery={() => { setShowImageSheet(false); photoInputRef.current?.click(); }}
          onClose={() => setShowImageSheet(false)}
        />
      )}

      {/* Photo preview overlay */}
      {photoPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-4 p-6">
          <img
            src={photoPreview.url}
            alt="Pré-visualização"
            className="max-w-full max-h-[70vh] rounded-2xl object-contain"
          />
          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={handlePhotoCancelPreview}
              className="flex-1 py-3 rounded-2xl bg-white/20 text-white font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handlePhotoConfirm}
              className="flex-1 py-3 rounded-2xl bg-sara-gold text-white font-semibold text-sm"
            >
              Enviar
            </button>
          </div>
        </div>
      )}

      {/* Long press message menu */}
      {messageMenu && (
        <div
          className="absolute inset-0 z-40 flex flex-col justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setMessageMenu(null)}
        >
          <div
            className="bg-white rounded-t-3xl pb-safe shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-3" />
            <button
              onClick={() => {
                const msg = messages.find((m) => m.id === messageMenu.messageId);
                if (msg) {
                  setReplyingTo({
                    id: msg.id,
                    senderName: msg.senderId === currentUserId ? 'você' : (msg.sender?.name ?? 'Contato'),
                    excerpt: msg.content?.slice(0, 80) ?? (msg.audioUrl ? 'Áudio' : msg.imageUrl ? 'Foto' : ''),
                  });
                }
                setMessageMenu(null);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 text-graphite text-sm font-medium"
            >
              <MessageCircle size={18} className="text-graphite-muted" />
              Responder
            </button>
            {messageMenu.content && (
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(messageMenu.content).catch(() => {});
                  setMessageMenu(null);
                }}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 text-graphite text-sm font-medium"
              >
                <Copy size={18} className="text-graphite-muted" />
                Copiar texto
              </button>
            )}
            {messageMenu.isMe && (
              <button
                onClick={() => {
                  deleteMessageMutation.mutate(messageMenu.messageId);
                  setMessageMenu(null);
                }}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-red-50 text-red-500 text-sm font-medium"
              >
                <Trash2 size={18} />
                Apagar para mim
              </button>
            )}
            <div className="h-4" />
          </div>
        </div>
      )}

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
        {/* Upload status banner rendered above the input row */}
        {isUploadingPhoto && (
          <div className="relative">
            <div className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-2xl shadow-lg border border-sara-linen px-4 py-3 z-50 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-sara-gold border-t-transparent animate-spin flex-shrink-0" />
              <span className="text-sm text-graphite">Enviando foto...</span>
            </div>
          </div>
        )}

        {/* Reply preview */}
        {replyingTo && (
          <div className="mb-2 bg-white rounded-2xl px-3 py-2 border-l-4 border-sara-gold flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-sara-gold uppercase tracking-wide">
                Respondendo a {replyingTo.senderName}
              </p>
              <p className="text-xs text-graphite-muted truncate">{replyingTo.excerpt}</p>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              aria-label="Cancelar resposta"
              className="w-5 h-5 flex items-center justify-center rounded-full text-graphite-muted hover:bg-gray-100 flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Audio error banner */}
        {audioError && (
          <div className="relative">
            <div className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-2xl shadow-lg border border-red-200 px-4 py-3 z-50 flex items-center justify-between gap-3">
              <span className="text-xs text-red-500 font-medium flex-1">{audioError}</span>
              <button
                onClick={dismissAudioError}
                aria-label="Fechar aviso"
                className="text-red-400 hover:text-red-600 flex-shrink-0"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div data-testid="chat-input-bar" className={`flex items-center gap-2 rounded-2xl border px-3 py-2 overflow-hidden transition-colors ${
          micState === 'recording' ? 'bg-red-50 border-red-200'
          : micState === 'preparing' ? 'bg-sara-linen border-sara-gold/40'
          : 'bg-white border-sara-linen'
        }`}>
          {/* Preparing (waiting for mic permission / stream ready) */}
          {micState === 'preparing' ? (
            <div className="flex-1 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-sara-gold border-t-transparent animate-spin flex-shrink-0" />
              <span className="text-xs text-graphite font-medium">Preparando microfone...</span>
            </div>
          ) : micState === 'recording' ? (
            <div className="flex-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              <div className="flex gap-0.5 items-center">
                {[3, 5, 4, 6, 3, 5, 4].map((h, i) => (
                  <span
                    key={i}
                    className="w-0.5 bg-red-400 rounded-full animate-pulse"
                    style={{ height: `${h * 3}px`, animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
              <span className="text-xs text-red-500 font-medium tabular-nums">{recordingSecs}s — Solte para enviar</span>
            </div>
          ) : (
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isUploadingAudio ? 'Enviando áudio...' : isUploadingPhoto ? 'Enviando foto...' : 'Escreva uma mensagem...'}
            disabled={isUploadingAudio || isUploadingPhoto}
            className="flex-1 bg-transparent text-sm text-graphite placeholder:text-sara-muted outline-none focus:outline-none disabled:opacity-50"
          />
          )}

          {/* Photo and mic — hidden while typing */}
          {!text && (
            <>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <button
                onClick={() => setShowImageSheet(true)}
                disabled={isUploadingPhoto || isUploadingAudio}
                aria-label="Enviar foto"
                className="w-7 h-7 flex items-center justify-center rounded-full transition-colors flex-shrink-0 text-sara-muted hover:text-graphite disabled:opacity-40"
              >
                <ImagePlus size={18} />
              </button>

              {/* Microphone button — hold to record */}
              <button
                aria-label={
                  micState === 'recording' ? 'Solte para enviar'
                  : micState === 'preparing' ? 'Preparando microfone'
                  : 'Segurar para gravar áudio'
                }
                onPointerDown={handleMicPointerDown}
                onPointerUp={handleMicPointerUp}
                onPointerCancel={handleMicPointerCancel}
                disabled={isUploadingAudio || isUploadingPhoto}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all flex-shrink-0 select-none touch-none ${
                  micState === 'recording'
                    ? 'text-white bg-red-500 scale-110'
                    : micState === 'preparing'
                    ? 'text-sara-gold bg-sara-gold/10 scale-105'
                    : 'text-sara-muted hover:text-graphite'
                } disabled:opacity-40`}
              >
                {micState === 'recording' ? <Square size={14} fill="currentColor" /> : <Mic size={18} />}
              </button>
            </>
          )}

          {/* Send button */}
          <button
            onClick={handleSend}
            aria-label="Enviar mensagem"
            disabled={!text.trim() || isUploadingAudio || isUploadingPhoto}
            className="w-8 h-8 rounded-full bg-sara-gold flex items-center justify-center disabled:opacity-40 transition-opacity active:scale-95 flex-shrink-0"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
