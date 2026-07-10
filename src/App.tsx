import React, { useState } from 'react';
import { Bell, MessageSquare } from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import type { TabId } from './types';
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

export default function App() {
  const isLoggedIn       = useAppStore((s) => s.isLoggedIn);
  const onboardingDone   = useAppStore((s) => s.onboardingDone);
  const activeTab        = useAppStore((s) => s.activeTab);

  const [drawerOpen,        setDrawerOpen]        = useState(false);
  const [showProfile,       setShowProfile]       = useState(false);
  const [showSettings,      setShowSettings]      = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChat,          setShowChat]          = useState(false);

  if (!isLoggedIn)    return <LoginScreen />;
  if (!onboardingDone) return <OnboardingScreen />;

  // Notification and chat badge counts will come from API queries (Task 3)
  const unreadNotifs = 0;
  const unreadChats  = 0;

  const isHomeTab = activeTab === 'home' || activeTab === 'comunidade';

  const headerRightSlot = isHomeTab ? (
    <div className="flex items-center gap-2">
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
          <SettingsScreen
            onBack={() => setShowSettings(false)}
            onClose={() => setShowSettings(false)}
          />
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
    </>
  );
}
