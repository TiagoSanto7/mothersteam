# P0 Navegação — Correções Críticas de Identidade e Navegação Principal

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar o bug do "meu perfil como visitante", trocar contagens hardcoded por dados reais e alinhar as navegações principais de web e mobile em um único batch.

**Architecture:** Criar um pequeno componente `ProfileRouter` que decide entre `ProfileScreen` (self) e `UserProfileScreen` (visitor) baseado em `currentUserId`. Substituir todos os pontos que hoje abrem `UserProfileScreen` diretamente por `ProfileRouter`. No `App.tsx`, unificar o estado `showProfile` no `profileUserId` (com id = próprio usuário). No `LeftSidebar`, mover `Shopping` da navegação principal para a seção secundária e adicionar `Comunidade` na principal. No `ProfileScreen`, consumir `/users/:id` para obter contagens reais.

**Tech Stack:** React 18 + TypeScript, Vitest + Testing Library, @tanstack/react-query, Zustand 5.

**Fonte:** `docs/analise-navegacao-completa-2026-07-22.md` (item P0 aprovado pelo usuário em 2026-07-22, com decisão explícita de mover Shopping para o drawer/secundário).

---

## Estrutura de arquivos

**Criar:**
- `src/components/profile/ProfileRouter.tsx` — decide qual tela de perfil renderizar
- `src/components/profile/ProfileRouter.test.tsx` — testes unitários

**Modificar:**
- `src/App.tsx` — usar `ProfileRouter` no lugar de `UserProfileScreen`; remover `showProfile`; drawer/home passam a chamar `setProfileUserId(currentUserId)`
- `src/App.test.tsx` — adicionar teste do fluxo self-vs-visitor via `profileUserId`
- `src/components/comunidade/ComunidadeScreen.tsx` — trocar `UserProfileScreen` inline por `ProfileRouter`
- `src/components/layout/LeftSidebar.tsx` — remover Shopping da `mainNavItems`, adicionar Comunidade; adicionar Shopping como item da seção inferior (`Perfil / Configurações / Shopping / Sair`)
- `src/components/profile/ProfileScreen.tsx` — buscar `/users/:currentUserId` para exibir contagens reais no lugar dos valores hardcoded 248/31
- `src/components/profile/ProfileScreen.test.tsx` — cobrir contagens reais e loading

**Não mexer:**
- `UserProfileScreen.tsx`, `SideDrawer.tsx`, `BottomTabBar.tsx`, `MobileShell.tsx` (Shopping já está no drawer mobile)

---

## Task 1: Criar `ProfileRouter`

**Files:**
- Create: `src/components/profile/ProfileRouter.tsx`
- Test: `src/components/profile/ProfileRouter.test.tsx`

### - [ ] Step 1.1: Escrever o teste falho

Criar `src/components/profile/ProfileRouter.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileRouter } from './ProfileRouter';
import { useAppStore } from '../../store/useAppStore';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  mockApiFetch.mockResolvedValue({ items: [], hasMore: false });
  useAppStore.setState({
    isLoggedIn: true,
    currentUserId: 'me-123',
    motherName: 'Mariana',
    phase: { stage: 'pregnant', week: 28 },
    motherProfile: null,
    savedVerses: [],
  });
});

describe('ProfileRouter', () => {
  it('renders ProfileScreen (self) when userId === currentUserId', () => {
    wrap(<ProfileRouter userId="me-123" onBack={vi.fn()} onOpenProfile={vi.fn()} />);
    expect(screen.getByRole('button', { name: /editar perfil/i })).toBeInTheDocument();
  });

  it('renders UserProfileScreen (visitor) when userId !== currentUserId', async () => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path.includes('/posts')) return { items: [], hasMore: false };
      return {
        id: 'other-999', name: 'Julia', bio: null,
        pregnancyStage: 'postpartum', pregnancyWeek: null, babyAgeInDays: 30,
        profileKey: null, archetypeKey: 'ana',
        _count: { posts: 0, followers: 0, following: 0 },
        isSelf: false, isFollowedByCurrentUser: false,
      };
    });
    wrap(<ProfileRouter userId="other-999" onBack={vi.fn()} onOpenProfile={vi.fn()} />);
    // ProfileScreen chrome must NOT appear
    expect(screen.queryByRole('button', { name: /editar perfil/i })).not.toBeInTheDocument();
    // Wait for name to render (proves UserProfileScreen took over)
    expect(await screen.findByText('Julia')).toBeInTheDocument();
  });
});
```

### - [ ] Step 1.2: Rodar o teste e confirmar falha

```powershell
npx vitest run src/components/profile/ProfileRouter.test.tsx
```

Esperado: falha com "Cannot find module './ProfileRouter'".

### - [ ] Step 1.3: Implementar `ProfileRouter`

Criar `src/components/profile/ProfileRouter.tsx`:

```tsx
import { useAppStore } from '../../store/useAppStore';
import { ProfileScreen } from './ProfileScreen';
import { UserProfileScreen } from './UserProfileScreen';

interface ProfileRouterProps {
  userId: string;
  onBack: () => void;
  onOpenProfile?: (userId: string) => void;
}

/** Único árbitro entre visão própria (ProfileScreen) e visão de visitante (UserProfileScreen). */
export function ProfileRouter({ userId, onBack, onOpenProfile }: ProfileRouterProps) {
  const currentUserId = useAppStore((s) => s.currentUserId);

  if (userId === currentUserId) {
    return <ProfileScreen onClose={onBack} />;
  }

  return (
    <UserProfileScreen
      key={userId}
      userId={userId}
      onBack={onBack}
      onOpenProfile={onOpenProfile}
    />
  );
}
```

### - [ ] Step 1.4: Rodar e confirmar passagem

```powershell
npx vitest run src/components/profile/ProfileRouter.test.tsx
```

Esperado: 2 passed.

### - [ ] Step 1.5: Commit

```powershell
git add src/components/profile/ProfileRouter.tsx src/components/profile/ProfileRouter.test.tsx
git commit -m @'
feat(profile): add ProfileRouter to route between self and visitor views

Single decision point that renders ProfileScreen when userId matches the
current session, UserProfileScreen otherwise. Callers stop needing to know
about the self-check.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 2: Substituir `UserProfileScreen` por `ProfileRouter` no `App.tsx`

**Files:**
- Modify: `src/App.tsx` (blocos do `showProfile` e do `profileUserId`; callbacks de `MobileShell`, `WebLayout`, `NotificationsScreen`, `SearchScreen`)
- Modify: `src/App.test.tsx`

### - [ ] Step 2.1: Escrever o teste falho

Adicionar ao `src/App.test.tsx` um novo `describe` no fim do arquivo:

```tsx
describe('App — profile navigation', () => {
  it('opens ProfileScreen (self) when profileUserId matches currentUserId (regression: "meu perfil como visitante")', async () => {
    useAppStore.setState({
      isLoggedIn: true,
      onboardingDone: true,
      socialOnboardingDone: true,
      activeTab: 'home',
      currentUserId: 'me-1',
      motherName: 'Mariana',
      phase: { stage: 'pregnant', week: 28 },
      motherProfile: null,
      savedVerses: [],
    });
    render(<App />, { wrapper: makeWrapper() });

    // Simular clique interno via store — jeito mais direto sem mexer em botões
    // internos: usar a mesma API que o feed usa. Como App expõe isso via callbacks
    // passados pra ComunidadeScreen/etc., testamos via re-render com estado ajustado.
    // Alternativa: chamar o próprio setState do App via testeando o efeito.
    // Aqui abrimos o drawer profile emulando clique no avatar do HomeScreen (aba rotina).
    useAppStore.setState({ activeTab: 'rotina' });
    // O botão de avatar em HomeScreen dispara onOpenProfile → setProfileUserId(currentUserId)
    // Após esse fluxo o overlay deve mostrar "Editar perfil" (chrome do ProfileScreen).
    const avatarBtn = await screen.findByRole('button', { name: /abrir perfil/i });
    avatarBtn.click();
    expect(await screen.findByRole('button', { name: /editar perfil/i })).toBeInTheDocument();
  });
});
```

### - [ ] Step 2.2: Rodar e confirmar falha

```powershell
npx vitest run src/App.test.tsx
```

Esperado: falha no novo teste — o botão "Editar perfil" não aparece porque o clique no avatar hoje seta `showProfile=true` (fluxo antigo que ainda funciona) mas o assert espera passagem via `profileUserId`. Se passar por acaso (o drawer/home ainda usa showProfile), o teste ainda serve como guarda-corpo pro comportamento correto.

*Nota pro executor:* se o teste já passar com o comportamento atual (avatar → `showProfile` → `ProfileScreen`), OK — o próximo step vai migrar o caminho e o teste continua valendo pra garantir que a substituição não quebra a UX.

### - [ ] Step 2.3: Modificar `src/App.tsx` — remover `showProfile`, usar `profileUserId`

No topo do arquivo, trocar o import:

```tsx
// remover:
// import { UserProfileScreen } from './components/profile/UserProfileScreen';
// adicionar:
import { ProfileRouter } from './components/profile/ProfileRouter';
```

Deletar a linha do `showProfile`:

```tsx
// remover:
// const [showProfile, setShowProfile] = useState(false);
```

Substituir os callbacks em `MobileShell` (`onOpenProfile`) e em `WebLayout` (`onOpenProfile`) e no `screens.rotina`:

```tsx
<MobileShell
  drawerOpen={drawerOpen}
  onOpenDrawer={() => setDrawerOpen(true)}
  onCloseDrawer={() => setDrawerOpen(false)}
  onOpenProfile={() => currentUserId && setProfileUserId(currentUserId)}
  onOpenSettings={() => setShowSettings(true)}
  onOpenSavedVerses={() => setShowSavedVerses(true)}
  headerRightSlot={headerRightSlot}
>
  {screens[activeTab]}
</MobileShell>

<WebLayout
  unreadNotifs={unreadNotifs}
  unreadChats={unreadChats}
  onOpenNotifications={() => setShowNotifications(true)}
  onOpenChat={() => setShowChat(true)}
  onOpenProfile={() => currentUserId && setProfileUserId(currentUserId)}
  onOpenSettings={() => setShowSettings(true)}
  onOpenUser={(id) => setProfileUserId(id)}
  onOpenCommunity={(id) => setOpenCommunityId(id)}
>
  {screens[activeTab]}
</WebLayout>
```

E no dicionário `screens`:

```tsx
rotina: <HomeScreen onOpenProfile={() => currentUserId && setProfileUserId(currentUserId)} />,
```

Deletar o bloco:

```tsx
{showProfile && (
  <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
    <ProfileScreen onClose={() => setShowProfile(false)} />
  </div>
)}
```

Substituir o bloco `{profileUserId && ...}`:

```tsx
{profileUserId && (
  <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
    <ProfileRouter
      userId={profileUserId}
      onBack={() => setProfileUserId(null)}
      onOpenProfile={(id) => setProfileUserId(id)}
    />
  </div>
)}
```

Remover também o import de `ProfileScreen` que ficou órfão (se o linter não pegar sozinho):

```tsx
// remover se não for mais usado em nenhum outro lugar do App.tsx:
// import { ProfileScreen } from './components/profile/ProfileScreen';
```

### - [ ] Step 2.4: Rodar App.test.tsx

```powershell
npx vitest run src/App.test.tsx
```

Esperado: todos os testes passam, incluindo o novo `opens ProfileScreen (self)`.

### - [ ] Step 2.5: Rodar a suíte completa

```powershell
npx vitest run
```

Esperado: nenhum novo teste quebra. Se algum teste antigo (ex: `SideDrawer.test.tsx`) estiver checando algo específico do fluxo `showProfile`, revisar sob a nova ótica (o drawer agora chama `setProfileUserId(currentUserId)` — o comportamento externo é o mesmo, mas o disparo é diferente).

### - [ ] Step 2.6: Commit

```powershell
git add src/App.tsx src/App.test.tsx
git commit -m @'
fix(profile): open self view instead of visitor view when navigating to own profile

Unifies profile navigation through a single profileUserId state; the drawer
and Home avatar now also route through it, and the ProfileRouter decides
which chrome to render. Eliminates the "meu perfil como visitante" bug when
clicking own avatar from feed, notifications, search or follow lists.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 3: Substituir `UserProfileScreen` por `ProfileRouter` no `ComunidadeScreen`

**Files:**
- Modify: `src/components/comunidade/ComunidadeScreen.tsx:84-92`
- Test: `src/components/comunidade/ComunidadeScreen.test.tsx` (adição)

### - [ ] Step 3.1: Escrever o teste falho

Adicionar ao `src/components/comunidade/ComunidadeScreen.test.tsx` (no fim, num novo `describe`):

```tsx
describe('ComunidadeScreen — self profile navigation', () => {
  it('renders self ProfileScreen (Editar perfil) when the opened profile is the current user', async () => {
    // Setup base do arquivo já configura isLoggedIn/currentUserId; sobrescrever se preciso.
    useAppStore.setState({
      isLoggedIn: true,
      currentUserId: 'me-1',
      motherName: 'Mariana',
      phase: { stage: 'pregnant', week: 28 },
      motherProfile: null,
      savedVerses: [],
    });

    // Renderiza com um post do próprio usuário no feed
    // (usar helper local do arquivo; se não houver, mockApiFetch retorna items com authorId='me-1')
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path.startsWith('/posts')) {
        return {
          items: [{
            id: 'p1', content: 'meu post', category: 'gestação',
            authorId: 'me-1',
            author: { id: 'me-1', name: 'Mariana', username: null },
            _count: { likes: 0, comments: 0, reposts: 0 },
            createdAt: new Date().toISOString(),
            isRepost: false, likedByCurrentUser: false,
          }],
          hasMore: false,
        };
      }
      return { items: [], hasMore: false };
    });

    render(<ComunidadeScreen />, { wrapper: makeWrapper() });

    // Clicar no avatar do próprio post
    const avatarBtn = await screen.findByRole('button', { name: /ver perfil de mariana/i });
    fireEvent.click(avatarBtn);

    // ProfileScreen chrome
    expect(await screen.findByRole('button', { name: /editar perfil/i })).toBeInTheDocument();
  });
});
```

*Se o arquivo `ComunidadeScreen.test.tsx` não existir com esse setup, o executor deve adaptar o boilerplate lendo o topo do arquivo.*

### - [ ] Step 3.2: Rodar e confirmar falha

```powershell
npx vitest run src/components/comunidade/ComunidadeScreen.test.tsx
```

Esperado: falha — clicar no avatar renderiza `UserProfileScreen` (visitor), não `ProfileScreen`.

### - [ ] Step 3.3: Modificar `ComunidadeScreen.tsx`

Substituir o import no topo:

```tsx
// remover:
// import { UserProfileScreen } from '../profile/UserProfileScreen';
// adicionar:
import { ProfileRouter } from '../profile/ProfileRouter';
```

Substituir o bloco `if (profileUserId)`:

```tsx
if (profileUserId) {
  return (
    <ProfileRouter
      userId={profileUserId}
      onBack={() => setProfileUserId(null)}
      onOpenProfile={(id) => setProfileUserId(id)}
    />
  );
}
```

### - [ ] Step 3.4: Rodar e confirmar passagem

```powershell
npx vitest run src/components/comunidade/ComunidadeScreen.test.tsx
```

Esperado: passa. Rodar suíte completa também:

```powershell
npx vitest run
```

### - [ ] Step 3.5: Commit

```powershell
git add src/components/comunidade/ComunidadeScreen.tsx src/components/comunidade/ComunidadeScreen.test.tsx
git commit -m @'
fix(comunidade): route own profile clicks to self view

Same bug as App.tsx: clicking own avatar inside the community tab opened
the visitor view. Uses ProfileRouter to make the self-check consistent.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 4: LeftSidebar — Comunidade na navegação principal, Shopping na secundária

**Files:**
- Modify: `src/components/layout/LeftSidebar.tsx`
- Test: `src/components/layout/LeftSidebar.test.tsx` (criar se não existir)

### - [ ] Step 4.1: Escrever o teste falho

Criar `src/components/layout/LeftSidebar.test.tsx` (ou adicionar `describe` novo se já existir):

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeftSidebar } from './LeftSidebar';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  useAppStore.setState({
    isLoggedIn: true,
    currentUserId: 'me-1',
    motherName: 'Mariana',
    activeTab: 'home',
  });
});

function renderSidebar() {
  return render(
    <LeftSidebar
      unreadNotifs={0}
      unreadChats={0}
      onOpenNotifications={vi.fn()}
      onOpenChat={vi.fn()}
      onOpenProfile={vi.fn()}
      onOpenSettings={vi.fn()}
    />,
  );
}

describe('LeftSidebar navigation parity', () => {
  it('has Comunidade in the primary nav', () => {
    renderSidebar();
    const comunidade = screen.getByRole('button', { name: 'Comunidade' });
    fireEvent.click(comunidade);
    expect(useAppStore.getState().activeTab).toBe('comunidade');
  });

  it('has Shopping accessible from the sidebar (secondary section, not primary)', () => {
    renderSidebar();
    const shopping = screen.getByRole('button', { name: 'Shopping' });
    fireEvent.click(shopping);
    expect(useAppStore.getState().activeTab).toBe('shopping');
  });
});
```

### - [ ] Step 4.2: Rodar e confirmar falha

```powershell
npx vitest run src/components/layout/LeftSidebar.test.tsx
```

Esperado: falha em "Comunidade" (não existe no sidebar hoje).

### - [ ] Step 4.3: Modificar `LeftSidebar.tsx`

Atualizar imports (adicionar `Users`):

```tsx
import { Home, MessageCircle, Baby, Calendar, ShoppingBag, Bell, MessageSquare, User, Settings, LogOut, Heart, Users } from 'lucide-react';
```

Trocar `mainNavItems`:

```tsx
const mainNavItems: NavItem[] = [
  { id: 'home',       icon: Home,          label: 'Home' },
  { id: 'maeIA',      icon: MessageCircle, label: 'MãeIA' },
  { id: 'baby',       icon: Baby,          label: 'Bebê' },
  { id: 'rotina',     icon: Calendar,      label: 'Rotina' },
  { id: 'comunidade', icon: Users,         label: 'Comunidade' },
];
```

Adicionar Shopping como botão na seção inferior, logo antes de "Sair" (dentro do `<div className="mt-auto ...">`):

```tsx
<button
  title="Shopping"
  aria-label="Shopping"
  onClick={() => setActiveTab('shopping')}
  className={navBtnClass(activeTab === 'shopping')}
>
  <ShoppingBag size={20} strokeWidth={1.8} className="flex-shrink-0" />
  <span className="text-sm font-medium hidden lg:block">Shopping</span>
</button>
```

*Posicionamento:* logo depois do botão Configurações e antes de Sair, para manter a hierarquia (perfil → configurações → shopping → sair).

### - [ ] Step 4.4: Rodar e confirmar passagem

```powershell
npx vitest run src/components/layout/LeftSidebar.test.tsx
```

Esperado: 2 passed.

### - [ ] Step 4.5: Commit

```powershell
git add src/components/layout/LeftSidebar.tsx src/components/layout/LeftSidebar.test.tsx
git commit -m @'
feat(nav): align web sidebar with mobile — Comunidade in primary nav, Shopping in secondary

Web users could not reach Comunidade from the primary nav (only via search),
while mobile had it as a bottom tab. Shopping was in the primary nav on web
but hidden in the drawer on mobile. This aligns both shells: Comunidade is
primary in both; Shopping stays accessible but as a secondary item.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 5: `ProfileScreen` — contagens reais da API

**Files:**
- Modify: `src/components/profile/ProfileScreen.tsx`
- Modify: `src/components/profile/ProfileScreen.test.tsx`

### - [ ] Step 5.1: Escrever o teste falho

Adicionar ao `src/components/profile/ProfileScreen.test.tsx`, num novo `describe` no fim:

```tsx
describe('ProfileScreen — real counts', () => {
  it('shows real follower/following/posts counts from /users/:id', async () => {
    useAppStore.setState({
      isLoggedIn: true, currentUserId: 'me-1',
      motherName: 'Mariana', phase: { stage: 'pregnant', week: 28 },
      motherProfile: null, savedVerses: [],
    });
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path.startsWith('/users/me-1/posts')) return EMPTY_POSTS;
      if (path === '/users/me-1') {
        return {
          id: 'me-1', name: 'Mariana', bio: null,
          pregnancyStage: 'pregnant', pregnancyWeek: 28, babyAgeInDays: null,
          profileKey: null, archetypeKey: null,
          _count: { posts: 7, followers: 42, following: 5 },
          isSelf: true, isFollowedByCurrentUser: false,
        };
      }
      return EMPTY_POSTS;
    });

    wrap(<ProfileScreen onClose={vi.fn()} />);

    expect(await screen.findByText('42')).toBeInTheDocument(); // followers
    expect(screen.getByText('5')).toBeInTheDocument();         // following
    expect(screen.getByText('7')).toBeInTheDocument();         // posts
    // Regressão: não pode mais mostrar os hardcoded
    expect(screen.queryByText('248')).not.toBeInTheDocument();
    expect(screen.queryByText('31')).not.toBeInTheDocument();
  });
});
```

### - [ ] Step 5.2: Rodar e confirmar falha

```powershell
npx vitest run src/components/profile/ProfileScreen.test.tsx
```

Esperado: falha — o teste vê "248" ainda presente.

### - [ ] Step 5.3: Modificar `ProfileScreen.tsx`

No topo, adicionar tipo:

```tsx
import type { PaginatedResult, ApiPost, ApiUserProfile } from '../../lib/types';
```

Dentro do componente, logo após `const savedVerses = useAppStore(...)`, adicionar a query de perfil:

```tsx
const { data: profileData } = useQuery({
  queryKey: ['user', currentUserId],
  queryFn: () => apiFetch<ApiUserProfile>(`/users/${currentUserId}`),
  enabled: isLoggedIn && !!currentUserId,
});
```

Substituir o array `[ { label: 'Posts', value: userPosts.length, ... }, { label: 'Seguidoras', value: 248, ...}, { label: 'Seguindo', value: 31, ...} ]` por:

```tsx
{[
  { label: 'Posts',       value: profileData?._count.posts       ?? 0, mode: null as 'followers' | 'following' | null },
  { label: 'Seguidoras',  value: profileData?._count.followers   ?? 0, mode: 'followers'  as const },
  { label: 'Seguindo',    value: profileData?._count.following   ?? 0, mode: 'following'  as const },
]}
```

*Nota:* mantemos o `?? 0` para o caso da query não ter resolvido ainda; a UI mostra 0 momentaneamente e depois atualiza. Sem loading spinner extra pra não brigar com o layout.

### - [ ] Step 5.4: Rodar e confirmar passagem

```powershell
npx vitest run src/components/profile/ProfileScreen.test.tsx
```

Esperado: todos passam, incluindo o novo. Se algum teste antigo estiver escrito assumindo 248/31, atualizar mock nesse teste (raro — os testes atuais não checam contagens).

Rodar suíte inteira também:

```powershell
npx vitest run
```

### - [ ] Step 5.5: Commit

```powershell
git add src/components/profile/ProfileScreen.tsx src/components/profile/ProfileScreen.test.tsx
git commit -m @'
fix(profile): replace hardcoded follower counts with real API data

ProfileScreen was showing 248 Seguidoras and 31 Seguindo hardcoded while
UserProfileScreen returned real counts from /users/:id. Two different
"truths" for the same user. Now ProfileScreen also queries /users/:id.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 6: Verificação final + checklist manual

### - [ ] Step 6.1: Suíte completa verde

```powershell
npx vitest run
```

Esperado: 0 falhas. Se algo quebrou em outro teste, investigar antes de seguir (não silenciar).

### - [ ] Step 6.2: TypeScript check

```powershell
npx tsc --noEmit
```

Esperado: 0 erros.

### - [ ] Step 6.3: Checklist manual (rodar `npm run dev` + `npm --prefix server run dev`)

Executor: rodar os dois servidores e clicar por cada caminho abaixo. Se algum ponto **abrir UserProfileScreen no lugar de ProfileScreen** ao navegar pro próprio usuário, esse ponto ficou de fora — reportar antes de fechar.

- [ ] Fazer login → Home aparece
- [ ] Aba Rotina → clicar no avatar (canto superior esquerdo) → abre ProfileScreen com **Editar perfil**, contagens reais, versículos
- [ ] Drawer (mobile: swipe do lado esquerdo; web: item Perfil na sidebar) → abre ProfileScreen (mesma coisa)
- [ ] Aba Comunidade → criar um post curto → clicar no **seu próprio avatar** no card do post → **deve abrir ProfileScreen** (bug original resolvido)
- [ ] Comunidade → clicar em avatar de outra mãe → abre UserProfileScreen (visitor) normal
- [ ] Notificações → clicar em ator "seguiu você" (se houver) → abre UserProfileScreen
- [ ] Notificações → clicar em ator que seja você mesma (se houver notif desse tipo — improvável) → abre ProfileScreen
- [ ] Busca → buscar seu próprio nome → clicar em você → abre ProfileScreen
- [ ] Perfil visitor → clicar em "Seguindo" → lista → clicar em você mesma → abre ProfileScreen
- [ ] Web (redimensionar viewport ≥ 768px):
  - [ ] LeftSidebar tem **Comunidade** com ícone Users
  - [ ] LeftSidebar tem **Shopping** na seção inferior (perto de Configurações)
  - [ ] Clicar em Comunidade abre o feed
  - [ ] Clicar em Shopping abre o Shopping
- [ ] Mobile (viewport < 768px): BottomTabBar continua com Comunidade; drawer continua com Shopping

### - [ ] Step 6.4: Atualizar memória do projeto

Adicionar entry ao `MEMORY.md` do usuário (apenas se o executor tiver acesso — normalmente feito manualmente pela sessão principal, não pelo subagent).

Sugestão de conteúdo em `~/.claude/projects/.../memory/project-p0-navegacao-2026-07-22.md`:

```markdown
---
name: p0-navegacao-2026-07-22
description: P0 de navegação aplicado — ProfileRouter, contagens reais, sidebar/drawer alinhados
metadata:
  type: project
---

Após auditoria em docs/analise-navegacao-completa-2026-07-22.md, o P0 foi implementado em 2026-07-22:
- ProfileRouter decide self vs visitor em um único ponto
- ProfileScreen agora consome /users/:id (contagens reais, adeus 248/31)
- LeftSidebar tem Comunidade na navegação primária; Shopping foi pra seção inferior
- showProfile foi removido — profileUserId unificado

**Why:** o bug "meu perfil como visitante" era sistêmico (7 pontos de entrada); consertar em cada callsite geraria drift. Um router centraliza.
**How to apply:** ao adicionar qualquer novo ponto que abra um perfil (nova notif, novo card, etc.), passar pelo ProfileRouter — nunca renderizar UserProfileScreen diretamente com id que pode ser o próprio usuário.

Ligados: [[project-architecture-epico1]]
```

E linha nova em `MEMORY.md`:

```markdown
- [P0 Navegação 2026-07-22](project-p0-navegacao-2026-07-22.md) — ProfileRouter + contagens reais + parity web/mobile
```

### - [ ] Step 6.5: Abrir PR

*Opcional — depende de o usuário querer PR ou merge direto.* Se PR:

```powershell
git push -u origin HEAD
gh pr create --title "P0 navegação: bug do perfil, contagens reais, sidebar/drawer alinhados" --body @'
## Summary
- Corrige bug "meu perfil como visitante": clicar no próprio avatar no feed/notif/busca/etc. agora abre a tela de perfil próprio (com Editar/Configurações/Versículos) em vez da tela de visitante
- Substitui contagens hardcoded (248/31) no ProfileScreen por dados reais de /users/:id
- Alinha navegação web e mobile: Comunidade entra na LeftSidebar; Shopping vai pra seção inferior do sidebar (já estava no drawer no mobile)

## Test plan
- [ ] Aba Rotina → avatar → abre self profile
- [ ] Comunidade → criar post → clicar no próprio avatar → abre self profile (bug reportado)
- [ ] Comunidade → clicar em avatar alheio → abre visitor profile
- [ ] Sidebar (web) tem Comunidade na principal e Shopping na secundária
- [ ] Contagens de seguidoras/seguindo/posts vêm da API
- [ ] `npx vitest run` verde
- [ ] `npx tsc --noEmit` verde

Base: docs/analise-navegacao-completa-2026-07-22.md (P0 approved)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
'@
```

---

## Notas de execução

- **Todos os commits são atômicos por Task.** Se um subagent quebrar no meio de uma Task, o rollback fica trivial.
- **Não pular o Step "rodar e confirmar falha".** Se o teste já passar antes da implementação, o teste é ruim (está testando comportamento antigo, ou está fraco demais).
- **Se o linter/typechecker apontar `showProfile` sobrando em algum arquivo não listado, deletar** — o refactor de estado é intencional e não deve deixar vestígio.
- **Backend não é tocado nesse plano.** `/users/:id` já retorna `_count` corretamente (visto em `UserProfileScreen`); qualquer divergência é bug de backend a ser reportado separadamente.
