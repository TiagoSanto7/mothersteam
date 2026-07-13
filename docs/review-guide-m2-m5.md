# Guia de Revisão — M2 a M5

> Feito em: 2026-07-12  
> Branch: `main` | SHA base: `8ce704e` → HEAD: `6fbabbf`  
> Testes: **204 passando** / 2 falham (integração DB — precisam de Docker)

---

## Contexto Rápido

Implementamos os milestones T2 a T5 do plano `docs/superpowers/plans/2026-07-12-tier2-polish-retention.md`.  
Cada seção abaixo explica **o que mudou**, **onde olhar** e **o que testar manualmente**.

---

## M2 — Upload Real de Imagem

### O que foi feito
Antes: fotos de post eram base64 guardadas no JSON — ineficiente e sem persistência.  
Agora: o arquivo vai para o servidor e é servido como URL estática.

### Backend

**`server/src/routes/uploads.ts`** (novo)
- `POST /uploads` — recebe `multipart/form-data`, salva em `server/uploads/` com nome UUID
- Proteções implementadas:
  - **Auth obrigatório** — mesmo `fastify.authenticate` usado nas outras rotas
  - **MIME allowlist** — só `image/jpeg`, `image/png`, `image/webp`, `image/gif`
  - **Limite 5 MB** — configurado em `@fastify/multipart`
  - **Truncation check** — se o arquivo for truncado (passou do limite), apaga e devolve 413
- Retorna `{ url: "http://localhost:3001/uploads/<uuid>.jpg" }`

**`server/src/index.ts`**
- Registra `@fastify/multipart` (limit 5MB) e `@fastify/static` (serve `/uploads/`)

**`server/uploads/.gitignore`**
- Garante que a pasta existe no git mas os arquivos uploadados não são commitados

### Frontend

**`src/lib/api.ts`** — `uploadImage(file, accessToken)`
- Usa `FormData` + `fetch` (não `apiFetch`) porque precisa de `multipart`
- Não seta `Content-Type` manualmente (o browser seta com o `boundary` correto)

**`src/components/comunidade/CreatePostScreen.tsx`**
- Trocou: `FileReader` → `URL.createObjectURL` para preview local instantâneo
- Fluxo de submit: `uploadImage()` primeiro → pega a URL → envia no POST do post
- Limpa o objectURL (`URL.revokeObjectURL`) no unmount e ao trocar imagem

### O que testar manualmente
> **Precisa de Docker rodando**
1. Criar post com foto JPG — deve aparecer a imagem na lista de posts
2. Tentar subir um PDF ou `.exe` — deve rejeitar com erro 415
3. Subir arquivo > 5MB — deve rejeitar com 413
4. Sem estar logado, chamar `POST /api/uploads` diretamente — deve retornar 401

---

## M3 — Notificações Com Destino

### O que foi feito
Antes: clicar em uma notificação não levava a lugar nenhum.  
Agora: notificações de like/comentário abrem o post; notificações de follow abrem o perfil (UI parcial — post abre; perfil é placeholder).

### Backend

**`server/prisma/schema.prisma`**
```prisma
// Adicionado ao model Notification:
targetType String?   // 'post' | 'user' | 'community'
targetId   String?   // ID da entidade
```
> ⚠️ **Ação pendente**: quando Docker voltar, rodar `cd server && npx prisma db push`

**`server/src/routes/posts.ts`**
- Like handler: cria notificação com `targetType: 'post'`, `targetId: postId`
- Comment handler: idem
- Ambos têm guard contra auto-notificação (não notifica se o autor curtiu/comentou no próprio post)

**`server/src/routes/users.ts`**
- Follow handler: cria notificação com `targetType: 'user'`, `targetId: userId`
- Guard explícito contra self-follow notification

**`server/src/routes/notifications.ts`** — novo endpoint:
- `POST /notifications/:id/read` — marca como lida
- Verifica `recipientId === request.userId` antes (403 se diferente)

### Frontend

**`src/lib/types.ts`** — `ApiNotification` agora tem `targetType?` e `targetId?`

**`src/components/notifications/NotificationsScreen.tsx`**
- Novos props: `onOpenPost?`, `onOpenUser?`, `onOpenCommunity?`
- Cada notificação é um botão clicável: chama `readMutation` + callback correto
- `readMutation`: `POST /notifications/:id/read` + invalida cache

**`src/App.tsx`**
- `pendingPostId` state + `useQuery(['posts', pendingPostId])` quando definido
- Overlay com `PostDetailScreen` aparece quando `pendingPost` está disponível
- `onOpenUser` e `onOpenCommunity` são placeholders por agora (`() => {}`)

### O que testar manualmente
> **Precisa de Docker rodando**
1. Usuário A curte post do usuário B → usuário B vê notificação
2. Clicar na notificação → post abre em overlay
3. Notificação fica marcada como lida (ícone/estilo muda)
4. Usuário A não recebe notificação ao curtir o próprio post

---

## M4 — Infinite Scroll

### O que foi feito
Antes: feed carregava uma única página de posts.  
Agora: role até o fim da lista e mais posts carregam automaticamente.

### `src/lib/useIntersection.ts` (novo)
- Hook simples: recebe um `ref`, usa `IntersectionObserver`, retorna `boolean`
- 6 testes cobrindo inicialização, toggle, cleanup e `ref.current = null`

### Telas com infinite scroll

| Tela | Query key | Endpoint |
|------|-----------|----------|
| `ComunidadeScreen` | `['posts']` | `/posts?cursor=&limit=20` |
| `UserProfileScreen` | `['userPosts', userId]` | `/users/:id/posts?cursor=&limit=20` |
| `CommunityDetailScreen` | `['communityPosts', communityId]` | `/communities/:id/posts?cursor=&limit=20` |

**Padrão em cada tela:**
1. `useInfiniteQuery` com `initialPageParam: ''` e `getNextPageParam` usando `lastPage.nextCursor`
2. `sentinelRef` → `useIntersection(sentinelRef)` → `useEffect` chama `fetchNextPage()`
3. `<div ref={sentinelRef} className="h-4" />` no fim da lista
4. "Carregando..." aparece quando `isFetchingNextPage`

### `src/lib/helpers.ts` — `patchPostLikeInAllCaches`
Atualizada para lidar com **dois shapes** de cache:
- `InfiniteData<PaginatedResult<ApiPost>>` — quando `'pages' in old`
- `PaginatedResult<ApiPost>` — shape flat antigo

O predicate captura queries com `k[0] === 'posts' | 'communityPosts' | 'userPosts'`.

### O que testar manualmente
1. Abrir feed da Comunidade, rolar até o fim — novos posts carregam
2. Curtir um post no feed → contador atualiza corretamente (teste do `patchPostLikeInAllCaches`)
3. Mesmo comportamento no perfil de um usuário e em uma comunidade específica

---

## M5 — Onboarding Social

### O que foi feito
Após completar o onboarding normal (13 perfis), o usuário vê uma tela sugerindo comunidades e pessoas para seguir — uma vez só.

### Backend

**`server/src/routes/communities.ts`** — novo endpoint:
```
GET /communities/suggested
```
- Retorna até 5 comunidades que o usuário ainda **não é membro**
- Ordenadas por `members._count` descrescente (mais populares primeiro)
- Protegido por auth

### Frontend

**`src/store/useAppStore.ts`**
- `socialOnboardingDone: boolean` (padrão `false`, **persistido** em localStorage)
- `completeSocialOnboarding: () => void`

**`src/components/onboarding/SocialOnboardingScreen.tsx`** (novo, 157 linhas)
- Seção "Comunidades sugeridas": busca `GET /communities/suggested`
- Seção "Pessoas para seguir": busca `GET /users?limit=5`, filtra self e já seguidos
- Botão "Entrar": `POST /communities/:id/join` → muda para "Membro"
- Botão "Seguir": `POST /users/:id/follow` → muda para "Seguindo"
- Botão "Continuar": chama `completeSocialOnboarding()` + `onDone()`
- **16 testes** cobrindo todos os casos

**`src/App.tsx`** — gate adicionado:
```tsx
{isLoggedIn && onboardingDone && !socialOnboardingDone && (
  <SocialOnboardingScreen onDone={() => {}} />
)}
```
Aparece **após** o onboarding regular, **antes** de qualquer outra tela.

### O que testar manualmente
1. Novo usuário → conclui onboarding → vê tela social
2. Entrar em comunidade → botão vira "Membro"
3. Seguir pessoa → botão vira "Seguindo"
4. Clicar "Continuar" → nunca mais vê a tela (mesmo após refresh)
5. Usuário que já tem `socialOnboardingDone: true` nunca vê a tela

---

## Checklist de Ação Pós-Docker

Quando Docker voltar a funcionar:

- [ ] `cd server && npx prisma db push` — aplica `targetType`/`targetId` na tabela `Notification`
- [ ] Testar upload de imagem end-to-end
- [ ] Testar notificações com destino (like → abre post)
- [ ] Confirmar que os 2 testes de integração voltam a passar (`npm test -- --run`)

---

## Commits desta sessão

```
6fbabbf feat(app): add SocialOnboardingScreen gate after onboarding
8199dee fix(social-onboarding): narrow community query invalidation to suggested key
decd152 feat(onboarding): add SocialOnboardingScreen with community/user suggestions
de23078 feat(store): add socialOnboardingDone + completeSocialOnboarding
26758ed feat(communities): add GET /communities/suggested endpoint
d5dc568 feat(profile,community): add infinite scroll to user posts and community posts
15651c7 feat(comunidade): infinite scroll with useInfiniteQuery + update patchPostLikeInAllCaches
19a0ab4 feat(lib): add useIntersection hook for infinite scroll
7a3af81 feat(app): open PostDetailScreen overlay when notification links to a post
0d83171 feat(notifications): add targetType/targetId type + navigation callbacks + read mutation
564d7a2 fix(notifications): explicit self-guard on follow notification
d48ae6e feat(notifications): add targetType/targetId + POST /notifications/:id/read
1391732 feat(schema): add targetType/targetId to Notification
1826d4e feat(create-post): use real file upload instead of base64
2805939 feat(api): add uploadImage helper for multipart file uploads
d05d4db fix(uploads): mime allowlist, size limit truncation check, auth guard
395e583 feat(server): add POST /uploads endpoint with multipart + static plugin
c8ebf1b chore(server): add @fastify/multipart and @fastify/static for image uploads
```

---

## Resultado dos Testes

```
Test Files: 2 failed (DB) | 28 passed
Tests:      2 failed (DB) | 204 passed

Falhas esperadas (Docker offline):
  server/src/routes/users.test.ts   — precisa de MySQL em localhost:3307
  server/src/routes/chats.test.ts   — idem
```

> Code review e security review foram executados com Opus. Todos os críticos e importantes foram resolvidos. Veja abaixo.

---

## Resultados do Code Review (Opus)

**Veredicto original:** Not ready to merge — 4 críticos encontrados.  
**Status após fixes:** ✅ Todos resolvidos no commit `7833857`.

### Críticos corrigidos

| # | Problema | Fix aplicado |
|---|----------|-------------|
| 1 | `GET /users` não existia — SocialOnboardingScreen fazia 404 | Adicionado endpoint em `users.ts`: retorna usuários não seguidos, excluindo self, ordenados por follower count |
| 2 | Colisão de queryKey `['posts']` entre ProfileScreen (useQuery flat) e ComunidadeScreen (useInfiniteQuery) | ProfileScreen migrado para `['userPosts', currentUserId]` + `/users/:id/posts` |
| 3 | CreatePostScreen invalidava `['community', id, 'posts']` mas a key real é `['communityPosts', id]` | Corrigido para `['communityPosts', initialCommunityId]` |
| 4 | Schema Notification sem migration SQL (apenas `db push`) | Arquivo `server/prisma/migrations/20260712000000_add_notification_target/migration.sql` criado |

### Importantes corrigidos

| # | Problema | Fix aplicado |
|---|----------|-------------|
| 5 | `patchPostLikeInAllCaches` não tratava shape `ApiPost` raw (queries de post individual) | Adicionado terceiro branch: se `old.id === postId`, patcha direto |
| 6 | `uploadImage` gerava URL absoluta `http://localhost:3001/uploads/...` — quebra em produção | Retorna caminho relativo `/uploads/filename`; Vite proxia `/uploads` para o backend |
| 7 | `global` em setupTests.ts causa erro TS | Substituído por `globalThis` |

### Não resolvidos (intencionais)

- **Existing users veem social onboarding** — é o comportamento desejado: usuários antigos também devem fazer o social onboarding uma vez
- **useIntersection options snapshot** — nenhum caller passa opções dinâmicas; baixo risco
- **`POST /notifications/:id/read` retorna row completa** — já corrigido no security review (`{ ok: true }`)
- **Ausência de hook `useCursorInfinite`** — abstração prematura neste momento
- **queryKeys centralizados** — desejável mas fora do escopo dos milestones

---

## Resultados do Security Review (Opus)

**Veredicto original:** Needs fixes (non-blocking) — nenhum crítico de segurança.  
**Status após fixes:** ✅ Issues importantes resolvidos.

### Importantes corrigidos

| # | Problema | Fix aplicado |
|---|----------|-------------|
| 1 | Sem rate limit em `POST /uploads` — DoS por usuário autenticado | `config: { rateLimit: { max: 20, timeWindow: '1 minute' } }` no route |
| 2 | `POST /notifications/:id/read` retornava row completa desnecessariamente | Mudado para `return { ok: true }` |

### Confirmado seguro (sem ação necessária)

- **Path traversal**: impossível — filename é UUID + extensão do MIME allowlist
- **MIME bypass XSS via SVG**: SVG não está no allowlist; `X-Content-Type-Options: nosniff` do helmet mitiga o resto
- **Ownership check nas notificações**: verificado `recipientId === request.userId` (403 se diferente)
- **Self-notification**: guard explícito em like, comment e follow
- **SQL injection**: Prisma usa queries parametrizadas — sem `$queryRaw` com input do usuário
- **Token handling**: `uploadImage` envia token no header Authorization, não na URL
