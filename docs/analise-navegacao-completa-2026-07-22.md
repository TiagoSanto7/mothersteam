# Análise de Navegação — Mother's Team

**Data:** 2026-07-22
**Escopo:** Toda a experiência pós-login, web e mobile
**Objetivo:** Elevar a navegação ao nível de plataformas maduras (Instagram, WhatsApp, X, Threads) — identidade coerente, previsível, deep-linkável.

---

## 1. Resumo executivo

A navegação atual funciona, mas foi construída como um mosaico de flags booleanas em `App.tsx`, sem uma noção central de "quem sou eu no fluxo". Isso gerou três classes de problema:

1. **Identidade quebrada** — a mesma entidade (o próprio usuário) vive em duas telas diferentes com dados diferentes, e o caminho de entrada decide qual você vê.
2. **Divergência web ↔ mobile** — as duas plataformas expõem conjuntos diferentes de abas principais.
3. **Estado sem URL** — nada é linkável, o botão "voltar" do navegador quebra o app, e recarregar a página perde o contexto.

Priorizei o P0 pensando em: qual bug o usuário sente como "isso não é normal em nenhum app que eu uso".

---

## 2. O bug do "meu perfil como visitante" — raiz do problema

### O que acontece
Você criou um post, viu no feed, clicou no avatar/nome do autor (você mesmo) e caiu numa tela onde apareceu como **visitante do seu próprio perfil**: sem o botão "Editar perfil", sem "Configurações", sem "Versículos salvos", com dados vindos direto da API em vez do seu estado local.

### Por que
Existem **duas telas de perfil** no app:

| Tela | Origem | Dados | Botões |
|---|---|---|---|
| `ProfileScreen` (self) | Aberta pelo **drawer** e pelo **avatar da aba Rotina** | Store Zustand (`motherName`, `motherProfile.archetypeKey`) + `/users/:id/posts` | Editar perfil, Configurações, Versículos, Sair |
| `UserProfileScreen` (visitor) | Aberta por **qualquer outro caminho** (feed, notificação, busca, seguidoras, comunidade) | `/users/:id` da API (`ApiUserProfile`) | Só "Seguir" (que só oculta se `isSelf`) |

No `App.tsx:230-239` o estado `profileUserId` **sempre** abre `UserProfileScreen`, sem checar se o `userId` é o do usuário logado:

```tsx
{profileUserId && (
  <UserProfileScreen userId={profileUserId} ... />
)}
```

E `UserProfileScreen` já sabe que é você (`profile.isSelf === true` vem do backend em `/users/:id`), mas só usa isso para esconder o botão "Seguir" — nunca para mostrar Editar/Configurações/etc.

### Onde o bug se manifesta (todos os caminhos)
Todos estes pontos passam `authorId`/`userId` cru para `setProfileUserId`, sem checar `currentUserId`:

- `PostCard.tsx:50` (feed, comunidade, perfil visitado) → **este é o que você reportou**
- `PostDetailScreen.tsx:134` (avatar dentro do post aberto)
- `NotificationsScreen.tsx:71` (notificação de "seguiu você" ou clique num actor)
- `SearchScreen.tsx:65` (buscar seu próprio nome)
- `FollowListScreen.tsx:54` (lista de seguidoras/seguindo)
- `CommunityDetailScreen.tsx` (comentários de comunidade)
- `RightPanel.tsx:152` (sugestões de "mães pra seguir" — nunca deveria mostrar você mesma, mas mostra em alguns filtros)
- `SocialOnboardingScreen.tsx` (mesma lógica)

### Consequência mais séria
**Contagens diferentes.** `ProfileScreen` mostra `248 Seguidoras · 31 Seguindo` **hardcoded** (linhas 105-106). `UserProfileScreen` mostra os valores reais do backend. Ou seja: no drawer você vê 248, e no post você vê o número real. Duas verdades para o mesmo usuário.

### Correção proposta
Uma única fonte de verdade e uma função central de navegação:

```ts
// src/lib/navigation.ts (novo)
export function openProfile(userId: string) {
  const me = useAppStore.getState().currentUserId
  if (userId === me) {
    // abre self view
    return { kind: 'self' as const }
  }
  return { kind: 'visitor' as const, userId }
}
```

Aplicar em `App.tsx` no bloco `{profileUserId && ...}`:

```tsx
{profileUserId && (
  profileUserId === currentUserId
    ? <ProfileScreen onClose={() => setProfileUserId(null)} />
    : <UserProfileScreen userId={profileUserId} ... />
)}
```

E — **mais importante** — unificar as duas telas ou fazer `UserProfileScreen` renderizar chrome de "self" quando `profile.isSelf`. Ver §5.

---

## 3. Divergência web ↔ mobile

Comparei as duas navegações principais:

| Aba | Mobile (`BottomTabBar`) | Web (`LeftSidebar`) |
|---|---|---|
| Home | ✅ | ✅ |
| MãeIA | ✅ | ✅ |
| Bebê (botão central) | ✅ | ✅ |
| Rotina | ✅ | ✅ |
| **Comunidade** | ✅ | ❌ (só via busca) |
| **Shopping** | ❌ (só via drawer) | ✅ |

**Impacto:** No desktop, **Comunidade não existe como navegação primária**. Um usuário que entra pela web e não conhece o produto nunca descobre a rede social. No mobile, Shopping é secundária. Fica confuso pra times de conteúdo e suporte explicarem "onde está X" — depende do device.

**Sugestão:** Cinco abas iguais nos dois shells. Se a barra fica cheia, o padrão da indústria é:
- Mobile: 5 abas visíveis (bottom).
- Web: mesma ordem no sidebar + "Mais" com Shopping/Configurações.

Ou aceitar que Shopping é secundária em ambos e movê-la para o drawer/menu do avatar.

> Tiago: Pode mover o Shopping para o drawer.

---

## 4. Arquitetura de navegação — o problema estrutural

### 4.1 Zero URL routing
Tudo é `useState<boolean>` no `App.tsx`. Consequências:

- **Nada é deep-linkável.** Não dá pra mandar link de um post no WhatsApp e cair naquele post.
- **Recarregar a página perde tudo.** Se o usuário está lendo um post e dá F5, volta pra Home.
- **Voltar do navegador não funciona.** Fecha o app inteiro.
- **Analytics fica cega.** Não dá pra medir "qual tela deu mais engajamento" via URL — precisa instrumentar cada `setState`.
- **SEO/compartilhamento:** impossível.

### 4.2 Explosão de flags no `App.tsx`
Contei **11 estados de UI só no root** (`showProfile`, `showSettings`, `showSavedVerses`, `showNotifications`, `showChat`, `showSearch`, `profileUserId`, `openCommunityId`, `pendingPostId`, `pendingShareContent`, `drawerOpen`). Cada nova tela adiciona uma flag + um `<div fixed inset-0 z-50>`. Manter isso vai virar pesadelo.

### 4.3 Overlays sobre overlays
`fixed inset-0 z-50` em 8 lugares. Se dois ficam abertos ao mesmo tempo (ex: notificação → perfil), só a ordem de renderização decide qual fica em cima. Não há stack manager.

### 4.4 Duplicação de "PostDetailScreen"
Três lugares renderizam `PostDetailScreen`:
- `App.tsx:255` (via `pendingPostId` — notificações)
- `ComunidadeScreen.tsx:96`
- `UserProfileScreen.tsx:70` e `ProfileScreen.tsx:54`

Cada um passa um subconjunto diferente de callbacks. `PostDetailScreen` renderizado pelo `pendingPostId` **não recebe `onOpenProfile`**, então clicar num avatar de comentário não faz nada.

### Correção proposta
**React Router** (ou tanstack-router, que já casa com o QueryClient existente). Rotas:

```
/                       → Dashboard (home)
/mae-ia
/bebe
/rotina
/comunidade
/comunidade/:id
/shopping
/perfil                 → ProfileScreen (self)
/perfil/configuracoes
/perfil/versiculos
/u/:username            → UserProfileScreen (visitor OU redirect pra /perfil se self)
/p/:postId              → PostDetailScreen (rota, não modal)
/notificacoes
/mensagens
/mensagens/:chatId
/buscar
```

Overlays viram rotas modais (`?share=...`, `?edit=1`) só quando fizer sentido — nunca em telas de conteúdo primário.

---

## 5. Duplicação `ProfileScreen` vs `UserProfileScreen`

### Divergências
| Aspecto | `ProfileScreen` | `UserProfileScreen` |
|---|---|---|
| Nome | `store.motherName` | `profile.name` da API |
| Avatar cor | `archetype.color` | `sara-terracotta` hardcoded |
| Bio | `archetype.phrases[1]` | `profile.bio` |
| Contagem seguidoras | **248 hardcoded** | Real do DB |
| Contagem seguindo | **31 hardcoded** | Real do DB |
| Posts | `/users/:id/posts` (paginado ruim) | `/users/:id/posts` (infinite scroll) |
| Editar perfil | ✅ | ❌ |
| Configurações | ✅ | ❌ |
| Versículos salvos | ✅ | ❌ |
| Header do post | Nome próprio + "agora" (sempre) | Card completo com badge, tempo, like |
| Interatividade nos posts | ❌ (só abre detalhe) | ✅ (like/comment/repost/share funcionam) |

### Sugestão
**Uma tela só (`ProfileScreen`).** Ela recebe `userId` (default = self). Se `userId === currentUserId` ou `profile.isSelf === true`:
- Mostra "Editar perfil", "Configurações", "Versículos" no header.
- Usa cor do arquétipo se disponível.

Se não é self:
- Mostra "Seguir/Seguindo" + "Mensagem".

Dados sempre vêm do `/users/:id` (fonte única). O store fica só com sessão/estado local, sem duplicar `motherName` etc. na exibição.

---

## 6. Outros pontos de fricção encontrados

### 6.1 Contagens hardcoded
`ProfileScreen.tsx:105-106`: `248 Seguidoras` e `31 Seguindo` estão no código. Precisa vir da API.

### 6.2 Header de ações some fora de Home/Comunidade
`App.tsx:112` — `headerRightSlot` só aparece quando `activeTab === 'home' || 'comunidade'`. Em MãeIA, Bebê, Rotina e Shopping o usuário **não tem acesso a Notificações, Chat, Busca**. No LeftSidebar da web sempre estão visíveis — só no mobile some. Inconsistência de acessibilidade.

### 6.3 SocialOnboarding surge do nada
`App.tsx:260` — logo após Sara dizer "Entrar", se `!socialOnboardingDone`, aparece o `SocialOnboardingScreen` overlay. Zero preparo narrativo. A Sara acabou de se despedir, e uma tela nova de "siga estas pessoas" surge. Ou: incorpora à conversa da Sara ("Antes de você entrar, queria te apresentar algumas mães..."), ou entra depois do primeiro uso, não imediatamente.

### 6.4 Repost sem undo
`PostCard.tsx:135-140` — após clicar Republicar, o botão vira "Republicado" mas não há como desfazer no mesmo momento. Contagem é local, não sincroniza com refetch.

### 6.5 Follow-back só aparece uma vez
`NotificationsScreen.tsx:151` — o botão "Seguir" na notificação só aparece se `!n.read`. Depois de lida, some. Pra seguir depois, precisa abrir o perfil. Costuma-se manter o botão até a ação ser tomada.

### 6.6 Avatares terracotta hardcoded em todos os lugares
Só `ProfileScreen` usa cor do arquétipo. Todo o resto (PostCard, ChatList, Notifications, Search, RightPanel, UserProfileScreen) usa `bg-sara-terracotta`. Ou o arquétipo é a identidade visual, ou não é. Hoje, é "às vezes".

### 6.7 Search fica preso ao contexto
`SearchScreen` só é acessível pelo header quando você está em Home ou Comunidade. Se você está na Rotina do Bebê e quer procurar uma amiga, não consegue.

### 6.8 Reception → Home sem transição
Sara diz "Entrar", `completeReception` roda, `onboardingDone = true`, e o `App` re-renderiza `DashboardScreen`. Sem fade, sem "primeira home" com Sara presente. O `getContextualPhrase` na home tenta cobrir isso, mas visualmente é um corte seco.

### 6.9 Chat sem mídia
`ChatScreen` só aceita texto. Numa comunidade de mães, foto do bebê é 80% do valor.

### 6.10 Sem "menu do post"
Não existe o `⋯` do post que abre "Editar/Apagar" para o autor e "Reportar/Silenciar" para os outros. Impossível moderar hoje.

### 6.11 Sem "meus posts salvos"
Você salva versículos, mas não posts da comunidade. É um gap comum em redes maduras.

### 6.12 Voltar múltiplos níveis
Feed → Post → Perfil do autor → Post do autor → Perfil de um comentarista → back back back back. Cada `onBack` é uma flag específica. Não há stack visível. Usuário precisa clicar N vezes.

---

## 7. Prioridade sugerida das correções

### P0 — antes de qualquer expansão
1. **Bug do "meu perfil como visitante"** — patch imediato: no `App.tsx`, checar `profileUserId === currentUserId` e abrir `ProfileScreen`.
2. **Unificar as duas telas de perfil** numa só que respeita `isSelf`.
3. **Contagens hardcoded** — trocar por dados reais em `ProfileScreen`.
4. **Alinhar navegação web ↔ mobile** — decidir se Comunidade e Shopping estão nas 5 principais em ambos.

### P1 — refactor estrutural
5. **URL routing** — React Router com rotas listadas em §4.4.
6. **Consolidar `PostDetailScreen`** para receber sempre os mesmos callbacks (usar contexto ou rota).
7. **Cor do avatar = cor do arquétipo em todo o app.** Uma função `getAvatarColor(user)` centralizada.

### P2 — refinamento UX
8. **Header de ações (bell/chat/search) visível em todas as abas** no mobile.
9. **Menu de ações do post** (`⋯`) — Editar/Apagar/Reportar.
10. **SocialOnboarding integrado à Sara** ou movido para pós-primeiro-uso.
11. **Follow-back persistente** na notificação até a ação.

### P3 — extensões
12. Deep-linking, PWA install, notificações web push.
13. Salvar posts (bookmark).
14. Mídia em chat.

---

## 8. Sugestões de complemento à plataforma

Separei em três categorias: **presença** (o que tem, ampliar), **conexão** (fortalecer o social) e **cuidado** (o diferencial de vocês — a Sara).

### 8.1 Presença — melhorar o que já existe

- **Perfil público sharável** — `mothersteam.com/u/ana-maria`. Amigos veem sem app.
- **Story-like para Momento de Deus** — vertical, gesto de swipe entre versículos salvos. Aumenta consumo.
- **Feed "Da sua fase"** — filtrar automaticamente por semana/idade do bebê próximas às suas. Comunidade micro-segmentada sem esforço.
- **Trending por comunidade** — topo do dia dentro de cada comunidade (não do app inteiro), preserva intimidade.
- **Frase do dia customizada** — hoje `DAILY_PHRASES[new Date().getDay()]` é fixa. Vindo da Sara (arquétipo-aware) tem mais peso.

### 8.2 Conexão — fortalecer o loop social

- **Reações granulares** (❤️ 🙏 🤗 💪) em vez de só like. Emocional bate mais que quantitativo.
- **Grupos privados dentro de comunidades** — "Mães de outubro/2026" — sub-comunidade fechada por período de gestação.
- **Aniversário do bebê / marcos** — post automático "Sofia completou 100 dias" com opção de compartilhar.
- **Recomendação baseada em arquétipo** — "Ana e você compartilham o mesmo arquétipo de mãe". Alta afinidade sem invadir privacidade.
- **Chat em grupo** — mãe + doula + companheiro/a. Se a plataforma é sobre rede de apoio, chat 1:1 é limitado.
- **Voice notes** no chat — mãe cansada, mão ocupada, digitação é fricção.
- **Menções `@nome`** em posts e comentários.

### 8.3 Cuidado — Sara como camada, não como beat isolado

Este é o **diferencial competitivo**. Nenhum concorrente tem uma companheira com voz e memória.

- **Sara na Home ativa** — não só saudação. Card "Percebi que você não postou essa semana. Quer conversar?" ou "Você compartilhou 3 versos essa semana — quer ver eles juntos?" Sara reage ao comportamento.
- **Sara no MãeIA** — a Sara já existe conceitualmente. O `MaeIAScreen` deveria ser a Sara, não um chat genérico.
- **Sara nas notificações emocionais** — se detecta 3 posts categorizados como "saúde mental" difíceis em 7 dias, Sara aparece com uma frase e sugestão de conteúdo.
- **Sara no primeiro post** — quando o usuário abre `CreatePostScreen` pela primeira vez, Sara pode sugerir: "Se quiser, começo escrevendo com você." Reduz atrito do primeiro post.
- **Sara guarda memória de conversa** (o `useSaraNarration` já coleta `Fatos` — extender para o pós-onboarding).
- **Rotina do Bebê comentada pela Sara** — "Hoje Sofia mamou 6 vezes, ontem 4. Alguma coisa mudou?" Não julgamento, observação.

### 8.4 Retenção e crescimento

- **Semana em revista** — domingo à noite, resumo com "3 novos versículos salvos, 12 mães seguiram você, seu bebê está na semana X".
- **Convite para amigas** — link único "Ana te convidou pra Mother's Team", entra já com Ana como primeira seguidora.
- **Push por marco** — quando o bebê muda de "semana X" pra "semana X+1", uma notificação com o que muda no desenvolvimento.
- **Backups do perfil** — algumas mães perdem o telefone e perdem todas as fotos e versículos. Exportar backup é raridade e diferenciador.

### 8.5 Infra e qualidade

- **Testes E2E do fluxo de navegação** (Playwright) — o bug do perfil ficou invisível pra suíte atual.
- **Storybook das telas** — permite designer/dev revisar as N variações (self vs. visitor, seguindo vs. não, etc.) sem rodar o app.
- **Feature flags** para lançamentos progressivos das mudanças acima.

---

## 9. Onde eu começaria

Se eu tivesse uma sprint pra atacar isto:

**Dia 1-2:** P0 items 1-3. Bug do perfil resolvido, uma única tela, contagens reais. Já melhora a percepção de "isso é um produto de verdade".

**Dia 3-5:** P1 — React Router. É um refactor grande, mas destranca tudo. Sem URL, cada nova tela é dívida técnica composta.

**Dia 6-8:** P1 item 6 (unificar PostDetail) + P2 itens 8-9 (menu de post, header de ações consistente).

**Dia 9-10:** Uma feature de §8.3 (Sara na Home ativa). Diferenciação de marca; um pequeno investimento aqui separa Mother's Team de qualquer competidor genérico.

Depois disso, backlog de §8 conforme prioridade de produto.
