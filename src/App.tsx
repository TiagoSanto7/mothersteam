import React, { useState } from 'react';
import { useAppStore } from './store/useAppStore';
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

const SHELL_OUTER = 'sm:min-h-screen sm:bg-[#E8E4DF] sm:flex sm:items-center sm:justify-center';

export default function App() {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const activeTab = useAppStore((s) => s.activeTab);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  if (!isLoggedIn) return <LoginScreen />;
  if (!onboardingDone) return <OnboardingScreen />;

  if (showProfile) {
    return (
      <div className={SHELL_OUTER}>
        <ProfileScreen onClose={() => setShowProfile(false)} />
      </div>
    );
  }

  if (showNotifications) {
    return (
      <div className={SHELL_OUTER}>
        <NotificationsScreen onBack={() => setShowNotifications(false)} />
      </div>
    );
  }

  const screens: Record<typeof activeTab, React.ReactElement> = {
    home: (
      <HomeScreen
        onOpenProfile={() => setShowProfile(true)}
        onOpenNotifications={() => setShowNotifications(true)}
      />
    ),
    maeIA:      <MaeIAScreen />,
    baby:       <BabyScreen />,
    comunidade: <ComunidadeScreen />,
    shopping:   <ShoppingScreen />,
  };

  return <MobileShell>{screens[activeTab]}</MobileShell>;
}
