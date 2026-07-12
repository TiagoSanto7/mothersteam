import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from './store/useAppStore';
import type { TabId } from './types';
import type { ApiNotification, ApiChat } from './lib/types';
import { apiFetch } from './lib/api';
import type { ApiUser } from './lib/types';
import { MobileShell } from './components/layout/MobileShell';
import { HomeScreen } from './components/home/HomeScreen';
import { BabyScreen } from './components/baby/BabyScreen';
import { MaeIAScreen } from './components/maeIA/MaeIAScreen';
import { ComunidadeScreen } from './components/comunidade/ComunidadeScreen';
import { ShoppingScreen } from './components/shopping/ShoppingScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { OnboardingScreen } from './components/auth/OnboardingScreen';
import { ProfileScreen } from './components/profile/ProfileScreen';
import { SettingsScreen } from './components/profile/SettingsScreen';
import { NotificationsScreen } from './components/notifications/NotificationsScreen';
import { ChatListScreen } from './components/chat/ChatListScreen';
import { SearchScreen } from './components/search/SearchScreen';
import { UserProfileScreen } from './components/profile/UserProfileScreen';
import { CommunityDetailScreen } from './components/comunidade/CommunityDetailScreen';

export default function App() {
  const isLoggedIn     = useAppStore((s) => s.isLoggedIn);
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const activeTab      = useAppStore((s) => s.activeTab);
  const currentUserId  = useAppStore((s) => s.currentUserId);
  const setAccessToken = useAppStore((s) => s.setAccessToken);
  const setAuth        = useAppStore((s) => s.setAuth);

  const [restoring,         setRestoring]         = useState(true);
  const [drawerOpen,        setDrawerOpen]        = useState(false);
  const [showProfile,       setShowProfile]       = useState(false);
  const [showSettings,      setShowSettings]      = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChat,          setShowChat]          = useState(false);
  const [showSearch,        setShowSearch]        = useState(false);
  const [profileUserId,     setProfileUserId]     = useState<string | null>(null);
  const [openCommunityId,   setOpenCommunityId]   = useState<string | null>(null);

  // Session restore: try refresh cookie on first load
  useEffect(() => {
    if (useAppStore.getState().isLoggedIn) {
      setRestoring(false);
      return;
    }
    (async () => {
      try {
        const { accessToken } = await apiFetch<{ accessToken: string }>('/auth/refresh', { method: 'POST' });
        setAccessToken(accessToken);
        const user = await apiFetch<ApiUser>('/auth/me');
        useAppStore.getState().setAuth(accessToken, user);
      } catch {
        // no valid session — stay at login
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

  if (restoring) return null;
  if (!isLoggedIn) return <LoginScreen />;
  if (!onboardingDone) return <OnboardingScreen />;

  const unreadNotifs = (notifications ?? []).filter((n) => !n.read).length;
  const unreadChats  = (chats ?? []).filter((c) => {
    const last = c.messages[0];
    return last && last.senderId !== currentUserId && !last.read;
  }).length;

  const isHomeTab = activeTab === 'home' || activeTab === 'comunidade';

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
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-sara-gold rounded-full flex items-center justify-center text-[9px] font-bold text-white">
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

  const screens: Record<TabId, React.ReactElement> = {
    home:       <ComunidadeScreen />,
    maeIA:      <MaeIAScreen />,
    baby:       <BabyScreen />,
    rotina:     <HomeScreen onOpenProfile={() => setShowProfile(true)} />,
    comunidade: <ComunidadeScreen />,
    shopping:   <ShoppingScreen />,
  };

  return (
    <>
      <MobileShell
        drawerOpen={drawerOpen}
        onOpenDrawer={() => setDrawerOpen(true)}
        onCloseDrawer={() => setDrawerOpen(false)}
        onOpenProfile={() => setShowProfile(true)}
        onOpenSettings={() => setShowSettings(true)}
        headerRightSlot={headerRightSlot}
      >
        {screens[activeTab]}
      </MobileShell>

      {showProfile && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <ProfileScreen onClose={() => setShowProfile(false)} />
        </div>
      )}

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
          <NotificationsScreen onBack={() => setShowNotifications(false)} />
        </div>
      )}

      {showChat && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <ChatListScreen onBack={() => setShowChat(false)} />
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
          <UserProfileScreen
            key={profileUserId}
            userId={profileUserId}
            onBack={() => setProfileUserId(null)}
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
    </>
  );
}
