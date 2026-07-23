import { Home, MessageCircle, Baby, Calendar, ShoppingBag, Bell, MessageSquare, User, Settings, LogOut, Heart, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { TabId } from '../../types';

interface LeftSidebarProps {
  unreadNotifs: number;
  unreadChats: number;
  onOpenNotifications: () => void;
  onOpenChat: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}

interface NavItem {
  id: TabId;
  icon: LucideIcon;
  label: string;
}

const mainNavItems: NavItem[] = [
  { id: 'home',       icon: Home,          label: 'Home' },
  { id: 'maeIA',      icon: MessageCircle, label: 'MãeIA' },
  { id: 'baby',       icon: Baby,          label: 'Bebê' },
  { id: 'rotina',     icon: Calendar,      label: 'Rotina' },
  { id: 'comunidade', icon: Users,         label: 'Comunidade' },
];

export function LeftSidebar({
  unreadNotifs,
  unreadChats,
  onOpenNotifications,
  onOpenChat,
  onOpenProfile,
  onOpenSettings,
}: LeftSidebarProps) {
  const activeTab    = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const motherName   = useAppStore((s) => s.motherName);
  const clearAuth    = useAppStore((s) => s.clearAuth);

  const navBtnClass = (isActive: boolean) =>
    [
      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
      'md:justify-center lg:justify-start',
      isActive
        ? 'bg-sara-gold/10 text-sara-gold'
        : 'text-graphite-muted hover:bg-sara-linen hover:text-graphite',
    ].join(' ');

  const actionBtnClass =
    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-graphite-muted hover:bg-sara-linen hover:text-graphite md:justify-center lg:justify-start';

  return (
    <aside className="sticky top-0 h-screen flex flex-col bg-[#F5EDE0] border-r border-sara-linen md:w-[72px] lg:w-60 flex-shrink-0 overflow-hidden">
      {/* Logo */}
      <div className="flex items-center md:justify-center lg:justify-start px-3 py-5 flex-shrink-0">
        <Heart size={22} className="text-sara-gold flex-shrink-0" fill="currentColor" strokeWidth={0} />
        <span className="hidden lg:block ml-2 font-serif font-bold text-lg text-sara-gold leading-tight">
          Mother's Team
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-1 px-2 flex-shrink-0">
        {mainNavItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            title={label}
            aria-label={label}
            onClick={() => setActiveTab(id)}
            className={navBtnClass(activeTab === id)}
          >
            <Icon size={20} strokeWidth={1.8} className="flex-shrink-0" />
            <span className="text-sm font-medium hidden lg:block">{label}</span>
          </button>
        ))}
      </nav>

      {/* Separator + secondary nav */}
      <div className="mt-4 pt-4 border-t border-sara-linen/60 flex flex-col gap-1 px-2 flex-shrink-0">
        <button
          title="Notificações"
          aria-label="Notificações"
          onClick={onOpenNotifications}
          className={actionBtnClass}
        >
          <span className="relative flex-shrink-0">
            <Bell size={20} strokeWidth={1.8} />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-sara-terracotta text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </span>
            )}
          </span>
          <span className="text-sm font-medium hidden lg:block">Notificações</span>
        </button>

        <button
          title="Mensagens"
          aria-label="Mensagens"
          onClick={onOpenChat}
          className={actionBtnClass}
        >
          <span className="relative flex-shrink-0">
            <MessageSquare size={20} strokeWidth={1.8} />
            {unreadChats > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-sara-terracotta text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadChats > 9 ? '9+' : unreadChats}
              </span>
            )}
          </span>
          <span className="text-sm font-medium hidden lg:block">Mensagens</span>
        </button>
      </div>

      {/* Bottom section */}
      <div className="mt-auto flex flex-col gap-1 px-2 pb-4 flex-shrink-0">
        <div className="hidden lg:flex items-center gap-2 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-sara-terracotta flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {motherName ? motherName.charAt(0).toUpperCase() : 'M'}
          </div>
          <span className="text-sm font-medium text-graphite truncate">{motherName || 'Mãe'}</span>
        </div>

        <button title="Perfil" aria-label="Perfil" onClick={onOpenProfile} className={actionBtnClass}>
          <User size={20} strokeWidth={1.8} className="flex-shrink-0" />
          <span className="text-sm font-medium hidden lg:block">Perfil</span>
        </button>

        <button title="Configurações" aria-label="Configurações" onClick={onOpenSettings} className={actionBtnClass}>
          <Settings size={20} strokeWidth={1.8} className="flex-shrink-0" />
          <span className="text-sm font-medium hidden lg:block">Configurações</span>
        </button>

        <button
          title="Shopping"
          aria-label="Shopping"
          onClick={() => setActiveTab('shopping')}
          className={navBtnClass(activeTab === 'shopping')}
        >
          <ShoppingBag size={20} strokeWidth={1.8} className="flex-shrink-0" />
          <span className="text-sm font-medium hidden lg:block">Shopping</span>
        </button>

        <button
          title="Sair"
          aria-label="Sair"
          onClick={clearAuth}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sara-terracotta hover:bg-sara-terracotta/10 md:justify-center lg:justify-start"
        >
          <LogOut size={20} strokeWidth={1.8} className="flex-shrink-0" />
          <span className="text-sm font-medium hidden lg:block">Sair</span>
        </button>
      </div>
    </aside>
  );
}
