import { Home, Heart, Users, User, Bell, MessageSquare, Settings, LogOut, ShoppingBag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getAvatarColor } from '../../utils/avatar';
import type { TabId } from '../../types';

interface LeftSidebarProps {
  unreadNotifs: number;
  unreadChats: number;
  onOpenNotifications: () => void;
  onOpenChat: () => void;
  onOpenSettings: () => void;
}

const MAIN_NAV: { id: TabId; icon: LucideIcon; label: string }[] = [
  { id: 'hoje',       icon: Home,   label: 'Hoje' },
  { id: 'jornada',    icon: Heart,  label: 'Jornada' },
  { id: 'comunidade', icon: Users,  label: 'Comunidade' },
  { id: 'perfil',     icon: User,   label: 'Perfil' },
];

export function LeftSidebar({
  unreadNotifs,
  unreadChats,
  onOpenNotifications,
  onOpenChat,
  onOpenSettings,
}: LeftSidebarProps) {
  const activeTab       = useAppStore((s) => s.activeTab);
  const setActiveTab    = useAppStore((s) => s.setActiveTab);
  const bumpTabRefresh  = useAppStore((s) => s.bumpTabRefresh);
  const motherName    = useAppStore((s) => s.motherName);
  const motherProfile = useAppStore((s) => s.motherProfile);
  const logout        = useAppStore((s) => s.logout);

  function handleLogout() {
    logout();
  }

  const navBtnClass = (isActive: boolean) =>
    [
      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
      'md:justify-center lg:justify-start',
      isActive
        ? 'bg-mt-rose/10 text-mt-rose'
        : 'text-mt-muted hover:bg-mt-linen hover:text-mt-charcoal',
    ].join(' ');

  const actionBtnClass =
    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-mt-muted hover:bg-mt-linen hover:text-mt-charcoal md:justify-center lg:justify-start';

  return (
    <aside className="sticky top-0 h-screen flex flex-col bg-[#F5EDE0] border-r border-mt-linen md:w-[72px] lg:w-60 flex-shrink-0 overflow-hidden">
      {/* Logo */}
      <div className="flex items-center md:justify-center lg:justify-start px-3 py-5 flex-shrink-0">
        <Heart size={22} className="text-mt-rose flex-shrink-0" fill="currentColor" strokeWidth={0} />
        <span className="hidden lg:block ml-2 font-serif font-bold text-lg text-mt-rose leading-tight">
          Mother's Team
        </span>
      </div>

      {/* Main nav — 4 tabs */}
      <nav className="flex flex-col gap-1 px-2 flex-shrink-0">
        {MAIN_NAV.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            title={label}
            aria-label={label}
            onClick={() => {
              useAppStore.getState().closeAllOverlays();
              if (activeTab !== id) setActiveTab(id);
              bumpTabRefresh();
            }}
            className={navBtnClass(activeTab === id)}
          >
            <Icon size={20} strokeWidth={1.8} className="flex-shrink-0" />
            <span className="text-sm font-medium hidden lg:block">{label}</span>
          </button>
        ))}
      </nav>

      {/* Secondary — notifications + messages + recomendações */}
      <div className="mt-4 pt-4 border-t border-mt-linen/60 flex flex-col gap-1 px-2 flex-shrink-0">
        <button
          title="Notificações"
          aria-label="Notificações"
          onClick={onOpenNotifications}
          className={actionBtnClass}
        >
          <span className="relative flex-shrink-0">
            <Bell size={20} strokeWidth={1.8} />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-mt-rose-dark text-white text-[9px] font-bold rounded-full flex items-center justify-center">
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
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-mt-rose-dark text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadChats > 9 ? '9+' : unreadChats}
              </span>
            )}
          </span>
          <span className="text-sm font-medium hidden lg:block">Mensagens</span>
        </button>

        <button
          title="Recomendações"
          aria-label="Recomendações"
          onClick={() => setActiveTab('shopping' as TabId)}
          className={navBtnClass(activeTab === ('shopping' as TabId))}
        >
          <span className="relative flex-shrink-0">
            <ShoppingBag size={20} strokeWidth={1.8} />
          </span>
          <span className="text-sm font-medium hidden lg:block">Recomendações</span>
        </button>
      </div>

      {/* Bottom — user chip + settings + logout */}
      <div className="mt-auto flex flex-col gap-1 px-2 pb-4 flex-shrink-0">
        <div className="hidden lg:flex items-center gap-2 px-3 py-2 mb-1">
          <div
            style={{ background: getAvatarColor(motherProfile?.archetypeKey ?? null) }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          >
            {motherName ? motherName.charAt(0).toUpperCase() : 'M'}
          </div>
          <span className="text-sm font-medium text-mt-charcoal truncate">{motherName || 'Mãe'}</span>
        </div>

        <button
          title="Configurações"
          aria-label="Configurações"
          onClick={onOpenSettings}
          className={actionBtnClass}
        >
          <Settings size={20} strokeWidth={1.8} className="flex-shrink-0" />
          <span className="text-sm font-medium hidden lg:block">Configurações</span>
        </button>

        <button
          title="Sair"
          aria-label="Sair"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-mt-rose-dark hover:bg-mt-rose-dark/10 md:justify-center lg:justify-start"
        >
          <LogOut size={20} strokeWidth={1.8} className="flex-shrink-0" />
          <span className="text-sm font-medium hidden lg:block">Sair</span>
        </button>
      </div>
    </aside>
  );
}
