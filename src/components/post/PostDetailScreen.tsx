import { useState } from 'react';
import { ChevronLeft, Heart, MessageCircle, Share2, Repeat2, Send, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { CommunityPost } from '../../types';

const BADGE_CONFIG = {
  experiente:   { label: 'Mãe Experiente',       color: 'bg-sara-linen text-sara-terracotta' },
  profissional: { label: 'Profissional de Saúde', color: 'bg-sara-cream text-sara-warm' },
} as const;

interface PostDetailScreenProps {
  post: CommunityPost;
  onBack: () => void;
}

export function PostDetailScreen({ post, onBack }: PostDetailScreenProps) {
  const motherName = useAppStore((s) => s.motherName);
  const postComments = useAppStore((s) => s.postComments);
  const chats = useAppStore((s) => s.chats);
  const communityPosts = useAppStore((s) => s.communityPosts);
  const addComment = useAppStore((s) => s.addComment);
  const repost = useAppStore((s) => s.repost);
  const likePost = useAppStore((s) => s.likePost);
  const shareToChat = useAppStore((s) => s.shareToChat);

  const currentPost = communityPosts.find((p) => p.id === post.id) ?? post;

  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [shareComment, setShareComment] = useState('');

  const comments = postComments[post.id] ?? [];
  const badge = currentPost.badge ? BADGE_CONFIG[currentPost.badge] : null;

  function handleLike() {
    if (!liked) likePost(post.id);
    setLiked((v) => !v);
  }

  function handleRepost() {
    if (!reposted) {
      repost(currentPost);
      setReposted(true);
    }
  }

  function handleComment() {
    if (!commentText.trim()) return;
    addComment(post.id, commentText.trim());
    setCommentText('');
  }

  function handleSendShare() {
    selectedChatIds.forEach((chatId) => {
      shareToChat(
        chatId,
        shareComment.trim(),
        {
          id: currentPost.id,
          author: currentPost.author,
          excerpt: currentPost.content.slice(0, 80),
          imageUrl: currentPost.imageUrl,
        },
      );
    });
    setSelectedChatIds([]);
    setShareComment('');
    setShowShareSheet(false);
  }

  function toggleChatSelection(chatId: string) {
    setSelectedChatIds((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
    );
  }

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden relative">
      <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-sara-linen/60 flex-shrink-0">
        <button onClick={onBack} aria-label="Voltar" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <p className="text-sm font-semibold text-graphite">Publicação</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Post */}
        <div className="bg-white px-4 py-4 border-b border-sara-linen/60">
          {currentPost.isRepost && (
            <div className="flex items-center gap-1.5 mb-2">
              <Repeat2 size={12} className="text-graphite-muted" />
              <span className="text-[11px] text-graphite-muted">Republicado de {currentPost.repostFrom}</span>
            </div>
          )}

          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {currentPost.author.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-graphite">{currentPost.author}</p>
                {badge && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                    {badge.label}
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs text-graphite-muted flex-shrink-0">{currentPost.time}</span>
          </div>

          <p className="text-sm text-graphite leading-relaxed mb-4">{currentPost.content}</p>

          {currentPost.imageUrl && (
            <img
              src={currentPost.imageUrl}
              alt="Imagem do post"
              className="w-full rounded-xl object-cover max-h-64 mb-4"
            />
          )}

          <div className="flex items-center gap-6 pt-3 border-t border-sara-linen/60">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-xs transition-colors ${liked ? 'text-sara-terracotta' : 'text-graphite-muted'}`}
            >
              <Heart size={16} fill={liked ? 'currentColor' : 'none'} strokeWidth={1.8} />
              <span>{currentPost.likes + (liked ? 1 : 0)}</span>
            </button>
            <button className="flex items-center gap-1.5 text-xs text-graphite-muted">
              <MessageCircle size={16} strokeWidth={1.8} />
              <span>{currentPost.replies + comments.length}</span>
            </button>
            <button
              onClick={handleRepost}
              className={`flex items-center gap-1.5 text-xs transition-colors ${reposted ? 'text-sara-warm' : 'text-graphite-muted'}`}
            >
              <Repeat2 size={16} strokeWidth={1.8} />
              <span>{reposted ? 'Republicado' : 'Republicar'}</span>
            </button>
            <button
              onClick={() => setShowShareSheet(true)}
              className="flex items-center gap-1.5 text-xs text-graphite-muted active:text-sara-gold transition-colors"
            >
              <Share2 size={16} strokeWidth={1.8} />
              <span>Enviar</span>
            </button>
          </div>
        </div>

        {/* Comments */}
        <div className="px-4 py-4 flex flex-col gap-3">
          {comments.length === 0 && (
            <p className="text-xs text-graphite-muted text-center py-6">Seja a primeira a comentar</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                {c.author.charAt(0)}
              </div>
              <div className="flex-1 bg-white rounded-2xl px-3 py-2.5 shadow-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-semibold text-graphite">{c.author}</p>
                  <span className="text-[10px] text-graphite-muted">{c.time}</span>
                </div>
                <p className="text-xs text-graphite leading-relaxed mt-0.5">{c.content}</p>
                <button className="flex items-center gap-1 mt-2 text-graphite-muted">
                  <Heart size={10} />
                  <span className="text-[10px]">{c.likes}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comment input */}
      <div className="px-4 py-3 border-t border-sara-linen/60 flex-shrink-0 bg-sara-linen/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {motherName.charAt(0)}
          </div>
          <div className="flex-1 flex items-center gap-2 bg-white rounded-2xl border border-sara-linen px-3 py-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              placeholder="Adicionar comentário..."
              className="flex-1 bg-transparent text-sm text-graphite placeholder:text-sara-muted outline-none"
            />
            <button
              onClick={handleComment}
              disabled={!commentText.trim()}
              className="w-7 h-7 rounded-full bg-sara-gold flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
            >
              <Send size={12} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      </div>

      {/* Share sheet */}
      {showShareSheet && (
        <div
          className="absolute inset-0 bg-black/40 flex items-end z-10"
          onClick={() => { setShowShareSheet(false); setSelectedChatIds([]); setShareComment(''); }}
        >
          <div
            className="w-full bg-white rounded-t-3xl px-4 pt-4 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-graphite">Enviar para</p>
              <button
                aria-label="Fechar"
                onClick={() => { setShowShareSheet(false); setSelectedChatIds([]); setShareComment(''); }}
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
                      onClick={() => toggleChatSelection(chat.id)}
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
              onClick={handleSendShare}
              disabled={selectedChatIds.length === 0}
              className="w-full py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
