# Tier 1 — Social Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o loop social do app — permitir que uma usuária descubra outras pessoas, veja perfis, siga, entre em comunidades específicas, crie novas comunidades e busque conteúdo. Sem isso o app é um feed sem conexão entre pessoas.

**Architecture:** Cinco milestones independentes, executáveis em sequência. Cada uma acopla frontend novo a rotas backend em grande parte já existentes; apenas ajustes pontuais de payload são necessários. Todas as telas seguem o padrão de overlay usado em `App.tsx` (fixed inset-0, gradient wrapper) e usam React Query pra estado servidor.

**Tech Stack:** React 18 + TypeScript + Vite + TanStack Query v5 + Zustand 5 (frontend); Fastify 4 + Prisma + MySQL (backend); Vitest + React Testing Library (tests).

**Ordem dos milestones (importante):**
1. User Profile (visitor view) — pré-requisito de #4 (listas linkam pra perfis)
2. Community Detail Page — independente
3. Create Community — independente
4. Followers/Following Lists — depende de #1
5. Search — depende de #1 e #2 (resultados linkam pra ambos)

---

## Convenções

- **Testes primeiro** (TDD). Cada task começa com teste falhando, então implementação mínima.
- **Commits atômicos** ao final de cada task com prefixo `feat:` / `refactor:` / `test:`.
- **Rodar testes** após cada task: `npm test -- --run <path>` (frontend) ou `npm --prefix server test` (backend).
- **Gradient wrapper reutilizado**: `bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF]` (não extrair agora — cleanup Tier separado).
- **Overlay pattern** em App.tsx: `fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center` + inner div com `w-full h-full sm:w-[390px] sm:h-[844px]`.
- **apiFetch** de `src/lib/api.ts` para todas as chamadas HTTP.
- **Server dev mode**: `npm --prefix server run dev` roda em `:3001`. Frontend `:5173` faz proxy via Vite.

---

# Milestone 1 — User Profile (Visitor View)

**Feature:** Tocar no nome/avatar de uma autora abre um perfil dela (avatar, nome, bio, contadores, botão Seguir, feed de posts dela).

**Backend changes:** Adicionar `bio` ao User; estender `GET /users/:id` com `bio`, `isFollowedByCurrentUser`, `isSelf`; criar `GET /users/:id/posts`.

**Frontend changes:** Criar `UserProfileScreen` (recebe `userId`), diferenciar self vs other, adicionar botão Seguir/Deixar de seguir, montar sistema de navegação pra abrir de qualquer PostCard.

---

## Task 1.1: Adicionar campo `bio` ao User

**Files:**
- Modify: `server/prisma/schema.prisma`
- Migration: `server/prisma/migrations/<timestamp>_add_user_bio/migration.sql` (gerada)

- [ ] **Step 1: Adicionar `bio` ao modelo User**

Em `server/prisma/schema.prisma`, dentro do bloco `model User`, após `archetypeKey String?`:

```prisma
  archetypeKey      String?
  bio               String?  @db.Text
```

- [ ] **Step 2: Gerar migration**

```bash
cd server && npx prisma migrate dev --name add_user_bio
```

Expected: migração criada, DB atualizado, Prisma Client regenerado.

- [ ] **Step 3: Commit**

```bash
git add server/prisma/
git commit -m "feat(server): add bio field to User model"
```

---

## Task 1.2: Estender `GET /users/:id` com bio, isFollowedByCurrentUser, isSelf, _count

**Files:**
- Modify: `server/src/routes/users.ts:15-25`
- Modify: `src/lib/types.ts` (adicionar `ApiUserProfile` interface)

- [ ] **Step 1: Substituir handler `GET /:id`**

Em `server/src/routes/users.ts`, substituir o handler existente (linhas 15-25):

```typescript
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.params.id },
      select: {
        id: true,
        name: true,
        bio: true,
        pregnancyStage: true,
        pregnancyWeek: true,
        babyAgeInDays: true,
        profileKey: true,
        archetypeKey: true,
        _count: { select: { posts: true, followers: true, following: true } },
      },
    })
    if (!user) return reply.status(404).send({ error: 'User not found' })

    const isSelf = user.id === request.userId
    let isFollowedByCurrentUser = false
    if (!isSelf) {
      const follow = await fastify.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: request.userId, followingId: user.id } },
      })
      isFollowedByCurrentUser = !!follow
    }

    reply.send({ ...user, isSelf, isFollowedByCurrentUser })
  })
```

- [ ] **Step 2: Adicionar tipo `ApiUserProfile` em `src/lib/types.ts`**

Após `ApiUser` (linha 12), adicionar:

```typescript
export interface ApiUserProfile {
  id: string
  name: string
  bio?: string | null
  pregnancyStage: 'pregnant' | 'postpartum'
  pregnancyWeek?: number | null
  babyAgeInDays?: number | null
  profileKey?: string | null
  archetypeKey?: string | null
  _count: { posts: number; followers: number; following: number }
  isSelf: boolean
  isFollowedByCurrentUser: boolean
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/users.ts src/lib/types.ts
git commit -m "feat(server): extend GET /users/:id with bio, follow state and counts"
```

---

## Task 1.3: Adicionar endpoint `GET /users/:id/posts`

**Files:**
- Modify: `server/src/routes/users.ts` (após handler `GET /:id`)

- [ ] **Step 1: Escrever teste smoke**

Criar `server/src/routes/users.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import Fastify from 'fastify'
import usersRoutes from './users'

const prisma = new PrismaClient()

describe('GET /users/:id/posts', () => {
  it('returns paginated posts for the given author with likedByCurrentUser', async () => {
    const author = await prisma.user.create({
      data: { email: `t${Date.now()}@t.com`, passwordHash: 'x', name: 'Autora', pregnancyStage: 'pregnant' },
    })
    const viewer = await prisma.user.create({
      data: { email: `v${Date.now()}@t.com`, passwordHash: 'x', name: 'Viewer', pregnancyStage: 'pregnant' },
    })
    const post = await prisma.post.create({
      data: { content: 'hi', category: 'gestação', authorId: author.id },
    })
    await prisma.postLike.create({ data: { userId: viewer.id, postId: post.id } })

    const app = Fastify()
    app.decorate('prisma', prisma)
    app.decorateRequest('userId', '')
    app.decorate('authenticate', async (req: any) => { req.userId = viewer.id })
    await app.register(usersRoutes)

    const res = await app.inject({ method: 'GET', url: `/${author.id}/posts` })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.items).toHaveLength(1)
    expect(body.items[0].likedByCurrentUser).toBe(true)

    await prisma.postLike.deleteMany({ where: { postId: post.id } })
    await prisma.post.delete({ where: { id: post.id } })
    await prisma.user.deleteMany({ where: { id: { in: [author.id, viewer.id] } } })
    await app.close()
  })
})
```

- [ ] **Step 2: Rodar teste (deve falhar)**

```bash
cd server && npx vitest run src/routes/users.test.ts
```

Expected: FAIL — rota não existe.

- [ ] **Step 3: Adicionar handler em `server/src/routes/users.ts`**

Após o handler de `PATCH /me` (antes de `POST /:id/follow`):

```typescript
  fastify.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/:id/posts',
    async (request, reply) => {
      const limit = Math.min(Number(request.query.limit ?? 20), 50)
      const rows = await fastify.prisma.post.findMany({
        where: { authorId: request.params.id },
        take: limit + 1,
        ...(request.query.cursor ? { cursor: { id: request.query.cursor }, skip: 1 } : {}),
        include: {
          author: { select: { id: true, name: true } },
          _count: { select: { likes: true, comments: true } },
          likes: { where: { userId: request.userId }, select: { userId: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      const hasMore = rows.length > limit
      const items = rows.slice(0, limit).map(({ likes, ...post }) => ({
        ...post,
        likedByCurrentUser: likes.length > 0,
      }))
      reply.send({ items, hasMore })
    }
  )
```

- [ ] **Step 4: Rodar teste (deve passar)**

```bash
cd server && npx vitest run src/routes/users.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/users.ts server/src/routes/users.test.ts
git commit -m "feat(server): GET /users/:id/posts with likedByCurrentUser"
```

---

## Task 1.4: Criar `UserProfileScreen` component

**Files:**
- Create: `src/components/profile/UserProfileScreen.tsx`
- Create: `src/components/profile/UserProfileScreen.test.tsx`

- [ ] **Step 1: Escrever testes**

Criar `src/components/profile/UserProfileScreen.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProfileScreen } from './UserProfileScreen';
import * as api from '../../lib/api';

vi.mock('../../lib/api', async () => ({
  ...(await vi.importActual('../../lib/api')),
  apiFetch: vi.fn(),
}));

function renderScreen(userId = 'u1', onBack = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <UserProfileScreen userId={userId} onBack={onBack} />
    </QueryClientProvider>
  );
}

const mockProfile = {
  id: 'u1', name: 'Julia', bio: 'Mãe de primeira viagem',
  pregnancyStage: 'postpartum', pregnancyWeek: null, babyAgeInDays: 30,
  profileKey: null, archetypeKey: 'ana',
  _count: { posts: 3, followers: 12, following: 8 },
  isSelf: false, isFollowedByCurrentUser: false,
};

const mockPosts = { items: [], hasMore: false };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.apiFetch).mockImplementation(async (path: string) => {
    if (path.endsWith('/posts')) return mockPosts;
    return mockProfile;
  });
});

describe('UserProfileScreen', () => {
  it('renders name, bio and counts', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('Julia')).toBeInTheDocument());
    expect(screen.getByText('Mãe de primeira viagem')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // posts
    expect(screen.getByText('12')).toBeInTheDocument(); // followers
    expect(screen.getByText('8')).toBeInTheDocument(); // following
  });

  it('shows "Seguir" button when not following', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Seguir' })).toBeInTheDocument());
  });

  it('shows "Seguindo" button when already following', async () => {
    vi.mocked(api.apiFetch).mockImplementation(async (path: string) => {
      if (path.endsWith('/posts')) return mockPosts;
      return { ...mockProfile, isFollowedByCurrentUser: true };
    });
    renderScreen();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Seguindo' })).toBeInTheDocument());
  });

  it('hides follow button when isSelf', async () => {
    vi.mocked(api.apiFetch).mockImplementation(async (path: string) => {
      if (path.endsWith('/posts')) return mockPosts;
      return { ...mockProfile, isSelf: true };
    });
    renderScreen();
    await waitFor(() => expect(screen.getByText('Julia')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Seguir/i })).not.toBeInTheDocument();
  });

  it('calls follow endpoint when Seguir clicked', async () => {
    const user = userEvent.setup();
    renderScreen();
    await waitFor(() => screen.getByRole('button', { name: 'Seguir' }));
    await user.click(screen.getByRole('button', { name: 'Seguir' }));
    await waitFor(() =>
      expect(api.apiFetch).toHaveBeenCalledWith('/users/u1/follow', { method: 'POST' })
    );
  });

  it('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    renderScreen('u1', onBack);
    await waitFor(() => screen.getByText('Julia'));
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(onBack).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar teste (deve falhar — arquivo não existe)**

```bash
npm test -- --run src/components/profile/UserProfileScreen.test.tsx
```

Expected: FAIL — módulo `./UserProfileScreen` não encontrado.

- [ ] **Step 3: Implementar `UserProfileScreen`**

Criar `src/components/profile/UserProfileScreen.tsx`:

```tsx
import { ChevronLeft, Heart, MessageCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { ApiUserProfile, PaginatedResult, ApiPost } from '../../lib/types';
import { apiPostToCommunityPost } from '../../lib/helpers';

interface UserProfileScreenProps {
  userId: string;
  onBack: () => void;
}

export function UserProfileScreen({ userId, onBack }: UserProfileScreenProps) {
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => apiFetch<ApiUserProfile>(`/users/${userId}`),
  });

  const { data: postsData } = useQuery({
    queryKey: ['user', userId, 'posts'],
    queryFn: () => apiFetch<PaginatedResult<ApiPost>>(`/users/${userId}/posts`),
    enabled: !!profile,
  });

  const followMutation = useMutation({
    mutationFn: (isFollowing: boolean) =>
      apiFetch(`/users/${userId}/follow`, { method: isFollowing ? 'POST' : 'DELETE' }),
    onSuccess: (_, isFollowing) => {
      queryClient.setQueryData<ApiUserProfile>(['user', userId], (old) =>
        old
          ? {
              ...old,
              isFollowedByCurrentUser: isFollowing,
              _count: { ...old._count, followers: old._count.followers + (isFollowing ? 1 : -1) },
            }
          : old
      );
    },
  });

  if (!profile) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="w-8 h-8 rounded-full border-2 border-sara-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  const posts = (postsData?.items ?? []).map(apiPostToCommunityPost);

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-6 pb-3 flex-shrink-0">
        <button onClick={onBack} aria-label="Voltar" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <p className="text-sm font-semibold font-serif text-graphite">{profile.name}</p>
        <div className="w-8" />
      </div>

      <div className="px-4 pb-3 flex-shrink-0">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 bg-sara-terracotta">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex gap-4 flex-1 justify-around">
            {[
              { label: 'Posts', value: profile._count.posts },
              { label: 'Seguidoras', value: profile._count.followers },
              { label: 'Seguindo', value: profile._count.following },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center">
                <span className="text-base font-bold text-graphite">{value}</span>
                <span className="text-[10px] text-graphite-muted text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {profile.bio && (
          <p className="text-xs text-graphite-muted leading-snug mt-3 italic">"{profile.bio}"</p>
        )}

        {!profile.isSelf && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => followMutation.mutate(!profile.isFollowedByCurrentUser)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-transform ${
                profile.isFollowedByCurrentUser
                  ? 'bg-white text-graphite-muted border border-sara-linen'
                  : 'bg-sara-gold text-white'
              }`}
            >
              {profile.isFollowedByCurrentUser ? 'Seguindo' : 'Seguir'}
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 flex-shrink-0" />

      <div className="flex-1 overflow-y-auto">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-12 text-graphite-muted">
            <p className="text-sm">Nenhuma publicação ainda</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {posts.map((post) => (
              <li key={post.id} className="px-4 py-4">
                <p className="text-sm text-graphite leading-relaxed">{post.content}</p>
                <div className="flex items-center gap-5 mt-2">
                  <span className="flex items-center gap-1.5 text-graphite-muted"><Heart size={14} /><span className="text-[11px]">{post.likes}</span></span>
                  <span className="flex items-center gap-1.5 text-graphite-muted"><MessageCircle size={14} /><span className="text-[11px]">{post.replies}</span></span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar testes**

```bash
npm test -- --run src/components/profile/UserProfileScreen.test.tsx
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/profile/UserProfileScreen.tsx src/components/profile/UserProfileScreen.test.tsx
git commit -m "feat: add UserProfileScreen with follow/unfollow and posts feed"
```

---

## Task 1.5: Wire UserProfileScreen — tap on author em PostCard abre perfil

**Files:**
- Modify: `src/components/comunidade/ComunidadeScreen.tsx` (adicionar state + handler)
- Modify: `src/components/post/PostDetailScreen.tsx` (wire tap na autora)
- Modify: `src/lib/types.ts` (adicionar `authorId` a ApiPost já existe; verificar CommunityPost)
- Modify: `src/types/index.ts` (adicionar `authorId?: string` a CommunityPost)
- Modify: `src/lib/helpers.ts` (mapear authorId)

- [ ] **Step 1: Adicionar `authorId` a `CommunityPost` em `src/types/index.ts`**

Localizar a interface `CommunityPost` e adicionar:

```typescript
export interface CommunityPost {
  // ... campos existentes
  authorId?: string;
  // ... resto
}
```

- [ ] **Step 2: Mapear `authorId` em `apiPostToCommunityPost`**

Em `src/lib/helpers.ts`, dentro do return de `apiPostToCommunityPost`, adicionar:

```typescript
    authorId: post.authorId,
```

- [ ] **Step 3: Adicionar state e overlay em `ComunidadeScreen.tsx`**

Após `const [sharingPost, setSharingPost] = useState<CommunityPost | null>(null);`:

```tsx
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
```

Import no topo do arquivo:

```tsx
import { UserProfileScreen } from '../profile/UserProfileScreen';
```

Antes do `if (selectedPost)` block:

```tsx
  if (profileUserId) {
    return <UserProfileScreen userId={profileUserId} onBack={() => setProfileUserId(null)} />;
  }
```

- [ ] **Step 4: Passar `onOpenProfile` para PostCard**

No mapeamento de posts (linha ~250), adicionar prop:

```tsx
                <PostCard
                  key={post.id}
                  post={post}
                  onOpen={() => setSelectedPost(post)}
                  onOpenProfile={() => post.authorId && setProfileUserId(post.authorId)}
                  onRepost={() => repostMutation.mutate(post.id)}
                  onShare={() => setSharingPost(post)}
                />
```

Na assinatura de `PostCard` (linha 26-36), adicionar `onOpenProfile`:

```tsx
function PostCard({
  post,
  onOpen,
  onOpenProfile,
  onRepost,
  onShare,
}: {
  post: CommunityPost;
  onOpen: () => void;
  onOpenProfile: () => void;
  onRepost: () => void;
  onShare: () => void;
}) {
```

No JSX do avatar (linha ~64-84), envolver o bloco autor/badge num button e chamar `onOpenProfile`:

```tsx
      <button
        onClick={(e) => { e.stopPropagation(); onOpenProfile(); }}
        aria-label={`Ver perfil de ${post.author}`}
        className="flex items-center gap-2.5 text-left"
      >
        <div
          data-testid="post-avatar"
          aria-hidden="true"
          className="w-10 h-10 rounded-full bg-sara-terracotta flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
        >
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
      </button>
```

Remova esse bloco de dentro do `button onClick={onOpen}` — o botão do post agora envolve só o conteúdo.

- [ ] **Step 5: Wire tap na autora em `PostDetailScreen.tsx`**

Adicionar prop opcional `onOpenProfile?: (userId: string) => void`. No JSX do autor (linha ~107-122), transformar o `<div>` do avatar em `<button>` com onClick chamando `onOpenProfile?.(post.authorId!)`.

Em `ComunidadeScreen.tsx`, dentro do `if (selectedPost)`:

```tsx
    return (
      <PostDetailScreen
        post={selectedPost}
        onBack={() => setSelectedPost(null)}
        onOpenProfile={(userId) => { setSelectedPost(null); setProfileUserId(userId); }}
      />
    );
```

- [ ] **Step 6: Rodar todos os testes**

```bash
npm test -- --run
```

Expected: todos os testes existentes ainda passam, 0 regressões.

- [ ] **Step 7: Commit**

```bash
git add src/components/comunidade/ComunidadeScreen.tsx src/components/post/PostDetailScreen.tsx src/types/index.ts src/lib/helpers.ts
git commit -m "feat: tap on post author opens UserProfileScreen"
```

---

# Milestone 2 — Community Detail Page

**Feature:** Tocar num card de comunidade abre uma tela dedicada com banner, descrição, contagem de membros, botão Entrar/Sair, e feed de posts daquela comunidade.

**Backend changes:** Estender `GET /communities/:id` com `isMember` e `role`; ajustar `GET /communities/:id/posts` para incluir `likedByCurrentUser`.

**Frontend changes:** Criar `CommunityDetailScreen`, substituir o toggle Zustand `followedCommunityIds` por queries reais.

---

## Task 2.1: Estender `GET /communities/:id` e `/posts` com estado do usuário

**Files:**
- Modify: `server/src/routes/communities.ts:38-45` e `:64-81`
- Modify: `src/lib/types.ts` (adicionar `ApiCommunityDetail`)

- [ ] **Step 1: Substituir handler `GET /:id`**

Em `server/src/routes/communities.ts`, linhas 38-45:

```typescript
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const community = await fastify.prisma.community.findUnique({
      where: { id: request.params.id },
      include: {
        _count: { select: { members: true } },
        members: { where: { userId: request.userId }, select: { role: true } },
      },
    })
    if (!community) return reply.status(404).send({ error: 'Community not found' })
    const { members, ...rest } = community
    const isMember = members.length > 0
    const role = members[0]?.role ?? null
    reply.send({ ...rest, isMember, role })
  })
```

- [ ] **Step 2: Adicionar `likedByCurrentUser` em `GET /:id/posts`**

Substituir linhas 64-81:

```typescript
  fastify.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/:id/posts',
    async (request, reply) => {
      const limit = Math.min(Number(request.query.limit ?? 20), 50)
      const rows = await fastify.prisma.post.findMany({
        where: { communityId: request.params.id },
        take: limit + 1,
        ...(request.query.cursor ? { cursor: { id: request.query.cursor }, skip: 1 } : {}),
        include: {
          author: { select: { id: true, name: true } },
          _count: { select: { likes: true, comments: true } },
          likes: { where: { userId: request.userId }, select: { userId: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      const hasMore = rows.length > limit
      const items = rows.slice(0, limit).map(({ likes, ...post }) => ({
        ...post,
        likedByCurrentUser: likes.length > 0,
      }))
      reply.send({ items, hasMore })
    }
  )
```

- [ ] **Step 3: Adicionar `ApiCommunityDetail` em `src/lib/types.ts`**

Após `ApiCommunity` (linha ~38):

```typescript
export interface ApiCommunityDetail extends ApiCommunity {
  isMember: boolean
  role: 'owner' | 'admin' | 'member' | null
}
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/communities.ts src/lib/types.ts
git commit -m "feat(server): communities GET /:id returns isMember/role, /posts includes likedByCurrentUser"
```

---

## Task 2.2: Criar `CommunityDetailScreen`

**Files:**
- Create: `src/components/comunidade/CommunityDetailScreen.tsx`
- Create: `src/components/comunidade/CommunityDetailScreen.test.tsx`

- [ ] **Step 1: Escrever testes**

Criar `src/components/comunidade/CommunityDetailScreen.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommunityDetailScreen } from './CommunityDetailScreen';
import * as api from '../../lib/api';

vi.mock('../../lib/api', async () => ({
  ...(await vi.importActual('../../lib/api')),
  apiFetch: vi.fn(),
}));

function renderScreen(id = 'c1', onBack = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CommunityDetailScreen communityId={id} onBack={onBack} />
    </QueryClientProvider>
  );
}

const mockCommunity = {
  id: 'c1', name: 'Gestantes 2026', description: 'Um espaço para gestantes',
  category: 'gestação', colorKey: 'gold', creatorId: 'x', createdAt: '2026-01-01',
  _count: { members: 42 }, isMember: false, role: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.apiFetch).mockImplementation(async (path: string) => {
    if (path.endsWith('/posts')) return { items: [], hasMore: false };
    return mockCommunity;
  });
});

describe('CommunityDetailScreen', () => {
  it('renders community name and description', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('Gestantes 2026')).toBeInTheDocument());
    expect(screen.getByText('Um espaço para gestantes')).toBeInTheDocument();
  });

  it('shows member count', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText(/42 membros/i)).toBeInTheDocument());
  });

  it('shows "Entrar" when not a member', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument());
  });

  it('shows "Sair" when already a member', async () => {
    vi.mocked(api.apiFetch).mockImplementation(async (path: string) => {
      if (path.endsWith('/posts')) return { items: [], hasMore: false };
      return { ...mockCommunity, isMember: true, role: 'member' };
    });
    renderScreen();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument());
  });

  it('calls join endpoint when Entrar clicked', async () => {
    const user = userEvent.setup();
    renderScreen();
    await waitFor(() => screen.getByRole('button', { name: 'Entrar' }));
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() =>
      expect(api.apiFetch).toHaveBeenCalledWith('/communities/c1/join', { method: 'POST' })
    );
  });
});
```

- [ ] **Step 2: Rodar teste (deve falhar)**

```bash
npm test -- --run src/components/comunidade/CommunityDetailScreen.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implementar `CommunityDetailScreen`**

Criar `src/components/comunidade/CommunityDetailScreen.tsx`:

```tsx
import { ChevronLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { ApiCommunityDetail, PaginatedResult, ApiPost } from '../../lib/types';
import { apiPostToCommunityPost } from '../../lib/helpers';

interface CommunityDetailScreenProps {
  communityId: string;
  onBack: () => void;
}

const COLOR_MAP: Record<string, string> = {
  gold:       'bg-sara-gold',
  terracotta: 'bg-sara-terracotta',
  warm:       'bg-sara-warm',
  linen:      'bg-sara-linen',
  cream:      'bg-sara-cream',
};

export function CommunityDetailScreen({ communityId, onBack }: CommunityDetailScreenProps) {
  const queryClient = useQueryClient();

  const { data: community } = useQuery({
    queryKey: ['community', communityId],
    queryFn: () => apiFetch<ApiCommunityDetail>(`/communities/${communityId}`),
  });

  const { data: postsData } = useQuery({
    queryKey: ['community', communityId, 'posts'],
    queryFn: () => apiFetch<PaginatedResult<ApiPost>>(`/communities/${communityId}/posts`),
    enabled: !!community,
  });

  const joinMutation = useMutation({
    mutationFn: (isJoining: boolean) =>
      apiFetch(`/communities/${communityId}/join`, { method: isJoining ? 'POST' : 'DELETE' }),
    onSuccess: (_, isJoining) => {
      queryClient.setQueryData<ApiCommunityDetail>(['community', communityId], (old) =>
        old
          ? {
              ...old,
              isMember: isJoining,
              role: isJoining ? 'member' : null,
              _count: { ...old._count, members: old._count.members + (isJoining ? 1 : -1) },
            }
          : old
      );
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });

  if (!community) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="w-8 h-8 rounded-full border-2 border-sara-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  const posts = (postsData?.items ?? []).map(apiPostToCommunityPost);

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-6 pb-3 flex-shrink-0">
        <button onClick={onBack} aria-label="Voltar" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <p className="text-sm font-semibold text-graphite">{community.name}</p>
        <div className="w-8" />
      </div>

      <div className={`h-24 ${COLOR_MAP[community.colorKey] ?? 'bg-sara-gold'} flex-shrink-0`} />

      <div className="px-4 py-4 flex-shrink-0 bg-white/40">
        <h1 className="text-base font-bold text-graphite">{community.name}</h1>
        <p className="text-xs text-graphite-muted mt-1">{community._count.members} membros · {community.category}</p>
        <p className="text-sm text-graphite mt-3 leading-relaxed">{community.description}</p>

        <button
          onClick={() => joinMutation.mutate(!community.isMember)}
          className={`w-full mt-4 py-2.5 rounded-xl text-xs font-semibold active:scale-95 transition-transform ${
            community.isMember
              ? 'bg-white text-graphite-muted border border-sara-linen'
              : 'bg-sara-gold text-white'
          }`}
        >
          {community.isMember ? 'Sair' : 'Entrar'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {posts.length === 0 ? (
          <p className="text-sm text-graphite-muted text-center py-8">Nenhuma publicação ainda</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-graphite">{post.author}</p>
              <p className="text-sm text-graphite-light mt-1 leading-relaxed">{post.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar testes**

```bash
npm test -- --run src/components/comunidade/CommunityDetailScreen.test.tsx
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/comunidade/CommunityDetailScreen.tsx src/components/comunidade/CommunityDetailScreen.test.tsx
git commit -m "feat: add CommunityDetailScreen with join/leave and post feed"
```

---

## Task 2.3: Refatorar `ComunidadesScreen` para usar server state (sem Zustand followedCommunityIds)

**Files:**
- Modify: `src/components/comunidade/ComunidadesScreen.tsx`
- Modify: `src/components/comunidade/CommunityCard.tsx` (talvez precise passar isFollowing como prop já — checar)

- [ ] **Step 1: Alterar `ComunidadesScreen` para derivar isFollowing do backend**

Substituir `src/components/comunidade/ComunidadesScreen.tsx` inteiro:

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { CommunityCard } from './CommunityCard';
import { apiFetch } from '../../lib/api';
import type { ApiCommunity, ApiCommunityDetail } from '../../lib/types';
import { apiCommunityToCommunity } from '../../lib/helpers';
import type { Community, PregnancyPhase } from '../../types';
import { useState } from 'react';

type SubFilter = 'seguindo' | 'sugestoes';

function getSuggestionScore(community: Community, phase: PregnancyPhase, archetypeKey: string | undefined): number {
  let score = 0;
  if (phase.stage === 'pregnant' && community.category === 'gestação') score += 3;
  if (phase.stage === 'postpartum' && (community.category === 'pós-parto' || community.category === 'amamentação')) score += 3;
  if (archetypeKey === 'ana' && community.category === 'saúde mental') score += 2;
  return score;
}

interface ComunidadesScreenProps {
  onOpenCommunity?: (id: string) => void;
}

export function ComunidadesScreen({ onOpenCommunity }: ComunidadesScreenProps = {}) {
  const phase          = useAppStore((s) => s.phase);
  const motherProfile  = useAppStore((s) => s.motherProfile);
  const isLoggedIn     = useAppStore((s) => s.isLoggedIn);
  const queryClient    = useQueryClient();
  const [subFilter, setSubFilter] = useState<SubFilter>('seguindo');

  const { data: apiCommunities = [] } = useQuery({
    queryKey: ['communities'],
    queryFn: () => apiFetch<Array<ApiCommunity & { isMember?: boolean }>>('/communities?includeMember=1'),
    enabled: isLoggedIn,
  });

  const communities = apiCommunities.map((c) => ({
    ...apiCommunityToCommunity(c),
    isMember: !!c.isMember,
  }));

  const joinMutation = useMutation({
    mutationFn: ({ id, isJoining }: { id: string; isJoining: boolean }) =>
      apiFetch(`/communities/${id}/join`, { method: isJoining ? 'POST' : 'DELETE' }),
    onMutate: async ({ id, isJoining }) => {
      await queryClient.cancelQueries({ queryKey: ['communities'] });
      const previous = queryClient.getQueryData<Array<ApiCommunity & { isMember?: boolean }>>(['communities']);
      queryClient.setQueryData<Array<ApiCommunity & { isMember?: boolean }>>(['communities'], (old) =>
        old?.map((c) => (c.id === id ? { ...c, isMember: isJoining } : c)) ?? old
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['communities'], ctx.previous);
    },
  });

  function handleToggle(id: string, isMember: boolean) {
    joinMutation.mutate({ id, isJoining: !isMember });
  }

  const followed    = communities.filter((c) => c.isMember);
  const suggestions = communities
    .filter((c) => !c.isMember)
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
              isFollowing={community.isMember}
              onToggle={() => handleToggle(community.id, community.isMember)}
              onOpen={onOpenCommunity ? () => onOpenCommunity(community.id) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Adicionar suporte a `includeMember=1` no server**

Em `server/src/routes/communities.ts`, substituir `GET /` (linhas 16-22):

```typescript
  fastify.get<{ Querystring: { includeMember?: string } }>(
    '/',
    async (request, reply) => {
      const includeMember = request.query.includeMember === '1'
      const communities = await fastify.prisma.community.findMany({
        include: {
          _count: { select: { members: true } },
          ...(includeMember
            ? { members: { where: { userId: request.userId }, select: { userId: true } } }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
      })
      if (!includeMember) return reply.send(communities)
      reply.send(
        communities.map(({ members, ...c }: any) => ({ ...c, isMember: members.length > 0 }))
      )
    }
  )
```

- [ ] **Step 3: Adicionar `onOpen` prop a `CommunityCard`**

Em `src/components/comunidade/CommunityCard.tsx`, adicionar `onOpen?: () => void` na interface de props e envolver o conteúdo principal do card num `<button onClick={onOpen}>` (o botão de toggle deve ter `e.stopPropagation()` no onClick).

- [ ] **Step 4: Wire `onOpenCommunity` em `ComunidadeScreen.tsx`**

Adicionar state `const [openCommunityId, setOpenCommunityId] = useState<string | null>(null);` e overlay:

```tsx
  if (openCommunityId) {
    return <CommunityDetailScreen communityId={openCommunityId} onBack={() => setOpenCommunityId(null)} />;
  }
```

Passar `onOpenCommunity={setOpenCommunityId}` para `<ComunidadesScreen />` (linha ~274).

Import: `import { CommunityDetailScreen } from './CommunityDetailScreen';`

- [ ] **Step 5: Remover `followedCommunityIds` da Zustand store**

Em `src/store/useAppStore.ts`:
- Remover linha `followedCommunityIds: string[];`
- Remover `joinCommunity` e `leaveCommunity` actions
- Remover `followedCommunityIds: []` do estado inicial
- Remover as duas actions do body (`joinCommunity: (id) => ...`, `leaveCommunity: (id) => ...`)
- Remover do `partialize`

Em `src/components/comunidade/ComunidadeScreen.tsx`, remover `followedCommunityIds` da leitura e simplificar o `prioritized`:

```tsx
  // Sem "prioritized" — feed simples ordenado pelo servidor
  const filtered = activeCategory === 'todos'
    ? communityPosts
    : communityPosts.filter((p) => p.category === activeCategory);
```

- [ ] **Step 6: Rodar todos os testes**

```bash
npm test -- --run
```

Expected: alguns testes de `ComunidadesScreen.test.tsx` podem quebrar (mock de Zustand). Ajustar mocks pra retornar `isMember` no mock da API.

- [ ] **Step 7: Commit**

```bash
git add src/components/comunidade/ src/store/useAppStore.ts server/src/routes/communities.ts
git commit -m "refactor: community membership from Zustand to server state; wire community detail"
```

---

# Milestone 3 — Create Community

**Feature:** Botão "+" na aba Comunidades abre form de criação (nome, descrição, categoria, cor). Ao criar, navega direto pra `CommunityDetailScreen` da nova comunidade.

**Backend changes:** Nenhuma — `POST /communities` já existe.

---

## Task 3.1: Criar `CreateCommunityScreen`

**Files:**
- Create: `src/components/comunidade/CreateCommunityScreen.tsx`
- Create: `src/components/comunidade/CreateCommunityScreen.test.tsx`

- [ ] **Step 1: Escrever testes**

Criar `src/components/comunidade/CreateCommunityScreen.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateCommunityScreen } from './CreateCommunityScreen';
import * as api from '../../lib/api';

vi.mock('../../lib/api', async () => ({
  ...(await vi.importActual('../../lib/api')),
  apiFetch: vi.fn(),
}));

function renderScreen(onCreated = vi.fn(), onBack = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CreateCommunityScreen onCreated={onCreated} onBack={onBack} />
    </QueryClientProvider>
  );
}

beforeEach(() => vi.clearAllMocks());

describe('CreateCommunityScreen', () => {
  it('disables Criar until name and description filled', async () => {
    renderScreen();
    expect(screen.getByRole('button', { name: 'Criar comunidade' })).toBeDisabled();
  });

  it('enables Criar when name + description provided', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByLabelText('Nome'), 'Gestantes 2027');
    await user.type(screen.getByLabelText('Descrição'), 'Um lugar seguro');
    expect(screen.getByRole('button', { name: 'Criar comunidade' })).toBeEnabled();
  });

  it('POSTs to /communities and calls onCreated with new id', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ id: 'new1', name: 'x' });
    const onCreated = vi.fn();
    const user = userEvent.setup();
    renderScreen(onCreated);
    await user.type(screen.getByLabelText('Nome'), 'Gestantes 2027');
    await user.type(screen.getByLabelText('Descrição'), 'Um lugar seguro');
    await user.click(screen.getByRole('button', { name: 'Criar comunidade' }));
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith('new1'));
  });
});
```

- [ ] **Step 2: Rodar teste (deve falhar)**

```bash
npm test -- --run src/components/comunidade/CreateCommunityScreen.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implementar `CreateCommunityScreen`**

Criar `src/components/comunidade/CreateCommunityScreen.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

type Category = 'gestação' | 'pós-parto' | 'amamentação' | 'saúde mental';
type ColorKey = 'gold' | 'terracotta' | 'warm' | 'linen' | 'cream';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'gestação',     label: 'Gestação' },
  { value: 'pós-parto',    label: 'Pós-parto' },
  { value: 'amamentação',  label: 'Amamentação' },
  { value: 'saúde mental', label: 'Saúde Mental' },
];

const COLORS: { value: ColorKey; className: string }[] = [
  { value: 'gold',       className: 'bg-sara-gold' },
  { value: 'terracotta', className: 'bg-sara-terracotta' },
  { value: 'warm',       className: 'bg-sara-warm' },
  { value: 'linen',      className: 'bg-sara-linen' },
  { value: 'cream',      className: 'bg-sara-cream' },
];

interface CreateCommunityScreenProps {
  onCreated: (id: string) => void;
  onBack: () => void;
}

export function CreateCommunityScreen({ onCreated, onBack }: CreateCommunityScreenProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('gestação');
  const [colorKey, setColorKey] = useState<ColorKey>('gold');
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string }>('/communities', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: description.trim(), category, colorKey }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      onCreated(data.id);
    },
  });

  const valid = name.trim().length > 0 && description.trim().length > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (valid) mutate();
  }

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-6 pb-3 flex-shrink-0">
        <button onClick={onBack} aria-label="Voltar" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <h1 className="text-base font-semibold text-graphite">Nova comunidade</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="cc-name" className="text-xs font-medium text-graphite-muted">Nome</label>
          <input
            id="cc-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Gestantes de 2027"
            className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite focus:outline-none focus:border-sara-gold"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="cc-description" className="text-xs font-medium text-graphite-muted">Descrição</label>
          <textarea
            id="cc-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Para quem é essa comunidade?"
            className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite resize-none focus:outline-none focus:border-sara-gold"
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-graphite-muted">Categoria</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                aria-pressed={category === c.value}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  category === c.value ? 'bg-sara-gold text-white' : 'bg-white text-graphite-muted border border-sara-linen'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-graphite-muted">Cor</p>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColorKey(c.value)}
                aria-label={c.value}
                aria-pressed={colorKey === c.value}
                className={`w-10 h-10 rounded-full ${c.className} ${colorKey === c.value ? 'ring-2 ring-graphite ring-offset-2' : ''}`}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!valid || isPending}
          className="w-full py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50 mt-2"
        >
          {isPending ? 'Criando…' : 'Criar comunidade'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Rodar testes**

```bash
npm test -- --run src/components/comunidade/CreateCommunityScreen.test.tsx
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/comunidade/CreateCommunityScreen.tsx src/components/comunidade/CreateCommunityScreen.test.tsx
git commit -m "feat: add CreateCommunityScreen with name/desc/category/color form"
```

---

## Task 3.2: Wire botão "+" em `ComunidadesScreen`

**Files:**
- Modify: `src/components/comunidade/ComunidadesScreen.tsx`
- Modify: `src/components/comunidade/ComunidadeScreen.tsx` (parent — para receber id da nova comunidade)

- [ ] **Step 1: Adicionar botão "+" em `ComunidadesScreen`**

Adicionar prop `onCreate?: () => void` na interface. Adicionar botão flutuante ao final do JSX (antes do `</div>` de fechamento):

```tsx
      {onCreate && (
        <button
          onClick={onCreate}
          aria-label="Criar comunidade"
          className="fixed bottom-24 right-4 z-20 w-14 h-14 rounded-full bg-sara-gold text-white shadow-lg flex items-center justify-center"
        >
          <Plus size={24} />
        </button>
      )}
```

Import `Plus` de `lucide-react`.

- [ ] **Step 2: Wire em `ComunidadeScreen.tsx`**

Adicionar state:

```tsx
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
```

Adicionar overlay antes do return principal, ao lado do `if (openCommunityId)`:

```tsx
  if (showCreateCommunity) {
    return (
      <CreateCommunityScreen
        onBack={() => setShowCreateCommunity(false)}
        onCreated={(id) => { setShowCreateCommunity(false); setOpenCommunityId(id); }}
      />
    );
  }
```

Passar `onCreate={() => setShowCreateCommunity(true)}` para `<ComunidadesScreen />`.

Import: `import { CreateCommunityScreen } from './CreateCommunityScreen';`

- [ ] **Step 3: Rodar todos os testes**

```bash
npm test -- --run
```

Expected: 0 regressões.

- [ ] **Step 4: Commit**

```bash
git add src/components/comunidade/
git commit -m "feat: wire CreateCommunity flow from ComunidadesScreen"
```

---

# Milestone 4 — Followers / Following Lists

**Feature:** Tocar em "12 Seguidoras" ou "8 Seguindo" no perfil abre uma lista rolável de usuárias. Cada linha mostra avatar + nome + botão Seguir/Seguindo. Tocar num item abre o `UserProfileScreen` daquela pessoa.

**Backend changes:** `GET /users/:id/followers` e `/following` já existem — ajustar retorno para incluir `isFollowedByCurrentUser` em cada entrada.

---

## Task 4.1: Estender endpoints de followers/following com `isFollowedByCurrentUser`

**Files:**
- Modify: `server/src/routes/users.ts:58-88`

- [ ] **Step 1: Ajustar handler `/followers`**

Substituir handler `GET /:id/followers`:

```typescript
  fastify.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/:id/followers',
    async (request, reply) => {
      const limit = Math.min(Number(request.query.limit ?? 20), 50)
      const follows = await fastify.prisma.follow.findMany({
        where: { followingId: request.params.id },
        take: limit + 1,
        ...(request.query.cursor ? { cursor: { followerId_followingId: { followerId: request.query.cursor, followingId: request.params.id } }, skip: 1 } : {}),
        include: { follower: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      })
      const hasMore = follows.length > limit
      const items = follows.slice(0, limit).map((f) => f.follower)

      const myFollows = await fastify.prisma.follow.findMany({
        where: { followerId: request.userId, followingId: { in: items.map((i) => i.id) } },
        select: { followingId: true },
      })
      const followingSet = new Set(myFollows.map((f) => f.followingId))
      const enriched = items.map((u) => ({
        ...u,
        isFollowedByCurrentUser: followingSet.has(u.id),
        isSelf: u.id === request.userId,
      }))
      reply.send({ items: enriched, hasMore })
    }
  )
```

- [ ] **Step 2: Ajustar handler `/following` de forma análoga**

Substituir handler `GET /:id/following` com a mesma lógica de enrichment.

- [ ] **Step 3: Adicionar tipo em `src/lib/types.ts`**

```typescript
export interface ApiFollowUser {
  id: string
  name: string
  isFollowedByCurrentUser: boolean
  isSelf: boolean
}
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/users.ts src/lib/types.ts
git commit -m "feat(server): enrich followers/following with isFollowedByCurrentUser and isSelf"
```

---

## Task 4.2: Criar `FollowListScreen`

**Files:**
- Create: `src/components/profile/FollowListScreen.tsx`
- Create: `src/components/profile/FollowListScreen.test.tsx`

- [ ] **Step 1: Escrever testes**

Criar `src/components/profile/FollowListScreen.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FollowListScreen } from './FollowListScreen';
import * as api from '../../lib/api';

vi.mock('../../lib/api', async () => ({
  ...(await vi.importActual('../../lib/api')),
  apiFetch: vi.fn(),
}));

function renderScreen(mode: 'followers' | 'following' = 'followers', userId = 'u1', onOpen = vi.fn(), onBack = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <FollowListScreen mode={mode} userId={userId} onOpenUser={onOpen} onBack={onBack} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.apiFetch).mockResolvedValue({
    items: [
      { id: 'a', name: 'Ana', isFollowedByCurrentUser: false, isSelf: false },
      { id: 'b', name: 'Bia', isFollowedByCurrentUser: true, isSelf: false },
    ],
    hasMore: false,
  });
});

describe('FollowListScreen', () => {
  it('renders "Seguidoras" title in followers mode', async () => {
    renderScreen('followers');
    await waitFor(() => expect(screen.getByText('Seguidoras')).toBeInTheDocument());
  });

  it('renders "Seguindo" title in following mode', async () => {
    renderScreen('following');
    await waitFor(() => expect(screen.getByText('Seguindo')).toBeInTheDocument());
  });

  it('lists users with follow button state', async () => {
    renderScreen('followers');
    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
      expect(screen.getByText('Bia')).toBeInTheDocument();
    });
    const buttons = screen.getAllByRole('button', { name: /Seguir|Seguindo/i });
    expect(buttons.find((b) => b.textContent === 'Seguir')).toBeTruthy();
    expect(buttons.find((b) => b.textContent === 'Seguindo')).toBeTruthy();
  });

  it('calls onOpenUser when list item clicked', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    renderScreen('followers', 'u1', onOpen);
    await waitFor(() => screen.getByText('Ana'));
    await user.click(screen.getByText('Ana'));
    expect(onOpen).toHaveBeenCalledWith('a');
  });
});
```

- [ ] **Step 2: Rodar teste (deve falhar)**

```bash
npm test -- --run src/components/profile/FollowListScreen.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implementar `FollowListScreen`**

Criar `src/components/profile/FollowListScreen.tsx`:

```tsx
import { ChevronLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { ApiFollowUser, PaginatedResult } from '../../lib/types';

interface FollowListScreenProps {
  mode: 'followers' | 'following';
  userId: string;
  onOpenUser: (id: string) => void;
  onBack: () => void;
}

export function FollowListScreen({ mode, userId, onOpenUser, onBack }: FollowListScreenProps) {
  const queryClient = useQueryClient();
  const title = mode === 'followers' ? 'Seguidoras' : 'Seguindo';
  const queryKey = ['user', userId, mode];

  const { data } = useQuery({
    queryKey,
    queryFn: () => apiFetch<PaginatedResult<ApiFollowUser>>(`/users/${userId}/${mode}`),
  });

  const followMutation = useMutation({
    mutationFn: ({ id, isFollowing }: { id: string; isFollowing: boolean }) =>
      apiFetch(`/users/${id}/follow`, { method: isFollowing ? 'POST' : 'DELETE' }),
    onSuccess: (_, { id, isFollowing }) => {
      queryClient.setQueryData<PaginatedResult<ApiFollowUser>>(queryKey, (old) =>
        old
          ? { ...old, items: old.items.map((u) => (u.id === id ? { ...u, isFollowedByCurrentUser: isFollowing } : u)) }
          : old
      );
    },
  });

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-6 pb-3 flex-shrink-0">
        <button onClick={onBack} aria-label="Voltar" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <h1 className="text-base font-semibold text-graphite">{title}</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-sm text-graphite-muted text-center py-8">Ninguém aqui ainda</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => onOpenUser(u.id)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-sara-terracotta flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-semibold text-graphite">{u.name}</p>
                </button>
                {!u.isSelf && (
                  <button
                    onClick={() => followMutation.mutate({ id: u.id, isFollowing: !u.isFollowedByCurrentUser })}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                      u.isFollowedByCurrentUser
                        ? 'bg-white text-graphite-muted border border-sara-linen'
                        : 'bg-sara-gold text-white'
                    }`}
                  >
                    {u.isFollowedByCurrentUser ? 'Seguindo' : 'Seguir'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar testes**

```bash
npm test -- --run src/components/profile/FollowListScreen.test.tsx
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/profile/FollowListScreen.tsx src/components/profile/FollowListScreen.test.tsx
git commit -m "feat: add FollowListScreen with follow toggle per row"
```

---

## Task 4.3: Wire Seguidoras/Seguindo counts em `UserProfileScreen` e `ProfileScreen`

**Files:**
- Modify: `src/components/profile/UserProfileScreen.tsx`
- Modify: `src/components/profile/ProfileScreen.tsx`

- [ ] **Step 1: Adicionar navegação em `UserProfileScreen`**

Adicionar state e overlay:

```tsx
import { useState } from 'react';
import { FollowListScreen } from './FollowListScreen';

// dentro do component:
const [followList, setFollowList] = useState<'followers' | 'following' | null>(null);

// antes do return principal:
if (followList) {
  return (
    <FollowListScreen
      mode={followList}
      userId={userId}
      onOpenUser={(id) => { /* recursive - abre outro perfil */ /* delegar via callback pai */ }}
      onBack={() => setFollowList(null)}
    />
  );
}
```

Para permitir navegação recursiva (perfil → lista → perfil de outra), adicionar prop `onOpenProfile?: (userId: string) => void` no `UserProfileScreen`. O callback `onOpenUser` da lista chama esse prop.

Envolver os blocos de contadores Seguidoras e Seguindo em `<button onClick={() => setFollowList('followers'|'following')}>`.

- [ ] **Step 2: Fazer o mesmo em `ProfileScreen` (self view)**

Adicionar state, overlay e envolver contadores em botões — mesma lógica.

Usar `useAppStore((s) => s.currentUserId)` para o `userId` da lista.

- [ ] **Step 3: Rodar todos os testes**

```bash
npm test -- --run
```

Expected: 0 regressões.

- [ ] **Step 4: Commit**

```bash
git add src/components/profile/UserProfileScreen.tsx src/components/profile/ProfileScreen.tsx
git commit -m "feat: tap on followers/following count opens FollowListScreen"
```

---

# Milestone 5 — Search

**Feature:** Ícone de busca no header abre uma tela de search com input debounced. Retorna usuárias e comunidades matching. Tocar em resultado abre o perfil/comunidade.

**Backend changes:** Novo endpoint `GET /search?q=<query>` retorna `{ users: [], communities: [] }`.

---

## Task 5.1: Endpoint `GET /search`

**Files:**
- Create: `server/src/routes/search.ts`
- Modify: `server/src/index.ts` (registrar rota)

- [ ] **Step 1: Escrever teste**

Criar `server/src/routes/search.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'
import Fastify from 'fastify'
import searchRoutes from './search'

const prisma = new PrismaClient()

describe('GET /search', () => {
  it('returns users and communities matching query', async () => {
    const stamp = Date.now()
    const user = await prisma.user.create({
      data: { email: `u${stamp}@t.com`, passwordHash: 'x', name: `Julia${stamp}`, pregnancyStage: 'pregnant' },
    })
    const community = await prisma.community.create({
      data: { name: `Gestantes${stamp}`, description: 'x', category: 'gestação', colorKey: 'gold', creatorId: user.id },
    })

    const app = Fastify()
    app.decorate('prisma', prisma)
    app.decorateRequest('userId', '')
    app.decorate('authenticate', async (req: any) => { req.userId = user.id })
    await app.register(searchRoutes)

    const res = await app.inject({ method: 'GET', url: `/?q=${stamp}` })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.users.some((u: any) => u.id === user.id)).toBe(true)
    expect(body.communities.some((c: any) => c.id === community.id)).toBe(true)

    await prisma.community.delete({ where: { id: community.id } })
    await prisma.user.delete({ where: { id: user.id } })
    await app.close()
  })

  it('returns empty arrays for query shorter than 2 chars', async () => {
    const app = Fastify()
    app.decorate('prisma', prisma)
    app.decorateRequest('userId', '')
    app.decorate('authenticate', async (req: any) => { req.userId = 'x' })
    await app.register(searchRoutes)

    const res = await app.inject({ method: 'GET', url: '/?q=a' })
    const body = res.json()
    expect(body.users).toEqual([])
    expect(body.communities).toEqual([])
    await app.close()
  })
})
```

- [ ] **Step 2: Rodar teste (deve falhar)**

```bash
cd server && npx vitest run src/routes/search.test.ts
```

Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `server/src/routes/search.ts`**

```typescript
import type { FastifyInstance } from 'fastify'

export default async function searchRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get<{ Querystring: { q?: string } }>('/', async (request, reply) => {
    const q = (request.query.q ?? '').trim()
    if (q.length < 2) return reply.send({ users: [], communities: [] })

    const [users, communities] = await Promise.all([
      fastify.prisma.user.findMany({
        where: { name: { contains: q } },
        select: { id: true, name: true, pregnancyStage: true },
        take: 10,
      }),
      fastify.prisma.community.findMany({
        where: { OR: [{ name: { contains: q } }, { description: { contains: q } }] },
        include: { _count: { select: { members: true } } },
        take: 10,
      }),
    ])

    reply.send({ users, communities })
  })
}
```

- [ ] **Step 4: Registrar rota em `server/src/index.ts`**

Após o `app.register(usersRoutes, { prefix: '/users' })`:

```typescript
import searchRoutes from './routes/search'
// ...
await app.register(searchRoutes, { prefix: '/search' })
```

- [ ] **Step 5: Rodar teste**

```bash
cd server && npx vitest run src/routes/search.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/search.ts server/src/routes/search.test.ts server/src/index.ts
git commit -m "feat(server): GET /search returns matching users and communities"
```

---

## Task 5.2: Criar `SearchScreen` com debounce

**Files:**
- Create: `src/components/search/SearchScreen.tsx`
- Create: `src/components/search/SearchScreen.test.tsx`

- [ ] **Step 1: Escrever testes**

Criar `src/components/search/SearchScreen.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchScreen } from './SearchScreen';
import * as api from '../../lib/api';

vi.mock('../../lib/api', async () => ({
  ...(await vi.importActual('../../lib/api')),
  apiFetch: vi.fn(),
}));

function renderScreen(onUser = vi.fn(), onCommunity = vi.fn(), onBack = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SearchScreen onOpenUser={onUser} onOpenCommunity={onCommunity} onBack={onBack} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.apiFetch).mockResolvedValue({
    users: [{ id: 'u1', name: 'Julia', pregnancyStage: 'pregnant' }],
    communities: [{ id: 'c1', name: 'Gestantes', description: 'x', category: 'gestação', colorKey: 'gold', _count: { members: 5 } }],
  });
});

describe('SearchScreen', () => {
  it('renders search input', () => {
    renderScreen();
    expect(screen.getByPlaceholderText(/Buscar/i)).toBeInTheDocument();
  });

  it('shows results after typing', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByPlaceholderText(/Buscar/i), 'jul');
    await waitFor(() => {
      expect(screen.getByText('Julia')).toBeInTheDocument();
      expect(screen.getByText('Gestantes')).toBeInTheDocument();
    });
  });

  it('does not search for queries under 2 chars', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByPlaceholderText(/Buscar/i), 'j');
    // pequena espera pra garantir que debounce não disparou
    await new Promise((r) => setTimeout(r, 250));
    expect(api.apiFetch).not.toHaveBeenCalled();
  });

  it('calls onOpenUser when user result clicked', async () => {
    const onOpenUser = vi.fn();
    const user = userEvent.setup();
    renderScreen(onOpenUser);
    await user.type(screen.getByPlaceholderText(/Buscar/i), 'jul');
    await waitFor(() => screen.getByText('Julia'));
    await user.click(screen.getByText('Julia'));
    expect(onOpenUser).toHaveBeenCalledWith('u1');
  });
});
```

- [ ] **Step 2: Rodar teste (deve falhar)**

```bash
npm test -- --run src/components/search/SearchScreen.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implementar `SearchScreen`**

Criar `src/components/search/SearchScreen.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { ChevronLeft, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

interface SearchResults {
  users: Array<{ id: string; name: string; pregnancyStage: string }>;
  communities: Array<{ id: string; name: string; description: string; category: string; colorKey: string; _count: { members: number } }>;
}

interface SearchScreenProps {
  onOpenUser: (id: string) => void;
  onOpenCommunity: (id: string) => void;
  onBack: () => void;
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function SearchScreen({ onOpenUser, onOpenCommunity, onBack }: SearchScreenProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query.trim(), 200);

  const { data } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => apiFetch<SearchResults>(`/search?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.length >= 2,
  });

  const users = data?.users ?? [];
  const communities = data?.communities ?? [];

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-6 pb-3 flex-shrink-0">
        <button onClick={onBack} aria-label="Voltar" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <div className="flex-1 flex items-center gap-2 bg-white rounded-2xl border border-sara-linen px-3 py-2">
          <Search size={16} className="text-graphite-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pessoas e comunidades"
            className="flex-1 bg-transparent text-sm text-graphite placeholder:text-sara-muted outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {users.length > 0 && (
          <section>
            <p className="text-[10px] font-semibold text-graphite-muted uppercase tracking-wide px-4 py-2">Pessoas</p>
            <ul className="divide-y divide-gray-100">
              {users.map((u) => (
                <li key={u.id}>
                  <button onClick={() => onOpenUser(u.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                    <div className="w-10 h-10 rounded-full bg-sara-terracotta flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm font-semibold text-graphite">{u.name}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {communities.length > 0 && (
          <section>
            <p className="text-[10px] font-semibold text-graphite-muted uppercase tracking-wide px-4 py-2">Comunidades</p>
            <ul className="divide-y divide-gray-100">
              {communities.map((c) => (
                <li key={c.id}>
                  <button onClick={() => onOpenCommunity(c.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                    <div className="w-10 h-10 rounded-2xl bg-sara-gold flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-graphite">{c.name}</p>
                      <p className="text-[11px] text-graphite-muted">{c._count.members} membros</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {debouncedQuery.length >= 2 && users.length === 0 && communities.length === 0 && (
          <p className="text-sm text-graphite-muted text-center py-8">Nada encontrado para "{debouncedQuery}"</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar testes**

```bash
npm test -- --run src/components/search/SearchScreen.test.tsx
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/search/
git commit -m "feat: add SearchScreen with debounced query for users + communities"
```

---

## Task 5.3: Wire ícone de busca no header

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Adicionar botão de busca ao `headerRightSlot`**

Em `App.tsx`, importar `Search` de `lucide-react` e `SearchScreen`.

Adicionar state:

```tsx
const [showSearch, setShowSearch] = useState(false);
const [profileUserId, setProfileUserId] = useState<string | null>(null);
const [openCommunityId, setOpenCommunityId] = useState<string | null>(null);
```

No `headerRightSlot`, antes do botão de mensagens, adicionar:

```tsx
      <button
        onClick={() => setShowSearch(true)}
        aria-label="Buscar"
        className="relative w-9 h-9 rounded-xl bg-white/70 backdrop-blur-sm border border-white/50 flex items-center justify-center"
      >
        <Search size={18} className="text-graphite-light" strokeWidth={1.8} />
      </button>
```

- [ ] **Step 2: Adicionar overlays**

Após os overlays existentes de settings/notifs/chat:

```tsx
{showSearch && (
  <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
    <SearchScreen
      onBack={() => setShowSearch(false)}
      onOpenUser={(id) => { setShowSearch(false); setProfileUserId(id); }}
      onOpenCommunity={(id) => { setShowSearch(false); setOpenCommunityId(id); }}
    />
  </div>
)}

{profileUserId && (
  <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
    <UserProfileScreen userId={profileUserId} onBack={() => setProfileUserId(null)} />
  </div>
)}

{openCommunityId && (
  <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
    <CommunityDetailScreen communityId={openCommunityId} onBack={() => setOpenCommunityId(null)} />
  </div>
)}
```

Imports: `UserProfileScreen`, `CommunityDetailScreen`, `SearchScreen`.

- [ ] **Step 3: Rodar todos os testes**

```bash
npm test -- --run
```

Expected: 0 regressões.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire search button in header with user/community navigation overlays"
```

---

# Verificação Final

- [ ] **Step 1: Rodar suite completa**

```bash
npm test -- --run
```

Expected: 0 falhas. Contagem esperada: ~180-190 tests (adicionamos ~25 novos).

- [ ] **Step 2: Rodar TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 erros novos (erros pré-existentes documentados no chat anterior podem persistir).

- [ ] **Step 3: Boot manual — smoke test**

```bash
# terminal 1
npm --prefix server run dev
# terminal 2
npm run dev
```

Abrir `http://localhost:5173`:
- Fazer login
- Tocar no nome de uma autora em um post → deve abrir `UserProfileScreen`
- Tocar em "Seguidoras" → lista abre
- Voltar, aba Comunidades, tocar em card → `CommunityDetailScreen` abre
- Tocar em "+" na aba Comunidades → form abre; criar; redirecionar pra detail
- Tocar no ícone de busca do header → digitar → resultados aparecem
- Testar todos os botões de voltar / fechar

- [ ] **Step 4: Commit final (release marker)**

```bash
git commit --allow-empty -m "release: Tier 1 social loop complete"
```

---

# Contexto — Próximos Tiers (referência)

Não implementar agora. Deixado aqui pra não perdermos de vista.

## Tier 2 — Real usability

1. **Upload de imagem real** (S3/Cloudflare R2 presigned URL, remover base64 do CreatePostScreen)
2. **Editar perfil** (nome, bio, foto — usa `PATCH /users/me`)
3. **Notificação → destino** (tap em notif abre post/perfil relevante)
4. **Infinite scroll** nos feeds (usar `useInfiniteQuery`, backend já paginated)

## Tier 3 — Ship-blockers pré-lançamento

1. **Report/block user** (moderação — endpoint + UI)
2. **Password reset** (`POST /auth/forgot-password` + email)
3. **Delete account** (LGPD art. 18)
4. **Termos + Política de Privacidade** (páginas + aceite no register)
5. **Rate limit** nas ações sociais (verificar `@fastify/rate-limit` aplicado em like/follow/post)

## Tier 4 — Sofisticação

1. Real-time chat (WebSocket ou SSE)
2. Push notifications (FCM)
3. Comentários aninhados + curtir comentário
4. Editar post
5. Compartilhar via URL (requer roteamento — react-router)
6. Read receipt + typing indicator no chat
