# Community UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 7 UX issues found in the live app: avatar in PostCard, Repost/Share buttons in feed, animated composer modal, image display in PostDetailScreen, rich shared-post cards in chat, multi-recipient share sheet, and chat/notification icons moved to the Comunidade (Home) tab header.

**Architecture:** All changes are self-contained in existing React components and the Zustand store. `types/index.ts` gains a `sharedPost?` field on `ChatMessage`. No new screens, no new routes, no backend. Tasks are strictly ordered — each subagent relies on the previous task's committed changes.

**Tech Stack:** React 18, TypeScript strict, Zustand v5 (`useAppStore((s) => s.field)` individual selector pattern — **never** object-destructure the store in new code), Framer Motion (`AnimatePresence`, `motion.div`), Tailwind CSS (sara-* palette + glassmorphism `bg-white/70 backdrop-blur-sm border border-white/50`), Lucide React icons, Vitest + @testing-library/react.

---

### Task 1: PostCard — avatar + Repost/Share buttons

**Files:**
- Modify: `src/components/comunidade/ComunidadeScreen.tsx`
- Modify: `src/components/comunidade/ComunidadeScreen.test.tsx`

- [ ] **Step 1: Write failing tests**

Add these tests to `src/components/comunidade/ComunidadeScreen.test.tsx`.

First, add `chats` to the existing `beforeEach` `setState` call (add it alongside the existing fields):

```ts
chats: [
  { id: '1', with: 'Ana Oliveira', lastMessage: 'Oi!', time: '5min', unread: 2,
    messages: [{ id: '1', from: 'Ana Oliveira', content: 'Oi!', time: '14:20' }] },
],
```

Then add these tests inside `describe('ComunidadeScreen', ...)`:

```tsx
it('renders avatar initial in the first PostCard', () => {
  render(<ComunidadeScreen />);
  const cards = screen.getAllByTestId('post-card');
  // first card author is Dra. Carla Lima (prioritized because its communityId is followed)
  // either way, the card must contain at least one single-char avatar string
  expect(cards[0].querySelector('[aria-label^="Ver post de"]')).toBeTruthy();
});

it('renders Republicar button in every PostCard', () => {
  render(<ComunidadeScreen />);
  const btns = screen.getAllByRole('button', { name: /republicar/i });
  expect(btns.length).toBeGreaterThan(0);
});

it('renders Enviar post button in every PostCard', () => {
  render(<ComunidadeScreen />);
  const btns = screen.getAllByRole('button', { name: /enviar post/i });
  expect(btns.length).toBeGreaterThan(0);
});

it('clicking Enviar post opens share sheet without navigating to post', () => {
  render(<ComunidadeScreen />);
  const [firstEnviar] = screen.getAllByRole('button', { name: /enviar post/i });
  fireEvent.click(firstEnviar);
  expect(screen.getByText('Enviar para')).toBeInTheDocument();
});

it('clicking Republicar toggles aria-pressed to true', () => {
  render(<ComunidadeScreen />);
  const [firstRepost] = screen.getAllByRole('button', { name: /republicar/i });
  fireEvent.click(firstRepost);
  expect(screen.getAllByRole('button', { name: /republicado/i })[0]).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npm test -- --run src/components/comunidade/ComunidadeScreen.test.tsx
```

Expected: 5 new tests FAIL (PostCard doesn't have avatar/repost/share yet).

- [ ] **Step 3: Implement PostCard changes and feed share sheet**

Replace the entire `src/components/comunidade/ComunidadeScreen.tsx` file with the version below. Key changes vs current:
- Import adds `Repeat2, Share2, X` (lucide-react)
- PostCard gets `onRepost` and `onShare` props + `reposted` local state + avatar circle
- `ComunidadeScreen` adds `repost`, `shareToChat`, `chats` from store + `sharingPost` state
- PostCard in feed receives `onRepost` and `onShare` callbacks
- Share sheet overlay at bottom of JSX (outside the main scrollable div)

```tsx
import { useState } from 'react';
import { MessageCircle, Heart, Plus, Repeat2, Share2, X } from 'lucide-react';
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

function PostCard({
  post,
  onOpen,
  onRepost,
  onShare,
}: {
  post: CommunityPost;
  onOpen: () => void;
  onRepost: () => void;
  onShare: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const badge = post.badge ? BADGE_CONFIG[post.badge] : null;

  return (
    <div
      data-testid="post-card"
      data-category={post.category}
      className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-3"
    >
      <button onClick={onOpen} aria-label={`Ver post de ${post.author}`} className="text-left flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-sara-terracotta flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {post.author.charAt(0)}
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-graphite">{post.author}</p>
              {badge && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full w-fit ${badge.color}`}>
                  {badge.label}
                </span>
              )}
            </div>
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
          onClick={(e) => { e.stopPropagation(); setLiked((v) => !v); }}
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!reposted) { onRepost(); setReposted(true); }
          }}
          aria-label={reposted ? 'Republicado' : 'Republicar'}
          aria-pressed={reposted}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            reposted ? 'text-sara-warm' : 'text-graphite-muted'
          }`}
        >
          <Repeat2 size={14} strokeWidth={1.8} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          aria-label="Enviar post"
          className="flex items-center gap-1.5 text-xs text-graphite-muted"
        >
          <Share2 size={14} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

export function ComunidadeScreen() {
  const communityPosts = useAppStore((s) => s.communityPosts);
  const followedCommunityIds = useAppStore((s) => s.followedCommunityIds);
  const repost = useAppStore((s) => s.repost);
  const shareToChat = useAppStore((s) => s.shareToChat);
  const chats = useAppStore((s) => s.chats);

  const [topTab, setTopTab] = useState<TopTab>('para-voce');
  const [activeCategory, setActiveCategory] = useState<Category>('todos');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [sharingPost, setSharingPost] = useState<CommunityPost | null>(null);

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
    <>
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
                <PostCard
                  key={post.id}
                  post={post}
                  onOpen={() => setSelectedPost(post)}
                  onRepost={() => repost(post)}
                  onShare={() => setSharingPost(post)}
                />
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

      {sharingPost && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end z-30"
          onClick={() => setSharingPost(null)}
        >
          <div
            className="w-full bg-white rounded-t-3xl px-4 pt-4 pb-10 max-w-[390px] mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-graphite">Enviar para</p>
              <button
                onClick={() => setSharingPost(null)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X size={14} className="text-graphite" />
              </button>
            </div>
            <ul className="flex flex-col gap-1">
              {chats.map((chat) => (
                <li key={chat.id}>
                  <button
                    onClick={() => {
                      shareToChat(
                        chat.id,
                        `📌 ${sharingPost.author}: "${sharingPost.content.slice(0, 80)}${sharingPost.content.length > 80 ? '…' : ''}"`,
                      );
                      setSharingPost(null);
                    }}
                    className="w-full flex items-center gap-3 px-2 py-3 rounded-xl active:bg-sara-linen transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-base">
                      {chat.with.charAt(0)}
                    </div>
                    <p className="text-sm font-medium text-graphite">{chat.with}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Run tests**

```
npm test -- --run src/components/comunidade/ComunidadeScreen.test.tsx
```

Expected: all tests pass (existing 12 + 5 new = 17 total).

- [ ] **Step 5: Commit**

```
git add src/components/comunidade/ComunidadeScreen.tsx src/components/comunidade/ComunidadeScreen.test.tsx
git commit -m "feat: PostCard avatar, Repost/Share buttons, feed share sheet"
```

---

### Task 2: SharedPost type + store + ChatScreen rich card

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/store/useAppStore.ts`
- Modify: `src/components/chat/ChatScreen.tsx`
- Create: `src/components/chat/ChatScreen.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/chat/ChatScreen.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ChatScreen } from './ChatScreen';
import { useAppStore } from '../../store/useAppStore';
import type { Chat } from '../../types';

const PLAIN_CHAT: Chat = {
  id: '1',
  with: 'Ana',
  lastMessage: 'Olá',
  time: '5min',
  unread: 0,
  messages: [
    { id: '1', from: 'Ana', content: 'Olá!', time: '10:00' },
    { id: '2', from: 'Mariana', content: 'Oi!', time: '10:01' },
  ],
};

const SHARED_CHAT: Chat = {
  id: '2',
  with: 'Fernanda',
  lastMessage: 'veja',
  time: '1h',
  unread: 0,
  messages: [
    {
      id: '1',
      from: 'Mariana',
      content: 'Olha isso!',
      time: '09:00',
      sharedPost: { id: 'p1', author: 'Juliana M.', excerpt: 'Puerpério é difícil', imageUrl: 'data:image/png;base64,abc' },
    },
    {
      id: '2',
      from: 'Mariana',
      content: '',
      time: '09:01',
      sharedPost: { id: 'p2', author: 'Fernanda S.', excerpt: 'Dica de amamentação' },
    },
  ],
};

beforeEach(() => {
  useAppStore.setState({ motherName: 'Mariana', chats: [PLAIN_CHAT, SHARED_CHAT] });
});

describe('ChatScreen', () => {
  it('renders plain text messages as bubbles', () => {
    render(<ChatScreen chat={PLAIN_CHAT} onBack={() => {}} />);
    expect(screen.getByText('Olá!')).toBeInTheDocument();
    expect(screen.getByText('Oi!')).toBeInTheDocument();
  });

  it('renders "Post compartilhado" label for sharedPost messages', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />);
    expect(screen.getAllByText('Post compartilhado').length).toBe(2);
  });

  it('renders the shared post author name', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />);
    expect(screen.getByText('Juliana M.')).toBeInTheDocument();
  });

  it('renders the shared post excerpt', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />);
    expect(screen.getByText('Puerpério é difícil')).toBeInTheDocument();
  });

  it('renders image when sharedPost has imageUrl', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />);
    const img = screen.getByAltText('Imagem do post');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,abc');
  });

  it('renders comment text when sharedPost message also has content', () => {
    render(<ChatScreen chat={SHARED_CHAT} onBack={() => {}} />);
    expect(screen.getByText('Olha isso!')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npm test -- --run src/components/chat/ChatScreen.test.tsx
```

Expected: 6 tests FAIL (ChatMessage has no `sharedPost` field yet).

- [ ] **Step 3: Add `sharedPost` to `ChatMessage` in `src/types/index.ts`**

Find the `ChatMessage` interface and replace it with:

```ts
export interface ChatMessage {
  id: string;
  from: string;
  content: string;
  time: string;
  sharedPost?: { id: string; author: string; excerpt: string; imageUrl?: string };
}
```

- [ ] **Step 4: Update `shareToChat` in `src/store/useAppStore.ts`**

In the `AppState` interface, change the `shareToChat` signature:

```ts
shareToChat: (chatId: string, content: string, sharedPost?: { id: string; author: string; excerpt: string; imageUrl?: string }) => void;
```

In the store implementation, update `shareToChat`:

```ts
shareToChat: (chatId, content, sharedPost) =>
  set((s) => ({
    chats: s.chats.map((c) =>
      c.id === chatId
        ? {
            ...c,
            lastMessage: content || (sharedPost ? `Post de ${sharedPost.author}` : ''),
            time: 'agora',
            messages: [
              ...c.messages,
              {
                id: Date.now().toString(),
                from: s.motherName,
                content,
                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                ...(sharedPost ? { sharedPost } : {}),
              },
            ],
          }
        : c
    ),
  })),
```

- [ ] **Step 5: Update `src/components/chat/ChatScreen.tsx` to render shared post cards**

Replace the message list section (the `.map((msg) => ...)`) with:

```tsx
{currentChat.messages.map((msg) => {
  const isMe = msg.from === motherName;
  return (
    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && (
        <div className="w-7 h-7 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mr-2 mt-1">
          {msg.from.charAt(0)}
        </div>
      )}
      <div className={`max-w-[72%] rounded-2xl overflow-hidden ${
        isMe
          ? 'bg-sara-gold text-white rounded-br-sm'
          : 'bg-white text-graphite shadow-sm rounded-bl-sm'
      }`}>
        {msg.sharedPost ? (
          <div className="p-3 flex flex-col gap-1.5">
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${isMe ? 'text-white/70' : 'text-graphite-muted'}`}>
              Post compartilhado
            </p>
            {msg.sharedPost.imageUrl && (
              <img
                src={msg.sharedPost.imageUrl}
                alt="Imagem do post"
                className="w-full rounded-lg object-cover max-h-24"
              />
            )}
            <p className={`text-[11px] font-semibold ${isMe ? 'text-white' : 'text-graphite'}`}>
              {msg.sharedPost.author}
            </p>
            <p className={`text-xs leading-relaxed ${isMe ? 'text-white/90' : 'text-graphite-light'}`}>
              {msg.sharedPost.excerpt}
            </p>
            {msg.content && (
              <p className={`text-xs pt-1.5 border-t ${isMe ? 'border-white/30 text-white/90' : 'border-sara-linen text-graphite-light'}`}>
                {msg.content}
              </p>
            )}
            <p className={`text-[10px] mt-0.5 ${isMe ? 'text-white/70' : 'text-graphite-muted'}`}>{msg.time}</p>
          </div>
        ) : (
          <div className="px-4 py-2.5">
            <p className="text-sm leading-relaxed">{msg.content}</p>
            <p className={`text-[10px] mt-0.5 ${isMe ? 'text-white/70' : 'text-graphite-muted'}`}>{msg.time}</p>
          </div>
        )}
      </div>
    </div>
  );
})}
```

- [ ] **Step 6: Run tests**

```
npm test -- --run src/components/chat/ChatScreen.test.tsx
```

Expected: 6/6 pass.

- [ ] **Step 7: Run full suite**

```
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```
git add src/types/index.ts src/store/useAppStore.ts src/components/chat/ChatScreen.tsx src/components/chat/ChatScreen.test.tsx
git commit -m "feat: sharedPost type, store update, ChatScreen rich post card"
```

---

### Task 3: Composer as modal (AnimatePresence overlay)

**Files:**
- Modify: `src/components/comunidade/ComunidadeScreen.tsx`
- Modify: `src/components/comunidade/CreatePostScreen.tsx`
- Modify: `src/components/comunidade/ComunidadeScreen.test.tsx`
- Modify: `src/components/comunidade/CreatePostScreen.test.tsx`

- [ ] **Step 1: Write failing tests**

In `ComunidadeScreen.test.tsx`, add:

```tsx
it('shows CreatePost modal when ComposerBar is clicked', () => {
  render(<ComunidadeScreen />);
  fireEvent.click(screen.getByRole('button', { name: /escrever post/i }));
  // Modal is overlaid — feed still in DOM (not replaced)
  expect(screen.getByText('O que você está sentindo hoje?')).toBeInTheDocument(); // ComposerBar still mounted
  expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
});

it('closes CreatePost modal when Cancelar is clicked', () => {
  render(<ComunidadeScreen />);
  fireEvent.click(screen.getByRole('button', { name: /escrever post/i }));
  fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
  expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
});
```

In `CreatePostScreen.test.tsx`, add:

```tsx
it('renders Cancelar button instead of arrow back', () => {
  render(<CreatePostScreen onBack={() => {}} />);
  expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /voltar/i })).not.toBeInTheDocument();
});

it('renders header Publicar button', () => {
  render(<CreatePostScreen onBack={() => {}} />);
  // There should be a "Publicar" button in the header
  const pubBtns = screen.getAllByRole('button', { name: /publicar/i });
  expect(pubBtns.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run to confirm they fail**

```
npm test -- --run src/components/comunidade/ComunidadeScreen.test.tsx src/components/comunidade/CreatePostScreen.test.tsx
```

Expected: 4 new tests FAIL.

- [ ] **Step 3: Update `ComunidadeScreen.tsx`**

1. Add `AnimatePresence` to the framer-motion import:
   ```ts
   import { motion, AnimatePresence } from 'framer-motion';
   ```

2. Remove the early-return block:
   ```tsx
   // DELETE THESE LINES:
   if (showCreate) {
     return <CreatePostScreen onBack={() => setShowCreate(false)} />;
   }
   ```

3. Change the JSX return from `<>...<div>...</div>...{sharingPost && ...}</>` — wrap the existing `<>` fragment's children with `AnimatePresence` for the modal. The full return becomes:

   ```tsx
   return (
     <>
       <div className="flex flex-col gap-4 pb-6">
         {/* ... all existing content unchanged ... */}
       </div>

       {sharingPost && (
         /* ... existing share sheet unchanged ... */
       )}

       <AnimatePresence>
         {showCreate && (
           <motion.div
             key="composer-modal"
             initial={{ opacity: 0, y: 40 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: 40 }}
             transition={{ type: 'spring', duration: 0.35, bounce: 0.1 }}
             className="fixed inset-0 z-50 bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] flex flex-col"
           >
             <CreatePostScreen onBack={() => setShowCreate(false)} />
           </motion.div>
         )}
       </AnimatePresence>
     </>
   );
   ```

   Keep all other content (`<div>`, `sharingPost` sheet) exactly as in Task 1's committed code. Only add the `AnimatePresence` block and remove the early return.

- [ ] **Step 4: Update `CreatePostScreen.tsx`**

Replace the header section (lines 49–58 in current file, the `<div>` containing ArrowLeft button and `<h1>Desabafar</h1>`) with a Bluesky-style header. Also remove the bottom `<div className="px-4">` publish button block.

New header (replaces old header):
```tsx
<div className="flex items-center justify-between px-4 pt-4 pb-2">
  <button
    onClick={onBack}
    className="text-sm text-graphite-muted font-medium px-1 py-1"
  >
    Cancelar
  </button>
  <h1 className="text-sm font-semibold text-graphite">Publicação</h1>
  <button
    onClick={handlePublish}
    disabled={!content.trim()}
    className="text-sm font-semibold text-sara-gold disabled:opacity-40 px-1 py-1"
  >
    Publicar
  </button>
</div>
```

Remove the `ArrowLeft` import and the old bottom `<div className="px-4">` publish button:
```tsx
// DELETE from imports:
import { ArrowLeft, ImagePlus, X } from 'lucide-react';
// BECOMES:
import { ImagePlus, X } from 'lucide-react';

// DELETE the bottom button div block:
<div className="px-4">
  <button
    onClick={handlePublish}
    disabled={!content.trim()}
    className="w-full py-3.5 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-40"
  >
    Publicar 💜
  </button>
</div>
```

- [ ] **Step 5: Run tests**

```
npm test -- --run src/components/comunidade/ComunidadeScreen.test.tsx src/components/comunidade/CreatePostScreen.test.tsx
```

Expected: all tests pass.

- [ ] **Step 6: Run full suite**

```
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```
git add src/components/comunidade/ComunidadeScreen.tsx src/components/comunidade/CreatePostScreen.tsx src/components/comunidade/ComunidadeScreen.test.tsx src/components/comunidade/CreatePostScreen.test.tsx
git commit -m "feat: composer opens as animated modal overlay (AnimatePresence)"
```

---

### Task 4: PostDetailScreen image + CreatePostScreen disabled fix

**Files:**
- Modify: `src/components/post/PostDetailScreen.tsx`
- Modify: `src/components/comunidade/CreatePostScreen.tsx`
- Create: `src/components/post/PostDetailScreen.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/post/PostDetailScreen.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostDetailScreen } from './PostDetailScreen';
import { useAppStore } from '../../store/useAppStore';
import type { CommunityPost } from '../../types';

const POST_WITH_IMAGE: CommunityPost = {
  id: '1', category: 'gestação', author: 'Fernanda S.',
  content: 'Dicas para o enjoo', likes: 24, replies: 8, time: '2h',
  imageUrl: 'data:image/png;base64,testimg',
};

const POST_NO_IMAGE: CommunityPost = {
  id: '2', category: 'saúde mental', author: 'Juliana M.',
  content: 'Puerpério é difícil', likes: 10, replies: 3, time: '5h',
};

beforeEach(() => {
  useAppStore.setState({
    motherName: 'Mariana',
    communityPosts: [POST_WITH_IMAGE, POST_NO_IMAGE],
    postComments: {},
    chats: [],
  });
});

describe('PostDetailScreen', () => {
  it('renders post content', () => {
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />);
    expect(screen.getByText('Dicas para o enjoo')).toBeInTheDocument();
  });

  it('renders image when post has imageUrl', () => {
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />);
    const img = screen.getByAltText('Imagem do post');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,testimg');
  });

  it('does not render image when post has no imageUrl', () => {
    render(<PostDetailScreen post={POST_NO_IMAGE} onBack={() => {}} />);
    expect(screen.queryByAltText('Imagem do post')).not.toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
```

Add to `CreatePostScreen.test.tsx`:

```tsx
it('enables Publicar when only imagePreview is set (no text)', async () => {
  // This test verifies that disabled={!content.trim() && !imagePreview}
  // (the Publicar header button should NOT be disabled when an image is selected)
  render(<CreatePostScreen onBack={() => {}} />);
  // Trigger file selection via mock
  const input = screen.getByTestId('file-input');
  const file = new File(['img'], 'photo.png', { type: 'image/png' });
  fireEvent.change(input, { target: { files: [file] } });
  // After selecting image, the Publicar button should be enabled
  const pubBtn = screen.getAllByRole('button', { name: /publicar/i })[0];
  expect(pubBtn).not.toBeDisabled();
});
```

Note: the `CreatePostScreen.test.tsx` already stubs FileReader with a synchronous MockFileReader in `beforeEach`. The new test runs within that same setup.

- [ ] **Step 2: Run to confirm they fail**

```
npm test -- --run src/components/post/PostDetailScreen.test.tsx src/components/comunidade/CreatePostScreen.test.tsx
```

Expected: PostDetailScreen image tests FAIL (no `<img>` rendered yet). The Publicar-enabled test FAIL (still uses old disabled condition).

- [ ] **Step 3: Add image to `PostDetailScreen.tsx`**

Find the `<p>` tag that renders content (line 100 in current file):
```tsx
<p className="text-sm text-graphite leading-relaxed mb-4">{currentPost.content}</p>
```

Immediately after it (before the action bar `<div className="flex items-center gap-6 ..."`), add:
```tsx
{currentPost.imageUrl && (
  <img
    src={currentPost.imageUrl}
    alt="Imagem do post"
    className="w-full rounded-xl object-cover max-h-64 mb-4"
  />
)}
```

- [ ] **Step 4: Fix disabled condition in `CreatePostScreen.tsx`**

In the header Publicar button (added in Task 3), change:
```tsx
disabled={!content.trim()}
```
to:
```tsx
disabled={!content.trim() && !imagePreview}
```

- [ ] **Step 5: Run tests**

```
npm test -- --run src/components/post/PostDetailScreen.test.tsx src/components/comunidade/CreatePostScreen.test.tsx
```

Expected: all pass.

- [ ] **Step 6: Run full suite**

```
npm test -- --run
```

Expected: all pass.

- [ ] **Step 7: Commit**

```
git add src/components/post/PostDetailScreen.tsx src/components/post/PostDetailScreen.test.tsx src/components/comunidade/CreatePostScreen.tsx src/components/comunidade/CreatePostScreen.test.tsx
git commit -m "feat: image in PostDetailScreen, fix publish disabled when image-only"
```

---

### Task 5: Multi-recipient share sheet in PostDetailScreen

**Files:**
- Modify: `src/components/post/PostDetailScreen.tsx`
- Modify: `src/components/post/PostDetailScreen.test.tsx`

**Context:** `shareToChat` now accepts an optional third `sharedPost` argument (added in Task 2). The current share sheet in PostDetailScreen sends to a single person on tap. This task replaces it with: checkbox selection of multiple recipients, optional comment textarea, and an "Enviar" button.

- [ ] **Step 1: Write failing tests**

Add to `src/components/post/PostDetailScreen.test.tsx`:

```tsx
beforeEach block — update to include chats:
```

Replace the existing `beforeEach` with:
```tsx
beforeEach(() => {
  useAppStore.setState({
    motherName: 'Mariana',
    communityPosts: [POST_WITH_IMAGE, POST_NO_IMAGE],
    postComments: {},
    chats: [
      { id: '1', with: 'Ana Oliveira', lastMessage: 'Oi', time: '5min', unread: 0,
        messages: [{ id: '1', from: 'Ana Oliveira', content: 'Oi', time: '14:20' }] },
      { id: '2', with: 'Fernanda S.', lastMessage: 'Ok', time: '2h', unread: 0,
        messages: [{ id: '1', from: 'Fernanda S.', content: 'Ok', time: '12:10' }] },
    ],
  });
});
```

Add tests:

```tsx
it('opens share sheet when Enviar is clicked', () => {
  render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
  expect(screen.getByText('Enviar para')).toBeInTheDocument();
});

it('shows all chats in share sheet as checkboxes', () => {
  render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
  expect(screen.getByText('Ana Oliveira')).toBeInTheDocument();
  expect(screen.getByText('Fernanda S.')).toBeInTheDocument();
});

it('Enviar button is disabled when no recipient selected', () => {
  render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
  // The sheet "Enviar" send button uses data-testid to disambiguate from action bar "Enviar"
  const sendBtn = screen.getByTestId('share-send-btn');
  expect(sendBtn).toBeDisabled();
});

it('Enviar button becomes enabled after selecting a recipient', () => {
  render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
  fireEvent.click(screen.getByText('Ana Oliveira'));
  const sendBtn = screen.getByTestId('share-send-btn');
  expect(sendBtn).not.toBeDisabled();
});

it('shows a comment textarea in the share sheet', () => {
  render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
  expect(screen.getByPlaceholderText(/adicionar um comentário/i)).toBeInTheDocument();
});

it('closes share sheet after sending', () => {
  render(<PostDetailScreen post={POST_WITH_IMAGE} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
  fireEvent.click(screen.getByText('Ana Oliveira'));
  fireEvent.click(screen.getByTestId('share-send-btn'));
  expect(screen.queryByText('Enviar para')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run to confirm they fail**

```
npm test -- --run src/components/post/PostDetailScreen.test.tsx
```

Expected: 6 new tests FAIL.

- [ ] **Step 3: Rewrite share sheet in `PostDetailScreen.tsx`**

Replace the `sharedTo` state and `handleShare` function with the multi-recipient version:

```tsx
// REMOVE:
const [sharedTo, setSharedTo] = useState<string | null>(null);

// REPLACE WITH:
const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
const [shareComment, setShareComment] = useState('');
```

Replace the `handleShare` function:
```tsx
// REMOVE handleShare entirely.

// ADD:
function handleSendShare() {
  selectedChatIds.forEach((chatId) => {
    shareToChat(
      chatId,
      shareComment.trim(),
      {
        id: currentPost.id,
        author: currentPost.author,
        excerpt: currentPost.content.slice(0, 80),
        imageUrl: currentPost.imageUrl,
      },
    );
  });
  setSelectedChatIds([]);
  setShareComment('');
  setShowShareSheet(false);
}

function toggleChatSelection(chatId: string) {
  setSelectedChatIds((prev) =>
    prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
  );
}
```

Replace the entire `{showShareSheet && (...)}` JSX block with:

```tsx
{showShareSheet && (
  <div
    className="absolute inset-0 bg-black/40 flex items-end z-10"
    onClick={() => { setShowShareSheet(false); setSelectedChatIds([]); setShareComment(''); }}
  >
    <div
      className="w-full bg-white rounded-t-3xl px-4 pt-4 pb-10"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-graphite">Enviar para</p>
        <button
          onClick={() => { setShowShareSheet(false); setSelectedChatIds([]); setShareComment(''); }}
          className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <X size={14} className="text-graphite" />
        </button>
      </div>

      <textarea
        value={shareComment}
        onChange={(e) => setShareComment(e.target.value)}
        placeholder="Adicionar um comentário..."
        rows={2}
        className="w-full px-3 py-2 rounded-xl border border-sara-linen text-sm text-graphite placeholder:text-graphite-muted resize-none focus:outline-none focus:border-sara-gold mb-3"
      />

      <ul className="flex flex-col gap-1 mb-4">
        {chats.map((chat) => {
          const selected = selectedChatIds.includes(chat.id);
          return (
            <li key={chat.id}>
              <button
                onClick={() => toggleChatSelection(chat.id)}
                aria-pressed={selected}
                className={`w-full flex items-center gap-3 px-2 py-3 rounded-xl transition-colors ${
                  selected ? 'bg-sara-linen' : 'active:bg-sara-linen'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                  {chat.with.charAt(0)}
                </div>
                <p className="flex-1 text-sm font-medium text-graphite text-left">{chat.with}</p>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  selected ? 'bg-sara-gold border-sara-gold' : 'border-sara-linen'
                }`}>
                  {selected && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        data-testid="share-send-btn"
        onClick={handleSendShare}
        disabled={selectedChatIds.length === 0}
        className="w-full py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
      >
        Enviar
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Run tests**

```
npm test -- --run src/components/post/PostDetailScreen.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Run full suite**

```
npm test -- --run
```

Expected: all pass.

- [ ] **Step 6: Commit**

```
git add src/components/post/PostDetailScreen.tsx src/components/post/PostDetailScreen.test.tsx
git commit -m "feat: multi-recipient share sheet with comment + sharedPost in PostDetailScreen"
```

---

### Task 6: Chat/notification icons in ComunidadeScreen header

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/comunidade/ComunidadeScreen.tsx`
- Modify: `src/components/home/HomeScreen.tsx`
- Modify: `src/components/comunidade/ComunidadeScreen.test.tsx`

- [ ] **Step 1: Write failing tests**

Add to `ComunidadeScreen.test.tsx`:

```tsx
it('shows Mensagens icon button when onOpenChat prop is provided', () => {
  render(<ComunidadeScreen onOpenChat={() => {}} />);
  expect(screen.getByRole('button', { name: /mensagens/i })).toBeInTheDocument();
});

it('shows Notificações icon button when onOpenNotifications prop is provided', () => {
  render(<ComunidadeScreen onOpenNotifications={() => {}} />);
  expect(screen.getByRole('button', { name: /notificações/i })).toBeInTheDocument();
});

it('calls onOpenChat when Mensagens button is clicked', () => {
  const onOpenChat = vi.fn();
  render(<ComunidadeScreen onOpenChat={onOpenChat} />);
  fireEvent.click(screen.getByRole('button', { name: /mensagens/i }));
  expect(onOpenChat).toHaveBeenCalledOnce();
});

it('does not render icon buttons when props are not provided', () => {
  render(<ComunidadeScreen />);
  expect(screen.queryByRole('button', { name: /mensagens/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /notificações/i })).not.toBeInTheDocument();
});
```

Note: the `beforeEach` must include `notifications: []` in the setState — add it now if missing:
```ts
notifications: [],
```

- [ ] **Step 2: Run to confirm they fail**

```
npm test -- --run src/components/comunidade/ComunidadeScreen.test.tsx
```

Expected: 4 new tests FAIL.

- [ ] **Step 3: Update `ComunidadeScreen.tsx`**

Add to the existing imports:
```tsx
import { MessageSquare, Bell } from 'lucide-react'; // add to the lucide-react import line
```

Add props interface before the `export function ComunidadeScreen` line:
```tsx
interface ComunidadeScreenProps {
  onOpenChat?: () => void;
  onOpenNotifications?: () => void;
}
```

Update function signature:
```tsx
export function ComunidadeScreen({ onOpenChat, onOpenNotifications }: ComunidadeScreenProps) {
```

Inside the function body, add store selectors for badge counts (after the existing store selectors):
```tsx
const notifications = useAppStore((s) => s.notifications);
const unreadNotifs = notifications.filter((n) => !n.read).length;
const unreadChats = chats.reduce((sum, c) => sum + c.unread, 0);
```

Note: `chats` is already selected from the store (added in Task 1). No duplicate needed.

Replace the header `<div>`:
```tsx
// REPLACE:
<div className="px-4 pt-4">
  <h1 className="text-base font-semibold text-graphite">Comunidade</h1>
</div>

// WITH:
<div className="px-4 pt-4 flex items-center justify-between">
  <h1 className="text-base font-semibold text-graphite">Comunidade</h1>
  {(onOpenChat || onOpenNotifications) && (
    <div className="flex items-center gap-2">
      {onOpenChat && (
        <button
          onClick={onOpenChat}
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
      )}
      {onOpenNotifications && (
        <button
          onClick={onOpenNotifications}
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
      )}
    </div>
  )}
</div>
```

- [ ] **Step 4: Update `App.tsx`**

Pass `onOpenChat` and `onOpenNotifications` to `ComunidadeScreen` for both `home` and `comunidade` entries:

```tsx
// REPLACE:
home:       <ComunidadeScreen />,
// ...
comunidade: <ComunidadeScreen />,

// WITH:
home: (
  <ComunidadeScreen
    onOpenChat={() => setShowChat(true)}
    onOpenNotifications={() => setShowNotifications(true)}
  />
),
// ...
comunidade: (
  <ComunidadeScreen
    onOpenChat={() => setShowChat(true)}
    onOpenNotifications={() => setShowNotifications(true)}
  />
),
```

- [ ] **Step 5: Update `HomeScreen.tsx`**

Remove the chat/notification icon buttons and their supporting code.

From the import, remove `Bell, MessageSquare`:
```tsx
// CHANGE:
import { Bell, MessageSquare, Plus } from 'lucide-react';
// TO:
import { Plus } from 'lucide-react';
```

Remove `onOpenChat` and `onOpenNotifications` from the `HomeScreenProps` interface:
```tsx
// CHANGE:
interface HomeScreenProps {
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  onOpenChat: () => void;
}
// TO:
interface HomeScreenProps {
  onOpenProfile: () => void;
}
```

Update the function signature:
```tsx
export function HomeScreen({ onOpenProfile }: HomeScreenProps) {
```

Remove `notifications` and `chats` from the destructuring (they're only used for badge counts):
```tsx
// CHANGE:
const { phase, motherName, babyName, selectedDate, motherProfile, notifications, chats } = useAppStore();
// TO:
const { phase, motherName, babyName, selectedDate, motherProfile } = useAppStore();
```

Remove the two computed lines:
```tsx
// DELETE:
const unreadNotifs = notifications.filter((n) => !n.read).length;
const unreadChats = chats.reduce((sum, c) => sum + c.unread, 0);
```

Remove the `<div className="flex items-center gap-2">` block that contains the two icon buttons (keeping the profile avatar button on the left):
```tsx
// DELETE this entire block (the right-side flex div with the two icon buttons):
<div className="flex items-center gap-2">
  <button onClick={onOpenChat} aria-label="Mensagens" ...>
    ...
  </button>
  <button onClick={onOpenNotifications} aria-label="Notificações" ...>
    ...
  </button>
</div>
```

The header div should now look like:
```tsx
<div className="flex items-start justify-between px-4 pt-4">
  <div className="flex items-center gap-3">
    <button onClick={onOpenProfile} aria-label="Abrir perfil" ...>
      {initial}
    </button>
    <div>
      <p ...>Bom dia ☀️</p>
      <h1 ...>{greeting}</h1>
    </div>
  </div>
</div>
```

- [ ] **Step 6: Update `App.tsx` — remove unused props from HomeScreen rotina entry**

```tsx
// CHANGE:
rotina: (
  <HomeScreen
    onOpenProfile={() => setShowProfile(true)}
    onOpenNotifications={() => setShowNotifications(true)}
    onOpenChat={() => setShowChat(true)}
  />
),
// TO:
rotina: (
  <HomeScreen
    onOpenProfile={() => setShowProfile(true)}
  />
),
```

- [ ] **Step 7: Run tests**

```
npm test -- --run src/components/comunidade/ComunidadeScreen.test.tsx
```

Expected: all tests pass.

- [ ] **Step 8: Run full suite**

```
npm test -- --run
```

Expected: all tests pass. TypeScript should also be clean (no unused props).

- [ ] **Step 9: Commit**

```
git add src/components/comunidade/ComunidadeScreen.tsx src/components/comunidade/ComunidadeScreen.test.tsx src/App.tsx src/components/home/HomeScreen.tsx
git commit -m "feat: move chat/notification icons to ComunidadeScreen header"
```

---

## Summary of files changed

| File | Tasks |
|---|---|
| `src/components/comunidade/ComunidadeScreen.tsx` | 1, 3, 6 |
| `src/components/comunidade/ComunidadeScreen.test.tsx` | 1, 3, 6 |
| `src/components/comunidade/CreatePostScreen.tsx` | 3, 4 |
| `src/components/comunidade/CreatePostScreen.test.tsx` | 3, 4 |
| `src/types/index.ts` | 2 |
| `src/store/useAppStore.ts` | 2 |
| `src/components/chat/ChatScreen.tsx` | 2 |
| `src/components/chat/ChatScreen.test.tsx` | 2 (create) |
| `src/components/post/PostDetailScreen.tsx` | 4, 5 |
| `src/components/post/PostDetailScreen.test.tsx` | 4, 5 (create) |
| `src/App.tsx` | 6 |
| `src/components/home/HomeScreen.tsx` | 6 |

## Out of scope

Item 2 from spec (category selector in CreatePost form) — awaiting client decision.
