# Mother's Team — Project Briefing

> Documento de handoff para agentes. Contém contexto de produto, arquitetura técnica, decisões de design, padrões do código, regras de segurança, e estado atual da implementação. Gerado em: 2026-07-16.

---

## 1. Visão Geral do Produto

**Mother's Team** é uma rede social + ferramenta de apoio para mães grávidas e no pós-parto.

- **Público-alvo:** mães brasileiras em período gestacional ou pós-parto (0–365 dias)
- **Persona central:** "Sara" — assistente IA com identidade visual (foto/avatar da Sara), voz e personalidade acolhedora
- **Pilares do produto:**
  1. **Comunidade** — feed social, posts, comunidades temáticas, seguir/seguidores
  2. **MãeIA** — chat com a Sara (IA personalizada)
  3. **Bebê** — rastreio de amamentação, fraldas, sono
  4. **Rotina** — agenda/tarefas diárias
  5. **Shopping** — loja afiliada com produtos selecionados

---

## 2. Stack Técnica

### Frontend
- **React 18** + **TypeScript** + **Vite** (porta 5173)
- **TanStack Query v5** — `useQuery`, `useMutation`, `useQueryClient`, `useInfiniteQuery`
- **Zustand 5** com `persist` + `partialize` (auth excluído do localStorage)
- **Tailwind CSS** — classes customizadas (ver seção de design tokens)
- **Lucide React** — ícones
- Vite proxy: `/api/*` → `http://localhost:3001/*` | `/uploads/*` → mesmo

### Backend
- **Fastify 4** + **TypeScript** (porta 3001)
- **Prisma** + **MySQL 8** — ORM principal
- **@fastify/jwt** — JWT (access tokens, 15min)
- **@fastify/cookie** — refresh tokens HttpOnly
- **@fastify/multipart** — upload de imagens (max 5MB)
- **@fastify/static** — serve `/uploads/` como estático
- **@fastify/rate-limit** — rate limiting por rota
- **Zod** — validação de body nos endpoints

---

## 3. Regras de Segurança — IMUTÁVEIS

> Essas regras foram definidas pelo cliente e **nunca podem ser violadas**, mesmo que seja "mais simples" do outro jeito.

1. **JWT access tokens ficam apenas em memória Zustand** — nunca em localStorage ou sessionStorage
2. **Refresh tokens são cookies HttpOnly** gerenciados exclusivamente pelo servidor
3. **O frontend nunca acessa, armazena ou lê refresh tokens**
4. **Não fazer nada de auth no frontend além de chamar os endpoints** — nenhuma lógica de validação de token no cliente
5. **RBAC no servidor** — nunca confiar em role vindo do cliente; sempre buscar do banco

---

## 4. Design Tokens (Tailwind)

```css
sara-gold:         #A07844   /* cor primária, botões, destaques */
sara-terracotta:   #BC8474   /* badges de alerta/notificação, cor secundária */
sara-linen:        #F5EFE6   /* fundos de cards */
sara-cream:        #FAF7F2   /* fundo de telas mais claras */
graphite:          #3D342E   /* texto principal */
graphite-muted:    #9E8E84   /* texto secundário */
```

**Gradiente de fundo padrão das telas mobile:**
`from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF]`

---

## 5. Arquitetura de Layout (Responsivo)

### Breakpoints

| Viewport        | Layout                                           |
|-----------------|--------------------------------------------------|
| `< 768px`       | Mobile puro — MobileShell (shell 390px) visível  |
| `768px – 1023px`| Tablet — WebLayout + LeftSidebar icon-only (72px)|
| `>= 1024px`     | Desktop — WebLayout + LeftSidebar expandida (240px) + RightPanel |

### Componentes de Layout

- **`src/components/layout/MobileShell.tsx`** — shell mobile. Tem `md:hidden` no wrapper para sumir no tablet/desktop.
- **`src/components/layout/WebLayout.tsx`** — layout três colunas web (`hidden md:flex`). Recebe `LeftSidebar` + `<main>` + `RightPanel`.
- **`src/components/layout/LeftSidebar.tsx`** — sidebar esquerda persistente. `md:w-[72px]` (icon-only) / `lg:w-60` (expandida com labels).
- **`src/components/layout/RightPanel.tsx`** — coluna direita 320px (`hidden lg:block`). Search inline + "Mães para seguir" + frase do dia.
- **`src/components/layout/BottomTabBar.tsx`** — tab bar mobile (só aparece no MobileShell).

**Padrão de responsividade nos botões da sidebar:**
```tsx
className="md:justify-center lg:justify-start"  // ícone centralizado no tablet, alinhado à esquerda no desktop
```
```tsx
<span className="text-sm font-medium hidden lg:block">Label</span>  // label só no desktop
```

---

## 6. State Management — Zustand

**Arquivo:** `src/store/useAppStore.ts`
**Chave localStorage:** `mothers-team-v3`

### O que É persistido (localStorage)
```ts
onboardingDone, motherProfile, motherName, babyName,
phase, socialOnboardingDone, activeTab, selectedDate, lastFeedSide
```

### O que NÃO É persistido (memória apenas)
```ts
isLoggedIn, accessToken, currentUserId, email
```

### Actions importantes
- `setAuth(token, user)` — popula tudo após login
- `clearAuth()` — limpa apenas campos de auth (mantém perfil)
- `completeSocialOnboarding()` — marca o social onboarding como feito
- `completeSocialOnboarding` (sem parênteses) ao passar como prop para evitar re-render

---

## 7. API Client

**Arquivo:** `src/lib/api.ts`

- `apiFetch<T>(path, init?)` — wrapper de fetch que injeta `Authorization: Bearer <token>`, faz retry automático com refresh em 401, e trata `204 No Content`
- `uploadImage(file, accessToken)` — upload multipart para `/api/uploads`
- Base URL: `/api` (proxiado pelo Vite para porta 3001)
- Em caso de refresh falho: chama `clearAuth()` e lança `ApiError(401)`

---

## 8. Fluxo de Autenticação

```
1. App carrega → checa `useAppStore.getState().isLoggedIn`
2. Se não logado → POST /auth/refresh (cookie HttpOnly)
3. Se refresh OK → GET /auth/me → `setAuth(token, user)`
4. Se refresh falha → mostrar LoginScreen
5. Em qualquer 401 durante uso → apiFetch faz refresh automático (deduplicado com Promise)
```

---

## 9. Database Schema (Prisma)

### Modelos principais

**User** — id(cuid), email, username?, passwordHash, name, babyName?, pregnancyStage, pregnancyWeek?, babyAgeInDays?, onboardingDone, onboardingAnswers(Json)?, profileKey?, archetypeKey?, bio?, **role(String default "USER")**

**Follow** — followerId + followingId (@@id composto)

**Community** — id, name, description, category, colorKey, creatorId

**Post** — id, content, category, imageUrl?, authorId, communityId?, isRepost, repostFromId?

**Chat / Message** — chat tem participants (junction); Message tem sharedPostId?, sharedPostAuthor?, sharedPostExcerpt?

**RoutineEntry** — id, time, date, title, category('task'|'appointment'|'medication'), done

**BabyEntry** — id, time, type('sleep'|'feed'|'diaper'), detail

**Notification** — id, type, text, read, recipientId, targetType?, targetId?, actorId?, actorName?, postExcerpt?

**Category** (shopping) — id, name, slug(unique), icon, active, sortOrder

**Product** (shopping) — id, name, description, price(Decimal 10,2), affiliateUrl?, images(Json default []), phases(Json default []), stock?, featured, active, categoryId

**ProductClick** — id, productId, userId?, clickedAt; @@index([productId, clickedAt])

### Regras Prisma importantes
- Campos `Json` (images, phases, onboardingAnswers): **NUNCA usar `JSON.stringify()`** — Prisma serializa automaticamente. Passar o array/objeto diretamente.
- Soft delete padrão: setar `active: false`, nunca deletar registro do banco em Products/Categories.
- Filtrar phases em query: `phases: { string_contains: '"trimester1"' }` (com aspas dentro do valor).

---

## 10. Backend — Rotas Registradas

**Prefixo `server/src/index.ts`:**

| Prefix                 | Arquivo                              | Auth    |
|------------------------|--------------------------------------|---------|
| `/auth`                | `routes/auth.ts`                     | público |
| `/users`               | `routes/users.ts`                    | JWT     |
| `/communities`         | `routes/communities.ts`              | JWT     |
| `/posts`               | `routes/posts.ts`                    | JWT     |
| `/chats`               | `routes/chats.ts`                    | JWT     |
| `/routine`             | `routes/routine.ts`                  | JWT     |
| `/baby`                | `routes/baby.ts`                     | JWT     |
| `/notifications`       | `routes/notifications.ts`            | JWT     |
| `/search`              | `routes/search.ts`                   | JWT     |
| `/uploads`             | `routes/uploads.ts`                  | JWT     |
| (SSE)                  | `routes/sse.ts`                      | JWT     |
| `/admin/dashboard`     | `routes/admin/dashboard.ts`          | ADMIN/EDITOR |
| `/admin/products`      | `routes/admin/products.ts`           | ADMIN/EDITOR |
| `/admin/categories`    | `routes/admin/categories.ts`         | ADMIN/EDITOR |
| `/admin/analytics`     | `routes/admin/analytics.ts`          | ADMIN/EDITOR |
| `/products`            | `routes/products-public.ts`          | JWT     |

### Endpoints de Shopping (público autenticado)
- `GET /products` — lista com cursor pagination; filtros: `categoryId`, `featured`, `phase`
- `GET /products/categories` — categorias ativas
- `POST /products/:id/click` — registra clique de afiliado

### Endpoints Admin
- `GET /admin/dashboard` — stats gerais + top produtos
- `GET /admin/products` — lista paginada (page/limit/categoryId/active/featured/q)
- `POST /admin/products` — criar produto
- `PUT /admin/products/:id` — editar produto
- `DELETE /admin/products/:id` — soft delete
- `GET/POST/PUT/DELETE /admin/categories` — CRUD de categorias
- `GET /admin/analytics/clicks?days=N` — analytics de cliques

---

## 11. RBAC — Plugin requireRole

**Arquivo:** `server/src/plugins/requireRole.ts`

```typescript
import fp from 'fastify-plugin'

export function requireRole(...roles: string[]) {
  return fp(async function (fastify) {
    fastify.addHook('preHandler', fastify.authenticate)
    fastify.addHook('preHandler', async (request, reply) => {
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.userId },
        select: { role: true },
      })
      if (!user || !roles.includes(user.role)) {
        return reply.status(403).send({ error: 'Forbidden' })
      }
    })
  })
}
```

**CRÍTICO — por que o `fp()` é obrigatório:**
Fastify escopa hooks em plugins filho. Sem `fastify-plugin`'s `fp()`, os hooks registrados dentro do plugin não propagam para as rotas no escopo pai, criando um bug de segurança onde a autenticação nunca dispara. O `fp()` "quebra" o encapsulamento.

**Uso:**
```typescript
await fastify.register(requireRole('ADMIN', 'EDITOR'))
// rotas aqui são protegidas
```

---

## 12. Frontend — Telas e Componentes

### Telas principais (tabs)
| TabId       | Componente                                     |
|-------------|------------------------------------------------|
| `home`      | `ComunidadeScreen` — feed de posts             |
| `maeIA`     | `MaeIAScreen` — chat com Sara IA               |
| `baby`      | `BabyScreen` — rastreio bebê                   |
| `rotina`    | `HomeScreen` — agenda/rotina                   |
| `comunidade`| `ComunidadeScreen` — mesmo que home            |
| `shopping`  | `ShoppingScreen` — loja afiliada               |

### Overlays (montados no App.tsx como fixed inset-0 z-50)
- `ProfileScreen` — perfil do usuário logado
- `SettingsScreen` — configurações
- `NotificationsScreen` — notificações
- `ChatListScreen` → `ChatScreen` — mensagens
- `SearchScreen` — busca de usuários e comunidades
- `UserProfileScreen` — perfil de outro usuário
- `CommunityDetailScreen` — detalhe de comunidade
- `PostDetailScreen` — detalhe de post (aberto via notificação)
- `SocialOnboardingScreen` — apresentado uma vez após onboarding (gating por `!socialOnboardingDone`)

### Painel Admin (rota `/admin`)
Gerenciado em `src/main.tsx` via `window.location.pathname.startsWith('/admin')` — sem react-router, routing por estado de componente.

| Arquivo                              | Função                        |
|--------------------------------------|-------------------------------|
| `src/admin/AdminApp.tsx`             | Shell: auth check + routing   |
| `src/admin/components/AdminSidebar.tsx` | Sidebar fixa 240px         |
| `src/admin/pages/DashboardPage.tsx`  | Stats + top produtos          |
| `src/admin/pages/CategoriesPage.tsx` | CRUD de categorias            |
| `src/admin/pages/ProductsPage.tsx`   | Tabela paginada de produtos   |
| `src/admin/pages/ProductFormPage.tsx`| Form criação/edição produto   |

---

## 13. SSE (Server-Sent Events)

**Arquivo:** `server/src/sse.ts` + `server/src/routes/sse.ts`

- Endpoint: `GET /sse` (JWT required)
- Eventos emitidos: `notification` (novo like/follow/comment), `message` (nova mensagem de chat)
- Frontend: `src/lib/useSSE.ts` — hook que faz `EventSource` com o token no query param e invalida caches do TanStack Query nos eventos recebidos

---

## 14. Upload de Imagens

- Endpoint: `POST /uploads` (multipart, JWT, rate-limit 20/min)
- Salva em `server/uploads/` com nome UUID
- Retorna `{ url: "/uploads/<filename>" }`
- Servido como estático pelo `@fastify/static`
- No frontend: `uploadImage(file, accessToken)` em `src/lib/api.ts`

---

## 15. Tipos TypeScript Compartilhados

**Arquivo:** `src/lib/types.ts`

Principais interfaces:
- `ApiUser` — inclui `role?: string`
- `ApiPost` — inclui `likedByCurrentUser`, `_count`
- `ApiCommunity` / `ApiCommunityDetail` (com `isMember`, `role`)
- `ApiNotification` — inclui `targetType`, `targetId`, `actorId`, `actorName`, `postExcerpt`
- `ApiChat` / `ApiMessage` — inclui `sharedPostId?` para mensagens com post compartilhado
- `Phase` — `'trimester1' | 'trimester2' | 'trimester3' | 'postpartum_0_30' | 'postpartum_31_180' | 'postpartum_181_365'`
- `ApiAdminProduct` — com `images: string[]`, `phases: Phase[]`, `category: {...}`, `_count.clicks`
- `ApiAdminCategory` — com `_count.products`
- `ApiAdminDashboard` — stats do dashboard admin

---

## 16. Padrões e Convenções

### TanStack Query
- `staleTime: 60_000` (1min) para dados que mudam raramente
- `staleTime: 30_000` (30s) para chats
- Invalidação após mutação: `queryClient.invalidateQueries({ queryKey: ['posts'] })`
- Infinite scroll: `useInfiniteQuery` com `nextCursor` para posts de comunidade e perfil

### Componentes de formulário
- Validação básica no cliente antes de enviar
- Nunca confiar em validação do cliente para segurança (server valida com Zod)
- Loading states: `isLoading` do useQuery → skeleton placeholders

### Estilos de botão padrão
```tsx
// Primário
"py-2 px-4 rounded-xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform"

// Destrutivo
"text-sara-terracotta hover:bg-sara-terracotta/10"

// Sair (logout)
onClick={clearAuth}  // sem () => — usar referência direta para evitar re-render
```

### Soft delete
```typescript
await fastify.prisma.product.update({
  where: { id },
  data: { active: false }
})
```

---

## 17. Onboarding e Perfis

O onboarding coleta dados da mãe e gera um "perfil arquétipo" via `computeProfile(answers)`:
- **13 tipos de perfil** (profileKey) — ex: "guerreira", "espiritual", "científica"
- Arquétipos complementares (archetypeKey)
- Fase da gravidez: `pregnant` ou `postpartum`
- Dados: `pregnancyWeek` (se pregnant) ou `babyAgeInDays` (se postpartum)
- Após onboarding: `SocialOnboardingScreen` (uma vez só) sugere comunidades e usuários para seguir

---

## 18. Features Analisadas (Prontas para Discussão/Implementação)

Documento de análise completo em `docs/analise-features-reuniao-2026-07-13.md`:

1. **Onboarding em Conversa com Sara** — ElevenLabs Conversational AI (STT+LLM+TTS). Opção A: voz + foto estática. Opção B: voz + avatar animado CSS/Lottie (recomendada). Opção C: vídeo HeyGen (pré-gravado).
2. **Mensagem de Deus / Versículos Bíblicos** — 70 versículos curados, rotação por fase e dia da semana, aparece em cada aba.
3. **Perguntas Dinâmicas por Fase** — MãeIA recebe contexto da fase da mãe e adapta as respostas.
4. **Segurança Contra Perfis Falsos** — verificação de número de telefone (Twilio) ou email + moderação de conteúdo.
5. **Tutorial Guiado com Sara** — coach marks ou bottom sheet explicativo na primeira semana de uso.
6. **Sugestões de Shopping Ativáveis** — "Sara recomenda" aparece no feed baseado na fase, com link para produto afiliado.
7. **Mães Adolescentes** — campo de idade no onboarding, conteúdo específico para <20 anos, comunidade dedicada.

---

## 19. Estado Atual (2026-07-16)

### Implementado e funcionando
- ✅ Auth completo (login, cadastro, refresh token, logout)
- ✅ Onboarding com 13 perfis arquétipo
- ✅ Social Onboarding (sugestão de comunidades/usuários após cadastro)
- ✅ Feed social (posts, likes, comentários, reposts, categorias)
- ✅ Comunidades (criar, entrar, posts internos, infinite scroll)
- ✅ Chat em tempo real (SSE para novas mensagens)
- ✅ Notificações em tempo real (SSE para likes/follows/comments)
- ✅ Busca de usuários e comunidades
- ✅ Perfis de usuário (seguir, ver posts, followers/following)
- ✅ Upload de imagens (posts, perfil)
- ✅ BabyScreen (amamentação, fralda, sono)
- ✅ Rotina/agenda
- ✅ MãeIA (chat com IA)
- ✅ Shopping screen com API real (categorias, produtos, clique de afiliado)
- ✅ Web layout três colunas (LeftSidebar + RightPanel) — CSS responsivo
- ✅ Admin panel completo (dashboard, produtos CRUD, categorias CRUD, analytics)
- ✅ RBAC com `requireRole` plugin (ADMIN/EDITOR)

### Não implementado ainda
- ❌ Onboarding por voz com Sara (analisado, não iniciado)
- ❌ Versículos bíblicos nas abas
- ❌ Tutorial guiado interno
- ❌ Sugestões de shopping no feed
- ❌ Campo de idade da mãe / conteúdo para adolescentes
- ❌ Verificação de número de telefone (anti-fake)
- ❌ Migration do banco para produção (local apenas)

### Mudanças não commitadas (git status dirty)
Os arquivos de layout web e admin panel foram criados na sessão anterior mas **ainda não foram commitados**. Todos os arquivos estão salvos no disco. O próximo passo é decidir: commitar em `main` ou criar branch + PR.

---

## 20. Estrutura de Arquivos (Resumo)

```
mothers-team/
├── src/
│   ├── App.tsx                          # Root component, routing, overlays
│   ├── main.tsx                         # Entry point, isAdmin split
│   ├── store/useAppStore.ts             # Zustand store
│   ├── lib/
│   │   ├── api.ts                       # apiFetch, uploadImage
│   │   ├── types.ts                     # TypeScript interfaces
│   │   ├── helpers.ts                   # apiPostToCommunityPost, buildPhase
│   │   └── useSSE.ts                    # SSE hook
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MobileShell.tsx          # Shell mobile (md:hidden)
│   │   │   ├── WebLayout.tsx            # Layout 3 colunas (hidden md:flex)
│   │   │   ├── LeftSidebar.tsx          # Nav sidebar
│   │   │   ├── RightPanel.tsx           # Coluna direita
│   │   │   ├── BottomTabBar.tsx         # Tab bar mobile
│   │   │   └── AppHeader.tsx            # Header mobile
│   │   ├── auth/ home/ baby/ maeIA/     # Telas por domínio
│   │   ├── comunidade/ chat/ profile/   # Telas sociais
│   │   ├── onboarding/ notifications/   # Onboarding e notificações
│   │   ├── shopping/ShoppingScreen.tsx  # Loja
│   │   └── search/ post/               # Busca e detalhe de post
│   └── admin/
│       ├── AdminApp.tsx                 # Shell admin
│       ├── components/AdminSidebar.tsx  # Sidebar admin
│       └── pages/                      # Dashboard, Products, Categories, Form
├── server/
│   ├── prisma/schema.prisma             # Schema do banco
│   └── src/
│       ├── index.ts                     # Registro de todos os plugins e rotas
│       ├── plugins/
│       │   ├── auth.ts                  # JWT plugin + fastify.authenticate
│       │   ├── prisma.ts                # Prisma plugin
│       │   └── requireRole.ts           # RBAC plugin (fp() obrigatório)
│       ├── routes/
│       │   ├── auth.ts users.ts posts.ts communities.ts
│       │   ├── chats.ts routine.ts baby.ts notifications.ts
│       │   ├── search.ts uploads.ts sse.ts
│       │   ├── products-public.ts       # Loja pública autenticada
│       │   └── admin/
│       │       ├── dashboard.ts products.ts
│       │       └── categories.ts analytics.ts
│       └── sse.ts                       # SSE manager (Map de connections)
└── docs/
    ├── project-briefing.md              # Este documento
    ├── analise-features-reuniao-2026-07-13.md  # Análise de 8 features
    └── analise-web-navigation-admin-panel.md   # Planejamento web+admin
```
