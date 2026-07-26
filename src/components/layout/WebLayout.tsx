import type { ReactNode } from 'react';
import { LeftSidebar } from './LeftSidebar';
import { RightPanel } from './RightPanel';

interface WebLayoutProps {
  children: ReactNode;
  unreadNotifs: number;
  unreadChats: number;
  onOpenNotifications: () => void;
  onOpenChat: () => void;
  onOpenSettings: () => void;
  onOpenUser: (userId: string) => void;
  onOpenCommunity: (communityId: string) => void;
}

export function WebLayout({
  children,
  unreadNotifs,
  unreadChats,
  onOpenNotifications,
  onOpenChat,
  onOpenSettings,
  onOpenUser,
  onOpenCommunity,
}: WebLayoutProps) {
  return (
    <div className="hidden md:flex min-h-screen bg-[#EDE6DC] w-full">
      <LeftSidebar
        unreadNotifs={unreadNotifs}
        unreadChats={unreadChats}
        onOpenNotifications={onOpenNotifications}
        onOpenChat={onOpenChat}
        onOpenSettings={onOpenSettings}
      />

      <main aria-label="Conteúdo principal" className="flex-1 min-h-screen overflow-y-auto">
        <div className="max-w-2xl mx-auto py-4 px-4">
          {children}
        </div>
      </main>

      <div className="hidden lg:block w-80 flex-shrink-0">
        <RightPanel
          onOpenUser={onOpenUser}
          onOpenCommunity={onOpenCommunity}
        />
      </div>
    </div>
  );
}
