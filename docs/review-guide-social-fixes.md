# Guia de Revisão — Social Fixes (2026-07-12)

> Feito em: 2026-07-12  
> Branch: `main`  
> Testes: **206 passando** / 0 falham

---

## Contexto Rápido

Esta sessão fechou todos os bugs do `fix-document.md`:  
posts, notificações, cadastro, mensagens e onboarding social.  
Também adicionou SSE para atualizações em tempo real e corrigiu dois bugs de infraestrutura que impediam o servidor de subir.

---

## Infraestrutura — Correções de Boot

### Problema 1 — `@fastify/multipart` v10 incompatível com Fastify 4

`@fastify/multipart ^10` e `@fastify/static ^10` exigem Fastify 5.x.  
O projeto usa Fastify 4.29.1 → servidor não subia com `FST_ERR_PLUGIN_VERSION_MISMATCH`.

**Fix:** `server/package.json`
- `@fastify/multipart` downgrade para `^8.3.0`
- `@fastify/static` downgrade para `^7.0.4`

### Problema 2 — Migração Prisma P3005

O banco tinha dados mas o histórico de migrações estava dessincronizado.  
**Fix:** `prisma migrate resolve --applied` na migração existente + `prisma migrate deploy` para aplicar as novas.

---

## Novos Campos no Banco

**Migração:** `server/prisma/migrations/20260713000000_add_username_actorid/`

```sql
-- User
ALTER TABLE `User` ADD COLUMN `username` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `User_username_key` ON `User`(`username`);

-- Notification (para rastrear quem fez a ação e preview do post)
ALTER TABLE `Notification` ADD COLUMN `actorId`     VARCHAR(191) NULL;
ALTER TABLE `Notification` ADD COLUMN `actorName`   VARCHAR(191) NULL;
ALTER TABLE `Notification` ADD COLUMN `postExcerpt` VARCHAR(300) NULL;
```

**Schema:** `server/prisma/schema.prisma`
- `User.username String? @unique`
- `Notification.actorId`, `.actorName`, `.postExcerpt`

> ⚠️ Depois de puxar esta branch pela 1ª vez: **parar o servidor → `npx prisma generate` → reiniciar**.  
> O client gerado precisa conhecer os novos campos.

---

## 1 — Posts: Botão Publicar

### Bug corrigido
`imageUrl: z.string().url()` no Zod rejeitava caminhos relativos como `/uploads/abc.jpg`,  
fazendo o POST de criação retornar 400 silenciosamente — o botão ficava travado.

**Fix:** `server/src/routes/posts.ts:9`
```ts
// antes
imageUrl: z.string().url().optional(),
// agora
imageUrl: z.string().optional(),
```

### Também corrigido — Infinite scroll parado na 1ª página
Todos os endpoints paginados retornavam `{ items, hasMore }` mas não `nextCursor`.  
O `getNextPageParam` do React Query recebia `undefined` e parava de buscar.

**Fix:** Adicionado `nextCursor` em:
- `GET /posts` (`posts.ts:39`)
- `GET /users/:id/posts` (`users.ts:92`)
- `GET /communities/:id/posts` (`communities.ts`)

### O que testar manualmente
1. Criar post com foto → publicar → post aparece no feed com imagem
2. Feed com > 20 posts → scroll até o fim → novos posts carregam automaticamente

---

## 2 — Posts: Navegar para Post Original do Repost

### Bug corrigido
Clicar no card do post original dentro de um repost não fazia nada.

**Fix:** `src/components/post/PostDetailScreen.tsx`
- Adicionado estado `viewingOriginalId`
- Card do repost original é agora um `<button>` com hint "Toque para ver a publicação original →"
- Quando clicado, busca o post original e renderiza `<PostDetailScreen>` recursivamente

**Helpers:** `src/lib/helpers.ts` e `src/types/index.ts`
- `repostOriginal.originalPostId` adicionado ao tipo `CommunityPost`
- `apiPostToCommunityPost` mapeia o campo

### O que testar manualmente
1. Abrir um post que é repost
2. Tocar no card do post original → deve abrir a publicação original
3. Voltar → retorna ao repost

---

## 3 — Notificações Ricas

### Bugs corrigidos
- Texto mostrava "Alguém" em vez do nome real de quem curtiu/comentou/seguiu
- Clicar na notificação de follow não abria o perfil do seguidor
- Sem botão de seguir de volta inline

### Backend — `server/src/routes/posts.ts` e `users.ts`

Like e comment: `Promise.all([post query, actor query])` busca nome do ator e salva:
```ts
actorId:     request.userId,
actorName:   actor?.name ?? 'Alguém',
postExcerpt: post.content.slice(0, 200),
```

Follow: mesmo padrão — `actorId` e `actorName` salvos na notificação.

### Frontend — `src/components/notifications/NotificationsScreen.tsx`

- Notificação de **follow**: nome do ator é um `<button>` clicável que abre o perfil via `onOpenUser`
- Notificações de **like/comment**: mostra `postExcerpt` em caixa destacada (`line-clamp-2`)
- **Botão "Seguir"** inline para notificações de follow (`followMutation` + `UserCheck` icon)

### App.tsx — navegação real conectada
`onOpenUser` e `onOpenCommunity` na `NotificationsScreen` estavam como `() => {}`.  
Corrigido para abrir `UserProfileScreen` e `CommunityDetailScreen` corretamente.

### O que testar manualmente
1. Usuário A curte post do usuário B → B vê "Usuário A curtiu sua publicação" com trecho do post
2. Tocar na notificação de curtida → abre o post
3. Usuário A segue usuário B → B vê notificação com nome clicável + botão Seguir de volta
4. Tocar no nome → abre perfil de A
5. Tocar "Seguir" inline → segue de volta sem sair da tela de notificações

---

## 4 — Cadastro: Campo @username

### O que foi feito
Novo campo @username no registro, com verificação de disponibilidade em tempo real.

**Backend:** `server/src/routes/auth.ts`
- `GET /auth/check-username?username=` — sem autenticação, valida formato e consulta DB
- `POST /auth/register` — aceita `username` opcional; verifica unicidade; salva no DB
- `PATCH /users/me` — aceita `username` para edição posterior

**Frontend:** `src/components/auth/RegisterScreen.tsx`
- Campo "@" com debounce de 500ms
- Feedback em tempo real: ✓ verde (disponível), ✗ vermelho (ocupado/inválido)
- Regras: `[a-z0-9_]`, mínimo 3, máximo 30 caracteres
- `step1Valid` bloqueia "Continuar" se username digitado ainda não passou na verificação

**Nos posts:** `src/components/comunidade/PostCard.tsx` e `PostDetailScreen.tsx`  
`@username` exibido em cinza ao lado do nome do autor.

### O que testar manualmente
1. Cadastrar sem username → funciona (campo opcional)
2. Digitar username disponível → ✓ verde aparece → avança normalmente
3. Digitar username já em uso → ✗ vermelho → botão "Continuar" desabilitado
4. Após cadastro → posts do usuário mostram `@username` no feed

---

## 5 — Mensagens: Preview de Post Compartilhado e Leitura

### Bugs corrigidos
- Post compartilhado no chat não mostrava autor nem trecho (campos eram `undefined`)
- Abrir chat não marcava mensagens como lidas

### SharePostSheet — `src/components/comunidade/SharePostSheet.tsx`
Adicionado `sharedPostAuthor` e `sharedPostExcerpt` no body da mensagem enviada.

### ChatScreen — `src/components/chat/ChatScreen.tsx`
`useEffect` ao montar com `chat.id`: chama `POST /chats/:id/read` e invalida `['chats']`.

### Backend — `server/src/routes/chats.ts`
- `POST /:id/read` — `updateMany` onde `senderId !== userId AND read === false`
- `sendMessageSchema` aceita `sharedPostAuthor` e `sharedPostExcerpt` e salva no DB

### O que testar manualmente
1. Compartilhar um post via SharePostSheet → abrir a conversa → card do post aparece com nome do autor e trecho
2. Fechar e reabrir chat → badge de não-lido some da lista de conversas

---

## 6 — SSE: Atualizações em Tempo Real

### O que foi feito
Notificações e mensagens agora chegam sem precisar de polling manual.

**`server/src/sse.ts`** — singleton EventEmitter
```ts
emitNotification(userId)          // dispara quando: like, comment, follow
emitMessage(userId, chatId)        // dispara quando: nova mensagem enviada
```

**`server/src/routes/sse.ts`** — endpoint `GET /sse`
- Autenticação via cookie `refresh_token` (HttpOnly — EventSource não suporta headers customizados)
- Headers SSE + heartbeat a cada 25s (mantém conexão viva através de proxies)
- Limpa listener e intervalo quando conexão fecha

**`src/lib/useSSE.ts`** — hook no frontend
- Cria `EventSource('/api/sse')` quando usuário está logado
- `type: 'notification'` → invalida `['notifications']`
- `type: 'message'` → invalida `['messages', chatId]` + `['chats']`

**`src/setupTests.ts`** — stub de EventSource adicionado para testes jsdom

### O que testar manualmente
1. Abrir app em duas abas com usuários diferentes
2. Aba A curte post de B → badge de notificação de B atualiza em segundos (sem reload)
3. Aba A envia mensagem para B → badge de mensagens de B atualiza imediatamente

---

## 7 — Onboarding Social: @username e Badge de Comunidade

**`src/components/onboarding/SocialOnboardingScreen.tsx`**
- Cards de **usuário**: exibe `@username` ao lado do nome + `bio` abaixo (ambos truncados)
- Cards de **comunidade**: chip "Comunidade" com ícone `<Users>` no canto superior direito

---

## Code Review — Pontos de Atenção

### 🔴 Crítico — Falta autorização nos endpoints de chat

`server/src/routes/chats.ts`:
- `GET /:id/messages` — qualquer usuário autenticado pode ler mensagens de qualquer chat
- `POST /:id/messages` — qualquer usuário autenticado pode enviar para qualquer chat
- `POST /:id/read` — qualquer usuário autenticado pode marcar lidas mensagens de qualquer chat

**Fix recomendado:**
```ts
// No início de cada endpoint de chat específico:
const isMember = await fastify.prisma.chatParticipant.findUnique({
  where: { userId_chatId: { userId: request.userId, chatId: request.params.id } },
})
if (!isMember) return reply.status(403).send({ error: 'Forbidden' })
```

---

### 🟠 Importante — Repost não inclui `author` na resposta

`server/src/routes/posts.ts` linha 127–142:  
`POST /posts/:id/repost` cria o post mas retorna sem incluir `author`.  
O frontend pode crashar se tentar acessar `post.author.name` no objeto retornado.

**Fix recomendado:**
```ts
const repost = await fastify.prisma.post.create({
  data: { ... },
  include: { author: { select: { id: true, name: true, username: true } } },
})
```

---

### 🟠 Importante — Follow cria notificação duplicada em re-follow

`server/src/routes/users.ts` linha 101–126:  
O `upsert` previne follows duplicados corretamente, mas a notificação é criada sempre,  
mesmo quando o follow já existia. Um usuário pode spam-notificar outro desfazendo e refazendo o follow.

**Fix recomendado:** Verificar se o follow já existia antes de criar a notificação:
```ts
const { created } = await fastify.prisma.follow.upsert({ ... })
// Só notifica se foi um follow novo
// (ou usar findUnique antes do upsert para checar)
```
*Alternativa mais simples:* usar `findFirst` antes do upsert e só criar notificação se não existia.

---

### 🟠 Importante — SSE sem handler de erro

`src/lib/useSSE.ts`:  
`EventSource` não tem `onerror`. Se o servidor reiniciar, o browser faz retry com backoff  
exponencial (comportamento padrão), mas o usuário fica com dados potencialmente desatualizados  
sem qualquer indicação.

**Fix recomendado:** Adicionar polling de fallback ou `onerror` que invalida queries:
```ts
es.onerror = () => {
  queryClient.invalidateQueries({ queryKey: ['notifications'] })
  queryClient.invalidateQueries({ queryKey: ['chats'] })
}
```

---

### 🟡 Menor — Username check em erro de rede bloqueia o usuário

`src/components/auth/RegisterScreen.tsx` linha 41–43:  
Se a chamada `/auth/check-username` falha (rede, timeout), `usernameStatus` volta para `'idle'`.  
Como `username !== ''`, `usernameOk = false`, e o botão "Continuar" fica desabilitado.  
O servidor valida unicidade no registro de qualquer forma.

**Fix recomendado:** Em caso de erro na verificação, manter `usernameStatus` como `'available'`  
(otimista) ou mostrar mensagem "Não foi possível verificar, tente mesmo assim".

---

### 🟡 Menor — Seguir de volta sem feedback de erro

`src/components/notifications/NotificationsScreen.tsx` linha 43–47:  
`followMutation` não tem `onError`. Se falhar, o botão "Seguir" não muda de estado  
e o usuário não sabe que a ação não foi concluída.

---

### ⚪ Pré-existente — `/auth/refresh` aceita token no body

`server/src/routes/auth.ts` linha 118:
```ts
const bodyToken = (request.body as { refreshToken?: string } | null)?.refreshToken
```
Isso permite enviar o refresh token no body da requisição, contornando a proteção do cookie HttpOnly  
(JS pode ler o body da resposta, não pode ler cookies HttpOnly). Este campo foi herdado de uma versão  
anterior e pode ser removido com segurança — o cookie é suficiente.

---

## Estado dos Testes

```
Test Files  30 passed (30)
Tests       206 passed (206)
```

Todos os testes de unidade e integração passam. Os 10 que falhavam foram corrigidos:
- 7 do `RegisterScreen.test.tsx` — label "Apelido (@)" em vez de "@ (nome de usuário)" (conflito com `/nome/i`)
- 3 do `App.test.tsx` — stub de `EventSource` adicionado ao `setupTests.ts`

---

## Checklist de Deploy

- [ ] Parar servidor → `cd server && npx prisma generate` → reiniciar
- [ ] Confirmar que a migração `20260713000000_add_username_actorid` foi aplicada (`npx prisma migrate status`)
- [ ] Testar fluxo completo de cadastro com @username
- [ ] Testar notificação em tempo real entre dois usuários
- [ ] Aplicar fix de autorização nos endpoints de chat antes de produção
