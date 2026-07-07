# Bluesky Composer + Nav Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the community feed the primary home experience, add ComposerBar + FAB for post creation, and support image attachments in posts.

**Architecture:** 4 independent tasks. Task 1 updates types and nav routing. Task 2 creates the ComposerBar component. Task 3 integrates ComposerBar + FAB into ComunidadeScreen, removes the Desabafar button, and adds PostCard image rendering. Task 4 rewrites CreatePostScreen with image upload via FileReader. No backend changes — all state in Zustand.

**Tech Stack:** React 18, TypeScript strict, Zustand v5 persist, Tailwind CSS, Framer Motion, Lucide React, Vitest + @testing-library/react.

---

## File Map

| File | Action |
|---|---|
| `src/types/index.ts` | Modify — add `'rotina'` to `TabId`, add `imageUrl?` to `CommunityPost` |
| `src/App.tsx` | Modify — route `home`/`comunidade` → `ComunidadeScreen`, `rotina` → `HomeScreen` |
| `src/components/layout/BottomTabBar.tsx` | Modify — replace Comunidade tab with Rotina (📅) tab |
| `src/components/layout/BottomTabBar.test.tsx` | Modify — update for new Rotina tab |
| `src/App.test.tsx` | Create — routing integration tests |
| `src/components/comunidade/ComposerBar.tsx` | Create — glassmorphism composer bar |
| `src/components/comunidade/ComposerBar.test.tsx` | Create — ComposerBar unit tests |
| `src/components/comunidade/ComunidadeScreen.tsx` | Modify — ComposerBar + FAB + remove Desabafar + PostCard image |
| `src/components/comunidade/ComunidadeScreen.test.tsx` | Modify — updated tests |
| `src/components/comunidade/CreatePostScreen.tsx` | Modify — FileReader image upload |
| `src/components/comunidade/CreatePostScreen.test.tsx` | Create — image upload tests |

---

### Task 1: Types + Navigation

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/BottomTabBar.tsx`
- Modify: `src/components/layout/BottomTabBar.test.tsx`
- Create: `src/App.test.tsx`

- [ ] **Step 1: Write failing routing tests**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import App from './App';
import { useAppStore } from './store/useAppStore';

beforeEach(() => {
  useAppStore.setState({
    isLoggedIn: true,
    onboardingDone: true,
    motherName: 'Mariana',
    phase: { stage: 'pregnant', week: 28 },
    communityPosts: [],
    communities: [],
    followedCommunityIds: [],
    motherProfile: null,
    routineEntries: [],
  });
});

describe('App routing', () => {
  it('home tab renders ComunidadeScreen (Para Você tab visible)', () => {
    useAppStore.setState({ activeTab: 'home' });
    render(<App />);
    expect(screen.getByRole('button', { name: /para você/i })).toBeInTheDocument();
  });

  it('rotina tab renders HomeScreen (Para Você tab absent)', () => {
    useAppStore.setState({ activeTab: 'rotina' });
    render(<App />);
    expect(screen.queryByRole('button', { name: /para você/i })).not.toBeInTheDocument();
  });

  it('comunidade tab renders ComunidadeScreen (alias for stale state)', () => {
    useAppStore.setState({ activeTab: 'comunidade' });
    render(<App />);
    expect(screen.getByRole('button', { name: /para você/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
npx vitest run src/App.test.tsx
```
Expected: FAIL — TypeScript error on `activeTab: 'rotina'` (not assignable to `TabId`) and/or test failures.

- [ ] **Step 3: Update `src/types/index.ts`**

Change line 1 to add `'rotina'`:
```ts
export type TabId = 'home' | 'maeIA' | 'baby' | 'rotina' | 'comunidade' | 'shopping';
```

Add `imageUrl?: string` to `CommunityPost` after `communityId?: string`:
```ts
export interface CommunityPost {
  id: string;
  category: 'gestação' | 'pós-parto' | 'amamentação' | 'saúde mental';
  author: string;
  badge?: 'experiente' | 'profissional';
  content: string;
  likes: number;
  replies: number;
  time: string;
  isRepost?: boolean;
  repostFrom?: string;
  communityId?: string;
  imageUrl?: string;
}
```

- [ ] **Step 4: Update `src/App.tsx`**

Replace the `screens` Record (currently lines 26–38) with a version that adds `rotina` and reroutes `home`:

```tsx
const screens: Record<TabId, React.ReactElement> = {
  home:       <ComunidadeScreen />,
  maeIA:      <MaeIAScreen />,
  baby:       <BabyScreen />,
  rotina: (
    <HomeScreen
      onOpenProfile={() => setShowProfile(true)}
      onOpenNotifications={() => setShowNotifications(true)}
      onOpenChat={() => setShowChat(true)}
    />
  ),
  comunidade: <ComunidadeScreen />,
  shopping:   <ShoppingScreen />,
};
```

- [ ] **Step 5: Run routing test**

```
npx vitest run src/App.test.tsx
```
Expected: 3 tests PASS.

- [ ] **Step 6: Write failing BottomTabBar test**

Replace all content of `src/components/layout/BottomTabBar.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { BottomTabBar } from './BottomTabBar';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  useAppStore.setState({ activeTab: 'home', phase: { stage: 'pregnant', week: 28 } });
});

describe('BottomTabBar', () => {
  it('renders 5 navigation items including Rotina', () => {
    render(<BottomTabBar />);
    expect(screen.getByTestId('tab-home')).toBeInTheDocument();
    expect(screen.getByTestId('tab-maeIA')).toBeInTheDocument();
    expect(screen.getByTestId('baby-central-button')).toBeInTheDocument();
    expect(screen.getByTestId('tab-rotina')).toBeInTheDocument();
    expect(screen.getByTestId('tab-shopping')).toBeInTheDocument();
  });

  it('does not render Comunidade tab', () => {
    render(<BottomTabBar />);
    expect(screen.queryByTestId('tab-comunidade')).not.toBeInTheDocument();
  });

  it('activates Rotina tab when clicked', () => {
    render(<BottomTabBar />);
    fireEvent.click(screen.getByTestId('tab-rotina'));
    expect(useAppStore.getState().activeTab).toBe('rotina');
  });

  it('activates baby tab via central button', () => {
    render(<BottomTabBar />);
    fireEvent.click(screen.getByTestId('baby-central-button'));
    expect(useAppStore.getState().activeTab).toBe('baby');
  });

  it('shows 🤰 emoji for week 28', () => {
    render(<BottomTabBar />);
    expect(screen.getByTestId('baby-central-button')).toHaveTextContent('🤰');
  });

  it('shows 🌱 emoji for week 4', () => {
    useAppStore.setState({ phase: { stage: 'pregnant', week: 4 } });
    render(<BottomTabBar />);
    expect(screen.getByTestId('baby-central-button')).toHaveTextContent('🌱');
  });
});
```

- [ ] **Step 7: Run BottomTabBar test to verify it fails**

```
npx vitest run src/components/layout/BottomTabBar.test.tsx
```
Expected: FAIL — `tab-rotina` not found, `tab-comunidade` still present.

- [ ] **Step 8: Update `src/components/layout/BottomTabBar.tsx`**

Replace the entire file:

```tsx
import { motion } from 'framer-motion';
import { Home, MessageCircle, Calendar, ShoppingBag } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getEvolutionEmoji } from '../../utils/pregnancyUtils';
import type { TabId } from '../../types';

function TabBtn({
  id, label, active, onClick, children,
}: {
  id: TabId; label: string; active: boolean; onClick: () => void; children: ReactNode;
}) {
  return (
    <button
      data-testid={`tab-${id}`}
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`flex flex-col items-center gap-0.5 w-14 py-1 rounded-xl transition-colors ${
        active ? 'text-sara-gold' : 'text-graphite-muted'
      }`}
    >
      {children}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export function BottomTabBar() {
  const { activeTab, setActiveTab, phase } = useAppStore();

  return (
    <nav
      data-testid="bottom-tab-bar"
      className="flex-shrink-0 bg-sara-linen/90 backdrop-blur-md border-t border-white/40 flex items-center justify-around px-2 pt-1 pb-2 h-[68px]"
    >
      <TabBtn id="home" label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')}>
        <Home size={22} strokeWidth={1.8} />
      </TabBtn>

      <TabBtn id="maeIA" label="MãeIA" active={activeTab === 'maeIA'} onClick={() => setActiveTab('maeIA')}>
        <MessageCircle size={22} strokeWidth={1.8} />
      </TabBtn>

      <div className="flex flex-col items-center -translate-y-3">
        <motion.button
          data-testid="baby-central-button"
          onClick={() => setActiveTab('baby')}
          aria-label="Abrir rotina do bebê"
          aria-pressed={activeTab === 'baby'}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg shadow-sara-terracotta/30 transition-colors ${
            activeTab === 'baby'
              ? 'bg-sara-gold ring-2 ring-sara-terracotta ring-offset-2'
              : 'bg-sara-terracotta'
          }`}
        >
          {getEvolutionEmoji(phase)}
        </motion.button>
        <span className="text-[10px] font-medium text-graphite-muted mt-1">Bebê</span>
      </div>

      <TabBtn id="rotina" label="Rotina" active={activeTab === 'rotina'} onClick={() => setActiveTab('rotina')}>
        <Calendar size={22} strokeWidth={1.8} />
      </TabBtn>

      <TabBtn id="shopping" label="Shopping" active={activeTab === 'shopping'} onClick={() => setActiveTab('shopping')}>
        <ShoppingBag size={22} strokeWidth={1.8} />
      </TabBtn>
    </nav>
  );
}
```

- [ ] **Step 9: Run all tests**

```
npx vitest run
```
Expected: all tests pass (TypeScript compiles cleanly with `'rotina'` in TabId).

- [ ] **Step 10: Commit**

```bash
git add src/types/index.ts src/App.tsx src/components/layout/BottomTabBar.tsx src/components/layout/BottomTabBar.test.tsx src/App.test.tsx
git commit -m "feat: add rotina tab, route home→feed, comunidade alias"
```

---

### Task 2: ComposerBar Component

**Files:**
- Create: `src/components/comunidade/ComposerBar.tsx`
- Create: `src/components/comunidade/ComposerBar.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/comunidade/ComposerBar.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ComposerBar } from './ComposerBar';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  useAppStore.setState({ motherName: 'Mariana' });
});

describe('ComposerBar', () => {
  it('renders avatar initial from motherName', () => {
    render(<ComposerBar onOpen={vi.fn()} />);
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('renders placeholder text', () => {
    render(<ComposerBar onOpen={vi.fn()} />);
    expect(screen.getByText('O que você está sentindo hoje?')).toBeInTheDocument();
  });

  it('calls onOpen when clicked', () => {
    const onOpen = vi.fn();
    render(<ComposerBar onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Escrever post' }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('uses first letter of a different motherName as initial', () => {
    useAppStore.setState({ motherName: 'Fernanda' });
    render(<ComposerBar onOpen={vi.fn()} />);
    expect(screen.getByText('F')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
npx vitest run src/components/comunidade/ComposerBar.test.tsx
```
Expected: FAIL — module `./ComposerBar` not found.

- [ ] **Step 3: Create `src/components/comunidade/ComposerBar.tsx`**

```tsx
import { Camera } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface ComposerBarProps {
  onOpen: () => void;
}

export function ComposerBar({ onOpen }: ComposerBarProps) {
  const motherName = useAppStore((s) => s.motherName);
  const initial = motherName[0]?.toUpperCase() ?? 'M';

  return (
    <button
      onClick={onOpen}
      aria-label="Escrever post"
      className="mx-4 mb-3 bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-3 flex items-center gap-3 w-[calc(100%-2rem)]"
    >
      <div className="w-8 h-8 rounded-full bg-sara-terracotta text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
        {initial}
      </div>
      <span className="flex-1 text-left text-graphite-muted text-sm">
        O que você está sentindo hoje?
      </span>
      <Camera size={20} className="text-sara-gold flex-shrink-0" />
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx vitest run src/components/comunidade/ComposerBar.test.tsx
```
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/comunidade/ComposerBar.tsx src/components/comunidade/ComposerBar.test.tsx
git commit -m "feat: ComposerBar component"
```

---

### Task 3: ComunidadeScreen — ComposerBar + FAB + PostCard Image

**Files:**
- Modify: `src/components/comunidade/ComunidadeScreen.tsx`
- Modify: `src/components/comunidade/ComunidadeScreen.test.tsx`

- [ ] **Step 1: Update tests first**

Replace all content of `src/components/comunidade/ComunidadeScreen.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { ComunidadeScreen } from './ComunidadeScreen';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  useAppStore.setState({
    motherName: 'Mariana',
    communityPosts: [
      {
        id: '1', category: 'gestação', author: 'Fernanda S.', badge: 'experiente',
        content: 'Post de gestação', likes: 24, replies: 8, time: '2h',
        communityId: 'gestacao-primeiro-tri',
      },
      {
        id: '2', category: 'amamentação', author: 'Dra. Carla Lima', badge: 'profissional',
        content: 'Post de amamentação', likes: 67, replies: 12, time: '4h',
        communityId: 'amamentacao-apoio',
        imageUrl: 'data:image/png;base64,fakedata',
      },
    ],
    communities: [
      {
        id: 'amamentacao-apoio',
        name: 'Amamentação com Apoio',
        description: 'Dúvidas da amamentação.',
        category: 'amamentação',
        memberCount: 3210,
        colorKey: 'warm',
      },
    ],
    followedCommunityIds: ['amamentacao-apoio'],
    phase: { stage: 'pregnant', week: 28 },
    motherProfile: null,
  });
});

describe('ComunidadeScreen', () => {
  it('renders Para Você and Comunidades top tabs', () => {
    render(<ComunidadeScreen />);
    expect(screen.getByRole('button', { name: /para você/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /comunidades/i })).toBeInTheDocument();
  });

  it('defaults to Para Você tab showing the feed', () => {
    render(<ComunidadeScreen />);
    expect(screen.getAllByTestId('post-card').length).toBeGreaterThan(0);
  });

  it('switches to communities list when Comunidades tab is clicked', () => {
    render(<ComunidadeScreen />);
    fireEvent.click(screen.getByRole('button', { name: /comunidades/i }));
    expect(screen.getByRole('button', { name: /seguindo/i })).toBeInTheDocument();
    expect(screen.queryAllByTestId('post-card')).toHaveLength(0);
  });

  it('shows category filter buttons in Para Você tab', () => {
    render(<ComunidadeScreen />);
    expect(screen.getByRole('button', { name: /todos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /amamentação/i })).toBeInTheDocument();
  });

  it('filters posts by category in Para Você', () => {
    render(<ComunidadeScreen />);
    fireEvent.click(screen.getByRole('button', { name: /amamentação/i }));
    const posts = screen.getAllByTestId('post-card');
    posts.forEach((post) => {
      expect(post.getAttribute('data-category')).toBe('amamentação');
    });
  });

  it('does not show Desabafar button', () => {
    render(<ComunidadeScreen />);
    expect(screen.queryByRole('button', { name: 'Desabafar' })).not.toBeInTheDocument();
  });

  it('shows ComposerBar in Para Você tab', () => {
    render(<ComunidadeScreen />);
    expect(screen.getByText('O que você está sentindo hoje?')).toBeInTheDocument();
  });

  it('hides ComposerBar in Comunidades tab', () => {
    render(<ComunidadeScreen />);
    fireEvent.click(screen.getByRole('button', { name: /comunidades/i }));
    expect(screen.queryByText('O que você está sentindo hoje?')).not.toBeInTheDocument();
  });

  it('shows FAB in Para Você tab', () => {
    render(<ComunidadeScreen />);
    expect(screen.getByRole('button', { name: 'Criar post' })).toBeInTheDocument();
  });

  it('hides FAB in Comunidades tab', () => {
    render(<ComunidadeScreen />);
    fireEvent.click(screen.getByRole('button', { name: /comunidades/i }));
    expect(screen.queryByRole('button', { name: 'Criar post' })).not.toBeInTheDocument();
  });

  it('renders image when post has imageUrl', () => {
    render(<ComunidadeScreen />);
    const img = screen.getByAltText('Imagem do post');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'data:image/png;base64,fakedata');
  });

  it('renders exactly one image for the one post with imageUrl', () => {
    render(<ComunidadeScreen />);
    expect(screen.getAllByAltText('Imagem do post')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run src/components/comunidade/ComunidadeScreen.test.tsx
```
Expected: multiple FAIL — Desabafar still present, ComposerBar/FAB/image missing.

- [ ] **Step 3: Replace `src/components/comunidade/ComunidadeScreen.tsx`**

```tsx
import { useState } from 'react';
import { MessageCircle, Heart, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { CreatePostScreen } from './CreatePostScreen';
import { PostDetailScreen } from '../post/PostDetailScreen';
import { ComunidadesScreen } from './ComunidadesScreen';
import { ComposerBar } from './ComposerBar';
import type { CommunityPost } from '../../types';

type TopTab = 'para-voce' | 'comunidades';
type Category = 'todos' | CommunityPost['category'];

const BADGE_CONFIG = {
  experiente:   { label: 'Mãe Experiente',       color: 'bg-sara-linen text-sara-terracotta' },
  profissional: { label: 'Profissional de Saúde', color: 'bg-sara-cream text-sara-warm' },
} as const;

const CATEGORY_LABELS: Category[] = ['todos', 'gestação', 'pós-parto', 'amamentação', 'saúde mental'];

function PostCard({ post, onOpen }: { post: CommunityPost; onOpen: () => void }) {
  const [liked, setLiked] = useState(false);
  const badge = post.badge ? BADGE_CONFIG[post.badge] : null;

  return (
    <div
      data-testid="post-card"
      data-category={post.category}
      className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-3"
    >
      <button onClick={onOpen} aria-label={`Ver post de ${post.author}`} className="text-left flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-graphite">{post.author}</p>
            {badge && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full w-fit ${badge.color}`}>
                {badge.label}
              </span>
            )}
          </div>
          <span className="text-xs text-graphite-muted flex-shrink-0">{post.time}</span>
        </div>
        <p className="text-sm text-graphite-light leading-relaxed">{post.content}</p>
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt="Imagem do post"
            className="w-full rounded-xl object-cover max-h-64 mt-2"
          />
        )}
      </button>

      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={() => setLiked((v) => !v)}
          aria-label={liked ? 'Descurtir' : 'Curtir'}
          aria-pressed={liked}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            liked ? 'text-sara-terracotta' : 'text-graphite-muted'
          }`}
        >
          <Heart size={14} fill={liked ? 'currentColor' : 'none'} strokeWidth={1.8} />
          {post.likes + (liked ? 1 : 0)}
        </button>
        <button
          onClick={onOpen}
          aria-label={`Ver ${post.replies} respostas`}
          className="flex items-center gap-1.5 text-xs text-graphite-muted"
        >
          <MessageCircle size={14} strokeWidth={1.8} />
          {post.replies}
        </button>
      </div>
    </div>
  );
}

export function ComunidadeScreen() {
  const communityPosts = useAppStore((s) => s.communityPosts);
  const followedCommunityIds = useAppStore((s) => s.followedCommunityIds);
  const [topTab, setTopTab] = useState<TopTab>('para-voce');
  const [activeCategory, setActiveCategory] = useState<Category>('todos');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

  if (selectedPost) {
    return <PostDetailScreen post={selectedPost} onBack={() => setSelectedPost(null)} />;
  }

  if (showCreate) {
    return <CreatePostScreen onBack={() => setShowCreate(false)} />;
  }

  const prioritized = [
    ...communityPosts.filter((p) => p.communityId && followedCommunityIds.includes(p.communityId)),
    ...communityPosts.filter((p) => !p.communityId || !followedCommunityIds.includes(p.communityId)),
  ];

  const filtered = activeCategory === 'todos'
    ? prioritized
    : prioritized.filter((p) => p.category === activeCategory);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="px-4 pt-4">
        <h1 className="text-base font-semibold text-graphite">Comunidade</h1>
      </div>

      <div className="flex gap-1 px-4 border-b border-sara-linen">
        {(['para-voce', 'comunidades'] as TopTab[]).map((tab) => {
          const label = tab === 'para-voce' ? 'Para Você' : 'Comunidades';
          const active = topTab === tab;
          return (
            <button
              key={tab}
              aria-pressed={active}
              onClick={() => {
                setTopTab(tab);
                setActiveCategory('todos');
              }}
              aria-label={label}
              className={`px-4 py-2 text-sm font-semibold transition-colors relative ${
                active ? 'text-sara-gold' : 'text-graphite-muted'
              }`}
            >
              {label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sara-gold rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {topTab === 'para-voce' ? (
        <>
          <ComposerBar onOpen={() => setShowCreate(true)} />

          <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4">
            {CATEGORY_LABELS.map((cat) => {
              const label = cat === 'todos' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1);
              return (
                <button
                  key={cat}
                  aria-pressed={activeCategory === cat}
                  onClick={() => setActiveCategory(cat)}
                  aria-label={label}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-sara-gold text-white'
                      : 'bg-white text-graphite-muted'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 px-4">
            {filtered.map((post) => (
              <PostCard key={post.id} post={post} onOpen={() => setSelectedPost(post)} />
            ))}
          </div>

          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', duration: 0.3 }}
            onClick={() => setShowCreate(true)}
            className="fixed bottom-24 right-4 z-20 w-14 h-14 rounded-full bg-sara-gold text-white shadow-lg flex items-center justify-center"
            aria-label="Criar post"
          >
            <Plus size={24} />
          </motion.button>
        </>
      ) : (
        <ComunidadesScreen />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```
npx vitest run src/components/comunidade/ComunidadeScreen.test.tsx
```
Expected: 12 tests PASS.

- [ ] **Step 5: Run full suite to check for regressions**

```
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/comunidade/ComunidadeScreen.tsx src/components/comunidade/ComunidadeScreen.test.tsx
git commit -m "feat: ComunidadeScreen — ComposerBar, FAB, remove Desabafar, PostCard image"
```

---

### Task 4: CreatePostScreen — Image Upload

**Files:**
- Modify: `src/components/comunidade/CreatePostScreen.tsx`
- Create: `src/components/comunidade/CreatePostScreen.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/comunidade/CreatePostScreen.test.tsx`:

```tsx
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { CreatePostScreen } from './CreatePostScreen';
import { useAppStore } from '../../store/useAppStore';

// Synchronous FileReader mock: readAsDataURL immediately fires onload
class MockFileReader {
  result = 'data:image/png;base64,fakedata';
  onload: ((e: any) => void) | null = null;
  readAsDataURL(_file: File) {
    this.onload?.({ target: this });
  }
}

beforeEach(() => {
  useAppStore.setState({ motherName: 'Mariana', communityPosts: [] });
  vi.stubGlobal('FileReader', MockFileReader);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CreatePostScreen', () => {
  it('renders textarea and publish button', () => {
    render(<CreatePostScreen onBack={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /publicar/i })).toBeInTheDocument();
  });

  it('renders Adicionar foto button', () => {
    render(<CreatePostScreen onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /adicionar foto/i })).toBeInTheDocument();
  });

  it('shows image preview after file is selected', async () => {
    render(<CreatePostScreen onBack={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['hello'], 'photo.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    const preview = screen.getByRole('img', { name: 'Preview' });
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveAttribute('src', 'data:image/png;base64,fakedata');
  });

  it('removes preview when X button is clicked', async () => {
    render(<CreatePostScreen onBack={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['hello'], 'photo.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect(screen.getByRole('img', { name: 'Preview' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remover imagem' }));
    expect(screen.queryByRole('img', { name: 'Preview' })).not.toBeInTheDocument();
  });

  it('submits post with imageUrl when image is selected', async () => {
    render(<CreatePostScreen onBack={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['hello'], 'photo.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Meu desabafo' } });
    fireEvent.click(screen.getByRole('button', { name: /publicar/i }));
    const posts = useAppStore.getState().communityPosts;
    expect(posts[0].imageUrl).toBe('data:image/png;base64,fakedata');
    expect(posts[0].content).toBe('Meu desabafo');
  });

  it('submits post without imageUrl when no image selected', () => {
    render(<CreatePostScreen onBack={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Só texto' } });
    fireEvent.click(screen.getByRole('button', { name: /publicar/i }));
    const posts = useAppStore.getState().communityPosts;
    expect(posts[0].imageUrl).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
npx vitest run src/components/comunidade/CreatePostScreen.test.tsx
```
Expected: FAIL — no image upload button, `imageUrl` not passed to `addCommunityPost`.

- [ ] **Step 3: Replace `src/components/comunidade/CreatePostScreen.tsx`**

```tsx
import { useState, useRef } from 'react';
import { ArrowLeft, ImagePlus, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { CommunityPost } from '../../types';

type PostCategory = CommunityPost['category'];

const CATEGORIES: { value: PostCategory; label: string }[] = [
  { value: 'gestação',      label: 'Gestação' },
  { value: 'pós-parto',    label: 'Pós-parto' },
  { value: 'amamentação',  label: 'Amamentação' },
  { value: 'saúde mental', label: 'Saúde Mental' },
];

interface CreatePostScreenProps {
  onBack: () => void;
}

export function CreatePostScreen({ onBack }: CreatePostScreenProps) {
  const addCommunityPost = useAppStore((s) => s.addCommunityPost);
  const motherName = useAppStore((s) => s.motherName);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategory>('saúde mental');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handlePublish() {
    if (!content.trim()) return;
    addCommunityPost({
      author: motherName,
      content: content.trim(),
      category,
      imageUrl: imagePreview ?? undefined,
    });
    onBack();
  }

  return (
    <div className="flex flex-col gap-4 pb-6 h-full">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="w-9 h-9 rounded-xl bg-sara-linen flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-sara-gold" strokeWidth={1.8} />
        </button>
        <h1 className="text-base font-semibold text-graphite">Desabafar</h1>
      </div>

      <div className="px-4 flex flex-col gap-3 flex-1">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="O que você está sentindo? Este é um espaço seguro 💜"
          autoFocus
          rows={7}
          className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-graphite-muted leading-relaxed resize-none focus:outline-none focus:border-sara-gold"
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          aria-label="Adicionar foto"
          className="flex items-center gap-2 text-sm text-sara-gold font-medium"
        >
          <ImagePlus size={18} />
          Adicionar foto
        </button>

        {imagePreview && (
          <div className="relative mt-1">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full rounded-xl object-cover max-h-48"
            />
            <button
              onClick={() => setImagePreview(null)}
              aria-label="Remover imagem"
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-graphite-muted">Categoria</p>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                aria-pressed={category === cat.value}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  category === cat.value
                    ? 'bg-sara-gold text-white'
                    : 'bg-white text-graphite-muted border border-sara-linen'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4">
        <button
          onClick={handlePublish}
          disabled={!content.trim()}
          className="w-full py-3.5 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-40"
        >
          Publicar 💜
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```
npx vitest run src/components/comunidade/CreatePostScreen.test.tsx
```
Expected: 6 tests PASS.

- [ ] **Step 5: Run full suite**

```
npx vitest run
```
Expected: all tests pass (previously 60, now ~80 with the new test files).

- [ ] **Step 6: Commit**

```bash
git add src/components/comunidade/CreatePostScreen.tsx src/components/comunidade/CreatePostScreen.test.tsx
git commit -m "feat: CreatePostScreen — image upload with FileReader preview"
```
