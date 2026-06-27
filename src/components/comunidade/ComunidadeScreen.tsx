import { useState } from 'react';
import { MessageCircle, Heart } from 'lucide-react';

type Category = 'todos' | 'gestação' | 'pós-parto' | 'amamentação' | 'saúde mental';

interface Post {
  id: string;
  category: Exclude<Category, 'todos'>;
  author: string;
  badge?: 'experiente' | 'profissional';
  content: string;
  likes: number;
  replies: number;
  time: string;
}

const SEED_POSTS: Post[] = [
  {
    id: '1', category: 'gestação', author: 'Fernanda S.', badge: 'experiente',
    content: 'Dicas para aliviar o enjoo do primeiro trimestre: gengibre em cápsulas ajudou muito!',
    likes: 24, replies: 8, time: '2h',
  },
  {
    id: '2', category: 'amamentação', author: 'Dra. Carla Lima', badge: 'profissional',
    content: 'Posição correta para amamentar: costas apoiadas, bebê de frente para o peito, barriga com barriga.',
    likes: 67, replies: 12, time: '4h',
  },
  {
    id: '3', category: 'saúde mental', author: 'Juliana M.',
    content: 'Alguém mais sentiu que a solidão do puerpério é diferente de tudo? Precisava desabafar.',
    likes: 89, replies: 31, time: '5h',
  },
  {
    id: '4', category: 'pós-parto', author: 'Renata P.', badge: 'experiente',
    content: 'Cinta pós-cesárea: comecei a usar no hospital e fez diferença na recuperação.',
    likes: 45, replies: 9, time: '8h',
  },
  {
    id: '5', category: 'amamentação', author: 'Priscila T.',
    content: 'Meu bebê estava com dificuldade de pegar o bico. A fonoaudióloga resolveu em 2 sessões!',
    likes: 33, replies: 14, time: '10h',
  },
];

const BADGE_CONFIG = {
  experiente:   { label: 'Mãe Experiente',       color: 'bg-blush-100 text-blush-500' },
  profissional: { label: 'Profissional de Saúde', color: 'bg-sage-100 text-sage-600' },
} as const;

const CATEGORIES: Category[] = ['todos', 'gestação', 'pós-parto', 'amamentação', 'saúde mental'];

function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false);
  const badge = post.badge ? BADGE_CONFIG[post.badge] : null;

  return (
    <div
      data-testid="post-card"
      data-category={post.category}
      className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-3"
    >
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
  const [activeCategory, setActiveCategory] = useState<Category>('todos');

  const filtered = activeCategory === 'todos'
    ? SEED_POSTS
    : SEED_POSTS.filter((p) => p.category === activeCategory);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="px-4 pt-4 flex items-center justify-between">
        <h1 className="text-base font-semibold text-graphite">Comunidade</h1>
        <button
          aria-label="Desabafar"
          className="px-3 py-1.5 rounded-xl bg-lavender-600 text-white text-xs font-semibold"
        >
          Desabafar 💜
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4">
        {CATEGORIES.map((cat) => {
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
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
