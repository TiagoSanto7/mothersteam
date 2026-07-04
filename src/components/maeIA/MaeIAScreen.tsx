import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const QUICK_CHIPS = [
  'Dicas para cólica do bebê',
  'Como lidar com o cansaço no puerpério?',
  'Amamentação: posição correta',
  'Quando voltar à academia?',
];

const STATIC_REPLIES: Record<string, string> = {
  'Dicas para cólica do bebê':
    'A cólica é comum nas primeiras semanas. Tente: massagem circular na barriga no sentido horário, a posição "aviãozinho" (barriga do bebê sobre seu antebraço) e calor suave. Se persistir por mais de 3h/dia, consulte seu pediatra. 💚',
  'Como lidar com o cansaço no puerpério?':
    'O cansaço pós-parto é real e validado pela ciência. Durma quando o bebê dorme, peça ajuda sem culpa e não exija perfeição de si mesma. Se o cansaço vier com tristeza persistente, procure apoio profissional. Você está indo muito bem! 💜',
  'Amamentação: posição correta':
    'A pega correta é fundamental: bebê de frente para o peito (barriga com barriga), boca bem aberta cobrindo toda a aréola, não só o bico. Costas da mãe apoiadas. Está doendo? A pega pode não estar certa — tente ajustar. 🤱',
  'Quando voltar à academia?':
    'Geralmente a liberação é com 6 semanas após parto normal ou 8 semanas após cesárea — sempre com avaliação médica. Comece com caminhadas leves e priorize a fisioterapia pélvica antes de exercícios de impacto. 💪',
};

const DEFAULT_REPLY =
  'Estou aqui para te ajudar! Para questões específicas de saúde, consulte sempre seu médico ou pediatra. O que mais posso esclarecer? 💜';

export function MaeIAScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      text: 'Olá! Sou a MãeIA, sua assistente de saúde materno-infantil. Como posso te ajudar hoje? 💜',
    },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const reply = STATIC_REPLIES[trimmed] ?? DEFAULT_REPLY;
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'user', text: trimmed },
      { id: (Date.now() + 1).toString(), role: 'assistant', text: reply },
    ]);
    setInput('');
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-sara-linen/60 bg-sara-cream/80 backdrop-blur-sm">
        <h1 className="text-base font-semibold font-serif text-graphite">MãeIA</h1>
        <p className="text-xs text-graphite-muted">Assistente de saúde materno-infantil</p>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 bg-sara-cream">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => sendMessage(chip)}
            aria-label={chip}
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-sara-linen text-sara-gold text-xs font-medium whitespace-nowrap"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3 flex flex-col gap-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
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

      <div className="px-4 pb-4 pt-2 bg-sara-linen/80 border-t border-sara-linen/60">
        <div className="flex items-center gap-2 bg-offwhite rounded-2xl px-3 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="Pergunte à MãeIA…"
            aria-label="Mensagem para a MãeIA"
            className="flex-1 bg-transparent text-sm text-graphite placeholder:text-graphite-muted outline-none"
          />
          <motion.button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            aria-label="Enviar mensagem"
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-8 h-8 rounded-xl bg-sara-gold flex items-center justify-center disabled:opacity-40"
          >
            <Send size={14} className="text-white" strokeWidth={2} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
