import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, Send, ImagePlus, Mic, Square, Play, Pause } from 'lucide-react';
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

export function ChatScreen({ chat, onBack, onOpenProfile }: ChatScreenProps) {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const accessToken   = useAppStore((s) => s.accessToken);
  const isLoggedIn    = useAppStore((s) => s.isLoggedIn);
  const queryClient   = useQueryClient();

  const [text, setText] = useState('');
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
        const url = await uploadImage(file, accessToken);
        sendMutation.mutate({ audioUrl: url });
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
          <UserAvatar
            name={chat.with}
            archetypeKey={chat.withArchetypeKey}
            size={32}
          />
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
                <UserAvatar
                  name={msg.sender.name}
                  archetypeKey={msg.sender.archetypeKey ?? null}
                  size={28}
                  className="mr-2 mt-1"
                />
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
        {/* Panels (recording indicator / upload status) rendered above the input row */}
        <div className="relative">
          {isUploadingPhoto && (
            <div className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-2xl shadow-lg border border-sara-linen px-4 py-3 z-50 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-sara-gold border-t-transparent animate-spin flex-shrink-0" />
              <span className="text-sm text-graphite">Enviando foto...</span>
            </div>
          )}
          {isRecording && (
            <RecordingIndicator durationSecs={recordingSecs} />
          )}
        </div>

        <div data-testid="chat-input-bar" className="flex items-center gap-2 bg-white rounded-2xl border border-sara-linen px-3 py-2 overflow-hidden">
          {/* Text input */}
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
                aria-label={isRecording ? 'Solte para enviar' : 'Segurar para gravar áudio'}
                onPointerDown={handleMicPointerDown}
                onPointerUp={handleMicPointerUp}
                onPointerCancel={handleMicPointerCancel}
                disabled={isUploadingAudio || isUploadingPhoto}
                className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors flex-shrink-0 select-none touch-none ${
                  isRecording
                    ? 'text-red-500 bg-red-50'
                    : 'text-sara-muted hover:text-graphite'
                } disabled:opacity-40`}
              >
                {isRecording ? <Square size={14} /> : <Mic size={18} />}
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
