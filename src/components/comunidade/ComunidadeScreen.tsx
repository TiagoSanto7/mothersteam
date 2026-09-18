import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Plus } from 'lucide-react';
import { SaraPullIndicator } from '../shared/SaraPullIndicator';
import { motion, AnimatePresence } from 'framer-motion';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { usePullToRefresh } from '../../lib/usePullToRefresh';
import { useAppStore } from '../../store/useAppStore';
import { apiFetch } from '../../lib/api';
import { PREFETCH_MARGIN, scrollParent, useIntersection } from '../../lib/useIntersection';
import type { ApiPost } from '../../lib/types';
import { apiPostToCommunityPost } from '../../lib/helpers';
import { CreatePostScreen } from './CreatePostScreen';
import { PostDetailScreen } from '../post/PostDetailScreen';
import { ComunidadesScreen } from './ComunidadesScreen';
import { CommunityDetailScreen } from './CommunityDetailScreen';
import { CreateCommunityScreen } from './CreateCommunityScreen';
import { ComposerBar } from './ComposerBar';
import { PostCard } from './PostCard';
import { JustPublishedHighlight, PendingPostCard, PublishNotice } from './PendingPostCard';
import { useJustPublishedIds, usePendingPosts, usePublishPost } from './publishing';
import { ProfileScreen } from '../profile/ProfileScreen';
import type { CommunityPost } from '../../types';

type TopTab = 'para-voce' | 'comunidades';
type Category = 'todos' | CommunityPost['category'];

type Screen =
  | { type: 'post'; post: CommunityPost }
  | { type: 'profile'; userId: string }
  | { type: 'community'; id: string }
  | { type: 'createCommunity' };

// Deep chains (profile → profile → …) keep only the most recent levels mounted.
const MAX_STACK = 8;

function screenKey(screen: Screen, index: number): string {
  const id = screen.type === 'post' ? screen.post.id : screen.type === 'profile' ? screen.userId : screen.type === 'community' ? screen.id : '';
  return `${index}-${screen.type}-${id}`;
}

const CATEGORY_LABELS: Category[] = ['todos', 'gestação', 'pós-parto', 'amamentação', 'saúde mental'];

export function ComunidadeScreen() {
  const isLoggedIn       = useAppStore((s) => s.isLoggedIn);
  const tabRefreshTick   = useAppStore((s) => s.tabRefreshTick);
  const pendingQuickAction = useAppStore((s) => s.pendingQuickAction);
  const consumeQuickAction = useAppStore((s) => s.consumeQuickAction);

  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sentinelRef, isAtBottom] = useIntersection(PREFETCH_MARGIN);
  const { isPulling, pullY, isLoading: isPullLoading } = usePullToRefresh(scrollRef, async () => {
    await queryClient.invalidateQueries({ queryKey: ['posts'] });
  });

  const {
    data: postsPages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam }) =>
      apiFetch<{ items: ApiPost[]; hasMore: boolean; nextCursor?: string }>(
        `/posts?cursor=${encodeURIComponent(pageParam ?? '')}&limit=20`,
      ),
    initialPageParam: '',
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: isLoggedIn,
  });

  const communityPosts = postsPages?.pages.flatMap((p) => p.items.map(apiPostToCommunityPost)) ?? [];

  const pendingPosts = usePendingPosts();
  const justPublished = useJustPublishedIds();
  const { retry, discard } = usePublishPost();

  useEffect(() => {
    if (isAtBottom && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isAtBottom, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (tabRefreshTick === 0) return;
    const { activeTab } = useAppStore.getState();
    if (activeTab !== 'comunidade') return;
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabRefreshTick]);

  const [topTab, setTopTab] = useState<TopTab>('para-voce');
  const [activeCategory, setActiveCategory] = useState<Category>('todos');
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateWithImage, setShowCreateWithImage] = useState(false);

  // Bridge from MtQuickActionSheet: when M-CTA's "Novo post" fires, open the composer here.
  useEffect(() => {
    if (pendingQuickAction !== 'newPost') return;
    setTopTab('para-voce');
    setShowCreate(true);
    consumeQuickAction();
  }, [pendingQuickAction, consumeQuickAction]);
  // Stack navigation (like Instagram): each sub-screen is pushed on top of the previous one and
  // "back" pops one level. Every level stays mounted underneath, so returning keeps its state
  // (tab, sub-filter, loaded pages, typed comment) and its own scroll position.
  const [stack, setStack] = useState<Screen[]>([]);
  const push = (screen: Screen) => setStack((st) => [...st, screen].slice(-MAX_STACK));
  const pop = () => setStack((st) => st.slice(0, -1));

  const renderScreen = (screen: Screen) => {
    switch (screen.type) {
      case 'createCommunity':
        return (
          <CreateCommunityScreen
            onBack={pop}
            onCreated={(id) => setStack((st) => [...st.slice(0, -1), { type: 'community', id }])}
          />
        );
      case 'community':
        return (
          <CommunityDetailScreen
            communityId={screen.id}
            onBack={pop}
            onOpenProfile={(id) => push({ type: 'profile', userId: id })}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            userId={screen.userId}
            onClose={pop}
            onOpenProfile={(id) => push({ type: 'profile', userId: id })}
            onMessage={(uid) => { setStack([]); useAppStore.getState().openChatWith(uid); }}
          />
        );
      case 'post':
        return (
          <PostDetailScreen
            post={screen.post}
            onBack={pop}
            onOpenProfile={(userId) => push({ type: 'profile', userId })}
          />
        );
    }
  };
  const depth = stack.length;
  const hasOverlay = depth > 0;

  // The tab scrolls in one shared container. Track its offset for the visible level, save it
  // when a screen is pushed on top, and restore it when that level becomes visible again.
  const liveScrollTop = useRef(0);
  const savedScrollTops = useRef<number[]>([]);
  const prevDepth = useRef(0);
  useEffect(() => {
    const scroller = scrollRef.current ? scrollParent(scrollRef.current) : null;
    if (!scroller) return;
    const onScroll = () => { liveScrollTop.current = scroller.scrollTop; };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);
  useLayoutEffect(() => {
    const scroller = scrollRef.current ? scrollParent(scrollRef.current) : null;
    const from = prevDepth.current;
    prevDepth.current = depth;
    if (!scroller || from === depth) return;
    if (depth > from) {
      savedScrollTops.current[from] = liveScrollTop.current;
      scroller.scrollTop = 0;
    } else {
      scroller.scrollTop = savedScrollTops.current[depth] ?? 0;
    }
    liveScrollTop.current = scroller.scrollTop;
  }, [depth]);

  const isFirstLoad = isLoading && communityPosts.length === 0;

  // A freshly published post appears at the top: bring the feed up to it.
  const pendingCount = pendingPosts.length;
  const prevPendingCount = useRef(pendingCount);
  useEffect(() => {
    const grew = pendingCount > prevPendingCount.current;
    prevPendingCount.current = pendingCount;
    if (!grew || hasOverlay) return;
    const scroller = scrollRef.current ? scrollParent(scrollRef.current) : null;
    scroller?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pendingCount, hasOverlay]);


  const filtered = activeCategory === 'todos'
    ? communityPosts
    : communityPosts.filter((p) => p.category === activeCategory);

  return (
    <>
      <PublishNotice />
      {stack.map((screen, i) => (
        // hidden (not just a CSS class) also removes lower levels from the accessibility tree.
        <div key={screenKey(screen, i)} hidden={i !== depth - 1} className={i === depth - 1 ? 'contents' : undefined}>
          {renderScreen(screen)}
        </div>
      ))}
      {isFirstLoad && !hasOverlay && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-mt-rose border-t-transparent animate-spin" />
        </div>
      )}
      <div hidden={hasOverlay || isFirstLoad} className={hasOverlay || isFirstLoad ? undefined : 'contents'}>
      <div ref={scrollRef} className="flex flex-col gap-4 pb-6">
        {(isPulling || isPullLoading) && (
          <SaraPullIndicator pullY={pullY} isLoading={isPullLoading} />
        )}
        <div className="flex gap-1 px-4 border-b border-mt-linen">
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
                  active ? 'text-mt-rose' : 'text-mt-muted'
                }`}
              >
                {label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-mt-rose rounded-full" />
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
                        ? 'bg-mt-rose text-white'
                        : 'bg-white text-mt-muted'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 px-4">
              <AnimatePresence initial={false}>
                {pendingPosts.map((pending) => (
                  <PendingPostCard key={pending.tempId} pending={pending} onRetry={retry} onDiscard={discard} />
                ))}
              </AnimatePresence>
              {filtered.map((post) => (
                <JustPublishedHighlight key={post.id} active={justPublished.includes(post.id)}>
                <PostCard
                  post={post}
                  onOpen={() => push({ type: 'post', post })}
                  onOpenProfile={() => post.authorId && push({ type: 'profile', userId: post.authorId })}
                  onOpenUser={(id) => push({ type: 'profile', userId: id })}
                  onOpenCommunity={(id) => push({ type: 'community', id })}
                />
                </JustPublishedHighlight>
              ))}
              <div ref={sentinelRef} className="h-4" />
              {isFetchingNextPage && (
                <p className="text-center text-xs text-mt-muted py-2">Carregando...</p>
              )}
            </div>

            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', duration: 0.3 }}
              onClick={() => setShowCreate(true)}
              className="fixed bottom-24 right-4 z-20 w-14 h-14 rounded-full bg-mt-rose text-white shadow-lg flex items-center justify-center"
              aria-label="Criar post"
            >
              <Plus size={24} />
            </motion.button>
          </>
        ) : (
          <ComunidadesScreen
            onOpenCommunity={(id) => push({ type: 'community', id })}
            onCreate={() => push({ type: 'createCommunity' })}
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
              className="w-full max-w-[390px] mx-auto h-[90%] bg-mt-cream rounded-t-3xl flex flex-col overflow-hidden"
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
      </div>
    </>
  );
}
