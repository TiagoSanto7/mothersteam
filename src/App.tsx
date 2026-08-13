import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { Bell, MessageSquare, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from './store/useAppStore';
import type { TabId } from './types';
import type { ApiNotification, ApiChat, ApiPost } from './lib/types';
import { apiFetch } from './lib/api';
import type { ApiUser } from './lib/types';
import { apiPostToCommunityPost } from './lib/helpers';
import { MobileShell } from './components/layout/MobileShell';
import { WebLayout } from './components/layout/WebLayout';
import { DashboardScreen } from './components/home/DashboardScreen';
import { JornadaScreen } from './components/jornada/JornadaScreen';
import { MaeIAScreen } from './components/maeIA/MaeIAScreen';
import { ComunidadeScreen } from './components/comunidade/ComunidadeScreen';
import { ShoppingScreen } from './components/shopping/ShoppingScreen';
import { ProductDetailScreen } from './components/shopping/ProductDetailScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { ReceptionFlow } from './components/reception/ReceptionFlow';
import { ProfileScreen } from './components/profile/ProfileScreen';
import { SettingsScreen } from './components/profile/SettingsScreen';
import { NotificationsScreen } from './components/notifications/NotificationsScreen';
import { ChatListScreen } from './components/chat/ChatListScreen';
import { SearchScreen } from './components/search/SearchScreen';
import { CommunityDetailScreen } from './components/comunidade/CommunityDetailScreen';
import { PostDetailScreen } from './components/post/PostDetailScreen';
import { SocialOnboardingScreen } from './components/onboarding/SocialOnboardingScreen'
import { SavedVersesScreen } from './components/home/SavedVersesScreen'
import { ReviewsScreen } from './components/shopping/ReviewsScreen'
import { CreatePostScreen } from './components/comunidade/CreatePostScreen'
import { useSSE } from './lib/useSSE';

export default function App() {
  const isLoggedIn           = useAppStore((s) => s.isLoggedIn);
  const onboardingDone       = useAppStore((s) => s.onboardingDone);
  const socialOnboardingDone = useAppStore((s) => s.socialOnboardingDone);
  const activeTab      = useAppStore((s) => s.activeTab);
  const currentUserId  = useAppStore((s) => s.currentUserId);
  const setAccessToken          = useAppStore((s) => s.setAccessToken);
  const completeSocialOnboarding = useAppStore((s) => s.completeSocialOnboarding);
  const pendingShareContent = useAppStore((s) => s.pendingShareContent)
  const setPendingShareContent = useAppStore((s) => s.setPendingShareContent)

  useSSE();

  const [restoring,         setRestoring]         = useState(true);
  const [drawerOpen,        setDrawerOpen]        = useState(false);
  const [showSettings,      setShowSettings]      = useState(false);
  const [showSavedVerses,   setShowSavedVerses]   = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChat,          setShowChat]          = useState(false);
  const [showSearch,        setShowSearch]        = useState(false);
  const [profileUserId,     setProfileUserId]     = useState<string | null>(null);
  const [openCommunityId,   setOpenCommunityId]   = useState<string | null>(null);
  const [pendingPostId,     setPendingPostId]     = useState<string | null>(null);
  const [openProduct,       setOpenProduct]       = useState<{ type: 'affiliate' | 'own'; id: string } | null>(null);
  const [openReviews,       setOpenReviews]       = useState<{ type: 'affiliate' | 'own'; id: string; name: string } | null>(null);

  // Session restore: try refresh on first load (cookie for web, body token for Capacitor)
  useEffect(() => {
    if (useAppStore.getState().isLoggedIn) {
      setRestoring(false);
      return;
    }
    (async () => {
      try {
        const storedRefreshToken = useAppStore.getState().refreshToken;
        const { accessToken } = await apiFetch<{ accessToken: string }>('/auth/refresh', {
          method: 'POST',
          body: storedRefreshToken ? JSON.stringify({ refreshToken: storedRefreshToken }) : undefined,
        });
        setAccessToken(accessToken);
        const user = await apiFetch<ApiUser>('/auth/me');
        useAppStore.getState().setAuth(accessToken, user);
      } catch (err) {
        // Visible in remote debugger; helps diagnose session-restore failures
        console.warn('[session-restore] failed:', err);
      } finally {
        setRestoring(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiFetch<ApiNotification[]>('/notifications'),
    enabled: isLoggedIn,
    staleTime: 60_000,
  });

  const { data: chats } = useQuery({
    queryKey: ['chats'],
    queryFn: () => apiFetch<ApiChat[]>('/chats'),
    enabled: isLoggedIn,
    staleTime: 30_000,
  });

  const { data: pendingApiPost } = useQuery({
    queryKey: ['posts', pendingPostId],
    queryFn: () => apiFetch<ApiPost>(`/posts/${pendingPostId}`),
    enabled: !!pendingPostId,
    staleTime: 60_000,
  });

  const pendingPost = pendingApiPost ? apiPostToCommunityPost(pendingApiPost) : null;

  if (restoring) return null;
  if (!isLoggedIn) return <LoginScreen />;
  if (!onboardingDone) return <ReceptionFlow />;

  const unreadNotifs = (notifications ?? []).filter((n) => !n.read).length;
  const unreadChats  = (chats ?? []).filter((c) => {
    const last = c.messages[0];
    return last && last.senderId !== currentUserId && !last.read;
  }).length;

  const isHomeTab = activeTab === 'hoje' || activeTab === 'comunidade';

  const headerRightSlot = isHomeTab ? (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setShowSearch(true)}
        aria-label="Buscar"
        className="relative w-9 h-9 rounded-xl bg-white/70 backdrop-blur-sm border border-white/50 flex items-center justify-center"
      >
        <Search size={18} className="text-graphite-light" strokeWidth={1.8} />
      </button>
      <button
        onClick={() => setShowChat(true)}
        aria-label="Mensagens"
        className="relative w-9 h-9 rounded-xl bg-white/70 backdrop-blur-sm border border-white/50 flex items-center justify-center"
      >
        <MessageSquare size={18} className="text-graphite-light" strokeWidth={1.8} />
        {unreadChats > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-sara-terracotta rounded-full flex items-center justify-center text-[9px] font-bold text-white">
            {unreadChats}
          </span>
        )}
      </button>
      <button
        onClick={() => setShowNotifications(true)}
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
    </div>
  ) : undefined;

  const goToHoje = () => useAppStore.getState().setActiveTab('hoje');
  const screens: Record<TabId, ReactElement> = {
    hoje:       <DashboardScreen />,
    maeIA:      <MaeIAScreen onBack={goToHoje} />,
    jornada:    <JornadaScreen />,
    comunidade: <ComunidadeScreen />,
    perfil: (
      <ProfileScreen
        key={currentUserId ?? 'self'}
        userId={currentUserId ?? undefined}
        isTab
        onOpenProfile={(id) => setProfileUserId(id)}
      />
    ),
    shopping: (
      <ShoppingScreen
        onOpenProduct={(type, id) => setOpenProduct({ type, id })}
      />
    ),
  };

  return (
    <>
      <MobileShell
        drawerOpen={drawerOpen}
        onOpenDrawer={() => setDrawerOpen(true)}
        onCloseDrawer={() => setDrawerOpen(false)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenSavedVerses={() => setShowSavedVerses(true)}
        headerRightSlot={headerRightSlot}
      >
        {screens[activeTab]}
      </MobileShell>

      <WebLayout
        unreadNotifs={unreadNotifs}
        unreadChats={unreadChats}
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenChat={() => setShowChat(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenUser={(id) => setProfileUserId(id)}
        onOpenCommunity={(id) => setOpenCommunityId(id)}
      >
        {screens[activeTab]}
      </WebLayout>

      {showSettings && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <div className="w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden flex flex-col">
            <SettingsScreen
              onBack={() => setShowSettings(false)}
              onClose={() => setShowSettings(false)}
            />
          </div>
        </div>
      )}

      {showNotifications && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <NotificationsScreen
            onBack={() => setShowNotifications(false)}
            onOpenPost={(postId) => { setShowNotifications(false); setPendingPostId(postId); }}
            onOpenUser={(userId) => { setShowNotifications(false); setProfileUserId(userId); }}
            onOpenCommunity={(communityId) => { setShowNotifications(false); setOpenCommunityId(communityId); }}
          />
        </div>
      )}

      {showChat && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <ChatListScreen onBack={() => setShowChat(false)} onOpenProfile={(id) => { setShowChat(false); setProfileUserId(id); }} />
        </div>
      )}

      {showSearch && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <SearchScreen
            onBack={() => setShowSearch(false)}
            onOpenUser={(id) => { setShowSearch(false); setProfileUserId(id); }}
            onOpenCommunity={(id) => { setShowSearch(false); setOpenCommunityId(id); }}
          />
        </div>
      )}

      {profileUserId && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <ProfileScreen
            key={profileUserId}
            userId={profileUserId}
            onClose={() => setProfileUserId(null)}
            onOpenProfile={(id) => setProfileUserId(id)}
          />
        </div>
      )}

      {openCommunityId && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <CommunityDetailScreen
            key={openCommunityId}
            communityId={openCommunityId}
            onBack={() => setOpenCommunityId(null)}
            onOpenProfile={(id) => { setOpenCommunityId(null); setProfileUserId(id); }}
          />
        </div>
      )}

      {pendingPost && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <div className="w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
            <PostDetailScreen post={pendingPost} onBack={() => setPendingPostId(null)} />
          </div>
        </div>
      )}

      {isLoggedIn && onboardingDone && !socialOnboardingDone && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <div className="w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
            <SocialOnboardingScreen onDone={completeSocialOnboarding} />
          </div>
        </div>
      )}

      {pendingShareContent !== null && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <div className="w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
            <CreatePostScreen
              onBack={() => setPendingShareContent(null)}
              initialContent={pendingShareContent}
            />
          </div>
        </div>
      )}

      {openProduct && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <div className="w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
            <ProductDetailScreen
              key={openProduct.id}
              productType={openProduct.type}
              productId={openProduct.id}
              onBack={() => setOpenProduct(null)}
              onOpenProduct={(type, id) => setOpenProduct({ type, id })}
              onOpenReviews={(type, id, name) => setOpenReviews({ type, id, name })}
              onOpenCart={() => setOpenProduct(null)}
            />
          </div>
        </div>
      )}

      {openReviews && (
        <div className="fixed inset-0 z-[55] sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <div className="w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
            <ReviewsScreen
              productType={openReviews.type}
              productId={openReviews.id}
              productName={openReviews.name}
              onBack={() => setOpenReviews(null)}
            />
          </div>
        </div>
      )}

      <SavedVersesScreen open={showSavedVerses} onClose={() => setShowSavedVerses(false)} />
    </>
  );
}
