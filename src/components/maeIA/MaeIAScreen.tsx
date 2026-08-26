import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, ChevronLeft, Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { Conversation } from '@elevenlabs/client';
import { apiFetch, apiStream } from '../../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isNew?: boolean;
  isStreaming?: boolean;
}

type ConvStatus = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

const QUICK_CHIPS = [
  'Dicas para cólica do bebê',
  'Como lidar com o cansaço?',
  'Amamentação: pega correta',
  'Quando voltar à academia?',
];

const STATUS_LABELS: Record<ConvStatus, string> = {
  idle: 'Toque em Conectar para falar com a Sara',
  connecting: 'Conectando...',
  listening: 'Ouvindo você...',
  processing: 'Processando...',
  speaking: 'Sara respondendo...',
  error: 'Erro na conexão',
};

const STATUS_COLORS: Record<ConvStatus, string> = {
  idle: 'text-mt-muted',
  connecting: 'text-mt-rose-dark',
  listening: 'text-green-600',
  processing: 'text-mt-rose',
  speaking: 'text-mt-rose-deep',
  error: 'text-red-500',
};

function AssistantMessage({ text, isNew, isStreaming }: { text: string; isNew?: boolean; isStreaming?: boolean }) {
  if (isStreaming) {
    if (!text) {
      return (
        <span className="flex gap-1 items-center py-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-mt-muted"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
            />
          ))}
        </span>
      );
    }
    return <span>{text}</span>;
  }

  const sentences = text.split(/[.!?]+\s+/).filter(Boolean);
  if (!isNew || sentences.length <= 1) {
    return <span>{text}</span>;
  }
  return (
    <>
      {sentences.map((sentence, i) => (
        <motion.span
          key={i}
          style={{ display: 'block' }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15, duration: 0.3, ease: 'easeOut' }}
        >
          {sentence}{i < sentences.length - 1 ? '.' : ''}
        </motion.span>
      ))}
    </>
  );
}

interface MaeIAScreenProps {
  onBack?: () => void;
}

export function MaeIAScreen({ onBack }: MaeIAScreenProps = {}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      text: 'Olá! Sou a Sara, sua assistente de saúde materno-infantil. Conecte-se para conversar por voz, ou digite sua pergunta abaixo. 💜',
    },
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ConvStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isSendingText, setIsSendingText] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const convRef = useRef<Conversation | null>(null);
  const messagesRef = useRef<Message[]>(messages);
  const isConnected = status !== 'idle' && status !== 'error' && status !== 'connecting';

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => { convRef.current?.endSession().catch(() => {}); };
  }, []);

  const addMessage = useCallback((role: 'user' | 'assistant', text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role, text, isNew: true },
    ]);
  }, []);

  async function connectVoice() {
    if (convRef.current) return;
    setStatus('connecting');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia unavailable in this WebView');
      }
      const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
      probe.getTracks().forEach((t) => t.stop());
    } catch (permErr) {
      console.error('[Sara] microfone bloqueado:', permErr);
      convRef.current = null;
      setStatus('error');
      addMessage(
        'assistant',
        'Não consegui acessar o microfone. Abra as configurações do sistema, dê permissão de microfone pro Mother\'s Team e tente de novo.',
      );
      setTimeout(() => setStatus('idle'), 5000);
      return;
    }

    try {
      const { signedUrl } = await apiFetch<{ signedUrl: string }>('/mae-ia/token', { method: 'POST' });

      const conv = await Conversation.startSession({
        signedUrl,
        onConnect: () => setStatus('listening'),
        onDisconnect: () => {
          convRef.current = null;
          setStatus('idle');
        },
        onError: (error) => {
          console.error('[Sara] erro de sessão:', error);
          convRef.current = null;
          setStatus('error');
          setTimeout(() => setStatus('idle'), 3000);
        },
        onModeChange: ({ mode }) => {
          if (!convRef.current) return;
          if (mode === 'listening') setStatus('listening');
          else if (mode === 'speaking') setStatus('speaking');
        },
        onMessage: ({ message, source }) => {
          if (source === 'user') addMessage('user', message);
          else if (source === 'ai') addMessage('assistant', message);
        },
      });

      convRef.current = conv;
    } catch (err) {
      console.error('[Sara] falha ao iniciar sessão:', err);
      convRef.current = null;
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      addMessage(
        'assistant',
        'Não foi possível conectar à Sara. Verifique sua conexão e tente novamente.',
      );
    }
  }

  async function disconnectVoice() {
    await convRef.current?.endSession().catch(() => {});
    convRef.current = null;
    setStatus('idle');
  }

  async function toggleMute() {
    if (!convRef.current) return;
    const newMuted = !isMuted;
    convRef.current.setMicMuted(newMuted);
    setIsMuted(newMuted);
  }

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSendingText) return;

    addMessage('user', trimmed);
    setInput('');
    setIsSendingText(true);

    const streamingId = `${Date.now()}-sara`;
    setMessages((prev) => [
      ...prev,
      { id: streamingId, role: 'assistant', text: '', isStreaming: true },
    ]);

    const history = [
      ...messagesRef.current
        .filter((m) => m.id !== '0')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.text })),
      { role: 'user' as const, content: trimmed },
    ].slice(-20);

    await apiStream(
      '/mae-ia/chat',
      { messages: history },
      (chunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId ? { ...m, text: m.text + chunk } : m
          )
        );
      },
      () => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId ? { ...m, isStreaming: false, isNew: false } : m
          )
        );
        setIsSendingText(false);
      },
      (errMsg) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId ? { ...m, text: errMsg, isStreaming: false } : m
          )
        );
        setIsSendingText(false);
      }
    );
  }

  const pulsing = status === 'listening' || status === 'speaking';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="relative px-4 pt-4 pb-3 border-b border-mt-linen/60 bg-mt-cream/80 backdrop-blur-sm">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Voltar"
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center z-10"
          >
            <ChevronLeft size={18} className="text-mt-charcoal" />
          </button>
        )}
        <h1 className={`text-base font-semibold font-serif text-mt-charcoal${onBack ? ' pl-10' : ''}`}>Sara</h1>
        <p className={`text-xs mt-0.5 ${STATUS_COLORS[status]}${onBack ? ' pl-10' : ''}`}>
          {STATUS_LABELS[status]}
        </p>
      </div>

      {/* Quick chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 bg-mt-cream flex-shrink-0">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => sendText(chip)}
            aria-label={chip}
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-mt-linen text-mt-rose text-xs font-medium whitespace-nowrap"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3 flex flex-col gap-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-mt-rose text-white rounded-br-sm'
                  : `bg-white text-mt-charcoal shadow-sm rounded-bl-sm ${msg.id === '0' ? 'font-serif' : ''}`
              }`}
            >
              {msg.role === 'assistant' ? (
                <AssistantMessage text={msg.text} isNew={msg.isNew} isStreaming={msg.isStreaming} />
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Voice status pulse */}
      {pulsing && (
        <div className="flex items-center justify-center py-3 flex-shrink-0">
          <div className="relative flex items-center justify-center">
            <motion.span
              aria-hidden="true"
              animate={{ scale: [1, 1.9, 1], opacity: [0.35, 0, 0.35] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeOut' }}
              className={`absolute w-6 h-6 rounded-full ${status === 'listening' ? 'bg-green-500' : 'bg-mt-rose'}`}
            />
            <motion.span
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className={`relative w-4 h-4 rounded-full ${status === 'listening' ? 'bg-green-500' : 'bg-mt-rose'}`}
            />
          </div>
          <span className={`text-xs ml-3 font-medium ${STATUS_COLORS[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 pb-4 pt-2 bg-mt-linen/80 border-t border-mt-linen/60 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={isConnected ? disconnectVoice : connectVoice}
            disabled={status === 'connecting'}
            aria-label={isConnected ? 'Encerrar conversa por voz' : 'Iniciar conversa por voz'}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
              isConnected ? 'bg-red-100 text-red-500' : 'bg-mt-rose text-white'
            } disabled:opacity-50`}
          >
            {isConnected ? <PhoneOff size={16} /> : <Phone size={16} />}
          </button>

          {isConnected && (
            <button
              onClick={toggleMute}
              aria-label={isMuted ? 'Ativar microfone' : 'Silenciar microfone'}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                isMuted ? 'bg-red-100 text-red-500' : 'bg-white text-mt-muted'
              }`}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}

          <div className="flex-1 flex items-center gap-2 bg-white rounded-2xl px-3 py-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendText(input)}
              placeholder="Pergunte à Sara…"
              aria-label="Mensagem para a Sara"
              className="flex-1 bg-transparent text-sm text-mt-charcoal placeholder:text-mt-muted outline-none"
            />
            <motion.button
              onClick={() => sendText(input)}
              disabled={!input.trim() || isSendingText}
              aria-label="Enviar mensagem"
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-7 h-7 rounded-xl bg-mt-rose flex items-center justify-center disabled:opacity-40"
            >
              <Send size={13} className="text-white" strokeWidth={2} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
