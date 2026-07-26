import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, ChevronLeft, Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { Conversation } from '@elevenlabs/client';
import { apiFetch } from '../../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

type ConvStatus = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

const QUICK_CHIPS = [
  'Dicas para cólica do bebê',
  'Como lidar com o cansaço?',
  'Amamentação: pega correta',
  'Quando voltar à academia?',
];

const STATUS_LABELS: Record<ConvStatus, string> = {
  idle: 'Toque em Conectar para falar com a MãeIA',
  connecting: 'Conectando...',
  listening: 'Ouvindo você...',
  processing: 'Processando...',
  speaking: 'MãeIA respondendo...',
  error: 'Erro na conexão',
};

const STATUS_COLORS: Record<ConvStatus, string> = {
  idle: 'text-graphite-muted',
  connecting: 'text-sara-gold',
  listening: 'text-green-600',
  processing: 'text-sara-warm',
  speaking: 'text-sara-gold',
  error: 'text-red-500',
};

interface MaeIAScreenProps {
  onBack?: () => void;
}

export function MaeIAScreen({ onBack }: MaeIAScreenProps = {}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      text: 'Olá! Sou a MãeIA, sua assistente de saúde materno-infantil. Conecte-se para conversar por voz, ou digite sua pergunta abaixo. 💜',
    },
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ConvStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const convRef = useRef<Conversation | null>(null);
  const isConnected = status !== 'idle' && status !== 'error' && status !== 'connecting';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { convRef.current?.endSession().catch(() => {}); };
  }, []);

  const addMessage = useCallback((role: 'user' | 'assistant', text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role, text },
    ]);
  }, []);

  async function connectVoice() {
    if (convRef.current) return;
    setStatus('connecting');
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
          console.error('MãeIA error:', error);
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
      convRef.current = null;
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      addMessage('assistant', 'Não foi possível conectar à MãeIA. Verifique sua conexão e tente novamente.');
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

  function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    addMessage('user', trimmed);
    setInput('');
    // Fallback static replies when not connected via voice
    if (!isConnected) {
      setTimeout(() => {
        addMessage('assistant', 'Para obter uma resposta personalizada da MãeIA, conecte-se usando o botão de voz. Para questões urgentes de saúde, consulte sempre seu médico. 💜');
      }, 800);
    }
  }

  const pulsing = status === 'listening' || status === 'speaking';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="relative px-4 pt-4 pb-3 border-b border-sara-linen/60 bg-sara-cream/80 backdrop-blur-sm">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Voltar"
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center z-10"
          >
            <ChevronLeft size={18} className="text-graphite" />
          </button>
        )}
        <h1 className={`text-base font-semibold font-serif text-graphite${onBack ? ' pl-10' : ''}`}>MãeIA</h1>
        <p className={`text-xs mt-0.5 ${STATUS_COLORS[status]}${onBack ? ' pl-10' : ''}`}>
          {STATUS_LABELS[status]}
        </p>
      </div>

      {/* Quick chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 bg-sara-cream flex-shrink-0">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => sendText(chip)}
            aria-label={chip}
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-sara-linen text-sara-gold text-xs font-medium whitespace-nowrap"
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
                  ? 'bg-sara-gold text-white rounded-br-sm'
                  : `bg-white text-graphite shadow-sm rounded-bl-sm ${msg.id === '0' ? 'font-serif' : ''}`
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Voice status indicator */}
      {pulsing && (
        <div className="flex items-center justify-center py-2 flex-shrink-0">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className={`w-3 h-3 rounded-full ${status === 'listening' ? 'bg-green-500' : 'bg-sara-gold'}`}
          />
          <span className={`text-xs ml-2 ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 pb-4 pt-2 bg-sara-linen/80 border-t border-sara-linen/60 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Voice connect/disconnect button */}
          <button
            onClick={isConnected ? disconnectVoice : connectVoice}
            disabled={status === 'connecting'}
            aria-label={isConnected ? 'Encerrar conversa por voz' : 'Iniciar conversa por voz'}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
              isConnected ? 'bg-red-100 text-red-500' : 'bg-sara-gold text-white'
            } disabled:opacity-50`}
          >
            {isConnected ? <PhoneOff size={16} /> : <Phone size={16} />}
          </button>

          {/* Mute toggle — only when connected */}
          {isConnected && (
            <button
              onClick={toggleMute}
              aria-label={isMuted ? 'Ativar microfone' : 'Silenciar microfone'}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                isMuted ? 'bg-red-100 text-red-500' : 'bg-white text-graphite-muted'
              }`}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}

          {/* Text input */}
          <div className="flex-1 flex items-center gap-2 bg-white rounded-2xl px-3 py-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendText(input)}
              placeholder="Pergunte à MãeIA…"
              aria-label="Mensagem para a MãeIA"
              className="flex-1 bg-transparent text-sm text-graphite placeholder:text-graphite-muted outline-none"
            />
            <motion.button
              onClick={() => sendText(input)}
              disabled={!input.trim()}
              aria-label="Enviar mensagem"
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-7 h-7 rounded-xl bg-sara-gold flex items-center justify-center disabled:opacity-40"
            >
              <Send size={13} className="text-white" strokeWidth={2} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
