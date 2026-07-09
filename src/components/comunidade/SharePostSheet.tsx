import { useState } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { CommunityPost } from '../../types';

interface SharePostSheetProps {
  post: CommunityPost;
  onClose: () => void;
}

export function SharePostSheet({ post, onClose }: SharePostSheetProps) {
  const chats = useAppStore((s) => s.chats);
  const shareToChat = useAppStore((s) => s.shareToChat);
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [shareComment, setShareComment] = useState('');

  function toggleChat(chatId: string) {
    setSelectedChatIds((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
    );
  }

  function handleSend() {
    selectedChatIds.forEach((chatId) => {
      shareToChat(chatId, shareComment.trim(), {
        id: post.id,
        author: post.author,
        excerpt: post.content.slice(0, 80),
      });
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end z-30"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Enviar post para conversa"
        className="w-full bg-white rounded-t-3xl px-4 pt-4 pb-10 max-w-[390px] mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-graphite">Enviar para</p>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <X size={14} className="text-graphite" />
          </button>
        </div>

        <textarea
          value={shareComment}
          onChange={(e) => setShareComment(e.target.value)}
          placeholder="Adicionar um comentário..."
          rows={2}
          className="w-full px-3 py-2 rounded-xl border border-sara-linen text-sm text-graphite placeholder:text-graphite-muted resize-none focus:outline-none focus:border-sara-gold mb-3"
        />

        <ul className="flex flex-col gap-1 mb-4">
          {chats.map((chat) => {
            const selected = selectedChatIds.includes(chat.id);
            return (
              <li key={chat.id}>
                <button
                  onClick={() => toggleChat(chat.id)}
                  aria-pressed={selected}
                  className={`w-full flex items-center gap-3 px-2 py-3 rounded-xl transition-colors ${
                    selected ? 'bg-sara-linen' : 'active:bg-sara-linen'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                    {chat.with.charAt(0)}
                  </div>
                  <p className="flex-1 text-sm font-medium text-graphite text-left">{chat.with}</p>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    selected ? 'bg-sara-gold border-sara-gold' : 'border-sara-linen'
                  }`}>
                    {selected && <span className="text-white text-[10px] font-bold">✓</span>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <button
          data-testid="share-send-btn"
          onClick={handleSend}
          disabled={selectedChatIds.length === 0}
          className="w-full py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
