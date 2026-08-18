import { Home, Heart, Users, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TabId } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface TabConfig {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const TABS: TabConfig[] = [
  { id: 'hoje',       label: 'Hoje',       icon: Home },
  { id: 'jornada',    label: 'Jornada',    icon: Heart },
  { id: 'comunidade', label: 'Comunidade', icon: Users },
  { id: 'perfil',     label: 'Perfil',     icon: User },
];

export function BottomTabBar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const bumpTabRefresh = useAppStore((s) => s.bumpTabRefresh);

  return (
    <nav
      data-testid="bottom-tab-bar"
      className="flex-shrink-0 bg-sara-linen/90 backdrop-blur-md border-t border-white/40 flex items-center justify-around px-2 pt-1 pb-2 h-[68px]"
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            data-testid={`tab-${id}`}
            onClick={() => { if (isActive) bumpTabRefresh(); else setActiveTab(id); }}
            aria-pressed={isActive}
            aria-label={label}
            className={`flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-colors ${
              isActive ? 'text-sara-gold' : 'text-graphite-muted'
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
      })}
    </nav>
  );
}
