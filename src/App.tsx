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

export default function App() {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const activeTab = useAppStore((s) => s.activeTab);
  const [showProfile, setShowProfile] = useState(false);

  if (!isLoggedIn) return <LoginScreen />;
  if (!onboardingDone) return <OnboardingScreen />;

  if (showProfile) {
    return <ProfileScreen onClose={() => setShowProfile(false)} />;
  }

  const screens: Record<typeof activeTab, React.ReactElement> = {
    home:       <HomeScreen onOpenProfile={() => setShowProfile(true)} />,
    maeIA:      <MaeIAScreen />,
    baby:       <BabyScreen />,
    comunidade: <ComunidadeScreen />,
    shopping:   <ShoppingScreen />,
  };

  return <MobileShell>{screens[activeTab]}</MobileShell>;
}
