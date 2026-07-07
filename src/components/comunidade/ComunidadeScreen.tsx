import { useState } from 'react';
import { MessageCircle, Heart, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
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

function PostCard({ post, onOpen }: { post: CommunityPost; onOpen: () => void }) {
  const [liked, setLiked] = useState(false);
  const badge = post.badge ? BADGE_CONFIG[post.badge] : null;

  return (
    <div
      data-testid="post-card"
      data-category={post.category}
      className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-3"
    >
      <button onClick={onOpen} aria-label={`Ver post de ${post.author}`} className="text-left flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-graphite">{post.author}</p>
            {badge && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full w-fit ${badge.color}`}>
                {badge.label}
              </span>
            )}
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
          onClick={() => setLiked((v) => !v)}
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
      </div>
    </div>
  );
}

export function ComunidadeScreen() {
  const communityPosts = useAppStore((s) => s.communityPosts);
  const followedCommunityIds = useAppStore((s) => s.followedCommunityIds);
  const [topTab, setTopTab] = useState<TopTab>('para-voce');
  const [activeCategory, setActiveCategory] = useState<Category>('todos');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

  if (selectedPost) {
    return <PostDetailScreen post={selectedPost} onBack={() => setSelectedPost(null)} />;
  }

  if (showCreate) {
    return <CreatePostScreen onBack={() => setShowCreate(false)} />;
  }

  const prioritized = [
    ...communityPosts.filter((p) => p.communityId && followedCommunityIds.includes(p.communityId)),
    ...communityPosts.filter((p) => !p.communityId || !followedCommunityIds.includes(p.communityId)),
  ];

  const filtered = activeCategory === 'todos'
    ? prioritized
    : prioritized.filter((p) => p.category === activeCategory);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="px-4 pt-4">
        <h1 className="text-base font-semibold text-graphite">Comunidade</h1>
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
              <PostCard key={post.id} post={post} onOpen={() => setSelectedPost(post)} />
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
  );
}
