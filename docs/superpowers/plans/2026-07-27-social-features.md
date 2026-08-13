# Social Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir 6 bugs sociais: @menções em comentários, like em comentário, comentários invisíveis, avatar real com foto de perfil, sincronização de follow, e priorização do feed.

**Architecture:** `UserAvatar` component centraliza a lógica de exibir foto real ou inicial colorida. Backend adiciona rota de like em comentário e lógica de ordenação de feed. `PostDetailScreen` recebe o `MentionInput` no campo de comentário.

**Tech Stack:** Fastify + Prisma (backend), React + TypeScript (frontend), Vitest + RTL (testes)

Bugs cobertos: #1 (menção em comentário), #7 (like comentário), #12 (avatar real), #13 (follow sync), #19 (comentários invisíveis), #20 (feed priorizado)

---

### Task 1: Componente `UserAvatar` — foto real ou inicial colorida

**Files:**
- Create: `src/components/shared/UserAvatar.tsx`
- Create: `src/components/shared/UserAvatar.test.tsx`

- [ ] **Step 1: Escrever testes que vão falhar**

Criar `src/components/shared/UserAvatar.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserAvatar } from './UserAvatar'

describe('UserAvatar', () => {
  it('renders initial letter when no avatarUrl', () => {
    render(<UserAvatar name="Ana" archetypeKey={null} avatarUrl={null} size={40} />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('renders img when avatarUrl is provided', () => {
    render(<UserAvatar name="Ana" archetypeKey={null} avatarUrl="https://cdn.test/ana.jpg" size={40} />)
    const img = screen.getByRole('img', { name: 'Foto de Ana' })
    expect(img).toHaveAttribute('src', 'https://cdn.test/ana.jpg')
  })

  it('falls back to initial if img fails to load', async () => {
    render(<UserAvatar name="Ana" archetypeKey={null} avatarUrl="https://cdn.test/broken.jpg" size={40} />)
    const img = screen.getByRole('img')
    // Simular erro de carregamento
    img.dispatchEvent(new Event('error'))
    expect(await screen.findByText('A')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

```bash
npx vitest run src/components/shared/UserAvatar.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Criar o componente**

Criar `src/components/shared/UserAvatar.tsx`:

```tsx
import { useState } from 'react'
import { getAvatarColor } from '../../utils/avatar'
import { resolveMediaUrl } from '../../lib/api'

interface Props {
  name: string
  archetypeKey?: string | null
  avatarUrl?: string | null
  size?: number
  className?: string
}

export function UserAvatar({ name, archetypeKey, avatarUrl, size = 40, className = '' }: Props) {
  const [imgError, setImgError] = useState(false)
  const resolvedUrl = avatarUrl ? resolveMediaUrl(avatarUrl) : null

  const sizeClass = `flex-shrink-0 rounded-full flex items-center justify-center font-bold text-white overflow-hidden`
  const style = { width: size, height: size, background: getAvatarColor(archetypeKey) }
  const fontSize = size <= 32 ? 'text-xs' : size <= 48 ? 'text-sm' : 'text-xl'

  if (resolvedUrl && !imgError) {
    return (
      <div style={style} className={`${sizeClass} ${className}`}>
        <img
          src={resolvedUrl}
          alt={`Foto de ${name}`}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  return (
    <div style={style} className={`${sizeClass} ${fontSize} ${className}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
```

- [ ] **Step 4: Rodar para ver passar**

```bash
npx vitest run src/components/shared/UserAvatar.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Substituir avatars em todo o app**

Buscar todos os padrões de avatar com inicial e trocar pelo `UserAvatar`. Os arquivos principais:
- `src/components/comunidade/PostCard.tsx`
- `src/components/post/PostDetailScreen.tsx`
- `src/components/chat/ChatListScreen.tsx`
- `src/components/chat/ChatScreen.tsx`
- `src/components/chat/ChatProfilePreviewModal.tsx`
- `src/components/notifications/NotificationsScreen.tsx`
- `src/components/comunidade/CommunityDetailScreen.tsx`

Em cada arquivo, trocar padrão:
```tsx
// ANTES:
<div style={{ background: getAvatarColor(post.authorArchetypeKey) }}
  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
  {post.author.charAt(0)}
</div>

// DEPOIS:
<UserAvatar
  name={post.author}
  archetypeKey={post.authorArchetypeKey}
  avatarUrl={post.authorAvatarUrl}
  size={40}
/>
```

Nota: `post.authorAvatarUrl` precisa ser adicionado ao tipo `CommunityPost` e ao helper `apiPostToCommunityPost` (veja Task 2).

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/UserAvatar.tsx src/components/shared/UserAvatar.test.tsx
git commit -m "feat(shared): add UserAvatar component with real photo support and fallback"
```

---

### Task 2: Backend e tipos — incluir avatarUrl nos payloads relevantes

**Files:**
- Modify: `src/types.ts` (tipo `CommunityPost`)
- Modify: `src/lib/types.ts` (tipo `ApiPost`, `ApiComment`, `ApiNotification`)
- Modify: `src/lib/helpers.ts` (função `apiPostToCommunityPost`)
- Modify: `server/src/routes/posts.ts` (incluir `avatarUrl` no select do autor)
- Modify: `server/src/routes/notifications.ts` (incluir `avatarUrl` do ator)

- [ ] **Step 1: Adicionar `authorAvatarUrl` ao tipo `CommunityPost`**

Em `src/types.ts`:
```ts
// Adicionar ao tipo CommunityPost:
authorAvatarUrl?: string | null
```

- [ ] **Step 2: Adicionar `avatarUrl` ao `ApiPost` e `ApiComment`**

Em `src/lib/types.ts`:
```ts
// No tipo ApiPost, dentro de author:
author: { id: string; name: string; username?: string | null; archetypeKey?: string | null; avatarUrl?: string | null }

// No tipo ApiComment (se existir), dentro de author:
author: { id: string; name: string; archetypeKey?: string | null; avatarUrl?: string | null }

// No tipo ApiNotification, adicionar:
actorAvatarUrl?: string | null
```

- [ ] **Step 3: Atualizar `apiPostToCommunityPost` em `src/lib/helpers.ts`**

```ts
// No retorno da função, adicionar:
authorAvatarUrl: post.author.avatarUrl ?? null,
```

- [ ] **Step 4: Backend — incluir avatarUrl no select do autor dos posts**

Em `server/src/routes/posts.ts`, nos `include`/`select` do autor:
```ts
author: { select: { id: true, name: true, username: true, archetypeKey: true, avatarUrl: true } }
```
Fazer o mesmo em todas as queries de posts (GET /, GET /:id, etc).

- [ ] **Step 5: Backend — incluir avatarUrl do ator nas notificações**

Em `server/src/routes/notifications.ts`, incluir `avatarUrl` ao buscar o ator:
```ts
// Ao criar/buscar notificações, garantir que actorAvatarUrl é retornado
// (verificar a estrutura atual e adicionar o campo ao retorno)
```

- [ ] **Step 6: Verificar TypeScript**

```bash
npx tsc --noEmit
cd server && npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/lib/types.ts src/lib/helpers.ts server/src/routes/posts.ts
git commit -m "feat: propagate avatarUrl through post/notification/comment types and API selects"
```

---

### Task 3: Comentários invisíveis — investigar e corrigir

**Files:**
- Modify: `src/components/post/PostDetailScreen.tsx`
- Modify: `server/src/routes/posts.ts`

- [ ] **Step 1: Investigar a query de comentários**

Em `src/components/post/PostDetailScreen.tsx`, linha ~58, há:
```ts
const { data: commentsData } = useQuery<PaginatedResult<ApiComment>>({
  queryKey: ['comments', post.id],
  queryFn: () => apiFetch<PaginatedResult<ApiComment>>(`/posts/${post.id}/comments`),
  initialData: { items: [], hasMore: false },
})
```

O problema: `initialData` faz com que o React Query considere os dados "frescos" na primeira renderização e **não dispare o fetch**. Com `initialData` definido, o React Query trata os dados como se já tivessem sido buscados.

- [ ] **Step 2: Escrever o teste que verifica que comentários aparecem**

Abrir `src/components/post/PostDetailScreen.test.tsx` e adicionar:

```tsx
it('fetches and displays comments on mount', async () => {
  const mockFetch = vi.mocked(apiFetch)
  mockFetch
    .mockResolvedValueOnce({ /* mock do post detail */ })
    .mockResolvedValueOnce({
      items: [{ id: 'c1', content: 'Ótimo post!', author: { id: 'u2', name: 'Maria', archetypeKey: null }, likes: 0, createdAt: new Date().toISOString() }],
      hasMore: false,
    })

  render(<PostDetailScreen post={mockPost} onBack={vi.fn()} />)

  expect(await screen.findByText('Ótimo post!')).toBeInTheDocument()
})
```

*(Adaptar ao mock setup existente do arquivo de teste.)*

- [ ] **Step 3: Corrigir — trocar `initialData` por `placeholderData`**

```tsx
// ANTES:
initialData: { items: [], hasMore: false },

// DEPOIS:
placeholderData: { items: [], hasMore: false },
```

`placeholderData` não impede o fetch — apenas exibe dados temporários enquanto carrega.

- [ ] **Step 4: Verificar rota backend de comentários**

Em `server/src/routes/posts.ts`, confirmar que `GET /posts/:id/comments` retorna `{ items, hasMore }`:
```ts
// Verificar que o retorno tem esse formato:
reply.send({ items: comments, hasMore: false })
```
Se retornar array direto (sem wrapper), corrigir para o formato `{ items: [], hasMore: false }`.

- [ ] **Step 5: Rodar o teste**

```bash
npx vitest run src/components/post/PostDetailScreen.test.tsx
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/post/PostDetailScreen.tsx
git commit -m "fix(posts): replace initialData with placeholderData so comments are fetched on mount"
```

---

### Task 4: @Menção em comentários

**Files:**
- Modify: `src/components/post/PostDetailScreen.tsx`

- [ ] **Step 1: Verificar imports disponíveis**

`PostDetailScreen.tsx` já tem `MentionInput` disponível no projeto em `src/components/shared/MentionInput.tsx`. Precisa só ser importado e usado.

- [ ] **Step 2: Escrever teste que verifica autocomplete no comentário**

Abrir `src/components/post/PostDetailScreen.test.tsx` e adicionar:

```tsx
it('shows mention suggestions when typing @ in comment input', async () => {
  render(<PostDetailScreen post={mockPost} onBack={vi.fn()} />)
  const input = screen.getByPlaceholderText('Adicionar comentário...')
  fireEvent.change(input, { target: { value: '@m' } })
  // MentionInput deve mostrar suggestions
  // (o comportamento exato depende do mock de /users?q=m — adicionar mock)
})
```

- [ ] **Step 3: Substituir `<input>` simples por `MentionInput` no campo de comentário**

Em `src/components/post/PostDetailScreen.tsx`, localizar o input de comentário (linha ~297):

```tsx
// ANTES:
<input
  type="text"
  value={commentText}
  onChange={(e) => setCommentText(e.target.value)}
  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
  placeholder="Adicionar comentário..."
  className="flex-1 bg-transparent text-sm text-graphite placeholder:text-sara-muted outline-none"
/>

// DEPOIS:
import { MentionInput } from '../shared/MentionInput'

<MentionInput
  value={commentText}
  onChange={setCommentText}
  onSubmit={handleComment}
  placeholder="Adicionar comentário..."
  className="flex-1 bg-transparent text-sm text-graphite placeholder:text-sara-muted outline-none"
/>
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/components/post/PostDetailScreen.tsx
git commit -m "feat(posts): enable @mention autocomplete in comment input"
```

---

### Task 5: Like em comentário — backend + frontend

**Files:**
- Modify: `server/src/routes/posts.ts`
- Modify: `src/components/post/PostDetailScreen.tsx`

- [ ] **Step 1: Adicionar rota no backend**

Em `server/src/routes/posts.ts`, adicionar após as rotas de comentários existentes:

```ts
fastify.post<{ Params: { id: string; commentId: string } }>(
  '/:id/comments/:commentId/like',
  { preHandler: [fastify.authenticate] },
  async (request, reply) => {
    const comment = await fastify.prisma.comment.findUnique({
      where: { id: request.params.commentId, postId: request.params.id },
    })
    if (!comment) return reply.status(404).send({ error: 'Comment not found' })

    const updated = await fastify.prisma.comment.update({
      where: { id: request.params.commentId },
      data: { likes: { increment: 1 } },
      select: { id: true, likes: true },
    })
    reply.send(updated)
  }
)
```

- [ ] **Step 2: Adicionar mutation de like no frontend**

Em `src/components/post/PostDetailScreen.tsx`:

```tsx
// Adicionar estado de likes por comentário:
const [commentLikes, setCommentLikes] = useState<Record<string, number>>({})
const [likedComments, setLikedComments] = useState<Record<string, boolean>>({})

const likeCommentMutation = useMutation({
  mutationFn: (commentId: string) =>
    apiFetch<{ id: string; likes: number }>(`/posts/${post.id}/comments/${commentId}/like`, { method: 'POST' }),
  onSuccess: (data) => {
    setCommentLikes((prev) => ({ ...prev, [data.id]: data.likes }))
    setLikedComments((prev) => ({ ...prev, [data.id]: true }))
  },
})
```

- [ ] **Step 3: Conectar o botão de like ao mutation**

Localizar o botão de like no comentário (linha ~277):

```tsx
// ANTES:
<button className="flex items-center gap-1 mt-2 text-graphite-muted">
  <Heart size={10} />
  <span className="text-[10px]">{c.likes}</span>
</button>

// DEPOIS:
<button
  onClick={() => { if (!likedComments[c.id]) likeCommentMutation.mutate(c.id) }}
  aria-label="Curtir comentário"
  className={`flex items-center gap-1 mt-2 transition-colors ${likedComments[c.id] ? 'text-sara-terracotta' : 'text-graphite-muted'}`}
>
  <Heart size={10} fill={likedComments[c.id] ? 'currentColor' : 'none'} />
  <span className="text-[10px]">{(commentLikes[c.id] ?? c.likes)}</span>
</button>
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit && cd server && npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/posts.ts src/components/post/PostDetailScreen.tsx
git commit -m "feat(posts): like comment — backend route + frontend mutation"
```

---

### Task 6: Follow via notificação sincroniza o perfil

**Files:**
- Modify: `src/components/notifications/NotificationsScreen.tsx`

- [ ] **Step 1: Identificar o problema**

Em `NotificationsScreen.tsx`, o `followMutation.onSuccess` chama:
```ts
queryClient.invalidateQueries({ queryKey: ['notifications'] })
```
Mas não invalida `['user', actorId]`. Ao navegar para o perfil da usuária, ele usa o cache antigo que ainda mostra "Seguir".

- [ ] **Step 2: Escrever teste**

Abrir ou criar `src/components/notifications/NotificationsScreen.test.tsx`:

```tsx
it('invalidates user profile cache after following from notification', async () => {
  const invalidate = vi.fn()
  vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: invalidate } as unknown as QueryClient)

  // ... render NotificationsScreen com uma notificação de follow
  // ... clicar em Seguir
  // ... verificar que invalidate foi chamado com ['user', actorId]

  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['user', 'actor-u2'] })
})
```

*(Adaptar ao padrão de mock do projeto.)*

- [ ] **Step 3: Corrigir — invalidar cache do perfil após follow**

Em `src/components/notifications/NotificationsScreen.tsx`:

```tsx
// No followMutation.onSuccess:
onSuccess: (_data, { userId, notificationId }) => {
  setFollowError(null)
  setFollowedMap((prev) => ({ ...prev, [notificationId]: true }))
  queryClient.invalidateQueries({ queryKey: ['notifications'] })
  queryClient.invalidateQueries({ queryKey: ['user', userId] })        // <-- ADICIONAR
  queryClient.invalidateQueries({ queryKey: ['userPosts', userId] })   // <-- ADICIONAR
},
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/notifications/NotificationsScreen.tsx
git commit -m "fix(notifications): invalidate user profile cache after follow-back"
```

---

### Task 7: Feed priorizado — posts de quem sigo primeiro

**Files:**
- Modify: `server/src/routes/posts.ts`

- [ ] **Step 1: Entender a query atual**

Abrir `server/src/routes/posts.ts` e localizar o `GET /` que lista posts. Atualmente retorna todos por `createdAt desc`.

- [ ] **Step 2: Adicionar lógica de priorização**

```ts
// GET / — feed principal
fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  // ... query params existentes (cursor, limit) ...

  // Buscar quem o usuário segue
  const following = await fastify.prisma.follow.findMany({
    where: { followerId: request.userId },
    select: { followingId: true },
  })
  const followingIds = following.map((f) => f.followingId)

  // Buscar comunidades do usuário
  const memberships = await fastify.prisma.communityMember.findMany({
    where: { userId: request.userId },
    select: { communityId: true },
  })
  const communityIds = memberships.map((m) => m.communityId)

  // Dois grupos: prioritários (seguidos/comunidades) + sugestões (resto)
  const priorityPosts = await fastify.prisma.post.findMany({
    where: {
      isRepost: false,
      OR: [
        { authorId: { in: followingIds } },
        { communityId: { in: communityIds } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { /* selects existentes */ },
  })

  const suggestionPosts = await fastify.prisma.post.findMany({
    where: {
      isRepost: false,
      authorId: { notIn: [...followingIds, request.userId] },
      communityId: communityIds.length > 0 ? { notIn: communityIds } : undefined,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { /* selects existentes */ },
  })

  // Mapear isSuggestion para o frontend poder exibir label
  const items = [
    ...priorityPosts.map((p) => ({ ...p, isSuggestion: false })),
    ...suggestionPosts.map((p) => ({ ...p, isSuggestion: true })),
  ]

  reply.send({ items, hasMore: false })
})
```

- [ ] **Step 3: Frontend — mostrar label "Sugestão" em posts sugeridos**

Em `src/lib/types.ts`, adicionar ao `ApiPost`:
```ts
isSuggestion?: boolean
```

Em `src/types.ts`, adicionar ao `CommunityPost`:
```ts
isSuggestion?: boolean
```

Em `src/lib/helpers.ts`, mapear em `apiPostToCommunityPost`:
```ts
isSuggestion: post.isSuggestion ?? false,
```

Em `src/components/comunidade/PostCard.tsx`, adicionar badge visual quando `post.isSuggestion`:
```tsx
{post.isSuggestion && (
  <span className="text-[9px] font-semibold uppercase tracking-wide text-graphite-muted/60 px-2 py-0.5 bg-gray-100 rounded-full">
    Sugestão
  </span>
)}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit && cd server && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/posts.ts src/lib/types.ts src/types.ts src/lib/helpers.ts src/components/comunidade/PostCard.tsx
git commit -m "feat(feed): prioritize followed users and communities; label suggestions"
```

---

### Task 8: Deploy

- [ ] **Step 1: Build e deploy**

```bash
npm run build
git push origin main
ssh -p 443 root@2.25.137.78 "cd /opt/mothersteam && git pull && docker compose -f deploy/docker-compose.prod.yml build api && docker compose -f deploy/docker-compose.prod.yml up -d api"
scp -P 443 -r dist/. root@2.25.137.78:/var/www/mothersteam/
```

- [ ] **Step 2: Rebuild APK**

```bash
npx cap copy android
cd android && .\gradlew.bat assembleDebug
```
