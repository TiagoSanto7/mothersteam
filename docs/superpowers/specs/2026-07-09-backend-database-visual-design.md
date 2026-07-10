# Spec — Backend, Banco de Dados e Visual (Drawer/Header)

**Data:** 2026-07-09
**Status:** Aprovado — aguardando implementação

---

## 1. Contexto

O app mothers-team é hoje um React SPA com Zustand + localStorage. Todos os dados são seed hardcoded em memória — nenhum backend, nenhum banco real. Esta spec define a introdução de um backend Fastify + MySQL via Prisma, com arquitetura de segurança adequada para web e React Native (Expo), além de um ajuste visual de header fixo com drawer lateral.

---

## 2. Arquitetura Geral

### Estrutura de repositório

Adicionar um diretório `server/` dentro do repositório existente. Frontend permanece em `src/`, backend em `server/`. Sem monorepo complexo.

```
mothers-team/
├── src/                        # React frontend (existente)
├── server/                     # Fastify API (novo)
│   ├── src/
│   │   ├── routes/             # auth, users, communities, posts, chats, routine, baby, notifications
│   │   ├── plugins/            # jwt, cors, helmet, rate-limit, prisma
│   │   └── index.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml          # MySQL para dev local
└── package.json                # scripts raiz
```

### Stack

- **Backend:** Node.js + Fastify + TypeScript
- **ORM:** Prisma
- **Banco:** MySQL 8.0 (Docker)
- **Validação:** Zod em todas as rotas
- **Frontend (server state):** `@tanstack/react-query` substituindo dados do Zustand store
- **Frontend (UI state):** Zustand continua gerenciando aba ativa, data selecionada, estado do drawer

---

## 3. Autenticação e Segurança

### Princípio central

O frontend nunca armazena nem manipula tokens de autenticação diretamente. O navegador gerencia o refresh token automaticamente via cookie HttpOnly.

### Padrão Access Token + Refresh Token

| | Access Token | Refresh Token |
|---|---|---|
| **Vida útil** | 15 minutos | 30 dias |
| **Web** | Memória (Zustand, não persiste no reload) | HttpOnly cookie (inacessível ao JS) |
| **Mobile (Expo)** | `expo-secure-store` (Keychain/Keystore) | `expo-secure-store` |

**Fluxo de login:**
```
POST /auth/login { email, password }
← access token no response body
← refresh token em Set-Cookie: HttpOnly; Secure; SameSite=Strict (web)
   OU no response body (mobile, detectado por header X-Client: mobile)
```

**Renovação:**
```
POST /auth/refresh
  Web:    browser envia cookie automaticamente
  Mobile: envia refresh token no body
← novo access token
```

### Camada de segurança do backend

| Plugin/Prática | O que protege |
|---|---|
| `@fastify/helmet` | Headers HTTP (CSP, X-Frame-Options, HSTS) |
| `@fastify/rate-limit` | Brute force em /auth/login (5 req/min por IP) |
| `@fastify/cors` | Só aceita requests do domínio do frontend |
| `zod` | Valida e sanitiza todo input antes de tocar o DB |
| `bcrypt` | Senhas nunca salvas em plaintext |
| Prisma | Queries parametrizadas — SQL injection impossível |
| `SameSite=Strict` | Proteção CSRF complementar ao HttpOnly |
| HTTPS (Let's Encrypt) | Token nunca viaja em plaintext |

---

## 4. Schema do Banco de Dados (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id                String    @id @default(cuid())
  email             String    @unique
  passwordHash      String
  name              String
  babyName          String?
  pregnancyStage    String    // 'pregnant' | 'postpartum'
  pregnancyWeek     Int?
  babyAgeInDays     Int?
  onboardingDone    Boolean   @default(false)
  onboardingAnswers Json?
  profileKey        String?
  archetypeKey      String?

  posts             Post[]
  comments          Comment[]
  routineEntries    RoutineEntry[]
  babyEntries       BabyEntry[]
  notifications     Notification[]
  following         Follow[]         @relation("Follower")
  followers         Follow[]         @relation("Following")
  communities       CommunityMember[]
  chats             ChatParticipant[]
  sentMessages      Message[]
  createdCommunities Community[]     @relation("CommunityCreator")

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model Follow {
  followerId  String
  followingId String
  follower    User  @relation("Follower", fields: [followerId], references: [id])
  following   User  @relation("Following", fields: [followingId], references: [id])
  createdAt   DateTime @default(now())
  @@id([followerId, followingId])
}

model Community {
  id          String  @id @default(cuid())
  name        String
  description String  @db.Text
  category    String  // 'gestação' | 'pós-parto' | 'amamentação' | 'saúde mental'
  colorKey    String  // 'gold' | 'terracotta' | 'warm' | 'linen' | 'cream'
  creatorId   String
  creator     User    @relation("CommunityCreator", fields: [creatorId], references: [id])
  members     CommunityMember[]
  posts       Post[]
  createdAt   DateTime @default(now())
}

// role: 'member' | 'admin' | 'owner'
// owner é quem criou; pode promover membros a admin; admins podem moderar posts
model CommunityMember {
  userId      String
  communityId String
  role        String    @default("member")
  user        User      @relation(fields: [userId], references: [id])
  community   Community @relation(fields: [communityId], references: [id])
  joinedAt    DateTime  @default(now())
  @@id([userId, communityId])
}

model Post {
  id           String     @id @default(cuid())
  content      String     @db.Text
  category     String
  imageUrl     String?
  authorId     String
  author       User       @relation(fields: [authorId], references: [id])
  communityId  String?
  community    Community? @relation(fields: [communityId], references: [id])
  isRepost     Boolean    @default(false)
  repostFromId String?
  repostFrom   Post?      @relation("Repost", fields: [repostFromId], references: [id])
  reposts      Post[]     @relation("Repost")
  likes        PostLike[]
  comments     Comment[]
  createdAt    DateTime   @default(now())
}

model PostLike {
  userId    String
  postId    String
  user      User     @relation(fields: [userId], references: [id])
  post      Post     @relation(fields: [postId], references: [id])
  createdAt DateTime @default(now())
  @@id([userId, postId])
}

model Comment {
  id        String   @id @default(cuid())
  content   String   @db.Text
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  postId    String
  post      Post     @relation(fields: [postId], references: [id])
  likes     Int      @default(0)
  createdAt DateTime @default(now())
}

// ChatParticipant em vez de user1/user2 fixos — suporta grupos futuros
model Chat {
  id           String            @id @default(cuid())
  participants ChatParticipant[]
  messages     Message[]
  createdAt    DateTime          @default(now())
}

model ChatParticipant {
  userId String
  chatId String
  user   User @relation(fields: [userId], references: [id])
  chat   Chat @relation(fields: [chatId], references: [id])
  @@id([userId, chatId])
}

model Message {
  id                String   @id @default(cuid())
  content           String   @db.Text
  chatId            String
  chat              Chat     @relation(fields: [chatId], references: [id])
  senderId          String
  sender            User     @relation(fields: [senderId], references: [id])
  // SharedPost desnormalizado — snapshot do post no momento do envio
  sharedPostId      String?
  sharedPostAuthor  String?
  sharedPostExcerpt String?
  read              Boolean  @default(false)
  createdAt         DateTime @default(now())
}

model RoutineEntry {
  id        String   @id @default(cuid())
  time      String
  date      String
  title     String
  category  String   // 'task' | 'appointment' | 'medication'
  done      Boolean  @default(false)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}

model BabyEntry {
  id        String   @id @default(cuid())
  time      String
  type      String   // 'sleep' | 'feed' | 'diaper'
  detail    String
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}

model Notification {
  id          String   @id @default(cuid())
  type        String   // 'like' | 'follow' | 'comment'
  text        String
  read        Boolean  @default(false)
  recipientId String
  recipient   User     @relation(fields: [recipientId], references: [id])
  createdAt   DateTime @default(now())
}
```

---

## 5. Rotas da API

Todas as rotas (exceto `/auth/register`, `/auth/login`, `/auth/refresh`) exigem access token válido no header `Authorization: Bearer <token>`.

Paginação: cursor-based em todas as listagens (`?cursor=<id>&limit=20`).

### Auth — rate limit 5 req/min por IP
```
POST  /auth/register
POST  /auth/login
POST  /auth/logout
POST  /auth/refresh
GET   /auth/me
```

### Users
```
GET    /users/:id
PATCH  /users/me
POST   /users/:id/follow
DELETE /users/:id/follow
GET    /users/:id/followers
GET    /users/:id/following
```

### Communities
```
GET    /communities
POST   /communities                       cria — usuário vira owner automaticamente
GET    /communities/:id
PATCH  /communities/:id                   owner ou admin only
GET    /communities/:id/posts
POST   /communities/:id/join
DELETE /communities/:id/join
POST   /communities/:id/admins/:userId    promove membro → admin (owner only)
DELETE /communities/:id/admins/:userId    rebaixa admin → member (owner only)
```

### Posts
```
GET    /posts                    feed geral paginado
POST   /posts
GET    /posts/:id
DELETE /posts/:id                autor only
POST   /posts/:id/like
DELETE /posts/:id/like
POST   /posts/:id/repost
GET    /posts/:id/comments
POST   /posts/:id/comments
```

### Chats
```
GET   /chats
POST  /chats                     body: { userId } — cria ou retorna chat existente
GET   /chats/:id/messages
POST  /chats/:id/messages        body: { content, sharedPostId? }
```

### Rotina
```
GET    /routine?date=YYYY-MM-DD
POST   /routine
PATCH  /routine/:id
DELETE /routine/:id
```

### Bebê
```
GET   /baby?date=YYYY-MM-DD
POST  /baby
```

### Notificações
```
GET   /notifications
POST  /notifications/read-all
```

---

## 6. Infraestrutura

### Desenvolvimento local

`docker-compose.yml` na raiz:

```yaml
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: mothers_team
      MYSQL_USER: mothers
      MYSQL_PASSWORD: mothers123
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

`npm run dev` sobe o Fastify apontando para `localhost:3306`. Migrations com `prisma migrate dev`.

### Hostinger VPS (produção)

```yaml
services:
  api:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: mysql://mothers:${DB_PASSWORD}@mysql:3306/mothers_team
      JWT_SECRET: ${JWT_SECRET}
      REFRESH_SECRET: ${REFRESH_SECRET}
      NODE_ENV: production
    depends_on:
      - mysql
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: mothers_team
      MYSQL_USER: mothers
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql_data:
```

Variáveis sensíveis em `.env` no VPS — nunca no repositório.

### HTTPS + Reverse Proxy

Nginx na frente da API com certificado Let's Encrypt (gratuito):

```
Internet → Nginx (443 HTTPS) → Fastify (3001 HTTP interno)
```

### Backups

MySQL dump diário via cron no VPS, salvo em diretório local separado.

### Deploy

`git pull` + `docker compose up --build -d` no VPS.

---

## 7. Alterações Visuais — Header Fixo + Drawer Lateral

### Contexto

Hoje não existe um header compartilhado. Cada uma das 5 abas desenha seu próprio topo, e o `MobileShell` só cuida do fundo e da barra inferior. Esta mudança introduz um header fixo global — pequena mudança de arquitetura de layout.

### 7.1 Novo header fixo (nas 5 abas do bottom nav)

Presente em: Comunidade, MãeIA, Bebê, Rotina, Shopping.

Estrutura:
- **Esquerda:** ícone hambúrguer (☰) — abre o drawer
- **Centro:** texto `"Mother's Team"` como logo (SVG a definir futuramente)
- **Direita:**
  - Comunidade: mantém ícones de chat e notificação já existentes
  - Demais abas: vazio (mantém logo centralizado)

O conteúdo específico de cada aba (título "MãeIA", saudação "Olá, Mariana", etc.) permanece abaixo desse header, sem ser removido.

### 7.2 Onde o header NÃO aparece

Telas secundárias abertas por navegação: Perfil, Configurações, Mensagens, Notificações, Detalhe do Post, Composer/Criar post. Essas já têm cabeçalho próprio com botão de voltar — comportamento igual ao Bluesky mobile.

### 7.3 Drawer lateral

**Abertura/fechamento:**
- Abre por toque no ícone ☰
- Na web: também abre por clique
- Fecha por toque no overlay escurecido, toque em um item, ou botão de fechar
- Overlay escurecido por trás do drawer (igual ao Bluesky)

**Conteúdo:**
- Cabeçalho: avatar + nome + stats (posts / seguidores / seguindo) — dados já existentes no store
- Itens: Perfil, Configurações, Sair da conta
- Itens futuros possíveis: Ajuda, Sobre (em aberto)

**Ponto em aberto:** decidir se o toggle "Como visitante" do Perfil entra no drawer ou permanece só dentro da tela de Perfil.

### 7.4 Arquivos envolvidos

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | Estado `drawerOpen` (boolean) + handler de abrir/fechar |
| `src/components/layout/MobileShell.tsx` | Adicionar `AppHeader` fixo acima do conteúdo |
| `src/components/layout/AppHeader.tsx` | Novo componente — hambúrguer + logo + slot direito contextual |
| `src/components/layout/SideDrawer.tsx` | Novo componente — overlay + painel + lista de itens |
| `ComunidadeScreen.tsx` | Remover/ajustar cabeçalho próprio para não duplicar |
| `HomeScreen.tsx` | Idem (aba Home/Rotina — `src/components/home/`) |
| `BabyScreen.tsx` | Idem |
| `MaeIAScreen.tsx` | Idem |
| `ShoppingScreen.tsx` | Idem |

---

## 8. Pontos em Aberto

- Logo SVG do Mother's Team (por ora: texto `"Mother's Team"`)
- Toggle "Como visitante": drawer ou só tela de Perfil
- Lista final de itens do drawer (Ajuda, Sobre)
- Estratégia de migração dos dados seed para o banco (script de seed Prisma)
- CI/CD no VPS (Docker + GitHub Actions — fase futura)
