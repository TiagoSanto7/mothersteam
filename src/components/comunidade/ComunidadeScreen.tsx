import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ArrowUp, Plus } from 'lucide-react';
import { SaraPullIndicator } from '../shared/SaraPullIndicator';
import { motion, AnimatePresence, useReducedMotion, useDragControls } from 'framer-motion';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
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

type FeedMode = 'foryou' | 'following';

function dedupeById<T extends { id: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

const FEED_MODES: { id: FeedMode; label: string }[] = [
  { id: 'foryou', label: 'Para você' },
  { id: 'following', label: 'Seguindo' },
];

// iOS-like spring: quick, settles without a visible bounce.
const THUMB_SPRING = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 } as const;

/**
 * "Para você | Seguindo": an iOS-style segmented control under the top tabs. Equal-width segments
 * and a single white thumb that slides between them; the feed gets a second mode without adding a
 * third top tab.
 */
function FeedModeSelector({ mode, onChange }: { mode: FeedMode; onChange: (mode: FeedMode) => void }) {
  return (
    <div className="flex justify-center px-4 -mb-1">
      <div
        role="radiogroup"
        aria-label="Tipo de feed"
        className="relative grid grid-cols-2 p-1 rounded-full bg-mt-linen/70"
      >
        {FEED_MODES.map((opt) => {
          const active = opt.id === mode;
          return (
            <motion.button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.id)}
              whileTap={{ scale: 0.96 }}
              transition={THUMB_SPRING}
              className="relative h-8 min-w-[104px] px-4 rounded-full text-[12px] font-semibold"
            >
              {active && (
                <motion.span
                  layoutId="feed-mode-thumb"
                  className="absolute inset-0 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.04)]"
                  transition={THUMB_SPRING}
                />
              )}
              <span className={`relative transition-colors duration-200 ${active ? 'text-mt-charcoal' : 'text-mt-muted'}`}>
                {opt.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// The feed list slides a little in the direction of the chosen segment while it fades, like
// switching pages in iOS: transform/opacity only, short enough to never feel like waiting.
const feedSlide = {
  enter: (dir: number) => ({ x: dir * 28, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -28, opacity: 0 }),
};

// How often the feed quietly checks for newer posts from others.
const NEW_POSTS_POLL_MS = 45_000;

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

  const [feedMode, setFeedMode] = useState<FeedMode>('foryou');
  const [feedDirection, setFeedDirection] = useState(0);
  const reduceMotion = useReducedMotion();
  const {
    data: postsPages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    // One cache per mode, so switching between "Para você" and "Seguindo" is instant after the
    // first load. Everything stays under ['posts'], so existing invalidations cover both.
    queryKey: ['posts', feedMode],
    queryFn: ({ pageParam }) =>
      apiFetch<{ items: ApiPost[]; hasMore: boolean; nextCursor?: string }>(
        `/posts?mode=${feedMode}&cursor=${encodeURIComponent(pageParam ?? '')}&limit=20`,
      ),
    initialPageParam: '',
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: isLoggedIn,
  });

  // A ranked page can overlap the next one if engagement changed in between: keep the first copy.
  const communityPosts = dedupeById(postsPages?.pages.flatMap((p) => p.items.map(apiPostToCommunityPost)) ?? []);

  const pendingPosts = usePendingPosts();
  const justPublished = useJustPublishedIds();
  const { retry, discard } = usePublishPost();
  const currentUserId = useAppStore((s) => s.currentUserId);

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
  const composerDragControls = useDragControls();

  function closeComposer() {
    setShowCreate(false);
    setShowCreateWithImage(false);
  }

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

  // Full-screen spinner only for the very first load; switching feed modes keeps the tab
  // (tabs, selector, composer) on screen and shows loading inside the list instead.
  const everLoaded = useRef(false);
  if (postsPages) everLoaded.current = true;
  const isFirstLoad = isLoading && !everLoaded.current;

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

  // "Novos posts ↑": check quietly for newer posts from others instead of shifting the feed
  // under her while she reads. Only while the feed itself is on screen.
  const newestLoaded = postsPages?.pages
    .flatMap((p) => p.items)
    .reduce<string | null>((max, i) => (max === null || i.createdAt > max ? i.createdAt : max), null);
  const { data: head } = useQuery({
    queryKey: ['posts-head', feedMode],
    queryFn: () =>
      apiFetch<{ items: { id: string; authorId: string; createdAt: string }[] }>(
        feedMode === 'following' ? '/posts?mode=following&limit=10' : '/posts?limit=10',
      ),
    enabled: isLoggedIn && !!newestLoaded && !hasOverlay && topTab === 'para-voce',
    refetchInterval: NEW_POSTS_POLL_MS,
    refetchIntervalInBackground: false,
  });
  const loadedIds = new Set(communityPosts.map((p) => p.id));
  const newPostsCount = newestLoaded && head
    ? head.items.filter((i) => i.authorId !== currentUserId && i.createdAt > newestLoaded && !loadedIds.has(i.id)).length
    : 0;
  function showNewPosts() {
    const scroller = scrollRef.current ? scrollParent(scrollRef.current) : null;
    scroller?.scrollTo({ top: 0, behavior: 'smooth' });
    void queryClient.invalidateQueries({ queryKey: ['posts', feedMode] });
  }

  function changeFeedMode(mode: FeedMode) {
    if (mode === feedMode) return;
    const order = FEED_MODES.map((m) => m.id);
    setFeedDirection(order.indexOf(mode) > order.indexOf(feedMode) ? 1 : -1);
    setFeedMode(mode);
    const scroller = scrollRef.current ? scrollParent(scrollRef.current) : null;
    if (scroller) scroller.scrollTop = 0;
  }

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
            <FeedModeSelector mode={feedMode} onChange={changeFeedMode} />

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

            <AnimatePresence>
              {newPostsCount > 0 && (
                <motion.div
                  key="new-posts"
                  className="sticky top-2 z-20 flex justify-center -mb-2 pointer-events-none"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                >
                  <button
                    type="button"
                    onClick={showNewPosts}
                    className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-mt-rose text-white text-[12px] font-semibold shadow-lg active:scale-95 transition-transform"
                  >
                    <ArrowUp size={14} strokeWidth={2.6} aria-hidden="true" />
                    {newPostsCount === 1 ? '1 novo post' : `${newPostsCount} novos posts`}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-3 px-4 overflow-x-clip">
              <AnimatePresence mode="popLayout" initial={false} custom={feedDirection}>
              <motion.div
                key={feedMode}
                custom={feedDirection}
                variants={reduceMotion ? undefined : feedSlide}
                initial={reduceMotion ? { opacity: 0 } : 'enter'}
                animate={reduceMotion ? { opacity: 1 } : 'center'}
                exit={reduceMotion ? { opacity: 0 } : 'exit'}
                transition={{ x: THUMB_SPRING, opacity: { duration: 0.18, ease: 'easeOut' } }}
                className="flex flex-col gap-3"
              >
              <AnimatePresence initial={false}>
                {pendingPosts.map((pending) => (
                  <PendingPostCard key={pending.tempId} pending={pending} onRetry={retry} onDiscard={discard} />
                ))}
              </AnimatePresence>
              {isLoading && everLoaded.current && (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 rounded-full border-2 border-mt-rose border-t-transparent animate-spin" />
                </div>
              )}
              {feedMode === 'following' && !isLoading && communityPosts.length === 0 && pendingPosts.length === 0 && (
                <div className="flex flex-col items-center text-center gap-2 py-12 px-6">
                  <p className="text-sm font-semibold text-mt-charcoal">Seu "Seguindo" ainda está vazio</p>
                  <p className="text-xs text-mt-muted">
                    Siga outras mães ou entre em comunidades para ver as publicações delas aqui.
                  </p>
                  <button
                    type="button"
                    onClick={() => changeFeedMode('foryou')}
                    className="mt-2 h-9 px-4 rounded-full bg-mt-rose text-white text-[12px] font-semibold shadow-sm active:scale-95 transition-transform"
                  >
                    Ver "Para você"
                  </button>
                </div>
              )}
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
              </motion.div>
              </AnimatePresence>
              {/* Outside the animated list: one sentinel for both modes keeps infinite scroll attached. */}
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
            onClick={closeComposer}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0.1 }}
              role="dialog"
              aria-modal="true"
              aria-label="Nova publicação"
              drag="y"
              dragControls={composerDragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 600) closeComposer();
              }}
              className="w-full max-w-[390px] mx-auto h-[90%] bg-mt-cream rounded-t-3xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Alça de arrastar — só ela inicia o drag (dragListener={false} acima),
                  pra não capturar gestos de scroll/seleção de texto dentro do formulário. */}
              <div
                onPointerDown={(e) => composerDragControls.start(e)}
                className="flex justify-center pt-2 pb-1 flex-shrink-0 touch-none cursor-grab active:cursor-grabbing"
                aria-hidden="true"
              >
                <div className="w-10 h-1.5 rounded-full bg-mt-linen" />
              </div>
              <CreatePostScreen
                  onBack={closeComposer}
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
