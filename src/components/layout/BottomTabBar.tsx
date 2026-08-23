import { Home, Heart, Users, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TabId } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { Mark } from '../brand/Mark';

interface TabConfig {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const LEFT_TABS: TabConfig[] = [
  { id: 'hoje',    label: 'Hoje',    icon: Home },
  { id: 'jornada', label: 'Jornada', icon: Heart },
];

const RIGHT_TABS: TabConfig[] = [
  { id: 'comunidade', label: 'Comunidade', icon: Users },
  { id: 'perfil',     label: 'Perfil',     icon: User },
];

export function BottomTabBar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const bumpTabRefresh = useAppStore((s) => s.bumpTabRefresh);
  const closeAllOverlays = useAppStore((s) => s.closeAllOverlays);
  const openQuickActions = useAppStore((s) => s.openQuickActions);

  const handleTabClick = (id: TabId) => {
    closeAllOverlays();
    setActiveTab(id);
    bumpTabRefresh();
  };

  const renderTab = ({ id, label, icon: Icon }: TabConfig) => {
    const isActive = activeTab === id;
    return (
      <button
        key={id}
        data-testid={`tab-${id}`}
        onClick={() => handleTabClick(id)}
        aria-pressed={isActive}
        aria-label={label}
        className={`flex flex-col items-center gap-0.5 flex-1 py-1 focus:outline-none transition-colors ${
          isActive ? 'text-mt-rose' : 'text-mt-muted'
        }`}
      >
        <Icon
          size={22}
          strokeWidth={isActive ? 2.2 : 1.8}
          fill={isActive && id === 'jornada' ? 'currentColor' : 'none'}
        />
        <span className="text-[10px] font-medium">{label}</span>
      </button>
    );
  };

  return (
    <nav
      data-testid="bottom-tab-bar"
      className="flex-shrink-0 bg-white/95 backdrop-blur-md border-t border-mt-linen flex items-end justify-around px-2 pt-2 pb-2 h-[72px]"
    >
      {LEFT_TABS.map(renderTab)}

      <button
        type="button"
        data-testid="bottom-cta"
        onClick={() => {
          closeAllOverlays();
          openQuickActions();
        }}
        aria-label="Ações rápidas"
        className="-mt-6 rounded-full shadow-mt-lg focus:outline-none focus:ring-2 focus:ring-mt-rose"
      >
        <Mark variant="gradient" size={56} aria-label="Ações rápidas" />
      </button>

      {RIGHT_TABS.map(renderTab)}
    </nav>
  );
}
