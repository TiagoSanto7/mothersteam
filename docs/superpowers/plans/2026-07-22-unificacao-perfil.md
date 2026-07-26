# Unificação Profunda dos Perfis — ProfileScreen Único

> **For agentic workers:** Use superpowers:subagent-driven-development. Steps use `- [ ]` for tracking.

**Goal:** Fundir `ProfileScreen` (self) e `UserProfileScreen` (visitor) em uma única tela que responde a `isSelf` do backend. `ProfileRouter` fica obsoleto e é removido.

**Architecture:** Nova `ProfileScreen({ userId, onClose, onOpenProfile? })` que consome `/users/:userId` via useQuery. Detecta `isSelf` pelo campo do próprio payload (backend é fonte de verdade). Renderiza chrome self (Editar perfil, Configurações, Versículos, header com ícone de settings) OU chrome visitor (Seguir/Seguindo) baseado em `profile.isSelf`. Avatar usa `profile.archetypeKey` mapeado para cor via `ARCHETYPES[key].color` (consistente pra qualquer usuário — não só self). Bio usa `profile.bio ?? archetype.phrases[1] ?? fallback padrão`. `UserProfileScreen` e `ProfileRouter` deletados. Todos os call-sites passam a instanciar `ProfileScreen` diretamente com o `userId`.

**Tech Stack:** React 18 + TypeScript, Vitest + Testing Library, @tanstack/react-query, Zustand 5.

**Fonte:** `docs/analise-navegacao-completa-2026-07-22.md` §5 e §7 item 2 (P0). Complemento ao P0 já mergido em `feat/p0-navegacao`.

---

## Estrutura de arquivos

**Modificar (refactor grande):**
- `src/components/profile/ProfileScreen.tsx` — nova assinatura + lógica unificada
- `src/components/profile/ProfileScreen.test.tsx` — cobre self, visitor, transições
- `src/App.tsx` — trocar `ProfileRouter` por `ProfileScreen` (passar `userId={profileUserId}`)
- `src/App.test.tsx` — ajustar assertion se necessário
- `src/components/comunidade/ComunidadeScreen.tsx` — mesma troca

**Deletar:**
- `src/components/profile/UserProfileScreen.tsx`
- `src/components/profile/UserProfileScreen.test.tsx`
- `src/components/profile/ProfileRouter.tsx`
- `src/components/profile/ProfileRouter.test.tsx`

**Absorver do UserProfileScreen (não perder cobertura):**
- Follow/unfollow (mutation + estado otimista)
- Follow lists (Seguidoras/Seguindo)
- Post detail inline
- Loading state
- Real name/bio/counts from API

---

## Contrato da nova ProfileScreen

```tsx
interface ProfileScreenProps {
  userId: string;              // qual perfil abrir
  onClose: () => void;         // voltar
  onOpenProfile?: (id: string) => void;  // navegar pra outro perfil (usado em FollowList, comentaristas etc.)
}
```

**Comportamento:**

1. Fetches `/users/:userId` → `ApiUserProfile`.
2. Fetches `/users/:userId/posts` (paginado, infinite scroll — igual UserProfileScreen atual).
3. Enquanto `profile === undefined`: spinner (como UserProfileScreen).
4. Uma vez carregado, decide chrome pelo `profile.isSelf`:

**Chrome comum (sempre):**
- Header: back button à esquerda, nome centralizado
- Bloco de identidade: avatar (arquétipo color quando disponível) + posts/followers/following counts (do `_count`)
- Bio abaixo: `profile.bio ?? ARCHETYPES[profile.archetypeKey]?.phrases[1] ?? 'Maternidade com presença e intenção.'`
- Divider
- Feed de posts (infinite scroll)

**Chrome self (`profile.isSelf === true`):**
- Header: settings icon à direita (abre `SettingsScreen`)
- Bloco de ações: botão "Editar perfil" (abre `EditProfileScreen`)
- Row abaixo das ações: "📖 Versículos salvos" (só se `savedVerses.length > 0`, abre `SavedVersesScreen`)
- FollowList (Seguidoras/Seguindo): abre normalmente; `onOpenUser` NÃO aparece recursivamente pra evitar loop na versão self (mantém a limitação atual do ProfileScreen)

**Chrome visitor (`profile.isSelf === false`):**
- Header: sem settings icon (space vazio pra centralizar)
- Bloco de ações: botão "Seguir" / "Seguindo" com toggle otimista (copiar da mutation existente do UserProfileScreen)
- Sem versículos, sem Editar
- FollowList: `onOpenUser` é `onOpenProfile` (encaminha)

**Avatar color (nova função central):**
- Adicionar em `src/utils/onboardingScoring.ts` ou novo `src/utils/avatar.ts`:
  ```ts
  export function getAvatarColor(archetypeKey: string | null | undefined): string {
    if (archetypeKey && ARCHETYPES[archetypeKey]) return ARCHETYPES[archetypeKey].color;
    return '#C97E5A'; // fallback = sara-terracotta hex
  }
  ```
- Usada pela ProfileScreen em ambos os casos. Task C aplicará em todo o app (fora do escopo deste plano).

---

## Task 1: Reescrever ProfileScreen

**Files:**
- Modify: `src/components/profile/ProfileScreen.tsx`
- Modify: `src/components/profile/ProfileScreen.test.tsx`

### - [ ] Step 1.1: Rescrever `ProfileScreen.tsx`

Substituir o conteúdo atual pelo componente unificado. Manter todos os sub-modos que hoje existem (showSettings, showEdit, selectedPost, followList, showSavedVerses) — a estrutura de "sub-screen dentro do próprio" continua igual, só que agora também suporta o caminho visitor.

Assinatura da função:
```tsx
export function ProfileScreen({ userId, onClose, onOpenProfile }: ProfileScreenProps) {
```

Adicionar useQuery pra `/users/:userId` (equivalente ao do UserProfileScreen). Manter useQuery pra posts, mas usar `/users/${userId}/posts` (não `/users/${currentUserId}/posts`) — assim serve pra visitor também. Se `userId === currentUserId`, resolve pro mesmo endpoint que hoje.

Adicionar useMutation pra follow/unfollow (copiar do UserProfileScreen, adaptando queryKey pra `['user', userId]`).

Renderizar chrome condicional conforme regras acima.

O botão "Seguidoras"/"Seguindo" no bloco de counts continua abrindo `FollowListScreen` — mesma UX que hoje UserProfileScreen tem.

Manter `ARCHETYPES[motherProfile.archetypeKey]` como fonte pra avatarColor no caso self (pra manter as cores atuais). Pro visitor, usar `ARCHETYPES[profile.archetypeKey]` se disponível, senão `sara-terracotta` fallback.

### - [ ] Step 1.2: Reescrever `ProfileScreen.test.tsx`

Cobrir:
- Self: renderiza Editar perfil, Settings icon, Versículos (quando savedVerses > 0), NÃO renderiza Seguir
- Visitor: renderiza Seguir, NÃO renderiza Editar/Settings/Versículos
- Regressão contagens (do teste antigo): 42 followers, 5 following, 7 posts vindos da API
- Regressão "não é visitor" (novo): quando isSelf=true, mesmo sendo userId diferente do currentUserId, mostra Editar (backend é fonte de verdade)
- Regressão "não é self" (novo): quando isSelf=false, mesmo sendo userId igual ao currentUserId, mostra Seguir (edge case, mas robusto)

Manter uso de `wrap`, `mockApiFetch`, `EMPTY_POSTS`.

### - [ ] Step 1.3: Rodar

```powershell
npx vitest run src/components/profile/ProfileScreen.test.tsx
```

Todos passam.

### - [ ] Step 1.4: Commit

```powershell
git add src/components/profile/ProfileScreen.tsx src/components/profile/ProfileScreen.test.tsx
git commit -m "refactor(profile): unify ProfileScreen for self and visitor via isSelf" -m "Merges the two profile screens: same chrome for shared parts (avatar, counts, bio, posts feed) and conditional chrome (Editar/Settings/Versiculos vs Seguir) based on profile.isSelf from the API. Backend is the source of truth for who-is-who." -m "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Atualizar call-sites (App.tsx, ComunidadeScreen)

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/comunidade/ComunidadeScreen.tsx`

### - [ ] Step 2.1: `src/App.tsx`

Substituir:
```tsx
import { ProfileRouter } from './components/profile/ProfileRouter';
```
por:
```tsx
import { ProfileScreen } from './components/profile/ProfileScreen';
```

Substituir o bloco:
```tsx
<ProfileRouter
  userId={profileUserId}
  onBack={() => setProfileUserId(null)}
  onOpenProfile={(id) => setProfileUserId(id)}
/>
```
por:
```tsx
<ProfileScreen
  userId={profileUserId}
  onClose={() => setProfileUserId(null)}
  onOpenProfile={(id) => setProfileUserId(id)}
/>
```

### - [ ] Step 2.2: `src/components/comunidade/ComunidadeScreen.tsx`

Substituir import e uso — mesma transformação.

### - [ ] Step 2.3: Rodar

```powershell
npx vitest run src/App.test.tsx src/components/comunidade/ComunidadeScreen.test.tsx
```

Deve continuar passando. Se algum teste quebrar por causa da nova API (prop `onClose` vs `onBack`), atualize.

### - [ ] Step 2.4: Commit

```powershell
git add src/App.tsx src/components/comunidade/ComunidadeScreen.tsx
git commit -m "refactor(app): use unified ProfileScreen instead of ProfileRouter" -m "App.tsx and ComunidadeScreen now instantiate ProfileScreen directly. ProfileRouter will be deleted in the next commit." -m "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Deletar arquivos obsoletos

**Files to delete:**
- `src/components/profile/UserProfileScreen.tsx`
- `src/components/profile/UserProfileScreen.test.tsx`
- `src/components/profile/ProfileRouter.tsx`
- `src/components/profile/ProfileRouter.test.tsx`

### - [ ] Step 3.1: Grep pra confirmar zero referências

```powershell
# Deve retornar 0 hits em src/:
Use Grep tool with pattern="UserProfileScreen" path="src"
Use Grep tool with pattern="ProfileRouter" path="src"
```

Se algum aparecer, resolver ANTES de deletar.

### - [ ] Step 3.2: Deletar

```powershell
git rm src/components/profile/UserProfileScreen.tsx
git rm src/components/profile/UserProfileScreen.test.tsx
git rm src/components/profile/ProfileRouter.tsx
git rm src/components/profile/ProfileRouter.test.tsx
```

### - [ ] Step 3.3: Rodar suíte inteira pra pegar qualquer regressão

```powershell
npx vitest run
```

Deve manter o mesmo baseline (337-ish passando).

### - [ ] Step 3.4: TypeScript check

```powershell
npx tsc --noEmit
```

Não pode introduzir novos erros.

### - [ ] Step 3.5: Commit

```powershell
git commit -m "chore(profile): remove UserProfileScreen and ProfileRouter after unification" -m "Both replaced by the single ProfileScreen that handles self vs visitor via isSelf." -m "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Verificação final

### - [ ] Step 4.1: Suíte inteira verde

```powershell
npx vitest run
```

### - [ ] Step 4.2: tsc limpo

```powershell
npx tsc --noEmit
```

### - [ ] Step 4.3: Confirmar diffstat total esperado

`git log --oneline --stat <base>..HEAD` — 3 commits, +/- proporcional.

---

## Notas

- Este plano é executado overnight. Se qualquer subagent hit BLOCKED, deixar nota no relatório e parar essa branch — não improvisar arquitetura.
- Nenhum push pra remote. Nenhum PR aberto sem consentimento explícito do usuário na manhã seguinte.
- Cada Task = 1 commit atômico.
- Se algum teste pré-existente quebrar por causa dessa unificação, é fair — os testes eram acoplados ao esquema antigo (dois componentes) e precisavam atualizar.
