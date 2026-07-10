# Visual — AppHeader + SideDrawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed global AppHeader (hamburger + logo + contextual right slot) and a SideDrawer (overlay menu with profile, settings, logout) across all 5 bottom-nav tabs.

**Architecture:** AppHeader lives inside MobileShell above `<main>`. SideDrawer is absolutely positioned inside MobileShell (confined to the phone shell on desktop via `overflow-hidden`). App.tsx owns all overlay state (drawerOpen, showProfile, showSettings, showChat, showNotifications) and computes the right slot for AppHeader based on activeTab. ComunidadeScreen loses its own header row — those icons move to App.tsx/AppHeader.

**Tech Stack:** React, Framer Motion (AnimatePresence), Zustand, Lucide icons, Tailwind.

---

## File Map

| Action | File |
|---|---|
| **Create** | `src/components/layout/AppHeader.tsx` |
| **Create** | `src/components/layout/AppHeader.test.tsx` |
| **Create** | `src/components/layout/SideDrawer.tsx` |
| **Create** | `src/components/layout/SideDrawer.test.tsx` |
| **Modify** | `src/components/layout/MobileShell.tsx` |
| **Modify** | `src/App.tsx` |
| **Modify** | `src/components/comunidade/ComunidadeScreen.tsx` |
| **Modify** | `src/components/comunidade/ComunidadeScreen.test.tsx` |

---

## Task 1: AppHeader component

**Files:**
- Create: `src/components/layout/AppHeader.tsx`
- Create: `src/components/layout/AppHeader.test.tsx`

- [ ] **Step 1.1: Write the failing tests**

```tsx
// src/components/layout/AppHeader.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppHeader } from './AppHeader';

describe('AppHeader', () => {
  it("renders Mother's Team logo text", () => {
    render(<AppHeader onOpenDrawer={() => {}} />);
    expect(screen.getByText("Mother's Team")).toBeInTheDocument();
  });

  it('renders hamburger button with correct aria-label', () => {
    render(<AppHeader onOpenDrawer={() => {}} />);
    expect(screen.getByRole('button', { name: /abrir menu/i })).toBeInTheDocument();
  });

  it('calls onOpenDrawer when hamburger button is clicked', () => {
    const fn = vi.fn();
    render(<AppHeader onOpenDrawer={fn} />);
    fireEvent.click(screen.getByRole('button', { name: /abrir menu/i }));
    expect(fn).toHaveBeenCalledOnce();
  });

  it('renders rightSlot when provided', () => {
    render(
      <AppHeader onOpenDrawer={() => {}} rightSlot={<button>Mensagens</button>} />
    );
    expect(screen.getByRole('button', { name: 'Mensagens' })).toBeInTheDocument();
  });

  it('renders only one button when rightSlot is not provided', () => {
    render(<AppHeader onOpenDrawer={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
```

- [ ] **Step 1.2: Run tests — verify they FAIL**

```
npx vitest run src/components/layout/AppHeader.test.tsx
```
Expected: 5 failures (module not found).

- [ ] **Step 1.3: Implement AppHeader**

```tsx
// src/components/layout/AppHeader.tsx
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
```

- [ ] **Step 1.4: Run tests — verify they PASS**

```
npx vitest run src/components/layout/AppHeader.test.tsx
```
Expected: 5 passing.

- [ ] **Step 1.5: Commit**

```
git add src/components/layout/AppHeader.tsx src/components/layout/AppHeader.test.tsx
git commit -m "feat: add AppHeader component with hamburger and logo"
```

---

## Task 2: SideDrawer component

**Files:**
- Create: `src/components/layout/SideDrawer.tsx`
- Create: `src/components/layout/SideDrawer.test.tsx`

- [ ] **Step 2.1: Write the failing tests**

```tsx
// src/components/layout/SideDrawer.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { SideDrawer } from './SideDrawer';
import { useAppStore } from '../../store/useAppStore';

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      ...actual.motion,
      div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
        <div {...props}>{children}</div>
      ),
    },
  };
});

beforeEach(() => {
  useAppStore.setState({
    motherName: 'Mariana',
    communityPosts: [
      { id: '1', author: 'Mariana', category: 'gestação', content: 'Post', likes: 0, replies: 0, time: '1h' },
      { id: '2', author: 'Outra', category: 'gestação', content: 'Post2', likes: 0, replies: 0, time: '1h' },
    ],
  });
});

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onOpenProfile: vi.fn(),
  onOpenSettings: vi.fn(),
};

describe('SideDrawer', () => {
  it('renders the drawer panel when isOpen is true', () => {
    render(<SideDrawer {...defaultProps} />);
    expect(screen.getByTestId('side-drawer')).toBeInTheDocument();
  });

  it('does not render the drawer panel when isOpen is false', () => {
    render(<SideDrawer {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('side-drawer')).not.toBeInTheDocument();
  });

  it('renders the user name', () => {
    render(<SideDrawer {...defaultProps} />);
    expect(screen.getByText('Mariana')).toBeInTheDocument();
  });

  it('renders correct post count for current user', () => {
    render(<SideDrawer {...defaultProps} />);
    expect(screen.getByText('1 posts')).toBeInTheDocument();
  });

  it('renders Perfil navigation item', () => {
    render(<SideDrawer {...defaultProps} />);
    expect(screen.getByRole('button', { name: /perfil/i })).toBeInTheDocument();
  });

  it('renders Configurações navigation item', () => {
    render(<SideDrawer {...defaultProps} />);
    expect(screen.getByRole('button', { name: /configurações/i })).toBeInTheDocument();
  });

  it('renders Sair da conta button', () => {
    render(<SideDrawer {...defaultProps} />);
    expect(screen.getByRole('button', { name: /sair da conta/i })).toBeInTheDocument();
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    render(<SideDrawer {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('drawer-overlay'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Fechar menu button is clicked', () => {
    const onClose = vi.fn();
    render(<SideDrawer {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /fechar menu/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose and onOpenProfile when Perfil is clicked', () => {
    const onClose = vi.fn();
    const onOpenProfile = vi.fn();
    render(<SideDrawer {...defaultProps} onClose={onClose} onOpenProfile={onOpenProfile} />);
    fireEvent.click(screen.getByRole('button', { name: /perfil/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onOpenProfile).toHaveBeenCalledOnce();
  });

  it('calls onClose and onOpenSettings when Configurações is clicked', () => {
    const onClose = vi.fn();
    const onOpenSettings = vi.fn();
    render(<SideDrawer {...defaultProps} onClose={onClose} onOpenSettings={onOpenSettings} />);
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2.2: Run tests — verify they FAIL**

```
npx vitest run src/components/layout/SideDrawer.test.tsx
```
Expected: failures (module not found).

- [ ] **Step 2.3: Implement SideDrawer**

```tsx
// src/components/layout/SideDrawer.tsx
import { X, User, Settings, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}

export function SideDrawer({ isOpen, onClose, onOpenProfile, onOpenSettings }: SideDrawerProps) {
  const motherName = useAppStore((s) => s.motherName);
  const communityPosts = useAppStore((s) => s.communityPosts);
  const logout = useAppStore((s) => s.logout);

  const initial = motherName.charAt(0).toUpperCase();
  const postCount = communityPosts.filter((p) => p.author === motherName).length;

  function handleItem(action: () => void) {
    onClose();
    action();
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
                  <p className="text-xs text-graphite-muted mt-0.5">{postCount} posts</p>
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
                onClick={() => { logout(); onClose(); }}
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
```

- [ ] **Step 2.4: Run tests — verify they PASS**

```
npx vitest run src/components/layout/SideDrawer.test.tsx
```
Expected: all passing.

- [ ] **Step 2.5: Commit**

```
git add src/components/layout/SideDrawer.tsx src/components/layout/SideDrawer.test.tsx
git commit -m "feat: add SideDrawer component with profile, settings and logout"
```

---

## Task 3: Update MobileShell to host AppHeader and SideDrawer

**Files:**
- Modify: `src/components/layout/MobileShell.tsx`

The SideDrawer renders with `absolute` positioning and is clipped to the shell by its parent's `overflow-hidden`. AppHeader renders as a `flex-shrink-0` row above `<main>`.

- [ ] **Step 3.1: Replace MobileShell entirely**

```tsx
// src/components/layout/MobileShell.tsx
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
  headerRightSlot?: ReactNode;
}

export function MobileShell({
  children,
  drawerOpen,
  onOpenDrawer,
  onCloseDrawer,
  onOpenProfile,
  onOpenSettings,
  headerRightSlot,
}: MobileShellProps) {
  return (
    <div className="sm:min-h-screen sm:bg-gradient-to-br sm:from-[#EDE6DC] sm:to-[#D4C0A8] sm:flex sm:items-center sm:justify-center">
      <div className="relative w-full h-screen sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:shadow-2xl overflow-hidden flex flex-col sm:rounded-[44px]">
        <div aria-hidden="true" className="hidden sm:block h-11 flex-shrink-0 bg-white/80 backdrop-blur-sm" />
        <AppHeader onOpenDrawer={onOpenDrawer} rightSlot={headerRightSlot} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {children}
        </main>
        <BottomTabBar />
        <SideDrawer
          isOpen={drawerOpen}
          onClose={onCloseDrawer}
          onOpenProfile={onOpenProfile}
          onOpenSettings={onOpenSettings}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3.2: Run full test suite to check for regressions**

```
npx vitest run
```
Expected: failures only in App.test.tsx (MobileShell now needs new props). Investigate and note any others.

- [ ] **Step 3.3: Commit**

```
git add src/components/layout/MobileShell.tsx
git commit -m "feat: wire AppHeader and SideDrawer into MobileShell"
```

---

## Task 4: Update App.tsx

**Files:**
- Modify: `src/App.tsx`

Changes:
1. Add `drawerOpen` + `showSettings` state.
2. Compute `headerRightSlot` (chat + notification icons) for the home/comunidade tab.
3. Read unread counts from store (previously read in ComunidadeScreen).
4. Remove `onOpenChat` / `onOpenNotifications` from ComunidadeScreen calls.
5. Add `SettingsScreen` overlay.
6. Pass all new props to `MobileShell`.

- [ ] **Step 4.1: Replace App.tsx**

```tsx
// src/App.tsx
import React, { useState } from 'react';
import { Bell, MessageSquare } from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import type { TabId } from './types';
import { MobileShell } from './components/layout/MobileShell';
import { HomeScreen } from './components/home/HomeScreen';
import { BabyScreen } from './components/baby/BabyScreen';
import { MaeIAScreen } from './components/maeIA/MaeIAScreen';
import { ComunidadeScreen } from './components/comunidade/ComunidadeScreen';
import { ShoppingScreen } from './components/shopping/ShoppingScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { OnboardingScreen } from './components/auth/OnboardingScreen';
import { ProfileScreen } from './components/profile/ProfileScreen';
import { SettingsScreen } from './components/profile/SettingsScreen';
import { NotificationsScreen } from './components/notifications/NotificationsScreen';
import { ChatListScreen } from './components/chat/ChatListScreen';

export default function App() {
  const isLoggedIn       = useAppStore((s) => s.isLoggedIn);
  const onboardingDone   = useAppStore((s) => s.onboardingDone);
  const activeTab        = useAppStore((s) => s.activeTab);
  const notifications    = useAppStore((s) => s.notifications);
  const chats            = useAppStore((s) => s.chats);

  const [drawerOpen,       setDrawerOpen]       = useState(false);
  const [showProfile,      setShowProfile]      = useState(false);
  const [showSettings,     setShowSettings]     = useState(false);
  const [showNotifications,setShowNotifications]= useState(false);
  const [showChat,         setShowChat]         = useState(false);

  if (!isLoggedIn)    return <LoginScreen />;
  if (!onboardingDone) return <OnboardingScreen />;

  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const unreadChats  = chats.reduce((sum, c) => sum + c.unread, 0);

  const isHomeTab = activeTab === 'home' || activeTab === 'comunidade';

  const headerRightSlot = isHomeTab ? (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setShowChat(true)}
        aria-label="Mensagens"
        className="relative w-9 h-9 rounded-xl bg-white/70 backdrop-blur-sm border border-white/50 flex items-center justify-center"
      >
        <MessageSquare size={18} className="text-graphite-light" strokeWidth={1.8} />
        {unreadChats > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-sara-gold rounded-full flex items-center justify-center text-[9px] font-bold text-white">
            {unreadChats}
          </span>
        )}
      </button>
      <button
        onClick={() => setShowNotifications(true)}
        aria-label="Notificações"
        className="relative w-9 h-9 rounded-xl bg-white/70 backdrop-blur-sm border border-white/50 flex items-center justify-center"
      >
        <Bell size={18} className="text-graphite-light" strokeWidth={1.8} />
        {unreadNotifs > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-sara-terracotta rounded-full flex items-center justify-center text-[9px] font-bold text-white">
            {unreadNotifs}
          </span>
        )}
      </button>
    </div>
  ) : undefined;

  const screens: Record<TabId, React.ReactElement> = {
    home:       <ComunidadeScreen />,
    maeIA:      <MaeIAScreen />,
    baby:       <BabyScreen />,
    rotina:     <HomeScreen onOpenProfile={() => setShowProfile(true)} />,
    comunidade: <ComunidadeScreen />,
    shopping:   <ShoppingScreen />,
  };

  return (
    <>
      <MobileShell
        drawerOpen={drawerOpen}
        onOpenDrawer={() => setDrawerOpen(true)}
        onCloseDrawer={() => setDrawerOpen(false)}
        onOpenProfile={() => setShowProfile(true)}
        onOpenSettings={() => setShowSettings(true)}
        headerRightSlot={headerRightSlot}
      >
        {screens[activeTab]}
      </MobileShell>

      {showProfile && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <ProfileScreen onClose={() => setShowProfile(false)} />
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <SettingsScreen
            onBack={() => setShowSettings(false)}
            onClose={() => setShowSettings(false)}
          />
        </div>
      )}

      {showNotifications && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <NotificationsScreen onBack={() => setShowNotifications(false)} />
        </div>
      )}

      {showChat && (
        <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
          <ChatListScreen onBack={() => setShowChat(false)} />
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4.2: Run full test suite**

```
npx vitest run
```
Expected: App.test.tsx may fail (needs update if it tests MobileShell props). Fix any TS errors before continuing.

- [ ] **Step 4.3: Commit**

```
git add src/App.tsx
git commit -m "feat: wire drawer state, right slot and settings screen in App"
```

---

## Task 5: Update ComunidadeScreen — remove internal header row

**Files:**
- Modify: `src/components/comunidade/ComunidadeScreen.tsx`

Remove: `onOpenChat` and `onOpenNotifications` props, their callback computations, and the header div (lines ~155-189) with the "Comunidade" title and icon buttons. Those responsibilities moved to App.tsx/AppHeader.

Also remove unused imports: `Bell` and `MessageSquare` (MessageCircle stays — used in PostCard reply count).

- [ ] **Step 5.1: Remove interface + props from ComunidadeScreen**

Find and remove:
```tsx
interface ComunidadeScreenProps {
  onOpenChat?: () => void;
  onOpenNotifications?: () => void;
}

export function ComunidadeScreen({ onOpenChat, onOpenNotifications }: ComunidadeScreenProps) {
```

Replace with:
```tsx
export function ComunidadeScreen() {
```

- [ ] **Step 5.2: Remove unread computations and unused store selectors**

Find and remove these lines (they depended on the removed props):
```tsx
const chats = useAppStore((s) => s.chats);
const notifications = useAppStore((s) => s.notifications);
const unreadNotifs = onOpenNotifications ? notifications.filter((n) => !n.read).length : 0;
const unreadChats = onOpenChat ? chats.reduce((sum, c) => sum + c.unread, 0) : 0;
```

- [ ] **Step 5.3: Remove the header row div**

Find and remove the block that starts with:
```tsx
<div className="px-4 pt-4 flex items-center justify-between">
  <h1 className="text-base font-semibold text-graphite">Comunidade</h1>
  {(onOpenChat || onOpenNotifications) && (
    ...
  )}
</div>
```
(approximately lines 155-189 in original file)

- [ ] **Step 5.4: Remove unused imports**

In the import line at the top of ComunidadeScreen.tsx, remove `MessageSquare` and `Bell` — they are no longer referenced:

```tsx
// Before
import { MessageCircle, Heart, Plus, Repeat2, Share2, MessageSquare, Bell } from 'lucide-react';

// After
import { MessageCircle, Heart, Plus, Repeat2, Share2 } from 'lucide-react';
```

- [ ] **Step 5.5: Run TypeScript check**

```
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 5.6: Run ComunidadeScreen tests (will fail — expected)**

```
npx vitest run src/components/comunidade/ComunidadeScreen.test.tsx
```
Expected: 5 tests fail (those that tested `onOpenChat`/`onOpenNotifications` props).

- [ ] **Step 5.7: Commit intermediate state**

```
git add src/components/comunidade/ComunidadeScreen.tsx
git commit -m "refactor: remove internal header row from ComunidadeScreen (moved to AppHeader)"
```

---

## Task 6: Update ComunidadeScreen tests

**Files:**
- Modify: `src/components/comunidade/ComunidadeScreen.test.tsx`

Remove the 5 tests that tested `onOpenChat` / `onOpenNotifications` props (those icons no longer exist in the component). Remove `chats` from the `beforeEach` store setup. All remaining tests should pass unchanged.

- [ ] **Step 6.1: Remove prop-specific tests and clean beforeEach**

In `src/components/comunidade/ComunidadeScreen.test.tsx`:

**In `beforeEach`**, remove the `chats` key from `useAppStore.setState({...})`:

```tsx
// Remove this block from beforeEach:
chats: [
  { id: '1', with: 'Ana Oliveira', lastMessage: 'Oi!', time: '5min', unread: 2,
    messages: [{ id: '1', from: 'Ana Oliveira', content: 'Oi!', time: '14:20' }] },
],
```

**Remove these 5 test cases entirely** (they test props that no longer exist):

```tsx
it('shows Mensagens icon button when onOpenChat prop is provided', ...);
it('shows Notificações icon button when onOpenNotifications prop is provided', ...);
it('calls onOpenChat when Mensagens button is clicked', ...);
it('calls onOpenNotifications when Notificações button is clicked', ...);
it('does not render icon buttons when props are not provided', ...);
```

- [ ] **Step 6.2: Run the updated ComunidadeScreen tests**

```
npx vitest run src/components/comunidade/ComunidadeScreen.test.tsx
```
Expected: all remaining tests pass.

- [ ] **Step 6.3: Run full test suite**

```
npx vitest run
```
Expected: all tests pass (green).

- [ ] **Step 6.4: Final commit**

```
git add src/components/comunidade/ComunidadeScreen.test.tsx
git commit -m "test: remove prop-specific tests from ComunidadeScreen after header refactor"
```

---

## Done

All 6 tasks complete. The app now has:
- A fixed AppHeader on all 5 bottom-nav tabs with hamburger + "Mother's Team" logo
- Chat/notification icons in the right slot of AppHeader only on the home/comunidade tab
- A SideDrawer accessible from any tab with profile, settings and logout
- SettingsScreen connected to App.tsx via drawer
- All tests green
