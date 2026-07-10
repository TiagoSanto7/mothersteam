import { useState } from 'react';
import { MessageCircle, Heart, Plus, Repeat2, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { apiFetch } from '../../lib/api';
import type { PaginatedResult, ApiPost } from '../../lib/types';
import { apiPostToCommunityPost } from '../../lib/helpers';
import { CreatePostScreen } from './CreatePostScreen';
import { PostDetailScreen } from '../post/PostDetailScreen';
import { ComunidadesScreen } from './ComunidadesScreen';
import { ComposerBar } from './ComposerBar';
import { SharePostSheet } from './SharePostSheet';
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

  const likeMutation = useMutation({
    mutationFn: (isLiked: boolean) =>
      apiFetch(`/posts/${post.id}/like`, { method: isLiked ? 'POST' : 'DELETE' }),
  });

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
              className="w-10 h-10 rounded-full bg-sara-terracotta flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
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
          onClick={(e) => {
            e.stopPropagation();
            const next = !liked;
            setLiked(next);
            likeMutation.mutate(next);
          }}
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

export function ComunidadeScreen() {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const followedCommunityIds = useAppStore((s) => s.followedCommunityIds);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => apiFetch<PaginatedResult<ApiPost>>('/posts'),
    enabled: isLoggedIn,
  });

  const repostMutation = useMutation({
    mutationFn: (postId: string) =>
      apiFetch(`/posts/${postId}/repost`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });

  const communityPosts = (data?.items ?? []).map(apiPostToCommunityPost);

  const [topTab, setTopTab] = useState<TopTab>('para-voce');
  const [activeCategory, setActiveCategory] = useState<Category>('todos');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [sharingPost, setSharingPost] = useState<CommunityPost | null>(null);

  if (selectedPost) {
    return <PostDetailScreen post={selectedPost} onBack={() => setSelectedPost(null)} />;
  }

  if (isLoading && communityPosts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-sara-gold border-t-transparent animate-spin" />
      </div>
    );
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
                  onRepost={() => repostMutation.mutate(post.id)}
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
        <SharePostSheet post={sharingPost} onClose={() => setSharingPost(null)} />
      )}

      <AnimatePresence>
        {showCreate && (
          <motion.div
            key="composer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-end"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0.1 }}
              role="dialog"
              aria-modal="true"
              aria-label="Nova publicação"
              className="w-full max-w-[390px] mx-auto h-[90%] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] rounded-t-3xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <CreatePostScreen onBack={() => setShowCreate(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
