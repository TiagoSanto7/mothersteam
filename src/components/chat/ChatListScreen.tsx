import { useState } from 'react';
import { ChevronLeft, Search, Edit } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ChatScreen } from './ChatScreen';
import type { Chat } from '../../types';

interface ChatListScreenProps {
  onBack: () => void;
}

export function ChatListScreen({ onBack }: ChatListScreenProps) {
  const chats = useAppStore((s) => s.chats);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

  if (selectedChat) {
    return (
      <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-offwhite sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
        <ChatScreen chat={selectedChat} onBack={() => setSelectedChat(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-offwhite sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-lavender-50">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <p className="text-sm font-semibold text-graphite">Mensagens</p>
        <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-lavender-50">
          <Edit size={16} className="text-graphite" />
        </button>
      </div>

      <div className="px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
          <Search size={14} className="text-graphite-muted flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar conversa..."
            className="flex-1 bg-transparent text-sm text-graphite placeholder:text-graphite-muted outline-none"
            readOnly
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-graphite-muted">
            <p className="text-sm">Nenhuma conversa ainda</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {chats.map((chat) => (
              <li key={chat.id}>
                <button
                  onClick={() => setSelectedChat(chat)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-lavender-50 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-lavender-200 flex items-center justify-center text-lavender-700 font-bold text-lg flex-shrink-0">
                    {chat.with.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`text-sm truncate ${chat.unread > 0 ? 'font-semibold text-graphite' : 'font-medium text-graphite'}`}>
                        {chat.with}
                      </p>
                      <span className="text-[10px] text-graphite-muted flex-shrink-0">{chat.time}</span>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${chat.unread > 0 ? 'text-graphite font-medium' : 'text-graphite-muted'}`}>
                      {chat.lastMessage}
                    </p>
                  </div>
                  {chat.unread > 0 && (
                    <div className="w-5 h-5 rounded-full bg-lavender-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-white">{chat.unread}</span>
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
