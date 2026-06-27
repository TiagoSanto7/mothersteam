import React from 'react';
import { useAppStore } from './store/useAppStore';
import { MobileShell } from './components/layout/MobileShell';
import { HomeScreen } from './components/home/HomeScreen';
import { BabyScreen } from './components/baby/BabyScreen';
import { MaeIAScreen } from './components/maeIA/MaeIAScreen';
import { ComunidadeScreen } from './components/comunidade/ComunidadeScreen';
import { ShoppingScreen } from './components/shopping/ShoppingScreen';

export default function App() {
  const activeTab = useAppStore((s) => s.activeTab);

  const screens: Record<typeof activeTab, React.ReactElement> = {
    home:       <HomeScreen />,
    maeIA:      <MaeIAScreen />,
    baby:       <BabyScreen />,
    comunidade: <ComunidadeScreen />,
    shopping:   <ShoppingScreen />,
  };

  return <MobileShell>{screens[activeTab]}</MobileShell>;
}
