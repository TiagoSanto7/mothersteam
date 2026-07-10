import { X, User, Settings, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { apiFetch } from '../../lib/api';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}

export function SideDrawer({ isOpen, onClose, onOpenProfile, onOpenSettings }: SideDrawerProps) {
  const motherName = useAppStore((s) => s.motherName);
  const clearAuth = useAppStore((s) => s.clearAuth);

  const initial = (motherName || 'M').charAt(0).toUpperCase();

  function handleItem(action: () => void) {
    onClose();
    action();
  }

  function handleLogout() {
    onClose();
    apiFetch('/auth/logout', { method: 'POST' }).catch(() => {/* ignore */});
    clearAuth();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            data-testid="drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            data-testid="side-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-y-0 left-0 z-50 w-72 bg-[#F5EDE0] shadow-xl flex flex-col"
          >
            <div className="flex items-start justify-between p-6 pt-12">
              <div className="flex flex-col gap-3">
                <div
                  aria-hidden="true"
                  className="w-14 h-14 rounded-full bg-sara-terracotta flex items-center justify-center text-white text-xl font-bold"
                >
                  {initial}
                </div>
                <div>
                  <p className="font-semibold text-graphite text-base">{motherName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Fechar menu"
                className="w-8 h-8 rounded-full flex items-center justify-center text-graphite-muted hover:bg-white/50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 px-4 flex flex-col gap-1">
              <button
                onClick={() => handleItem(onOpenProfile)}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-graphite hover:bg-white/50 active:bg-white/70 transition-colors"
              >
                <User size={20} strokeWidth={1.8} />
                <span className="text-sm font-medium">Perfil</span>
              </button>
              <button
                onClick={() => handleItem(onOpenSettings)}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-graphite hover:bg-white/50 active:bg-white/70 transition-colors"
              >
                <Settings size={20} strokeWidth={1.8} />
                <span className="text-sm font-medium">Configurações</span>
              </button>
            </nav>

            <div className="p-4 border-t border-black/5">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-sara-terracotta hover:bg-white/50 transition-colors"
              >
                <LogOut size={20} strokeWidth={1.8} />
                <span className="text-sm font-medium">Sair da conta</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
