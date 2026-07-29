import type { ReactNode } from 'react';
import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomTabBar } from './BottomTabBar';
import { AppHeader } from './AppHeader';
import { SideDrawer } from './SideDrawer';
import { useAppStore } from '../../store/useAppStore';

const TABS = ['hoje', 'jornada', 'comunidade', 'perfil'];

const tabVariants = {
  enter: (dir: number) => ({ x: dir * 40, opacity: 0.6 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -20, opacity: 0 }),
};

interface MobileShellProps {
  children: ReactNode;
  drawerOpen: boolean;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
  onOpenSettings: () => void;
  onOpenSavedVerses: () => void;
  headerRightSlot?: ReactNode;
}

export function MobileShell({
  children,
  drawerOpen,
  onOpenDrawer,
  onCloseDrawer,
  onOpenSettings,
  onOpenSavedVerses,
  headerRightSlot,
}: MobileShellProps) {
  const activeTab = useAppStore((s) => s.activeTab);
  const prevTabRef = useRef<string>(activeTab);

  const currentIndex = TABS.indexOf(activeTab);
  const prevIndex = TABS.indexOf(prevTabRef.current);
  const direction = currentIndex >= prevIndex ? 1 : -1;

  useEffect(() => {
    prevTabRef.current = activeTab;
  }, [activeTab]);

  return (
    <div className="md:hidden sm:min-h-screen sm:bg-gradient-to-br sm:from-[#EDE6DC] sm:to-[#D4C0A8] sm:flex sm:items-center sm:justify-center">
      <div className="relative w-full h-screen sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:shadow-2xl overflow-hidden flex flex-col sm:rounded-[44px]">
        <div aria-hidden="true" className="hidden sm:block h-11 flex-shrink-0 bg-white/80 backdrop-blur-sm" />
        <AppHeader onOpenDrawer={onOpenDrawer} rightSlot={headerRightSlot} />
        <main aria-label="Conteúdo principal" className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="popLayout" custom={direction}>
            <motion.div
              key={activeTab}
              custom={direction}
              variants={tabVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="absolute inset-0 overflow-y-auto overflow-x-hidden scrollbar-hide"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        <BottomTabBar />
        <SideDrawer
          isOpen={drawerOpen}
          onClose={onCloseDrawer}
          onOpenSettings={onOpenSettings}
          onOpenSavedVerses={onOpenSavedVerses}
        />
      </div>
    </div>
  );
}
