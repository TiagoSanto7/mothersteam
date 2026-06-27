import type { ReactNode } from 'react';
import { BottomTabBar } from './BottomTabBar';

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#E8E4DF] flex items-center justify-center">
      <div className="relative w-[390px] h-[844px] bg-offwhite shadow-2xl overflow-hidden flex flex-col rounded-[2px] sm:rounded-[44px]">
        <div className="h-11 flex-shrink-0 bg-white/80 backdrop-blur-sm" />
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {children}
        </main>
        <BottomTabBar />
      </div>
    </div>
  );
}
