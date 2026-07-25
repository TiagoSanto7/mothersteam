# Comunidades Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-tab navigation ("Para Você" / "Comunidades") inside `ComunidadeScreen`, with a new communities list showing "Seguindo" and "Sugestões" sub-filters, backed by mock data and Zustand state.

**Architecture:** The existing `ComunidadeScreen` gains a top tab bar; tab 1 keeps the current feed with followed-community prioritization; tab 2 renders a new `ComunidadesScreen` component with `CommunityCard` items. All data is client-side mock — no backend.

**Tech Stack:** React 18, TypeScript, Zustand (persist), Tailwind CSS (Sara Warm Sanctuary tokens), Vitest + Testing Library.

---

## File Map

| Status | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/types/index.ts` | Add `Community` interface + `CommunityColorKey` type; add `communityId?: string` to `CommunityPost` |
| Modify | `src/store/useAppStore.ts` | Add `communities`, `followedCommunityIds`, `joinCommunity`, `leaveCommunity`; add seed communities; assign `communityId` to seed posts |
| Create | `src/components/comunidade/CommunityCard.tsx` | Glassmorphism card: name, description, member count, follow/leave button |
| Create | `src/components/comunidade/CommunityCard.test.tsx` | Unit tests for CommunityCard |
| Create | `src/components/comunidade/ComunidadesScreen.tsx` | Communities list with "Seguindo" / "Sugestões" sub-filters and relevance sorting |
| Create | `src/components/comunidade/ComunidadesScreen.test.tsx` | Unit tests for ComunidadesScreen |
| Modify | `src/components/comunidade/ComunidadeScreen.tsx` | Add top tab bar ("Para Você" / "Comunidades"), prioritize followed-community posts in Para Você |
| Modify | `src/components/comunidade/ComunidadeScreen.test.tsx` | Update tests to cover tab switching |

---

## Task 1: Add Community types to `src/types/index.ts`

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add the new types after the `Chat` interface**

Open `src/types/index.ts` and append at the end of the file:

```typescript
export type CommunityColorKey = 'gold' | 'terracotta' | 'warm' | 'linen' | 'cream';

export interface Community {
  id: string;
  name: string;
  description: string;
  category: CommunityPost['category'];
  memberCount: number;
  colorKey: CommunityColorKey;
}
```

Also add `communityId?: string` inside `CommunityPost` (after `isRepost?`):

```typescript
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
  communityId?: string;   // ← new, optional for backwards compat
}
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```
npx tsc --noEmit
```

Expected: no output (exit 0). If errors appear, fix them before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add Community type and communityId to CommunityPost"
```

---

## Task 2: Update store — seed communities + new state + actions

**Files:**
- Modify: `src/store/useAppStore.ts`

- [ ] **Step 1: Add Community to the import line at the top**

Change the import on line 3 from:

```typescript
import type { TabId, PregnancyPhase, RoutineEntry, BabyEntry, OnboardingAnswers, MotherProfile, CommunityPost, AppNotification, PostComment, Chat } from '../types';
```

to:

```typescript
import type { TabId, PregnancyPhase, RoutineEntry, BabyEntry, OnboardingAnswers, MotherProfile, CommunityPost, Community, AppNotification, PostComment, Chat } from '../types';
```

- [ ] **Step 2: Add `SEED_COMMUNITIES` constant after `SEED_POSTS`**

Insert after the closing `];` of `SEED_POSTS` (around line 46):

```typescript
const SEED_COMMUNITIES: Community[] = [
  {
    id: 'gestacao-primeiro-tri',
    name: 'Gestantes — 1° Trimestre',
    description: 'Compartilhe as descobertas e dúvidas dos primeiros meses.',
    category: 'gestação',
    memberCount: 1840,
    colorKey: 'terracotta',
  },
  {
    id: 'reta-final',
    name: 'Reta Final',
    description: 'Para quem está nas últimas semanas e se preparando para o grande dia.',
    category: 'gestação',
    memberCount: 923,
    colorKey: 'gold',
  },
  {
    id: 'amamentacao-apoio',
    name: 'Amamentação com Apoio',
    description: 'Dúvidas, desafios e conquistas da amamentação, sem julgamentos.',
    category: 'amamentação',
    memberCount: 3210,
    colorKey: 'warm',
  },
  {
    id: 'pos-parto-real',
    name: 'Pós-parto Real',
    description: 'O quarto trimestre sem filtros: corpo, mente e recomeço.',
    category: 'pós-parto',
    memberCount: 2670,
    colorKey: 'linen',
  },
  {
    id: 'saude-mental',
    name: 'Saúde Mental na Maternidade',
    description: 'Espaço seguro para falar sobre ansiedade, depressão pós-parto e bem-estar.',
    category: 'saúde mental',
    memberCount: 4120,
    colorKey: 'cream',
  },
  {
    id: 'maes-solo',
    name: 'Mães Solo',
    description: 'Força, troca e comunidade para quem caminha pela maternidade sozinha.',
    category: 'pós-parto',
    memberCount: 1560,
    colorKey: 'terracotta',
  },
];
```

- [ ] **Step 3: Add `communityId` to the seed posts**

Replace the `SEED_POSTS` constant so each post carries its `communityId`:

```typescript
const SEED_POSTS: CommunityPost[] = [
  {
    id: '1', category: 'gestação', author: 'Fernanda S.', badge: 'experiente',
    content: 'Dicas para aliviar o enjoo do primeiro trimestre: gengibre em cápsulas ajudou muito!',
    likes: 24, replies: 8, time: '2h', communityId: 'gestacao-primeiro-tri',
  },
  {
    id: '2', category: 'amamentação', author: 'Dra. Carla Lima', badge: 'profissional',
    content: 'Posição correta para amamentar: costas apoiadas, bebê de frente para o peito, barriga com barriga.',
    likes: 67, replies: 12, time: '4h', communityId: 'amamentacao-apoio',
  },
  {
    id: '3', category: 'saúde mental', author: 'Juliana M.',
    content: 'Alguém mais sentiu que a solidão do puerpério é diferente de tudo? Precisava desabafar.',
    likes: 89, replies: 31, time: '5h', communityId: 'saude-mental',
  },
  {
    id: '4', category: 'pós-parto', author: 'Renata P.', badge: 'experiente',
    content: 'Cinta pós-cesárea: comecei a usar no hospital e fez diferença na recuperação.',
    likes: 45, replies: 9, time: '8h', communityId: 'pos-parto-real',
  },
  {
    id: '5', category: 'amamentação', author: 'Priscila T.',
    content: 'Meu bebê estava com dificuldade de pegar o bico. A fonoaudióloga resolveu em 2 sessões!',
    likes: 33, replies: 14, time: '10h', communityId: 'amamentacao-apoio',
  },
];
```

- [ ] **Step 4: Extend `AppState` interface with communities fields and actions**

Inside the `interface AppState { ... }` block, add after `postComments: Record<string, PostComment[]>;`:

```typescript
  communities: Community[];
  followedCommunityIds: string[];
  // Actions — Communities
  joinCommunity: (id: string) => void;
  leaveCommunity: (id: string) => void;
```

- [ ] **Step 5: Add initial state and action implementations inside `create()`**

Inside the `(set) => ({ ... })` object, add after `postComments: SEED_POST_COMMENTS,`:

```typescript
      communities: SEED_COMMUNITIES,
      followedCommunityIds: ['amamentacao-apoio'],
```

And add the action implementations after `markChatRead`:

```typescript
      joinCommunity: (id) =>
        set((s) => ({
          followedCommunityIds: s.followedCommunityIds.includes(id)
            ? s.followedCommunityIds
            : [...s.followedCommunityIds, id],
        })),
      leaveCommunity: (id) =>
        set((s) => ({
          followedCommunityIds: s.followedCommunityIds.filter((cid) => cid !== id),
        })),
```

- [ ] **Step 6: Verify TypeScript compiles**

```
npx tsc --noEmit
```

Expected: no output (exit 0).

- [ ] **Step 7: Run existing tests to verify nothing broke**

```
npm test
```

Expected: all existing tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/store/useAppStore.ts
git commit -m "feat: add communities state, seed data, joinCommunity/leaveCommunity actions"
```

---

## Task 3: Create `CommunityCard` — tests first, then component

**Files:**
- Create: `src/components/comunidade/CommunityCard.test.tsx`
- Create: `src/components/comunidade/CommunityCard.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/comunidade/CommunityCard.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommunityCard } from './CommunityCard';
import type { Community } from '../../types';

const MOCK_COMMUNITY: Community = {
  id: 'amamentacao-apoio',
  name: 'Amamentação com Apoio',
  description: 'Dúvidas, desafios e conquistas da amamentação, sem julgamentos.',
  category: 'amamentação',
  memberCount: 3210,
  colorKey: 'warm',
};

describe('CommunityCard', () => {
  it('renders community name with serif font class', () => {
    render(<CommunityCard community={MOCK_COMMUNITY} isFollowing={false} onToggle={vi.fn()} />);
    const title = screen.getByText('Amamentação com Apoio');
    expect(title).toBeInTheDocument();
    expect(title.className).toMatch(/font-serif/);
  });

  it('renders description and member count', () => {
    render(<CommunityCard community={MOCK_COMMUNITY} isFollowing={false} onToggle={vi.fn()} />);
    expect(screen.getByText(/dúvidas, desafios/i)).toBeInTheDocument();
    expect(screen.getByText(/3\.210/)).toBeInTheDocument();
  });

  it('shows "Seguir" button when not following', () => {
    render(<CommunityCard community={MOCK_COMMUNITY} isFollowing={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('button', { name: /seguir/i })).toBeInTheDocument();
  });

  it('shows "Seguindo" button when following', () => {
    render(<CommunityCard community={MOCK_COMMUNITY} isFollowing={true} onToggle={vi.fn()} />);
    expect(screen.getByRole('button', { name: /seguindo/i })).toBeInTheDocument();
  });

  it('calls onToggle with community id on button click', () => {
    const onToggle = vi.fn();
    render(<CommunityCard community={MOCK_COMMUNITY} isFollowing={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: /seguir/i }));
    expect(onToggle).toHaveBeenCalledWith('amamentacao-apoio');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test -- CommunityCard
```

Expected: FAIL — "Cannot find module './CommunityCard'"

- [ ] **Step 3: Create the component**

Create `src/components/comunidade/CommunityCard.tsx`:

```typescript
import { Users } from 'lucide-react';
import type { Community, CommunityColorKey } from '../../types';

interface CommunityCardProps {
  community: Community;
  isFollowing: boolean;
  onToggle: (id: string) => void;
}

const COLOR_CONFIG: Record<CommunityColorKey, { avatarBg: string; avatarText: string }> = {
  gold:       { avatarBg: 'bg-sara-linen', avatarText: 'text-sara-gold' },
  terracotta: { avatarBg: 'bg-sara-linen', avatarText: 'text-sara-terracotta' },
  warm:       { avatarBg: 'bg-sara-cream', avatarText: 'text-sara-warm' },
  linen:      { avatarBg: 'bg-sara-linen', avatarText: 'text-sara-charcoal' },
  cream:      { avatarBg: 'bg-sara-cream', avatarText: 'text-sara-charcoal' },
};

export function CommunityCard({ community, isFollowing, onToggle }: CommunityCardProps) {
  const { avatarBg, avatarText } = COLOR_CONFIG[community.colorKey];

  return (
    <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-3xl p-4 flex items-start gap-3 shadow-sm">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${avatarBg}`}>
        <span className={`text-lg font-serif font-semibold ${avatarText}`}>
          {community.name.charAt(0)}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold font-serif text-graphite leading-snug">
          {community.name}
        </h3>
        <p className="text-xs text-graphite-muted leading-relaxed mt-0.5 line-clamp-2">
          {community.description}
        </p>
        <div className="flex items-center gap-1 mt-1.5">
          <Users size={11} className="text-graphite-muted" strokeWidth={1.8} />
          <span className="text-[10px] text-graphite-muted">
            {community.memberCount.toLocaleString('pt-BR')} membros
          </span>
        </div>
      </div>

      <button
        onClick={() => onToggle(community.id)}
        aria-label={isFollowing ? 'Seguindo' : 'Seguir'}
        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
          isFollowing
            ? 'bg-sara-linen text-sara-warm border border-sara-linen'
            : 'bg-sara-gold text-white'
        }`}
      >
        {isFollowing ? 'Seguindo' : 'Seguir'}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test -- CommunityCard
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/comunidade/CommunityCard.tsx src/components/comunidade/CommunityCard.test.tsx
git commit -m "feat: add CommunityCard component with glassmorphism and follow toggle"
```

---

## Task 4: Create `ComunidadesScreen` — tests first, then component

**Files:**
- Create: `src/components/comunidade/ComunidadesScreen.test.tsx`
- Create: `src/components/comunidade/ComunidadesScreen.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/comunidade/ComunidadesScreen.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { ComunidadesScreen } from './ComunidadesScreen';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  useAppStore.setState({
    communities: [
      {
        id: 'amamentacao-apoio',
        name: 'Amamentação com Apoio',
        description: 'Dúvidas da amamentação.',
        category: 'amamentação',
        memberCount: 3210,
        colorKey: 'warm',
      },
      {
        id: 'pos-parto-real',
        name: 'Pós-parto Real',
        description: 'O quarto trimestre sem filtros.',
        category: 'pós-parto',
        memberCount: 2670,
        colorKey: 'linen',
      },
      {
        id: 'saude-mental',
        name: 'Saúde Mental na Maternidade',
        description: 'Espaço seguro.',
        category: 'saúde mental',
        memberCount: 4120,
        colorKey: 'cream',
      },
    ],
    followedCommunityIds: ['amamentacao-apoio'],
    phase: { stage: 'postpartum', ageInDays: 30 },
    motherProfile: null,
  });
});

describe('ComunidadesScreen', () => {
  it('renders Seguindo and Sugestões sub-filter buttons', () => {
    render(<ComunidadesScreen />);
    expect(screen.getByRole('button', { name: /seguindo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sugestões/i })).toBeInTheDocument();
  });

  it('shows only followed communities in Seguindo tab', () => {
    render(<ComunidadesScreen />);
    fireEvent.click(screen.getByRole('button', { name: /seguindo/i }));
    expect(screen.getByText('Amamentação com Apoio')).toBeInTheDocument();
    expect(screen.queryByText('Pós-parto Real')).not.toBeInTheDocument();
  });

  it('shows only non-followed communities in Sugestões tab', () => {
    render(<ComunidadesScreen />);
    fireEvent.click(screen.getByRole('button', { name: /sugestões/i }));
    expect(screen.queryByText('Amamentação com Apoio')).not.toBeInTheDocument();
    expect(screen.getByText('Pós-parto Real')).toBeInTheDocument();
    expect(screen.getByText('Saúde Mental na Maternidade')).toBeInTheDocument();
  });

  it('defaults to Seguindo sub-filter', () => {
    render(<ComunidadesScreen />);
    const seguindoButton = screen.getByRole('button', { name: /seguindo/i });
    expect(seguindoButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows empty state message when following no communities', () => {
    useAppStore.setState({ followedCommunityIds: [] });
    render(<ComunidadesScreen />);
    expect(screen.getByText(/você ainda não segue/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test -- ComunidadesScreen
```

Expected: FAIL — "Cannot find module './ComunidadesScreen'"

- [ ] **Step 3: Create the component**

Create `src/components/comunidade/ComunidadesScreen.tsx`:

```typescript
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { CommunityCard } from './CommunityCard';
import type { Community, ArchetypeKey, PregnancyPhase } from '../../types';

type SubFilter = 'seguindo' | 'sugestoes';

function getSuggestionScore(community: Community, phase: PregnancyPhase, archetypeKey: ArchetypeKey | undefined): number {
  let score = 0;
  if (phase.stage === 'pregnant' && community.category === 'gestação') score += 3;
  if (phase.stage === 'postpartum' && (community.category === 'pós-parto' || community.category === 'amamentação')) score += 3;
  if (archetypeKey === 'ana' && community.category === 'saúde mental') score += 2;
  if (archetypeKey === 'rute' && community.id === 'maes-solo') score += 2;
  return score;
}

export function ComunidadesScreen() {
  const communities = useAppStore((s) => s.communities);
  const followedCommunityIds = useAppStore((s) => s.followedCommunityIds);
  const joinCommunity = useAppStore((s) => s.joinCommunity);
  const leaveCommunity = useAppStore((s) => s.leaveCommunity);
  const phase = useAppStore((s) => s.phase);
  const motherProfile = useAppStore((s) => s.motherProfile);
  const [subFilter, setSubFilter] = useState<SubFilter>('seguindo');

  function handleToggle(id: string) {
    if (followedCommunityIds.includes(id)) {
      leaveCommunity(id);
    } else {
      joinCommunity(id);
    }
  }

  const followed = communities.filter((c) => followedCommunityIds.includes(c.id));

  const suggestions = communities
    .filter((c) => !followedCommunityIds.includes(c.id))
    .sort((a, b) =>
      getSuggestionScore(b, phase, motherProfile?.archetypeKey) -
      getSuggestionScore(a, phase, motherProfile?.archetypeKey)
    );

  const displayList = subFilter === 'seguindo' ? followed : suggestions;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 px-4">
        {(['seguindo', 'sugestoes'] as SubFilter[]).map((f) => {
          const label = f === 'seguindo' ? 'Seguindo' : 'Sugestões';
          return (
            <button
              key={f}
              aria-pressed={subFilter === f}
              onClick={() => setSubFilter(f)}
              aria-label={label}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                subFilter === f
                  ? 'bg-sara-gold text-white'
                  : 'bg-white/70 text-graphite-muted border border-white/50'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 px-4">
        {displayList.length === 0 ? (
          <p className="text-sm text-graphite-muted text-center py-8">
            {subFilter === 'seguindo'
              ? 'Você ainda não segue nenhuma comunidade. Explore as sugestões!'
              : 'Todas as comunidades disponíveis já estão no seu feed.'}
          </p>
        ) : (
          displayList.map((community) => (
            <CommunityCard
              key={community.id}
              community={community}
              isFollowing={followedCommunityIds.includes(community.id)}
              onToggle={handleToggle}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test -- ComunidadesScreen
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/comunidade/ComunidadesScreen.tsx src/components/comunidade/ComunidadesScreen.test.tsx
git commit -m "feat: add ComunidadesScreen with Seguindo/Sugestões sub-filters"
```

---

## Task 5: Update `ComunidadeScreen` — top tab nav + Para Você prioritization

**Files:**
- Modify: `src/components/comunidade/ComunidadeScreen.tsx`
- Modify: `src/components/comunidade/ComunidadeScreen.test.tsx`

- [ ] **Step 1: Write new tests first (add to existing test file)**

Replace the full content of `src/components/comunidade/ComunidadeScreen.test.tsx` with:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { ComunidadeScreen } from './ComunidadeScreen';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  useAppStore.setState({
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

  it('shows Desabafar button in Para Você tab', () => {
    render(<ComunidadeScreen />);
    expect(screen.getByRole('button', { name: /desabafar/i })).toBeInTheDocument();
  });

  it('hides Desabafar button when on Comunidades tab', () => {
    render(<ComunidadeScreen />);
    fireEvent.click(screen.getByRole('button', { name: /comunidades/i }));
    expect(screen.queryByRole('button', { name: /desabafar/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run new tests to verify they fail**

```
npm test -- ComunidadeScreen
```

Expected: several tests FAIL (tab tests don't exist yet in the component).

- [ ] **Step 3: Rewrite `ComunidadeScreen.tsx` with top tabs**

Replace the full content of `src/components/comunidade/ComunidadeScreen.tsx`:

```typescript
import { useState } from 'react';
import { MessageCircle, Heart } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { CreatePostScreen } from './CreatePostScreen';
import { PostDetailScreen } from '../post/PostDetailScreen';
import { ComunidadesScreen } from './ComunidadesScreen';
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
      <button onClick={onOpen} className="text-left flex flex-col gap-2">
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
      {/* Header */}
      <div className="px-4 pt-4 flex items-center justify-between">
        <h1 className="text-base font-semibold text-graphite">Comunidade</h1>
        {topTab === 'para-voce' && (
          <button
            onClick={() => setShowCreate(true)}
            aria-label="Desabafar"
            className="px-3 py-1.5 rounded-xl bg-sara-gold text-white text-xs font-semibold active:scale-95 transition-transform"
          >
            Desabafar 💜
          </button>
        )}
      </div>

      {/* Top tab bar */}
      <div className="flex gap-1 px-4 border-b border-sara-linen">
        {(['para-voce', 'comunidades'] as TopTab[]).map((tab) => {
          const label = tab === 'para-voce' ? 'Para Você' : 'Comunidades';
          const active = topTab === tab;
          return (
            <button
              key={tab}
              aria-pressed={active}
              onClick={() => setTopTab(tab)}
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

      {/* Tab content */}
      {topTab === 'para-voce' ? (
        <>
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
        </>
      ) : (
        <ComunidadesScreen />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test -- ComunidadeScreen
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Run full test suite**

```
npm test
```

Expected: all tests PASS.

- [ ] **Step 6: Verify TypeScript**

```
npx tsc --noEmit
```

Expected: no output (exit 0).

- [ ] **Step 7: Commit**

```bash
git add src/components/comunidade/ComunidadeScreen.tsx src/components/comunidade/ComunidadeScreen.test.tsx
git commit -m "feat: add Para Você / Comunidades top tabs with followed-community prioritization"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Aba "Para Você" mantém o comportamento atual do feed — preservado em Task 5
- [x] "Para Você" prioriza posts de comunidades seguidas — Task 5, `prioritized` array
- [x] Aba "Comunidades" com sub-filtros "Seguindo" e "Sugestões" — Task 4
- [x] `Community` interface com id, name, description, category, memberCount, colorKey — Task 1
- [x] `communityId?: string` em `CommunityPost` mantendo compatibilidade — Task 1
- [x] `communities: Community[]` e `followedCommunityIds: string[]` no store — Task 2
- [x] `joinCommunity(id)` e `leaveCommunity(id)` no store — Task 2
- [x] Seletores individuais (sem desestruturar objeto) — verificado em todos os componentes
- [x] `ComunidadesScreen.tsx` com Seguindo/Sugestões — Task 4
- [x] `CommunityCard.tsx` com nome, descrição, membros, botão seguir/deixar — Task 3
- [x] Glassmorphism `bg-white/70 backdrop-blur-sm border border-white/50` nos cards — Task 3, CommunityCard
- [x] `font-serif` no título da comunidade — Task 3, `h3` com `font-serif`
- [x] Sugestões ordenadas por phase + archetypeKey — Task 4, `getSuggestionScore`
- [x] 100% client-side com dados mock — todos os seeds são constantes in-memory

**Placeholders scan:** Nenhum TBD, TODO ou "similar ao Task N" — todos os passos têm código completo.

**Type consistency:**
- `CommunityColorKey` definida em Task 1, usada em Task 3 (`CommunityCard`) e Task 2 (seed data) ✓
- `Community` definida em Task 1, usada em Task 2 (store) e Task 4 (ComunidadesScreen) ✓
- `joinCommunity` / `leaveCommunity` definidas em Task 2, chamadas em Task 4 ✓
- `followedCommunityIds` adicionada ao store em Task 2, acessada em Tasks 4 e 5 ✓
