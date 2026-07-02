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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat.messages.length]);

  function handleSend() {
    if (!text.trim()) return;
    sendMessage(chat.id, text.trim());
    setText('');
  }

  return (
    <div className="flex flex-col w-full h-full bg-offwhite overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-lavender-50">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <div className="w-8 h-8 rounded-full bg-lavender-200 flex items-center justify-center text-lavender-700 font-bold text-sm flex-shrink-0">
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
                <div className="w-7 h-7 rounded-full bg-lavender-200 flex items-center justify-center text-lavender-700 font-bold text-xs flex-shrink-0 mr-2 mt-1">
                  {msg.from.charAt(0)}
                </div>
              )}
              <div className={`max-w-[72%] px-4 py-2.5 rounded-2xl ${
                isMe
                  ? 'bg-lavender-600 text-white rounded-br-sm'
                  : 'bg-white text-graphite shadow-sm rounded-bl-sm'
              }`}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className={`text-[10px] mt-0.5 ${isMe ? 'text-lavender-200' : 'text-graphite-muted'}`}>
                  {msg.time}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0 bg-offwhite">
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-gray-200 px-3 py-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escreva uma mensagem..."
            className="flex-1 bg-transparent text-sm text-graphite placeholder:text-graphite-muted outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="w-8 h-8 rounded-full bg-lavender-600 flex items-center justify-center disabled:opacity-40 transition-opacity active:scale-95"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
