# Guia de teste — trabalho da madrugada de 23/07/2026

**Branch a testar:** `fix/code-review-findings` (a mais nova, contém tudo empilhado)

**Setup:**

```powershell
git switch fix/code-review-findings
npm install                     # se houver deps novas
npm run dev                     # frontend
# em outro terminal:
npm --prefix server run dev     # backend
```

Abre `http://localhost:5173` no browser. Se ainda não estiver logada, cria conta ou entra.

---

## Parte 1 — Guia de teste (fluxo por fluxo)

Cada item tem: **onde clicar**, **o que esperar** e **o que estar procurando**. Testa mobile (viewport `<768px`) e desktop (`>=768px`) — muita coisa muda entre os dois.

### 1. Perfil próprio via aba Rotina (bug original do "perfil como visitante")

1. Vai pra aba **Rotina** (calendário).
2. Clica no **avatar redondo no canto superior esquerdo** (círculo com sua inicial).
3. **Esperado:** abre a tela do seu perfil com botão **"Editar perfil"**, ícone de engrenagem no header (⚙️ Configurações), e se você tiver versículos salvos, aparece um botão "📖 Versículos salvos" abaixo.
4. **Procurando:** que NÃO apareça o botão "Seguir" (isso seria o modo visitante — o bug original).

### 2. Perfil próprio via feed da Comunidade

1. Vai pra aba **Comunidade**.
2. Se você não tem post seu, publica um curto ("teste").
3. Clica no **seu próprio avatar** dentro do card do post que você criou.
4. **Esperado:** mesma tela do teste #1 — chrome de perfil próprio (Editar, Configurações, Versículos).
5. **Procurando:** **este era o bug reportado**. Antes você via a versão visitante (sem Editar). Agora deve aparecer o próprio.

### 3. Perfil de outra mãe

1. Ainda na Comunidade, clica no **avatar de outra mãe** em qualquer post.
2. **Esperado:** perfil dela com botão **"Seguir"** (ou "Seguindo" se você já segue). Sem Editar, sem Configurações, sem Versículos.
3. **Procurando:** contagens de seguidoras/seguindo/posts reais (não os hardcoded 248/31 antigos).

### 4. Navegação user→user via lista de seguidoras (novo: sub-screen não vaza)

1. Abre o perfil de qualquer mãe (seu ou visitor).
2. Clica em **"Seguidoras"** ou **"Seguindo"** na régua de counters.
3. Na lista que aparece, clica em qualquer nome.
4. **Esperado:** abre o perfil daquela pessoa, e a lista de seguidoras não continua sobreposta.
5. **Procurando:** se antes ficava "grudada" a FollowListScreen da mãe anterior por cima do perfil novo, agora deve remontar limpinho.

### 5. Tap em seguidora no seu próprio perfil (era silencioso)

1. Abre o **seu próprio perfil** (via Rotina → avatar).
2. Clica em **"Seguidoras"** ou **"Seguindo"**.
3. Clica em qualquer nome da lista.
4. **Esperado:** navega pro perfil da pessoa.
5. **Procurando:** antes o tap não fazia nada (bug do "self view — no recursive nav available here"). Agora tem que abrir o perfil da seguidora.

### 6. Repost — tap no avatar do autor original

1. Se houver algum repost no feed (ou faz um: republica um post seu), abre o **perfil da mãe que republicou**.
2. Dentro do feed dela, procura um card de repost (com o "Republicou" no topo e o card cinza embaixo).
3. Clica no **avatar do autor original** do repost.
4. **Esperado:** navega pro perfil do autor original, não pra o perfil da pessoa que republicou.
5. **Procurando:** antes ficava travado no perfil sendo visitado (bug do `effectiveUserId` no lugar de `post.authorId`). Agora abre o autor certo.

### 7. Avatares coloridos por arquétipo

1. Passa por **Comunidade**, **Notificações** (sino no topo), **Chat** (balão no topo), **Busca**.
2. **Esperado:** os avatares das mães (círculos com a inicial) agora aparecem em **cores diferentes** — cada arquétipo tem sua cor. Se todas parecerem iguais, é porque as mães dos posts ainda não têm arquétipo definido no banco.
3. **Procurando (importante):** avatares sem arquétipo devem cair pra **terracota** (`#BC8474`). Coloca o avatar sem arquétipo lado a lado com um botão `bg-sara-terracotta` (tipo o Sair) — **as duas cores têm que ser idênticas**. Se você vê dois tons diferentes de marrom, o fix do hex não pegou.

### 8. Menu ⋯ no post — Apagar (dono)

1. Abre um **post seu** no feed ou clica pra abrir em tela cheia.
2. Clica no ícone **⋯** (três pontos horizontais) no canto superior direito do card.
3. **Esperado:** popover pequeno com **"Apagar publicação"** em terracota.
4. Clica em Apagar.
5. **Esperado:** botão vira **"Apagando..."** por instantes, depois o menu fecha e o post some do feed.
6. **Procurando:** se o backend rejeitar (desconecta a internet e tenta), tem que aparecer uma mensagem em vermelho "Não foi possível apagar. Tente novamente." dentro do menu.

### 9. Menu ⋯ no post — Reportar (não é dono)

1. Encontra um post de outra pessoa.
2. Clica no ⋯.
3. **Esperado:** popover com **"Reportar publicação"** em preto/graphite.
4. Clica em Reportar.
5. **Esperado:** o texto do popover vira **"Obrigada. Nosso time vai revisar."** por 2 segundos, depois fecha.
6. **Procurando:** o botão NÃO faz chamada de API (é stub — o endpoint de backend ainda não existe).

### 10. Menu ⋯ — teclado e clique fora

1. Abre qualquer ⋯.
2. Aperta **Esc** — menu fecha.
3. Abre de novo. Clica **fora do menu, na tela** — fecha.
4. **Procurando:** ambas ações fecham o menu limpo, sem travar.

### 11. Registrar mamada (era um crash)

1. Vai pra aba **Bebê** (botão central da barra inferior no mobile, ou aba Bebê no menu).
2. Encontra o card **"Amamentação"** (🤱).
3. Escolhe um lado (Esquerdo ou Direito).
4. Clica em **"Registrar mamada"**.
5. **Esperado:** botão vira **"Registrando..."**, depois volta ao normal. O lado ativo troca (se estava esquerdo, vai pra direito). Uma nova entrada de "Mamada" aparece na timeline do bebê.
6. **Procurando:** antes clicar aqui **crashava o app inteiro** (ReferenceError: addBabyEntry). Agora tem que funcionar.
7. **Se o backend falhar:** aparece "Não foi possível registrar. Tente novamente." abaixo do botão.

### 12. Chat com pessoa que você já conversou (era um crash)

1. Abre a lista de mensagens (balão no topo).
2. Se você já tem chat com alguém, entra nele e volta.
3. Clica em **"Nova conversa"** (ícone lápis no canto superior direito).
4. Na lista de seguindo, clica em **alguém com quem você JÁ tem chat**.
5. **Esperado:** abre o chat existente sem crashar. Você vê as mensagens antigas.
6. **Procurando:** antes o `POST /chats` retornava o chat existente **sem** o join de `participants.user`, o que crashava `apiChatToChat` (leitura de `undefined.name`). Agora tem que abrir liso.

### 13. Navegação principal — paridade web/mobile

1. **Mobile (viewport `<768px`):** barra inferior tem Home, MãeIA, Bebê (central), Rotina, **Comunidade**.
2. **Desktop (viewport `>=768px`):** LeftSidebar tem Home, MãeIA, Bebê, Rotina, **Comunidade** (nova! antes não tinha) e Shopping foi pra seção de baixo.
3. **Procurando:** o item Comunidade tem que estar acessível pelo menu principal em ambos.

### 14. LeftSidebar — Sair chama a API

1. No desktop, clica em **Sair** (LogOut, no rodapé da sidebar).
2. Abre DevTools → Network e reproduz.
3. **Esperado:** aparece uma request **POST /auth/logout** ANTES de você ser jogado pra tela de login.
4. **Procurando:** antes o Sair só limpava o local (server ficava com sessão viva). Agora tem que bater na API.

### 15. Contagens do perfil próprio (era hardcoded 248/31)

1. Abre seu perfil.
2. Olha "Posts / Seguidoras / Seguindo".
3. **Esperado:** os números refletem seus dados reais.
4. **Procurando:** se ainda mostrar 248 e 31, o fix não pegou.

### 16. Teste do timezone da Mamada (interno — sem UI)

Se você abrir o terminal e rodar:

```powershell
npx vitest run src/components/home/DashboardScreen.test.tsx
```

Deve dar 21/21 passing independente do horário local. Antes falhava entre ~20h e ~4h no seu fuso.

---

## Parte 2 — Sumário do que foi implementado e corrigido

Ordem cronológica das 4 tasks + fixes. Todos os commits atômicos na branch stack.

### Task A — Safe fixes
**Commit:** `ce15436`

- **Timezone bug no teste Mamada** — `DashboardScreen.test.tsx` usava `Date.now() - 80min` em UTC, que caía no dia anterior quando você estava em fuso negativo. Ancorei em `${today}T10:00:00.000Z` — passa 24/7.
- **Alias `userPosts` no ProfileScreen** — era só um rename de `communityPosts` sem valor. Removido.

### Task B — Unificação profunda dos perfis
**Commits:** `de5f20b`, `9aae818`, `a7cbc39`, `ce928bd`

- `ProfileScreen` e `UserProfileScreen` **fundidos em uma tela só** (`ProfileScreen`).
- Chrome (Editar/Configurações/Versículos vs Seguir) agora ramifica por **`profile.isSelf` vindo do backend** — não mais por caminho de navegação.
- **Deletados:** `ProfileRouter.tsx`, `UserProfileScreen.tsx`, e testes (–365 linhas).
- App.tsx e ComunidadeScreen instanciam `<ProfileScreen>` direto.
- Item 2 do P0 do doc de análise, fechado.

### Task C — Avatar por arquétipo em todo o app
**Commits:** `f60e3a6`, `982a367`

- **Backend:** rotas `posts`, `chats`, `communities`, `search` agora expõem `archetypeKey` em nested selects.
- **Novo helper:** `src/utils/avatar.ts` — `getAvatarColor(archetypeKey)`.
- **Aplicado em 15 componentes:** PostCard, PostDetailScreen, ChatListScreen, ChatScreen, SearchScreen, RightPanel, FollowListScreen, SideDrawer, LeftSidebar, HomeScreen, DashboardScreen, ComposerBar, SharePostSheet, SocialOnboardingScreen, ProfileScreen.
- Onde a API ainda não expõe (`ApiFollowUser`, follower list, etc.), cai no fallback terracota — visualmente igual ao antes, sem regressão.
- **Não toquei em `users.ts`** (estava pending na sessão da Recepção).

### Task D — Menu ⋯ de ações do post
**Commit:** `2a45b1e`

- Novo componente `PostActionsMenu.tsx` — popover ancorado, keyboard (Esc) e backdrop dismiss.
- **Dono do post:** ação "Apagar publicação" chamando `DELETE /posts/:id`.
- **Outras pessoas:** ação "Reportar publicação" — stub por 2s ("Obrigada. Nosso time vai revisar."). Backend endpoint pendente, marcado com `TODO(report)`.
- Aplicado em PostCard (feed) e PostDetailScreen (header).
- 13 testes novos, todos passando.

### Bônus — Fix do BreastfeedingCard
**Commit:** `c11d976`

- Chamava `addBabyEntry` do store — método **que nunca existiu**. Clicar "Registrar mamada" crashava.
- Reescrito no padrão do `DiaperCard`: `useMutation` + `apiFetch('/baby', POST)` + invalidate `['baby']`.

### Code review — 6 fixes de correctness
Depois de um code review a alto esforço (9 finder subagents), fixei os 9 findings mais graves. Todos empilhados na branch `fix/code-review-findings`.

- **`db8e1c7`** — `chats.ts` include `participants.user` no branch existing (crash ao reabrir chat).
- **`14cd6b9`** — `key={profileUserId}` em App.tsx e ComunidadeScreen. Sub-screen state (showEdit, selectedPost, followList) não vaza mais entre perfis quando você navega user→user.
- **`53e6000`** — Três fixes em `ProfileScreen`:
  1. Self follow-list dead branch removida — tap em seguidora navega.
  2. `PostCard.onOpenProfile` passa `post.authorId` (não mais `effectiveUserId`) — reposts navegam pro autor certo.
  3. Posts infinite query agora guarda `isLoggedIn` também — evita 401 durante logout.
- **`bc4b3d6`** — `avatar.ts` fallback hex corrigido de `#C97E5A` pra `#BC8474` (bate com tailwind `sara-terracotta`).
- **`bee848d`** — `PostActionsMenu` com `onError` visível + `removeQueries` do `['posts', postId]` antes de invalidar as feeds (evita 404 refetch se PostDetailScreen tá montado).
- **`6ba84bd`** — `BreastfeedingCard` com `isPending` (botão desabilitado durante request) + `onError` (mensagem em vermelho).

### Ficaram de fora (com razão)

- **openMyProfile silent no-op**: refutado após análise — o gate `if (restoring) return null` garante que só passa quando `currentUserId` já foi setado. Cenário não acontece.
- **WebLayout onOpenSavedVerses**: bloqueado. `WebLayout.tsx` está untracked (pertence à sessão da Recepção pendente). Committar aqui misturaria escopos.
- **apiChatToChat silent 'Usuária' fallback**: minor, decidi deixar como follow-up.
- **Avatar component (altitude)**: 15 sites duplicados. Vale um refactor dedicado, não bug.
- **authorSelect shared constant (backend altitude)**: mesma coisa — refactor, não urgente.

### Estado final

- **Suite:** 352/352 passando (baseline 339 + 13 novos do PostActionsMenu).
- **tsc:** 0 erros.
- **Branches empilhadas:** `feat/p0-navegacao` → `feat/overnight-2026-07-22` → `fix/code-review-findings`.
- **PRs sugeridos:** 3 empilhados na ordem acima. URLs de compare no chat anterior.

Se algum teste do guia acima não bater, me avisa com o número do fluxo — reproduzo e diagnostico.
