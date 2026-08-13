# Comment Like/Dislike Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar curtir/descurtir em comentários (idempotente, per-user), com notificação pro autor e a mesma animação de bounce+partícula do like em post.

**Architecture:** Espelhar o padrão do `PostLike` — novo modelo `CommentLike` (join table user↔comment), rotas `POST/DELETE /posts/:postId/comments/:commentId/like`, contador `Comment.likes: Int` mantido como campo denormalizado atualizado em transação. GET de comments inclui `likedByCurrentUser: boolean`. Frontend refatora `likeCommentMutation` pra toggle com optimistic update e rollback.

**Tech Stack:** Prisma + MySQL, Fastify (backend), React + TypeScript + Framer Motion (frontend), TanStack Query, Vitest para testes de rotas.

---

## File Structure

**Backend:**
- Modify: `server/prisma/schema.prisma` — adicionar model `CommentLike`, relacionamento em `Comment` e `User`
- Create: `server/prisma/migrations/20260730000000_add_comment_like/migration.sql` — migration da tabela
- Modify: `server/src/routes/posts.ts` — adicionar rotas `POST/DELETE /:id/comments/:commentId/like`, atualizar GET `/:id/comments` para incluir `likedByCurrentUser`
- Create: `server/src/routes/posts.comment-like.test.ts` — testes de integração das novas rotas

**Frontend:**
- Modify: `src/components/post/PostDetailScreen.tsx` — atualizar type `ApiComment`, refatorar `likeCommentMutation` pra toggle, aplicar bounce+partícula ao botão heart, inicializar `likedComments` a partir do response

**Deploy:**
- Manual: cherry-pick commit backend na branch `fix/code-review-findings` do VPS, `prisma migrate deploy`, docker rebuild
- Manual: `npm run build` + `scp` do dist pro `/var/www/mothersteam/` + `npx cap sync android`

---

## Task 1: Adicionar model CommentLike no schema

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Adicionar campo likedBy no model Comment**

Ler `server/prisma/schema.prisma` e localizar o model `Comment` (linha ~128). Adicionar linha `likedBy CommentLike[]` logo após `likes: Int @default(0)`:

```prisma
model Comment {
  id        String        @id @default(cuid())
  content   String        @db.Text
  authorId  String
  author    User          @relation(fields: [authorId], references: [id], onDelete: Cascade)
  postId    String
  post      Post          @relation(fields: [postId], references: [id], onDelete: Cascade)
  likes     Int           @default(0)
  likedBy   CommentLike[]
  createdAt DateTime      @default(now())
}
```

- [ ] **Step 2: Adicionar model CommentLike ao final do arquivo (antes de qualquer sessão de enums)**

Adicionar logo APÓS o model `Comment`:

```prisma
model CommentLike {
  userId    String
  commentId String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  comment   Comment  @relation(fields: [commentId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@id([userId, commentId])
}
```

- [ ] **Step 3: Adicionar relação inversa em User**

Localizar o model `User` e adicionar `likedComments CommentLike[]` na mesma seção onde `likedPosts PostLike[]` já existe (linha ~44):

```prisma
  likedPosts         PostLike[]
  likedComments      CommentLike[]
```

- [ ] **Step 4: Validar schema**

Run: `cd server && npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 5: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat(schema): add CommentLike model for per-user comment likes"
```

---

## Task 2: Criar migration Prisma

**Files:**
- Create: `server/prisma/migrations/20260730000000_add_comment_like/migration.sql`

- [ ] **Step 1: Gerar migration em modo create-only**

Run: `cd server && npx prisma migrate dev --create-only --name add_comment_like`
Expected: Cria `server/prisma/migrations/20260730xxx_add_comment_like/migration.sql` com CREATE TABLE `CommentLike` + FK + índice composto. Não aplica no DB ainda.

- [ ] **Step 2: Verificar SQL gerado**

Ler o arquivo criado. Deve conter:
```sql
CREATE TABLE `CommentLike` (
    `userId` VARCHAR(191) NOT NULL,
    `commentId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`userId`, `commentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CommentLike` ADD CONSTRAINT `CommentLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CommentLike` ADD CONSTRAINT `CommentLike_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `Comment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
```

Se estiver diferente (por exemplo, sem cascade), edite manualmente pra ficar exatamente assim.

- [ ] **Step 3: Aplicar migration local**

Run: `cd server && npx prisma migrate dev`
Expected: `Applying migration \`20260730xxx_add_comment_like\`... Your database is now in sync with your schema.`

- [ ] **Step 4: Regenerar client**

Run: `cd server && npx prisma generate`
Expected: `Generated Prisma Client (v6.x.x) to ./node_modules/@prisma/client in Xs`

- [ ] **Step 5: Commit**

```bash
git add server/prisma/migrations/
git commit -m "chore(db): migration add_comment_like"
```

---

## Task 3: Backend — POST route (like) com notificação

**Files:**
- Modify: `server/src/routes/posts.ts`

- [ ] **Step 1: Adicionar rota POST logo APÓS a rota `DELETE /:id/like` (linha ~221)**

Encontrar o bloco:
```ts
fastify.delete<{ Params: { id: string } }>('/:id/like', async (request, reply) => {
  await fastify.prisma.postLike.deleteMany({
    where: { userId: request.userId, postId: request.params.id },
  })
  reply.send({ ok: true })
})
```

Adicionar logo DEPOIS:

```ts
fastify.post<{ Params: { id: string; commentId: string } }>(
  '/:id/comments/:commentId/like',
  async (request, reply) => {
    // Verify comment exists and belongs to the given post; guards against
    // clients constructing arbitrary commentIds against unrelated posts.
    const comment = await fastify.prisma.comment.findFirst({
      where: { id: request.params.commentId, postId: request.params.id },
      select: { id: true, authorId: true, content: true },
    })
    if (!comment) return reply.status(404).send({ error: 'Comment not found' })

    // Transaction: idempotent upsert + counter increment only when actually inserted
    const inserted = await fastify.prisma.$transaction(async (tx) => {
      const existing = await tx.commentLike.findUnique({
        where: { userId_commentId: { userId: request.userId, commentId: comment.id } },
      })
      if (existing) return false
      await tx.commentLike.create({
        data: { userId: request.userId, commentId: comment.id },
      })
      await tx.comment.update({
        where: { id: comment.id },
        data: { likes: { increment: 1 } },
      })
      return true
    })

    // Read the up-to-date counter after the transaction
    const updated = await fastify.prisma.comment.findUnique({
      where: { id: comment.id },
      select: { likes: true },
    })

    // Notify only on first like (not on retry) and not for self-likes
    if (inserted && comment.authorId !== request.userId) {
      const actor = await fastify.prisma.user.findUnique({
        where: { id: request.userId },
        select: { name: true },
      })
      const actorName = actor?.name ?? 'Alguém'
      await fastify.prisma.notification.create({
        data: {
          type: 'like',
          text: `${actorName} curtiu seu comentário.`,
          recipientId: comment.authorId,
          targetType: 'comment',
          targetId: comment.id,
          actorId: request.userId,
          actorName,
          postExcerpt: comment.content.slice(0, 200),
        },
      })
      emitNotification(comment.authorId)
    }

    reply.status(201).send({
      id: comment.id,
      likes: updated?.likes ?? 0,
      likedByCurrentUser: true,
    })
  }
)
```

- [ ] **Step 2: Verificar TypeScript**

Run: `cd server && npx tsc --noEmit`
Expected: sem erros. Se der erro tipo `Property 'commentLike' does not exist on type 'PrismaClient'`, rode `npx prisma generate` de novo.

- [ ] **Step 3: Testar manualmente com curl (opcional — pode pular se Task 6 vai cobrir)**

Não fazer neste passo. Testes formais na Task 6.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/posts.ts
git commit -m "feat(comments): POST /:id/comments/:commentId/like with notification"
```

---

## Task 4: Backend — DELETE route (unlike)

**Files:**
- Modify: `server/src/routes/posts.ts`

- [ ] **Step 1: Adicionar rota DELETE logo APÓS a rota POST comment/like criada na Task 3**

```ts
fastify.delete<{ Params: { id: string; commentId: string } }>(
  '/:id/comments/:commentId/like',
  async (request, reply) => {
    const comment = await fastify.prisma.comment.findFirst({
      where: { id: request.params.commentId, postId: request.params.id },
      select: { id: true },
    })
    if (!comment) return reply.status(404).send({ error: 'Comment not found' })

    // Transaction: idempotent delete + counter decrement only when actually removed
    await fastify.prisma.$transaction(async (tx) => {
      const existing = await tx.commentLike.findUnique({
        where: { userId_commentId: { userId: request.userId, commentId: comment.id } },
      })
      if (!existing) return
      await tx.commentLike.delete({
        where: { userId_commentId: { userId: request.userId, commentId: comment.id } },
      })
      // Guard against negative counters if a stray write got out of sync
      await tx.comment.updateMany({
        where: { id: comment.id, likes: { gt: 0 } },
        data: { likes: { decrement: 1 } },
      })
    })

    const updated = await fastify.prisma.comment.findUnique({
      where: { id: comment.id },
      select: { likes: true },
    })
    reply.send({
      id: comment.id,
      likes: updated?.likes ?? 0,
      likedByCurrentUser: false,
    })
  }
)
```

- [ ] **Step 2: Verificar TypeScript**

Run: `cd server && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/posts.ts
git commit -m "feat(comments): DELETE /:id/comments/:commentId/like"
```

---

## Task 5: Backend — GET comments inclui likedByCurrentUser

**Files:**
- Modify: `server/src/routes/posts.ts`

- [ ] **Step 1: Localizar a rota GET `:id/comments` (linha ~250-264) e substituir por versão que inclui likedBy**

Encontrar:
```ts
fastify.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
  ':id/comments',
  async (request, reply) => {
    const limit = Math.min(Number(request.query.limit ?? 20), 50)
    const comments = await fastify.prisma.comment.findMany({
      where: { postId: request.params.id },
      take: limit + 1,
      ...(request.query.cursor ? { cursor: { id: request.query.cursor }, skip: 1 } : {}),
      include: { author: { select: { id: true, name: true, archetypeKey: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    })
    const hasMore = comments.length > limit
    reply.send({ items: comments.slice(0, limit), hasMore })
  }
)
```

Substituir por:

```ts
fastify.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
  ':id/comments',
  async (request, reply) => {
    const limit = Math.min(Number(request.query.limit ?? 20), 50)
    const comments = await fastify.prisma.comment.findMany({
      where: { postId: request.params.id },
      take: limit + 1,
      ...(request.query.cursor ? { cursor: { id: request.query.cursor }, skip: 1 } : {}),
      include: {
        author: { select: { id: true, name: true, archetypeKey: true, avatarUrl: true } },
        // Per-user like flag — same pattern used by posts.likes on the feed
        likedBy: { where: { userId: request.userId }, select: { userId: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    const hasMore = comments.length > limit
    const items = comments.slice(0, limit).map(({ likedBy, ...rest }) => ({
      ...rest,
      likedByCurrentUser: likedBy.length > 0,
    }))
    reply.send({ items, hasMore })
  }
)
```

- [ ] **Step 2: Verificar TypeScript**

Run: `cd server && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/posts.ts
git commit -m "feat(comments): include likedByCurrentUser in GET /:id/comments"
```

---

## Task 6: Testes de integração das rotas

**Files:**
- Create: `server/src/routes/posts.comment-like.test.ts`

- [ ] **Step 1: Criar o arquivo de teste**

Criar `server/src/routes/posts.comment-like.test.ts` com o conteúdo:

```ts
import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'
import Fastify from 'fastify'
import postsRoutes from './posts'

const prisma = new PrismaClient()

async function makeApp(viewerId: string) {
  const app = Fastify()
  app.decorate('prisma', prisma)
  app.decorateRequest('userId', '')
  app.decorate('authenticate', async (req: any) => { req.userId = viewerId })
  await app.register(postsRoutes)
  return app
}

async function setupFixture() {
  const author = await prisma.user.create({
    data: { email: `a${Date.now()}${Math.random()}@t.com`, passwordHash: 'x', name: 'Autora', pregnancyStage: 'pregnant' },
  })
  const viewer = await prisma.user.create({
    data: { email: `v${Date.now()}${Math.random()}@t.com`, passwordHash: 'x', name: 'Viewer', pregnancyStage: 'pregnant' },
  })
  const post = await prisma.post.create({
    data: { content: 'post', category: 'gestação', authorId: author.id },
  })
  const comment = await prisma.comment.create({
    data: { content: 'primeiro comentário', authorId: author.id, postId: post.id },
  })
  return { author, viewer, post, comment }
}

async function cleanup(ids: { authorId: string; viewerId: string; postId: string }) {
  await prisma.commentLike.deleteMany({ where: { userId: ids.viewerId } })
  await prisma.notification.deleteMany({ where: { recipientId: ids.authorId } })
  await prisma.comment.deleteMany({ where: { postId: ids.postId } })
  await prisma.post.delete({ where: { id: ids.postId } })
  await prisma.user.deleteMany({ where: { id: { in: [ids.authorId, ids.viewerId] } } })
}

describe('POST /posts/:id/comments/:commentId/like', () => {
  it('cria um like, incrementa o contador e notifica o autor', async () => {
    const { author, viewer, post, comment } = await setupFixture()
    const app = await makeApp(viewer.id)

    const res = await app.inject({
      method: 'POST',
      url: `/${post.id}/comments/${comment.id}/like`,
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toMatchObject({ id: comment.id, likes: 1, likedByCurrentUser: true })

    const notif = await prisma.notification.findFirst({
      where: { recipientId: author.id, targetType: 'comment', targetId: comment.id },
    })
    expect(notif).not.toBeNull()
    expect(notif?.text).toContain('Viewer')

    await app.close()
    await cleanup({ authorId: author.id, viewerId: viewer.id, postId: post.id })
  })

  it('é idempotente — chamar duas vezes mantém contador em 1 e não duplica notificação', async () => {
    const { author, viewer, post, comment } = await setupFixture()
    const app = await makeApp(viewer.id)

    await app.inject({ method: 'POST', url: `/${post.id}/comments/${comment.id}/like` })
    const res2 = await app.inject({ method: 'POST', url: `/${post.id}/comments/${comment.id}/like` })

    expect(res2.json()).toMatchObject({ likes: 1, likedByCurrentUser: true })

    const notifs = await prisma.notification.count({
      where: { recipientId: author.id, targetType: 'comment', targetId: comment.id },
    })
    expect(notifs).toBe(1)

    await app.close()
    await cleanup({ authorId: author.id, viewerId: viewer.id, postId: post.id })
  })

  it('não notifica quando o autor curte o próprio comentário', async () => {
    const { author, post, comment } = await setupFixture()
    const app = await makeApp(author.id)

    await app.inject({ method: 'POST', url: `/${post.id}/comments/${comment.id}/like` })
    const notifs = await prisma.notification.count({
      where: { recipientId: author.id, targetType: 'comment', targetId: comment.id },
    })
    expect(notifs).toBe(0)

    await app.close()
    await cleanup({ authorId: author.id, viewerId: author.id, postId: post.id })
  })

  it('retorna 404 quando o comentId não pertence ao postId', async () => {
    const { author, viewer, post, comment } = await setupFixture()
    const otherPost = await prisma.post.create({
      data: { content: 'other', category: 'gestação', authorId: author.id },
    })
    const app = await makeApp(viewer.id)

    const res = await app.inject({
      method: 'POST',
      url: `/${otherPost.id}/comments/${comment.id}/like`,
    })
    expect(res.statusCode).toBe(404)

    await app.close()
    await prisma.post.delete({ where: { id: otherPost.id } })
    await cleanup({ authorId: author.id, viewerId: viewer.id, postId: post.id })
  })
})

describe('DELETE /posts/:id/comments/:commentId/like', () => {
  it('remove like existente e decrementa contador', async () => {
    const { author, viewer, post, comment } = await setupFixture()
    const app = await makeApp(viewer.id)

    await app.inject({ method: 'POST', url: `/${post.id}/comments/${comment.id}/like` })
    const res = await app.inject({ method: 'DELETE', url: `/${post.id}/comments/${comment.id}/like` })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: comment.id, likes: 0, likedByCurrentUser: false })

    await app.close()
    await cleanup({ authorId: author.id, viewerId: viewer.id, postId: post.id })
  })

  it('é idempotente — DELETE sem like prévio retorna 200 sem alterar contador', async () => {
    const { author, viewer, post, comment } = await setupFixture()
    const app = await makeApp(viewer.id)

    const res = await app.inject({ method: 'DELETE', url: `/${post.id}/comments/${comment.id}/like` })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ likes: 0, likedByCurrentUser: false })

    await app.close()
    await cleanup({ authorId: author.id, viewerId: viewer.id, postId: post.id })
  })
})

describe('GET /posts/:id/comments — likedByCurrentUser', () => {
  it('retorna likedByCurrentUser=true quando o viewer curtiu o comentário', async () => {
    const { author, viewer, post, comment } = await setupFixture()
    await prisma.commentLike.create({ data: { userId: viewer.id, commentId: comment.id } })
    const app = await makeApp(viewer.id)

    const res = await app.inject({ method: 'GET', url: `/${post.id}/comments` })
    const body = res.json()
    expect(body.items).toHaveLength(1)
    expect(body.items[0].likedByCurrentUser).toBe(true)

    await app.close()
    await cleanup({ authorId: author.id, viewerId: viewer.id, postId: post.id })
  })

  it('retorna likedByCurrentUser=false quando o viewer não curtiu', async () => {
    const { author, viewer, post, comment } = await setupFixture()
    const app = await makeApp(viewer.id)

    const res = await app.inject({ method: 'GET', url: `/${post.id}/comments` })
    const body = res.json()
    expect(body.items[0].likedByCurrentUser).toBe(false)

    await app.close()
    await cleanup({ authorId: author.id, viewerId: viewer.id, postId: post.id })
  })
})
```

- [ ] **Step 2: Rodar os testes e ver falharem se algo estiver errado**

Run: `cd server && npx vitest run src/routes/posts.comment-like.test.ts`
Expected: **todos passam** (as rotas já foram implementadas nas Tasks 3-5). Se algum falhar, ler a mensagem e corrigir a rota correspondente. Não avançar até 8/8 passarem.

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/posts.comment-like.test.ts
git commit -m "test(comments): integration tests for like/unlike routes"
```

---

## Task 7: Frontend — atualizar type ApiComment

**Files:**
- Modify: `src/components/post/PostDetailScreen.tsx`

- [ ] **Step 1: Adicionar likedByCurrentUser ao interface ApiComment (linha 34-40)**

Encontrar:
```tsx
interface ApiComment {
  id: string;
  content: string;
  author: { id: string; name: string; archetypeKey?: string | null; avatarUrl?: string | null };
  likes: number;
  createdAt: string;
}
```

Substituir por:
```tsx
interface ApiComment {
  id: string;
  content: string;
  author: { id: string; name: string; archetypeKey?: string | null; avatarUrl?: string | null };
  likes: number;
  likedByCurrentUser: boolean;
  createdAt: string;
}
```

- [ ] **Step 2: Verificar TypeScript**

Run: `cd . && npx tsc --noEmit` (a partir da raiz do repo)
Expected: sem erros (o campo é apenas adicionado, callers ainda ignoram).

- [ ] **Step 3: Commit**

```bash
git add src/components/post/PostDetailScreen.tsx
git commit -m "types(comments): add likedByCurrentUser to ApiComment"
```

---

## Task 8: Frontend — refatorar likeCommentMutation para toggle

**Files:**
- Modify: `src/components/post/PostDetailScreen.tsx`

- [ ] **Step 1: Inicializar likedComments/commentLikes a partir do response**

Localizar as linhas 67-68:
```tsx
const [commentLikes, setCommentLikes] = useState<Record<string, number>>({});
const [likedComments, setLikedComments] = useState<Record<string, boolean>>({});
```

Deixar como estão (o estado inicial vazio é OK — vamos hidratar via useEffect a seguir).

- [ ] **Step 2: Adicionar useEffect que hidrata os estados quando commentsData chega**

Logo depois da declaração do `const { data: commentsData } = useQuery(...)` (linha ~74), adicionar:

```tsx
useEffect(() => {
  if (!commentsData?.items) return
  const nextLikes: Record<string, number> = {}
  const nextLiked: Record<string, boolean> = {}
  for (const c of commentsData.items) {
    nextLikes[c.id] = c.likes
    nextLiked[c.id] = c.likedByCurrentUser
  }
  setCommentLikes(nextLikes)
  setLikedComments(nextLiked)
}, [commentsData]);
```

- [ ] **Step 3: Refatorar likeCommentMutation para toggle com optimistic e rollback**

Encontrar (linha ~118-125):
```tsx
const likeCommentMutation = useMutation({
  mutationFn: (commentId: string) =>
    apiFetch<{ id: string; likes: number }>(`/posts/${post.id}/comments/${commentId}/like`, { method: 'POST' }),
  onSuccess: (data) => {
    setCommentLikes((prev) => ({ ...prev, [data.id]: data.likes }));
    setLikedComments((prev) => ({ ...prev, [data.id]: true }));
  },
});
```

Substituir por:
```tsx
const likeCommentMutation = useMutation({
  mutationFn: ({ commentId, isLiked }: { commentId: string; isLiked: boolean }) =>
    apiFetch<{ id: string; likes: number; likedByCurrentUser: boolean }>(
      `/posts/${post.id}/comments/${commentId}/like`,
      { method: isLiked ? 'POST' : 'DELETE' },
    ),
  onMutate: async ({ commentId, isLiked }) => {
    // Optimistic: flip flag + adjust counter immediately
    const prevLiked = likedComments[commentId] ?? false
    const prevCount = commentLikes[commentId] ?? 0
    setLikedComments((prev) => ({ ...prev, [commentId]: isLiked }))
    setCommentLikes((prev) => ({ ...prev, [commentId]: prevCount + (isLiked ? 1 : -1) }))
    return { prevLiked, prevCount }
  },
  onError: (_err, { commentId }, ctx) => {
    // Roll back to pre-mutation state
    if (!ctx) return
    setLikedComments((prev) => ({ ...prev, [commentId]: ctx.prevLiked }))
    setCommentLikes((prev) => ({ ...prev, [commentId]: ctx.prevCount }))
  },
  onSuccess: (data) => {
    // Reconcile with server truth
    setCommentLikes((prev) => ({ ...prev, [data.id]: data.likes }))
    setLikedComments((prev) => ({ ...prev, [data.id]: data.likedByCurrentUser }))
  },
});
```

- [ ] **Step 4: Atualizar onClick do botão heart (linha ~334) para chamar toggle**

Encontrar:
```tsx
onClick={() => { if (!likedComments[c.id]) likeCommentMutation.mutate(c.id); }}
```

Substituir por:
```tsx
onClick={() => likeCommentMutation.mutate({ commentId: c.id, isLiked: !likedComments[c.id] })}
```

- [ ] **Step 5: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/post/PostDetailScreen.tsx
git commit -m "feat(comments): toggle like via POST/DELETE + optimistic rollback"
```

---

## Task 9: Frontend — bounce + partícula no botão heart do comentário

**Files:**
- Modify: `src/components/post/PostDetailScreen.tsx`

- [ ] **Step 1: Adicionar estado por-comment para bounce e partícula**

Perto das outras declarações `useState` do componente (linha ~60), adicionar:

```tsx
const [commentBounceKey, setCommentBounceKey] = useState<Record<string, number>>({});
const [commentParticle, setCommentParticle] = useState<Record<string, boolean>>({});
```

- [ ] **Step 2: Substituir o `<button>` do heart do comentário (linha ~333-340) pelo `motion.button` com wrapper**

Encontrar o bloco:
```tsx
<button
  onClick={() => likeCommentMutation.mutate({ commentId: c.id, isLiked: !likedComments[c.id] })}
  aria-label="Curtir comentário"
  className={`flex items-center gap-1 mt-2 transition-colors ${likedComments[c.id] ? 'text-sara-terracotta' : 'text-graphite-muted'}`}
>
  <Heart size={10} fill={likedComments[c.id] ? 'currentColor' : 'none'} />
  <span className="text-[10px]">{commentLikes[c.id] ?? c.likes}</span>
</button>
```

Substituir por:
```tsx
<div className="relative inline-flex">
  <motion.button
    key={commentBounceKey[c.id] ?? 0}
    onClick={() => {
      const next = !likedComments[c.id];
      likeCommentMutation.mutate({ commentId: c.id, isLiked: next });
      if (next) {
        setCommentBounceKey((prev) => ({ ...prev, [c.id]: (prev[c.id] ?? 0) + 1 }));
        setCommentParticle((prev) => ({ ...prev, [c.id]: true }));
        setTimeout(() => {
          setCommentParticle((prev) => ({ ...prev, [c.id]: false }));
        }, 700);
      }
    }}
    aria-label={likedComments[c.id] ? 'Descurtir comentário' : 'Curtir comentário'}
    aria-pressed={likedComments[c.id] ?? false}
    animate={likedComments[c.id] ? { scale: [1, 1.4, 0.9, 1.15, 1] } : { scale: [1, 0.85, 1] }}
    transition={{ duration: likedComments[c.id] ? 0.4 : 0.2, ease: 'easeOut' }}
    className={`flex items-center gap-1 mt-2 transition-colors ${likedComments[c.id] ? 'text-sara-terracotta' : 'text-graphite-muted'}`}
  >
    <Heart size={10} fill={likedComments[c.id] ? 'currentColor' : 'none'} />
    <span className="text-[10px]">{commentLikes[c.id] ?? c.likes}</span>
  </motion.button>
  <AnimatePresence>
    {commentParticle[c.id] && (
      <motion.span
        initial={{ opacity: 0, y: 0, x: -4 }}
        animate={{ opacity: [0, 1, 1, 0], y: -20 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="absolute -top-1 left-3 text-[10px] font-bold text-sara-terracotta pointer-events-none"
      >
        +1
      </motion.span>
    )}
  </AnimatePresence>
</div>
```

Note: `motion` e `AnimatePresence` já estão importados no topo do arquivo (linha 2). Nenhum import novo é necessário.

- [ ] **Step 3: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/post/PostDetailScreen.tsx
git commit -m "feat(motion): bounce + partícula +1 no heart do comentário"
```

---

## Task 10: Deploy

**Files:**
- Nenhum arquivo editado — apenas deploy.

- [ ] **Step 1: Push do repo local pro remoto**

```bash
git push origin main
```

Expected: push aceito.

- [ ] **Step 2: Cherry-pick dos commits do backend na VPS**

Coletar os SHAs dos commits deste plano no repo local:
```bash
git log --oneline -15 | grep -E "CommentLike|comment-like|comments\).*like|comment/like|comments\).*likedBy"
```

Anote os SHAs relevantes (schema, migration, POST route, DELETE route, GET likedByCurrentUser, tests). Depois:

```bash
ssh -p 443 root@2.25.137.78 "cd /opt/mothersteam && git fetch origin && git cherry-pick <SHA1> <SHA2> <SHA3> <SHA4> <SHA5> <SHA6>"
```

Se um dos cherry-picks der conflito, resolver manualmente e continuar com `git cherry-pick --continue`.

Expected: todos os commits aplicados sem conflito.

- [ ] **Step 3: Aplicar a migration no VPS**

```bash
ssh -p 443 root@2.25.137.78 "cd /opt/mothersteam/deploy && docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy"
```

Expected: `Applying migration \`20260730xxx_add_comment_like\`... All migrations have been successfully applied.`

- [ ] **Step 4: Rebuild + restart do container api**

```bash
ssh -p 443 root@2.25.137.78 "cd /opt/mothersteam/deploy && docker compose -f docker-compose.prod.yml build api && docker compose -f docker-compose.prod.yml up -d api"
```

Expected: `Container mothersteam-api Recreated / Started`.

- [ ] **Step 5: Smoke test do endpoint**

```bash
curl -s -X POST https://api.santoti.com/posts/nonexistent/comments/nonexistent/like -H "Authorization: Bearer fake" -w "\nHTTP %{http_code}\n"
```

Expected: HTTP 401 (fake bearer) — comprova que a rota existe e passa pelo middleware de auth. Se retornar 404 significa que a rota não subiu; conferir logs com `ssh -p 443 root@2.25.137.78 "cd /opt/mothersteam/deploy && docker compose -f docker-compose.prod.yml logs api | tail -30"`.

- [ ] **Step 6: Build e deploy do frontend**

```bash
npm run build
scp -P 443 -r dist/. root@2.25.137.78:/var/www/mothersteam/
npx cap sync android
```

Expected: 3 comandos completam sem erro. Frontend novo servindo em https://mothersteam.santoti.com (ou domínio equivalente) e assets sincronizados pro Android.

- [ ] **Step 7: Teste manual no emulador**

Abrir Android Studio → Run. Fazer login. Abrir um post com comentário. Clicar no heart do comentário:
- Deve ficar vermelho + bounce animado + partícula "+1"
- Contador incrementa 1
- Clicar de novo → volta a cinza, contador decrementa, sem partícula
- Fechar app e abrir de novo → estado do like preservado (vem do backend)

Se autor do comentário for OUTRO usuário, o autor deve receber notificação "Você curtiu o comentário de X".

---

## Notes for the implementer

- **Ordem das tasks importa**: Tasks 1-2 (schema + migration) precisam vir ANTES de 3-6 (rotas + tests) senão o `prisma generate` não vai ter o tipo `commentLike`. Tasks 7-9 (frontend) podem ser feitas depois em qualquer ordem entre si, mas o build do frontend só passa se Task 5 (GET include likedByCurrentUser) já estiver commitado, senão o response não vai ter o campo esperado no runtime.
- **Idempotência é crítica**: se o cliente faz double-tap ou reenvia por retry de rede, o contador NÃO pode dobrar. A transação nas Tasks 3 e 4 usa "check-then-write" no mesmo tx pra garantir isso.
- **CommentLike foreign keys** têm CASCADE em user e comment — se o comentário é deletado, os likes vão junto sem código extra.
- **NÃO usar `_count` no lugar do campo `likes`**: manter o contador denormalizado é intencional pra evitar N+1 no listing. As mutations SEMPRE atualizam os dois em transação.
- **Notificação só na PRIMEIRA vez**: Task 3 checa `inserted` (bool retornado da tx) — se o like já existia, retorna 201 mas não notifica de novo.
- **Deploy branch**: o VPS roda `fix/code-review-findings`, não `main`. Nunca fazer `git checkout main` no VPS sem confirmar — pode perder commits da branch de dev.
