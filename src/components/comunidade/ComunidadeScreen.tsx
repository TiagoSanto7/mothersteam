import { useState } from 'react';
import { MessageCircle, Heart, Plus, Repeat2, Share2, X, MessageSquare, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { CreatePostScreen } from './CreatePostScreen';
import { PostDetailScreen } from '../post/PostDetailScreen';
import { ComunidadesScreen } from './ComunidadesScreen';
import { ComposerBar } from './ComposerBar';
import type { CommunityPost } from '../../types';

type TopTab = 'para-voce' | 'comunidades';
type Category = 'todos' | CommunityPost['category'];

const BADGE_CONFIG = {
  experiente:   { label: 'Mãe Experiente',       color: 'bg-sara-linen text-sara-terracotta' },
  profissional: { label: 'Profissional de Saúde', color: 'bg-sara-cream text-sara-warm' },
} as const;

const CATEGORY_LABELS: Category[] = ['todos', 'gestação', 'pós-parto', 'amamentação', 'saúde mental'];

function PostCard({
  post,
  onOpen,
  onRepost,
  onShare,
}: {
  post: CommunityPost;
  onOpen: () => void;
  onRepost: () => void;
  onShare: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const badge = post.badge ? BADGE_CONFIG[post.badge] : null;

  return (
    <div
      data-testid="post-card"
      data-category={post.category}
      className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-3"
    >
      <button onClick={onOpen} aria-label={`Ver post de ${post.author}`} className="text-left flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              data-testid="post-avatar"
              aria-hidden="true"
              className="w-9 h-9 rounded-full bg-sara-terracotta flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            >
              {post.author.charAt(0)}
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-graphite">{post.author}</p>
              {badge && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full w-fit ${badge.color}`}>
                  {badge.label}
                </span>
              )}
            </div>
          </div>
          <span className="text-xs text-graphite-muted flex-shrink-0">{post.time}</span>
        </div>
        <p className="text-sm text-graphite-light leading-relaxed">{post.content}</p>
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt="Imagem do post"
            className="w-full rounded-xl object-cover max-h-64 mt-2"
          />
        )}
      </button>

      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={(e) => { e.stopPropagation(); setLiked((v) => !v); }}
          aria-label={liked ? 'Descurtir' : 'Curtir'}
          aria-pressed={liked}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            liked ? 'text-sara-terracotta' : 'text-graphite-muted'
          }`}
        >
          <Heart size={14} fill={liked ? 'currentColor' : 'none'} strokeWidth={1.8} />
          {post.likes + (liked ? 1 : 0)}
        </button>
        <button
          onClick={onOpen}
          aria-label={`Ver ${post.replies} respostas`}
          className="flex items-center gap-1.5 text-xs text-graphite-muted"
        >
          <MessageCircle size={14} strokeWidth={1.8} />
          {post.replies}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!reposted) { onRepost(); setReposted(true); }
          }}
          aria-label={reposted ? 'Republicado' : 'Republicar'}
          aria-pressed={reposted}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            reposted ? 'text-sara-warm' : 'text-graphite-muted'
          }`}
        >
          <Repeat2 size={14} strokeWidth={1.8} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          aria-label="Enviar post"
          className="flex items-center gap-1.5 text-xs text-graphite-muted"
        >
          <Share2 size={14} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

interface ComunidadeScreenProps {
  onOpenChat?: () => void;
  onOpenNotifications?: () => void;
}

export function ComunidadeScreen({ onOpenChat, onOpenNotifications }: ComunidadeScreenProps) {
  const communityPosts = useAppStore((s) => s.communityPosts);
  const followedCommunityIds = useAppStore((s) => s.followedCommunityIds);
  const repost = useAppStore((s) => s.repost);
  const shareToChat = useAppStore((s) => s.shareToChat);
  const chats = useAppStore((s) => s.chats);
  const notifications = useAppStore((s) => s.notifications);
  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const unreadChats = chats.reduce((sum, c) => sum + c.unread, 0);

  const [topTab, setTopTab] = useState<TopTab>('para-voce');
  const [activeCategory, setActiveCategory] = useState<Category>('todos');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [sharingPost, setSharingPost] = useState<CommunityPost | null>(null);

  if (selectedPost) {
    return <PostDetailScreen post={selectedPost} onBack={() => setSelectedPost(null)} />;
  }

  const prioritized = [
    ...communityPosts.filter((p) => p.communityId && followedCommunityIds.includes(p.communityId)),
    ...communityPosts.filter((p) => !p.communityId || !followedCommunityIds.includes(p.communityId)),
  ];

  const filtered = activeCategory === 'todos'
    ? prioritized
    : prioritized.filter((p) => p.category === activeCategory);

  return (
    <>
      <div className="flex flex-col gap-4 pb-6">
        <div className="px-4 pt-4 flex items-center justify-between">
          <h1 className="text-base font-semibold text-graphite">Comunidade</h1>
          {(onOpenChat || onOpenNotifications) && (
            <div className="flex items-center gap-2">
              {onOpenChat && (
                <button
                  onClick={onOpenChat}
                  aria-label="Mensagens"
                  className="relative w-9 h-9 rounded-xl bg-white/70 backdrop-blur-sm border border-white/50 flex items-center justify-center"
                >
                  <MessageSquare size={18} className="text-graphite-light" strokeWidth={1.8} />
                  {unreadChats > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-sara-gold rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                      {unreadChats}
                    </span>
                  )}
                </button>
              )}
              {onOpenNotifications && (
                <button
                  onClick={onOpenNotifications}
                  aria-label="Notificações"
                  className="relative w-9 h-9 rounded-xl bg-white/70 backdrop-blur-sm border border-white/50 flex items-center justify-center"
                >
                  <Bell size={18} className="text-graphite-light" strokeWidth={1.8} />
                  {unreadNotifs > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-sara-terracotta rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                      {unreadNotifs}
                    </span>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-1 px-4 border-b border-sara-linen">
          {(['para-voce', 'comunidades'] as TopTab[]).map((tab) => {
            const label = tab === 'para-voce' ? 'Para Você' : 'Comunidades';
            const active = topTab === tab;
            return (
              <button
                key={tab}
                aria-pressed={active}
                onClick={() => {
                  setTopTab(tab);
                  setActiveCategory('todos');
                }}
                aria-label={label}
                className={`px-4 py-2 text-sm font-semibold transition-colors relative ${
                  active ? 'text-sara-gold' : 'text-graphite-muted'
                }`}
              >
                {label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sara-gold rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {topTab === 'para-voce' ? (
          <>
            <ComposerBar onOpen={() => setShowCreate(true)} />

            <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4">
              {CATEGORY_LABELS.map((cat) => {
                const label = cat === 'todos' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1);
                return (
                  <button
                    key={cat}
                    aria-pressed={activeCategory === cat}
                    onClick={() => setActiveCategory(cat)}
                    aria-label={label}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      activeCategory === cat
                        ? 'bg-sara-gold text-white'
                        : 'bg-white text-graphite-muted'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 px-4">
              {filtered.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onOpen={() => setSelectedPost(post)}
                  onRepost={() => repost(post)}
                  onShare={() => setSharingPost(post)}
                />
              ))}
            </div>

            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', duration: 0.3 }}
              onClick={() => setShowCreate(true)}
              className="fixed bottom-24 right-4 z-20 w-14 h-14 rounded-full bg-sara-gold text-white shadow-lg flex items-center justify-center"
              aria-label="Criar post"
            >
              <Plus size={24} />
            </motion.button>
          </>
        ) : (
          <ComunidadesScreen />
        )}
      </div>

      {sharingPost && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end z-30"
          onClick={() => setSharingPost(null)}
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
                onClick={() => setSharingPost(null)}
                aria-label="Fechar"
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X size={14} className="text-graphite" />
              </button>
            </div>
            <ul className="flex flex-col gap-1">
              {chats.map((chat) => (
                <li key={chat.id}>
                  <button
                    onClick={() => {
                      shareToChat(
                        chat.id,
                        `📌 ${sharingPost.author}: "${sharingPost.content.slice(0, 80)}${sharingPost.content.length > 80 ? '…' : ''}"`,
                      );
                      setSharingPost(null);
                    }}
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
          </div>
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <motion.div
            key="composer-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Nova publicação"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.1 }}
            className="fixed inset-0 z-50 bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] flex flex-col"
          >
            <CreatePostScreen onBack={() => setShowCreate(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
