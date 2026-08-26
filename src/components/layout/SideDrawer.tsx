import { X, User, Settings, LogOut, BookOpen, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { getAvatarColor } from '../../utils/avatar';
import { Wordmark } from '../brand/Wordmark';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenSavedVerses: () => void;
}

export function SideDrawer({ isOpen, onClose, onOpenSettings, onOpenSavedVerses }: SideDrawerProps) {
  const motherName    = useAppStore((s) => s.motherName);
  const motherProfile = useAppStore((s) => s.motherProfile);
  const logout        = useAppStore((s) => s.logout);
  const setActiveTab  = useAppStore((s) => s.setActiveTab);

  const initial = (motherName || 'M').charAt(0).toUpperCase();

  function handleItem(action: () => void) {
    onClose();
    action();
  }

  function handleLogout() {
    onClose();
    logout();
  }

  const itemClass = 'w-full flex items-center gap-3 px-3 py-3.5 rounded-mt text-mt-charcoal hover:bg-mt-linen active:bg-mt-linen transition-colors';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            data-testid="drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            data-testid="side-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-y-0 left-0 z-50 w-72 bg-mt-cream shadow-mt-lg flex flex-col"
          >
            <div className="flex items-start justify-between p-6 pt-12">
              <div className="flex flex-col gap-3">
                <div
                  aria-hidden="true"
                  style={{ background: getAvatarColor(motherProfile?.archetypeKey ?? null) }}
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold ring-4 ring-white shadow-mt"
                >
                  {initial}
                </div>
                <div>
                  <p className="font-semibold text-mt-charcoal text-base">{motherName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Fechar menu"
                className="w-8 h-8 rounded-full flex items-center justify-center text-mt-muted hover:bg-mt-linen transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 px-4 flex flex-col gap-1">
              <button onClick={() => handleItem(() => setActiveTab('perfil'))} className={itemClass}>
                <User size={20} strokeWidth={1.8} />
                <span className="text-sm font-medium">Perfil</span>
              </button>
              <button onClick={() => handleItem(onOpenSettings)} className={itemClass}>
                <Settings size={20} strokeWidth={1.8} />
                <span className="text-sm font-medium">Configurações</span>
              </button>
              <button onClick={() => handleItem(onOpenSavedVerses)} aria-label="Meus versículos" className={itemClass}>
                <BookOpen size={20} strokeWidth={1.8} />
                <span className="text-sm font-medium">Meus versículos</span>
              </button>
              <button onClick={() => handleItem(() => setActiveTab('shopping'))} aria-label="Shopping" className={itemClass}>
                <ShoppingBag size={20} strokeWidth={1.8} />
                <span className="text-sm font-medium">Shopping</span>
              </button>
            </nav>

            <div className="p-4 border-t border-mt-linen flex items-center justify-between gap-3">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-mt-muted hover:text-mt-rose-dark transition-colors"
              >
                <LogOut size={16} strokeWidth={1.8} />
                <span className="text-xs font-medium">Sair da conta</span>
              </button>
              <Wordmark variant="rose" size="sm" className="opacity-60" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
