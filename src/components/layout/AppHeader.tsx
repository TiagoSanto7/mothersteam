import { Menu } from 'lucide-react';
import type { ReactNode } from 'react';

interface AppHeaderProps {
  onOpenDrawer: () => void;
  rightSlot?: ReactNode;
}

export function AppHeader({ onOpenDrawer, rightSlot }: AppHeaderProps) {
  return (
    <div className="flex items-center h-14 px-4 flex-shrink-0 bg-gradient-to-r from-[#F5EDE0] to-[#EAD8C8] border-b border-white/30">
      <button
        onClick={onOpenDrawer}
        aria-label="Abrir menu"
        className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
      >
        <Menu size={22} className="text-graphite" strokeWidth={1.8} />
      </button>

      <div className="flex-1 flex items-center justify-center">
        <span className="text-base font-semibold font-serif text-graphite tracking-wide">
          Mother's Team
        </span>
      </div>

      <div className="flex items-center gap-1 min-w-[36px] justify-end">
        {rightSlot}
      </div>
    </div>
  );
}
