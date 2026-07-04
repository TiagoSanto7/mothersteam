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
  const [sharedTo, setSharedTo] = useState<string | null>(null);

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

  function handleShare(chatId: string, chatWith: string) {
    shareToChat(chatId, `📌 ${currentPost.author}: "${currentPost.content.slice(0, 80)}${currentPost.content.length > 80 ? '…' : ''}"`);
    setSharedTo(chatWith);
    setTimeout(() => {
      setShowShareSheet(false);
      setSharedTo(null);
    }, 1500);
  }

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden relative">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-sara-linen/60 flex-shrink-0">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
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

      {/* Share sheet */}
      {showShareSheet && (
        <div
          className="absolute inset-0 bg-black/40 flex items-end z-10"
          onClick={() => setShowShareSheet(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl px-4 pt-4 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-graphite">Enviar para</p>
              <button
                onClick={() => setShowShareSheet(false)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X size={14} className="text-graphite" />
              </button>
            </div>
            {sharedTo ? (
              <div className="text-center py-6">
                <p className="text-sm text-sara-warm font-semibold">Enviado para {sharedTo} ✓</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-1">
                {chats.map((chat) => (
                  <li key={chat.id}>
                    <button
                      onClick={() => handleShare(chat.id, chat.with)}
                      className="w-full flex items-center gap-3 px-2 py-3 rounded-xl active:bg-sara-linen transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-base">
                        {chat.with.charAt(0)}
                      </div>
                      <p className="text-sm font-medium text-graphite">{chat.with}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
