import type { ReactNode } from 'react';
import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomTabBar } from './BottomTabBar';
import { AppHeader } from './AppHeader';
import { SideDrawer } from './SideDrawer';
import { useAppStore } from '../../store/useAppStore';
import { MtQuickActionSheet } from '../mt/MtQuickActionSheet';
import { QuickRegisterSheet } from '../home/QuickRegisterSheet';

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
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const quickActionsOpen = useAppStore((s) => s.quickActionsOpen);
  const closeQuickActions = useAppStore((s) => s.closeQuickActions);
  const requestQuickAction = useAppStore((s) => s.requestQuickAction);
  const babySheetMode = useAppStore((s) => s.babySheetMode);
  const openBabySheet = useAppStore((s) => s.openBabySheet);
  const closeBabySheet = useAppStore((s) => s.closeBabySheet);
  const prevTabRef = useRef<string>(activeTab);

  const currentIndex = TABS.indexOf(activeTab);
  const prevIndex = TABS.indexOf(prevTabRef.current);
  const direction = currentIndex >= prevIndex ? 1 : -1;

  useEffect(() => {
    prevTabRef.current = activeTab;
  }, [activeTab]);

  return (
    <div className="md:hidden w-full h-screen">
      <div className="relative w-full h-full bg-mt-cream overflow-hidden flex flex-col">
        <div aria-hidden="true" className="hidden" />
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
        <MtQuickActionSheet
          open={quickActionsOpen}
          onClose={closeQuickActions}
          onMaeIA={() => setActiveTab('maeIA')}
          onNewPost={() => { requestQuickAction('newPost'); setActiveTab('comunidade'); }}
          onAddRoutine={() => { requestQuickAction('addRoutine'); setActiveTab('hoje'); }}
          onRegisterBaby={() => openBabySheet('amamentacao')}
        />
        <QuickRegisterSheet
          open={babySheetMode !== null}
          initialMode={babySheetMode ?? 'amamentacao'}
          onClose={closeBabySheet}
        />
      </div>
    </div>
  );
}
