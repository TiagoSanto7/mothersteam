import { LayoutDashboard, Package, Tag, LogOut, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { AdminRoute } from '../AdminApp';

interface AdminSidebarProps {
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  role: string;
}

const NAV = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products' as const, label: 'Produtos', icon: Package },
  { id: 'categories' as const, label: 'Categorias', icon: Tag },
];

export function AdminSidebar({ activeRoute, onNavigate, role }: AdminSidebarProps) {
  const logout = useAppStore((s) => s.logout);
  const motherName = useAppStore((s) => s.motherName);

  function handleLogout() {
    logout();
    window.location.href = '/';
  }

  const isActive = (id: string) => activeRoute === id || activeRoute.startsWith(id + '/');

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen">
      <div className="px-6 py-5 border-b border-gray-100">
        <p className="font-bold text-sara-gold font-serif text-lg">Mother's Team</p>
        <p className="text-[11px] text-graphite-muted mt-0.5">Painel Admin</p>
      </div>

      <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            aria-current={isActive(id) ? 'page' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive(id)
                ? 'bg-sara-gold/10 text-sara-gold'
                : 'text-graphite-muted hover:bg-gray-50 hover:text-graphite'
            }`}
          >
            <Icon size={18} strokeWidth={1.8} />
            {label}
            {isActive(id) && <ChevronRight size={14} className="ml-auto" />}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs font-semibold text-graphite truncate">{motherName || 'Admin'}</p>
          <p className="text-[11px] text-graphite-muted">{role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sara-terracotta hover:bg-gray-50 transition-colors"
        >
          <LogOut size={18} strokeWidth={1.8} />
          Sair
        </button>
      </div>
    </aside>
  );
}
