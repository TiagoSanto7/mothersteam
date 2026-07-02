import { useState } from 'react';
import { MessageCircle, Heart } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { CreatePostScreen } from './CreatePostScreen';
import { PostDetailScreen } from '../post/PostDetailScreen';
import type { CommunityPost } from '../../types';

type Category = 'todos' | CommunityPost['category'];

const BADGE_CONFIG = {
  experiente:   { label: 'Mãe Experiente',       color: 'bg-blush-100 text-blush-500' },
  profissional: { label: 'Profissional de Saúde', color: 'bg-sage-100 text-sage-600' },
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
      <button onClick={onOpen} className="text-left flex flex-col gap-2">
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
      </button>

      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={() => setLiked((v) => !v)}
          aria-label={liked ? 'Descurtir' : 'Curtir'}
          aria-pressed={liked}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            liked ? 'text-blush-500' : 'text-graphite-muted'
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
  const [activeCategory, setActiveCategory] = useState<Category>('todos');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

  if (selectedPost) {
    return <PostDetailScreen post={selectedPost} onBack={() => setSelectedPost(null)} />;
  }

  if (showCreate) {
    return <CreatePostScreen onBack={() => setShowCreate(false)} />;
  }

  const filtered = activeCategory === 'todos'
    ? communityPosts
    : communityPosts.filter((p) => p.category === activeCategory);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="px-4 pt-4 flex items-center justify-between">
        <h1 className="text-base font-semibold text-graphite">Comunidade</h1>
        <button
          onClick={() => setShowCreate(true)}
          aria-label="Desabafar"
          className="px-3 py-1.5 rounded-xl bg-lavender-600 text-white text-xs font-semibold active:scale-95 transition-transform"
        >
          Desabafar 💜
        </button>
      </div>

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
                  ? 'bg-lavender-600 text-white'
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
    </div>
  );
}
