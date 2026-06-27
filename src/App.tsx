import React from 'react';
import { useAppStore } from './store/useAppStore';
import { MobileShell } from './components/layout/MobileShell';
import { HomeScreen } from './components/home/HomeScreen';

function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[600px] gap-3">
      <span className="text-5xl">🚧</span>
      <p className="text-graphite-muted font-medium">{name}</p>
    </div>
  );
}

export default function App() {
  const activeTab = useAppStore((s) => s.activeTab);

  const screens: Record<typeof activeTab, React.ReactElement> = {
    home:       <HomeScreen />,
    maeIA:      <Placeholder name="MãeIA — em construção" />,
    baby:       <Placeholder name="Rotina do Bebê — em construção" />,
    comunidade: <Placeholder name="Comunidade — em construção" />,
    shopping:   <Placeholder name="Shopping — em construção" />,
  };

  return <MobileShell>{screens[activeTab]}</MobileShell>;
}
