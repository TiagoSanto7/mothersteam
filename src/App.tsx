import React, { useState } from 'react';
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
import { NotificationsScreen } from './components/notifications/NotificationsScreen';
import { ChatListScreen } from './components/chat/ChatListScreen';

export default function App() {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const activeTab = useAppStore((s) => s.activeTab);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChat, setShowChat] = useState(false);

  if (!isLoggedIn) return <LoginScreen />;
  if (!onboardingDone) return <OnboardingScreen />;

  const screens: Record<TabId, React.ReactElement> = {
    // 'home' routes to the feed — community IS the home experience by design
    home:       <ComunidadeScreen />,
    maeIA:      <MaeIAScreen />,
    baby:       <BabyScreen />,
    rotina: (
      <HomeScreen
        onOpenProfile={() => setShowProfile(true)}
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenChat={() => setShowChat(true)}
      />
    ),
    comunidade: <ComunidadeScreen />, // alias for stale persisted activeTab
    shopping:   <ShoppingScreen />,
  };

  return (
    <>
      <MobileShell>{screens[activeTab]}</MobileShell>

      {showProfile && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <ProfileScreen onClose={() => setShowProfile(false)} />
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
