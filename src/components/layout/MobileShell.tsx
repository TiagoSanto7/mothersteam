import type { ReactNode } from 'react';
import { BottomTabBar } from './BottomTabBar';
import { AppHeader } from './AppHeader';
import { SideDrawer } from './SideDrawer';

interface MobileShellProps {
  children: ReactNode;
  drawerOpen: boolean;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenSavedVerses: () => void;
  headerRightSlot?: ReactNode;
}

export function MobileShell({
  children,
  drawerOpen,
  onOpenDrawer,
  onCloseDrawer,
  onOpenProfile,
  onOpenSettings,
  onOpenSavedVerses,
  headerRightSlot,
}: MobileShellProps) {
  return (
    <div className="md:hidden sm:min-h-screen sm:bg-gradient-to-br sm:from-[#EDE6DC] sm:to-[#D4C0A8] sm:flex sm:items-center sm:justify-center">
      <div className="relative w-full h-screen sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:shadow-2xl overflow-hidden flex flex-col sm:rounded-[44px]">
        <div aria-hidden="true" className="hidden sm:block h-11 flex-shrink-0 bg-white/80 backdrop-blur-sm" />
        <AppHeader onOpenDrawer={onOpenDrawer} rightSlot={headerRightSlot} />
        <main aria-label="Conteúdo principal" className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {children}
        </main>
        <BottomTabBar />
        <SideDrawer
          isOpen={drawerOpen}
          onClose={onCloseDrawer}
          onOpenProfile={onOpenProfile}
          onOpenSettings={onOpenSettings}
          onOpenSavedVerses={onOpenSavedVerses}
        />
      </div>
    </div>
  );
}
