# Planejamento: Navegação Web + Painel Admin de Shopping

**Data:** 2026-07-15  
**Contexto:** O app hoje roda como shell mobile (390px centralizado) na web. Esse documento planeja duas coisas independentes:
1. Layout web real com navegação inspirada em X/Twitter e Bluesky (três colunas, sidebar persistente)
2. Painel administrativo para gestão de produtos do Shopping — fora do mobile, feito pra web

---

## Parte 1 — Navegação Web Real

### O problema atual

O `MobileShell.tsx` usa `sm:w-[390px] sm:h-[844px]` para centralizar o shell mobile na tela quando em desktop. Isso funciona como "preview" de app, mas não é uma experiência web de verdade:

- Conteúdo limitado a 390px de largura mesmo em monitor 1920px
- Navigation tabs embaixo (`BottomTabBar`) — padrão mobile, não web
- Menu em gaveta lateral (`SideDrawer`) — faz sentido mobile, mas em desktop nav deveria ser sempre visível
- Sem uso das colunas laterais que o desktop oferece (search, sugestões, trending)

### Referências — como X e Bluesky fazem

**X (Twitter) — três colunas:**
```
| Nav Sidebar (left) | Content (center) | Right panel |
| 240-280px fixo     | 600px max        | 350px       |
```
- Sidebar esquerda: ícones + labels, fixo, sempre visível
- Ícones viram labels em telas maiores (sidebar expande de 72px icon-only para 240px completo)
- Coluna direita: campo de search + "Who to follow" + trends
- Em mobile (<768px): sidebar esquerda some, bottom tab aparece

**Bluesky — mesma lógica:**
- Sidebar esquerda com avatar do usuário no topo + nav items
- Content center com feed
- Coluna direita com search + sugestões de perfis
- Breakpoints: `<640px` = mobile, `640-1024px` = dois colunas (nav sidebar + content), `>1024px` = três colunas

### Arquitetura proposta

#### Breakpoints

| Viewport | Layout |
|---|---|
| `< 768px` | Mobile puro: full-screen + BottomTabBar (igual hoje) |
| `768px – 1023px` | Tablet: sidebar icon-only (72px) + conteúdo |
| `>= 1024px` | Desktop: sidebar expandida (240px) + conteúdo + right panel |

Esses breakpoints mapeiam direto no Tailwind: `md:` (768px) e `lg:` (1024px).

#### Estrutura de componentes proposta

```
App
├── MobileShell (< 768px) — mantém igual
└── WebLayout (>= 768px) — novo
    ├── LeftSidebar (nav persistente)
    ├── ContentArea (mesma lógica de tabs mas sem shell)
    └── RightPanel (opcional, apenas >= 1024px)
```

O roteamento entre `MobileShell` e `WebLayout` pode ser feito com um hook `useIsDesktop()` baseado em `window.matchMedia('(min-width: 768px)')` ou via CSS puro com classes `hidden md:flex`.

**Abordagem recomendada: CSS puro** — renderiza os dois layouts e usa classes para mostrar/esconder. Evita flash de conteúdo e não precisa de JavaScript para detectar viewport.

---

### Left Sidebar — design detalhado

**Dois estados:**
- **Icon-only (72px):** em `768px – 1023px` — mostra só ícone + tooltip ao hover
- **Expanded (240px):** em `>= 1024px` — ícone + label visíveis

**Itens de navegação** (mapeados da `BottomTabBar` atual):

| Ícone | Label | TabId |
|---|---|---|
| Home | Home | `home` |
| MessageCircle | MãeIA | `maeIA` |
| (emoji evolutivo) | Bebê | `baby` |
| Calendar | Rotina | `rotina` |
| ShoppingBag | Shopping | `shopping` |
| Globe / Users | Comunidades | `comunidade` |

**Bloco inferior** (atualmente no `SideDrawer`):
- Avatar do usuário + nome (expandido) ou só avatar (icon-only)
- Link para Perfil
- Link para Configurações
- Botão Sair

**Design visual:**
- Fundo: `bg-[#F5EDE0]` (mesmo tom da sidebar do SideDrawer)
- Active item: `text-sara-gold` com fundo `bg-sara-gold/10`
- Hover: `hover:bg-white/50`
- Border direita sutil: `border-r border-sara-linen`
- Em modo expandido, o logo "Mother's Team" aparece no topo da sidebar em vez do header

---

### Content Area — design

- Largura máxima de `672px` (próximo ao padrão do X/Bluesky)
- Centralizada com `mx-auto`
- Padding lateral de `16px` no mobile, `24px` no desktop
- Sem o gradiente de fundo do shell mobile — usa o fundo da página (`bg-[#EDE6DC]` ou `bg-sara-cream`)
- Posts e cards mantêm visual igual, só sem o constraint de 390px

---

### Right Panel — design

Aparece apenas em `>= 1024px`. Largura fixa de `320px`.

**Conteúdo:**
- **Campo de busca** no topo (busca de posts, mães, comunidades)
- **"Mães para seguir"** — lista de sugestões de perfis (já existe endpoint `GET /users/`)
- **Comunidades em destaque** — lista das mais ativas
- **Dica da semana** — conteúdo editorial fixo ou rotativo (ex: "Na semana X de gravidez, o bebê está do tamanho de...")

---

### Migração — o que muda nos arquivos existentes

| Arquivo | O que muda |
|---|---|
| `MobileShell.tsx` | Adiciona `className="md:hidden"` ao wrapper — some em desktop |
| `BottomTabBar.tsx` | Adiciona `className="md:hidden"` — some em desktop |
| `SideDrawer.tsx` | Pode manter para mobile ou converter em estado do sidebar web |
| `AppHeader.tsx` | Adiciona `className="md:hidden"` — some em desktop (sidebar tem o logo) |
| `App.tsx` (ou equivalente) | Renderiza `WebLayout` em paralelo com `md:flex hidden` |

**Novos arquivos:**
- `src/components/layout/WebLayout.tsx` — shell de desktop
- `src/components/layout/LeftSidebar.tsx` — navegação lateral
- `src/components/layout/RightPanel.tsx` — coluna direita
- `src/components/layout/SearchBar.tsx` — campo de busca reutilizável

---

### Considerações de UX

**Notificações no desktop:**
- Ícone de sino na sidebar (novo item) com badge de contagem
- Ou manter o sino no header (que em desktop seria parte da sidebar)

**Drawer → sem drawer no desktop:**
- O `SideDrawer` desliza do lado e foi projetado para mobile
- No desktop, o perfil/configurações acessados via clique no avatar na base da sidebar — dropdown ou navigate para página de perfil

**URL routing:**
- Hoje o app é SPA com tabs controladas por Zustand (`activeTab`)
- Para web real, idealmente cada tab teria URL própria (`/home`, `/maeIA`, `/bebe`, `/rotina`, `/shopping`)
- Isso permite: link direto, botão voltar do browser, bookmarks
- Requer adicionar `react-router-dom` ou similar — decisão separada, não bloqueia o layout

---

## Parte 2 — Painel Administrativo de Shopping

### Por que não pode ser mobile

Gerenciar produtos pelo celular seria frustrante:
- Formulários com muitos campos (nome, descrição, preço, categoria, imagens, estoque, fase da gravidez recomendada)
- Upload de múltiplas fotos de produto
- Visão de tabela para gerenciar dezenas/centenas de produtos
- Filtros e busca avançada
- Relatórios de pedidos/cliques

**A solução é um painel web dedicado para admin**, seja embutido na mesma aplicação React em uma rota `/admin` ou como uma aplicação separada.

---

### Três abordagens comparadas

#### Opção A — Rota `/admin` na mesma SPA React (Recomendada)
- Adiciona `/admin/*` routes protegidas por papel ADMIN
- Usa shadcn/ui para os componentes de tabela, formulários e cards
- Compartilha a mesma API Fastify, mesma autenticação (JWT + cookie)
- Build único, deploy único
- Mais simples de manter

**Prós:** sem servidor extra, sem autenticação duplicada, usa mesma stack  
**Contras:** bundle maior (mas tree-shaking resolve), risco de vazar código admin para usuários normais (resolver com lazy loading da rota `/admin`)

#### Opção B — App admin separado (Next.js/Vite)
- Repositório separado ou pasta `admin/` no monorepo
- Stack própria, deploy independente (ex: `admin.mothersteam.com`)
- Completamente isolado do app principal

**Prós:** isolamento total, stack livre, sem risco de vazamento  
**Contras:** duplicação de autenticação, dois deploys, mais overhead

#### Opção C — AdminJS (auto-gerado)
- Biblioteca Node.js que gera painel CRUD automático a partir dos modelos Prisma
- Integra com Fastify via plugin `@adminjs/fastify`
- Visual genérico mas funcional em horas

**Prós:** rápido de montar, zero front-end a escrever  
**Contras:** difícil customizar UX, visual não se encaixa com a marca, sem suporte a lógica de negócio complexa (ex: "fases da gravidez")

**Recomendação: Opção A** — rota `/admin` na mesma SPA, com lazy loading e guard de papel.

---

### Modelo de dados — o que o admin gerencia

#### Produtos
```
Product {
  id, name, description, price, category,
  images: string[],          // URLs no S3/R2
  stock: number,             // ou null se ilimitado
  phases: Phase[],           // quais fases a Mae vê esse produto
  featured: boolean,         // aparece em destaque
  active: boolean,           // visível para usuários
  affiliateUrl: string,      // link externo (Amazon, etc)
  createdAt, updatedAt
}

Phase = 'trimester1' | 'trimester2' | 'trimester3' | 'postpartum_0_30' | 'postpartum_31_180' | 'postpartum_181_365'
```

#### Categorias
```
Category { id, name, slug, icon, active }
```

#### Pedidos / Cliques (analytics)
```
ProductClick { id, productId, userId, clickedAt }
```

---

### Telas do painel admin

#### 1. Dashboard
- Cards: total de produtos ativos, produtos fora de estoque, cliques hoje, cliques 30 dias
- Gráfico simples de cliques por produto (top 5)
- Tabela "Produtos precisando atenção" (estoque baixo ou sem imagem)

#### 2. Listagem de Produtos (`/admin/products`)
- Tabela com colunas: Nome, Categoria, Preço, Estoque, Fases, Status (ativo/inativo), Ações
- Filtros: por categoria, fase, status
- Busca por nome
- Ações em massa: ativar/desativar selecionados
- Botão "Novo produto"
- Paginação (server-side)

#### 3. Formulário de Produto (`/admin/products/new` e `/admin/products/:id/edit`)
- Campos: nome, descrição, preço, link afiliado
- Seletor de categoria
- Checkboxes de fases (com tooltip explicando cada fase)
- Upload de imagens (drag-and-drop, múltiplas, reordenável)
- Toggle "Ativo" e "Destaque"
- Campo de estoque (ou "ilimitado")
- Preview do card como a usuária vai ver

#### 4. Categorias (`/admin/categories`)
- CRUD simples de categorias
- Reordenação via drag-and-drop (ordem de exibição no app)

#### 5. Usuários Admin (`/admin/users`) — opcional v1
- Lista de admins com papel ADMIN
- Convite por e-mail

---

### RBAC — controle de acesso

**Papéis propostos:**

| Papel | O que pode fazer |
|---|---|
| `USER` | Usuário normal do app — sem acesso a `/admin` |
| `ADMIN` | Acesso total ao painel admin |
| `EDITOR` | Pode editar produtos mas não gerenciar usuários |

**Implementação:**
- Campo `role: 'USER' | 'ADMIN' | 'EDITOR'` na tabela `User` do Prisma
- Middleware Fastify `requireRole('ADMIN')` protege todas as rotas `/admin/*`
- No frontend, `AdminGuard` component verifica `currentUser.role` antes de renderizar a rota — redireciona para home se não for admin
- A rota `/admin` fica em chunk separado via `React.lazy()` — código não baixa para usuário normal

**Migração do banco:**
```sql
ALTER TABLE User ADD COLUMN role ENUM('USER', 'ADMIN', 'EDITOR') NOT NULL DEFAULT 'USER';
```

---

### Tecnologia — componentes UI para o admin

**Recomendação: shadcn/ui** — já é a direção natural da stack (Tailwind, React)

Componentes usados:
- `Table` + `DataTable` com sorting e paginação
- `Dialog` para confirmações
- `Form` + `Input`, `Select`, `Checkbox` para formulários
- `Tabs` para separar seções no formulário de produto
- `Badge` para status e fases
- `Skeleton` para loading states
- `Sonner` para toasts de sucesso/erro

Para upload de imagens: `react-dropzone` (licença MIT, 11K stars) + endpoint existente de upload da API.

Para tabelas com muitos dados: `@tanstack/react-table` v8 (já é dependência do shadcn DataTable).

**Template de referência:** `satnaing/shadcn-admin` (GitHub, 12K stars) — pode ser usado como visual reference/copy de componentes específicos, sem necessidade de instalar como dependência.

---

### Estrutura de arquivos proposta

```
src/
└── admin/                        # todo o código admin aqui
    ├── AdminApp.tsx              # shell da SPA admin (sidebar + outlet)
    ├── pages/
    │   ├── DashboardPage.tsx
    │   ├── ProductsPage.tsx      # listagem
    │   ├── ProductFormPage.tsx   # criar/editar
    │   └── CategoriesPage.tsx
    ├── components/
    │   ├── ProductTable.tsx
    │   ├── ProductForm.tsx
    │   ├── ImageUploader.tsx
    │   └── PhaseSelector.tsx
    └── hooks/
        └── useAdminProducts.ts   # queries e mutations dos produtos

server/src/routes/
└── admin/
    ├── products.ts               # CRUD produtos
    ├── categories.ts             # CRUD categorias
    └── analytics.ts              # cliques e stats
```

---

### Rotas da API para o admin

```
GET    /admin/products          → lista com filtros e paginação
POST   /admin/products          → criar produto
GET    /admin/products/:id      → detalhe
PUT    /admin/products/:id      → atualizar
DELETE /admin/products/:id      → deletar (soft delete → active: false)
POST   /admin/products/:id/images  → upload de imagem

GET    /admin/categories        → lista
POST   /admin/categories        → criar
PUT    /admin/categories/:id    → atualizar
DELETE /admin/categories/:id    → deletar

GET    /admin/analytics/clicks  → cliques por produto nos últimos N dias
GET    /admin/dashboard         → stats gerais (contagens)
```

Todas protegidas por middleware `requireRole('ADMIN')`.

---

### Roadmap de implementação

#### Fase 1 — Fundação (1-2 dias)
1. Adicionar campo `role` na tabela `User` (migration Prisma)
2. Criar middleware `requireRole` no Fastify
3. Criar rota `/admin` no React com lazy loading + `AdminGuard`
4. Shell do admin com sidebar (sem conteúdo ainda)
5. Criar schema do `Product` e `Category` no Prisma

#### Fase 2 — CRUD de Produtos (3-4 dias)
1. Rotas API para produtos (CRUD + upload de imagem)
2. Listagem com tabela, filtros e busca
3. Formulário de produto com todos os campos
4. Seletor de fases com preview visual
5. Upload de imagens com drag-and-drop

#### Fase 3 — Dashboard e Polish (1-2 dias)
1. Dashboard com stats básicos
2. CRUD de categorias
3. Analytics de cliques
4. Integrar produtos na tab Shopping do app mobile

**Total estimado: ~1 semana para v1 funcional**

---

## Resumo Executivo

| Tópico | Decisão |
|---|---|
| Layout web | Three-column (sidebar + content + right panel), responsivo com breakpoints `md:` e `lg:` |
| Mobile | Continua igual, só some em `>= 768px` |
| Routing web | Opcional mas recomendado: `react-router-dom` com URLs `/home`, `/maeIA` etc |
| Admin | Rota `/admin` na mesma SPA, chunk separado com lazy loading |
| Auth admin | Mesmo JWT/cookie, campo `role` na tabela User |
| UI admin | shadcn/ui + @tanstack/react-table |
| Upload imagens admin | react-dropzone + endpoint existente |
| Prioridade | Admin de shopping tem mais ROI imediato (Shopping é uma das abas principais) |
