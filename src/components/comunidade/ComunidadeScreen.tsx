import { useState } from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { apiFetch } from '../../lib/api';
import type { PaginatedResult, ApiPost } from '../../lib/types';
import { apiPostToCommunityPost } from '../../lib/helpers';
import { CreatePostScreen } from './CreatePostScreen';
import { PostDetailScreen } from '../post/PostDetailScreen';
import { ComunidadesScreen } from './ComunidadesScreen';
import { CommunityDetailScreen } from './CommunityDetailScreen';
import { CreateCommunityScreen } from './CreateCommunityScreen';
import { ComposerBar } from './ComposerBar';
import { PostCard } from './PostCard';
import { UserProfileScreen } from '../profile/UserProfileScreen';
import type { CommunityPost } from '../../types';

type TopTab = 'para-voce' | 'comunidades';
type Category = 'todos' | CommunityPost['category'];

const CATEGORY_LABELS: Category[] = ['todos', 'gestação', 'pós-parto', 'amamentação', 'saúde mental'];

export function ComunidadeScreen() {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);

  const { data, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => apiFetch<PaginatedResult<ApiPost>>('/posts'),
    enabled: isLoggedIn,
  });

  const communityPosts = (data?.items ?? []).map(apiPostToCommunityPost);

  const [topTab, setTopTab] = useState<TopTab>('para-voce');
  const [activeCategory, setActiveCategory] = useState<Category>('todos');
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateWithImage, setShowCreateWithImage] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [openCommunityId, setOpenCommunityId] = useState<string | null>(null);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);

  if (showCreateCommunity) {
    return (
      <CreateCommunityScreen
        onBack={() => setShowCreateCommunity(false)}
        onCreated={(id) => { setShowCreateCommunity(false); setOpenCommunityId(id); }}
      />
    );
  }

  if (openCommunityId) {
    return (
      <CommunityDetailScreen
        communityId={openCommunityId}
        onBack={() => setOpenCommunityId(null)}
        onOpenProfile={(id) => { setOpenCommunityId(null); setProfileUserId(id); }}
      />
    );
  }

  if (profileUserId) {
    return (
      <UserProfileScreen
        userId={profileUserId}
        onBack={() => setProfileUserId(null)}
        onOpenProfile={(id) => setProfileUserId(id)}
      />
    );
  }

  if (selectedPost) {
    return (
      <PostDetailScreen
        post={selectedPost}
        onBack={() => setSelectedPost(null)}
        onOpenProfile={(userId) => { setSelectedPost(null); setProfileUserId(userId); }}
      />
    );
  }

  if (isLoading && communityPosts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-sara-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  const filtered = activeCategory === 'todos'
    ? communityPosts
    : communityPosts.filter((p) => p.category === activeCategory);

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
            <ComposerBar
              onOpen={() => setShowCreate(true)}
              onOpenWithImage={() => { setShowCreateWithImage(true); setShowCreate(true); }}
            />

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
                  onOpenProfile={() => post.authorId && setProfileUserId(post.authorId)}
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
          <ComunidadesScreen
            onOpenCommunity={setOpenCommunityId}
            onCreate={() => setShowCreateCommunity(true)}
          />
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            key="composer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-end"
            onClick={() => { setShowCreate(false); setShowCreateWithImage(false); }}
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
              <CreatePostScreen
                  onBack={() => { setShowCreate(false); setShowCreateWithImage(false); }}
                  autoOpenImage={showCreateWithImage}
                />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
