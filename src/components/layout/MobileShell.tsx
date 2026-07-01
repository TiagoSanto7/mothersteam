import type { ReactNode } from 'react';
import { BottomTabBar } from './BottomTabBar';

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="sm:min-h-screen sm:bg-[#E8E4DF] sm:flex sm:items-center sm:justify-center">
      <div className="relative w-full h-screen sm:w-[390px] sm:h-[844px] bg-offwhite sm:shadow-2xl overflow-hidden flex flex-col sm:rounded-[44px]">
        <div aria-hidden="true" className="hidden sm:block h-11 flex-shrink-0 bg-white/80 backdrop-blur-sm" />
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {children}
        </main>
        <BottomTabBar />
      </div>
    </div>
  );
}
