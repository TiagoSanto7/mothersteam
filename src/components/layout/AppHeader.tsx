import { Menu } from 'lucide-react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';

const TABS = ['hoje', 'jornada', 'comunidade', 'perfil'] as const;

const TAB_LABELS: Record<string, string> = {
  hoje: 'Início',
  jornada: 'Jornada',
  comunidade: 'Comunidade',
  perfil: 'Perfil',
};

interface AppHeaderProps {
  onOpenDrawer: () => void;
  rightSlot?: ReactNode;
}

export function AppHeader({ onOpenDrawer, rightSlot }: AppHeaderProps) {
  const activeTab = useAppStore((s) => s.activeTab);

  return (
    <div className="flex items-center h-14 px-4 flex-shrink-0 bg-gradient-to-r from-[#F5EDE0] to-[#EAD8C8] border-b border-white/30">
      <button
        onClick={onOpenDrawer}
        aria-label="Abrir menu"
        className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
      >
        <Menu size={22} className="text-graphite" strokeWidth={1.8} />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center gap-1">
        <AnimatePresence mode="wait">
          <motion.span
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-base font-semibold font-serif text-graphite tracking-wide"
          >
            {TAB_LABELS[activeTab] ?? activeTab}
          </motion.span>
        </AnimatePresence>

        <div className="flex gap-1.5 items-center">
          {TABS.map((tab) => (
            <motion.div
              key={tab}
              animate={{
                scale: tab === activeTab ? 1.3 : 1,
                backgroundColor: tab === activeTab ? '#C9A96E' : '#D9C4AF',
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{ width: 6, height: 6, borderRadius: '50%' }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1 min-w-[36px] justify-end">
        {rightSlot}
      </div>
    </div>
  );
}
