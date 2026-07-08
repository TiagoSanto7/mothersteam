import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Send } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { Chat } from '../../types';

interface ChatScreenProps {
  chat: Chat;
  onBack: () => void;
}

export function ChatScreen({ chat, onBack }: ChatScreenProps) {
  const motherName = useAppStore((s) => s.motherName);
  const chats = useAppStore((s) => s.chats);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const markChatRead = useAppStore((s) => s.markChatRead);

  const currentChat = chats.find((c) => c.id === chat.id) ?? chat;
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markChatRead(chat.id);
  }, [chat.id, markChatRead]);

  useEffect(() => {
    if (typeof bottomRef.current?.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentChat.messages.length]);

  function handleSend() {
    if (!text.trim()) return;
    sendMessage(chat.id, text.trim());
    setText('');
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
        {currentChat.messages.map((msg) => {
          const isMe = msg.from === motherName;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className="w-7 h-7 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mr-2 mt-1">
                  {msg.from.charAt(0)}
                </div>
              )}
              <div className={`max-w-[72%] rounded-2xl overflow-hidden ${
                isMe
                  ? 'bg-sara-gold text-white rounded-br-sm'
                  : 'bg-white text-graphite shadow-sm rounded-bl-sm'
              }`}>
                {msg.sharedPost ? (
                  <div className="p-3 flex flex-col gap-1.5">
                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${isMe ? 'text-white/70' : 'text-graphite-muted'}`}>
                      Post compartilhado
                    </p>
                    {msg.sharedPost.imageUrl && (
                      <img
                        src={msg.sharedPost.imageUrl}
                        alt="Imagem do post"
                        className="w-full rounded-lg object-cover max-h-24"
                      />
                    )}
                    <p className={`text-[11px] font-semibold ${isMe ? 'text-white' : 'text-graphite'}`}>
                      {msg.sharedPost.author}
                    </p>
                    <p className={`text-xs leading-relaxed ${isMe ? 'text-white/90' : 'text-graphite-light'}`}>
                      {msg.sharedPost.excerpt}
                    </p>
                    {msg.content && (
                      <p className={`text-xs pt-1.5 border-t ${isMe ? 'border-white/30 text-white/90' : 'border-sara-linen text-graphite-light'}`}>
                        {msg.content}
                      </p>
                    )}
                    <p className={`text-[10px] mt-0.5 ${isMe ? 'text-white/70' : 'text-graphite-muted'}`}>{msg.time}</p>
                  </div>
                ) : (
                  <div className="px-4 py-2.5">
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className={`text-[10px] mt-0.5 ${isMe ? 'text-white/70' : 'text-graphite-muted'}`}>{msg.time}</p>
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
