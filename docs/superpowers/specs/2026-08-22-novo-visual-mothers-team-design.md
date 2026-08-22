# Novo visual "Mother's Team" — design spec

**Data:** 2026-08-22
**Status:** aprovado para plano de execução
**Autor:** brainstorm com o dono do produto
**Materiais fonte:** `docs/materials/LAYOUT APP.pdf` (6 páginas), `docs/materials/logos/LOGOS/*.png`

## Contexto

A plataforma hoje usa a paleta "Sara" (gold/terracotta amarelado, `#A07844`/`#BC8474`, cream/linen bege, tipografia Playfair Display + Inter). Foi entregue o material de identidade oficial "Mother's Team": paleta rose/pink com dois tons canônicos, wordmark próprio, ícone de app dedicado (M + coração), tagline e backgrounds em gradiente.

O objetivo é aplicar essa nova identidade **em toda a plataforma** como design system global (aprovado na etapa de brainstorm), em três ondas sequenciais e deployáveis independentemente, mantendo zero regressão funcional.

## Decisões de escopo (fechadas no brainstorm)

1. **Escopo global.** Substituir a paleta Sara pela mothers team em todos os 84 arquivos que a referenciam, aplicando os primitivos visuais em todas as telas (comunidade, chat, perfil, shopping, jornada, MãeIA, onboarding, admin, notifications, search).
2. **Wordmark como SVG apenas.** A tipografia rounded/geométrica do wordmark fica embarcada em SVG (logo/marca). Corpo do app continua Inter + Playfair Display nos títulos serifados.
3. **Bottom nav: 4 abas + M-CTA central.** Preserva navegação atual (Hoje, Jornada, Comunidade, Perfil) e adiciona o M gradiente centralizado como CTA que abre um bottom sheet com atalhos (MãeIA, novo post, adicionar rotina, registrar amamentação/sono/fralda).
4. **Ilustração do útero (Home card "Rotina do bebê"):** placeholder na Onda 2 (M-logo grande em círculo com gradiente), arte final entra depois.

## Terminologia (regras invioláveis)

- Assistente de IA: **"MãeIA"** (com til, IA em caixa alta) em todo texto exibido ao usuário. Identificadores de código podem manter `maeIA` / `MaeIAScreen`.
- Alimentar bebê no peito: **"amamentação"** em todo texto user-facing (labels, aria-labels, botões, categorias). Substituir "mamada" existente em `DashboardScreen.tsx` e `QuickRegisterSheet.tsx`.

## Design tokens

### Paleta oficial

```
mt-rose        #db958b   Primária (CTA, links, ícones ativos)
mt-rose-dark   #c47c73   Hover/pressed, badges destacados
mt-rose-deep   #8b3d34   Variação mono dark (uso pontual)
mt-pink        #f6bdd8   Secundária, gradiente end
mt-pink-soft   #fadfec   Backgrounds de cards secundários, chips
mt-cream       #faf5f0   Off-white creme (fundos, texto sobre gradient)
mt-linen       #f5ede4   Fundo neutro alternativo
mt-charcoal    #3d342e   Texto principal
mt-muted       #8b7268   Texto secundário
```

### Gradientes canônicos (utilities customizadas)

```css
.bg-mt-gradient        { background: linear-gradient(135deg, #db958b 0%, #f6bdd8 100%); }
.bg-mt-gradient-soft   { background: linear-gradient(135deg, #fadfec 0%, #f6bdd8 60%, #db958b 100%); }
.bg-mt-gradient-pastel { background: linear-gradient(135deg, #fadfec 0%, #e8e5f0 50%, #d9e8f2 100%); }
```

### Radius e sombras

```
rounded-mt        24px    Cards principais
rounded-mt-lg     32px    Drawer, sheets
rounded-mt-pill   9999px  Botões e inputs
shadow-mt         0 8px 24px -8px rgba(219,149,139,0.25)
shadow-mt-lg      0 20px 40px -12px rgba(219,149,139,0.35)
```

### Aliases legado (Onda 1 → removidos na Onda 3)

Aliases da paleta Sara mantidos apontando para tons novos, para que o rebrand cromático de toda a UI ocorra automaticamente na Onda 1 sem tocar 84 arquivos:

```
sara-gold       → #db958b  (era #A07844)
sara-terracotta → #c47c73  (era #BC8474)
sara-linen      → #f5ede4  (era #F5EFE6)
sara-cream      → #faf5f0  (era #FAF7F2)
sara-warm       → #8b7268  (era #7A6B62)
sara-charcoal   → #3d342e  (igual)
```

## Assets de marca

Local: `src/assets/brand/`

- `wordmark-mt-rose.svg` — wordmark rose sobre fundo claro
- `wordmark-mt-cream.svg` — wordmark cream sobre fundo rose
- `mark-mt.svg` — M+coração monocromático (`currentColor`)
- `mark-mt-gradient.svg` — M+coração com gradiente rose→pink embutido
- `tagline-mt.svg` — "quem é MÃE sabe." (variante cream)

Componentes wrapper (evitam duplicar SVG inline):

- `src/components/brand/Wordmark.tsx` — `<Wordmark variant="rose|cream" size="sm|md|lg" aria-label />`
- `src/components/brand/Mark.tsx` — `<Mark variant="mono|gradient|outline" size={n} aria-label />`

### Android launcher e splash

- `android/app/src/main/res/mipmap-*/ic_launcher_foreground.xml` — foreground do adaptive icon (M branco com sombra sobre gradient rose)
- `android/app/src/main/res/values/ic_launcher_background.xml` — background do adaptive icon (gradient `#db958b`→`#f6bdd8`, 135°)
- Splash Capacitor regenerado via `npx @capacitor/assets generate` — wordmark cream centralizado sobre `bg-mt-gradient`, alinhado com página 1 do PDF

### Favicons web / PWA

- `public/favicon.ico`, `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png` — todos regenerados a partir do M-logo gradiente

## Componentes primitivos (vocabulário visual)

Local: `src/components/mt/`

| Componente | Substitui |
|---|---|
| `MtScreen` | Wrappers de tela com `bg-sara-cream` |
| `MtCard` (+ `.Compact`, `.Feature`) | `bg-white/70 border border-white/50 rounded-3xl` |
| `MtPillButton` (variantes primary, secondary, google, apple) | Botões `bg-sara-gold rounded-full` |
| `MtInput` | Inputs pill com fundo creme |
| `MtAvatar` (`sm`, `md`, `lg`) | `w-14 h-14 rounded-full` avulsos |
| `MtBottomNav` | `BottomTabBar.tsx` atual (4 abas → 4 abas + M-CTA) |
| `MtQuickActionSheet` | Novo (bottom sheet do M-CTA) |
| `MtChip` | `Chip` genéricos existentes |
| `MtHeader` | `AppHeader.tsx` atual |

Regras de contraste (WCAG AA):
- Texto sobre gradient rose: usar `text-white` (contrast ≥ 4.5:1 no ponto mais claro do gradient).
- `text-mt-cream` sobre `bg-mt-rose` = 3.8:1 — permitido apenas em texto grande (≥18px bold) como o wordmark.
- Corpo de leitura sempre sobre card branco/creme, nunca sobre gradient.

## Ondas de rollout

Cada onda é um PR deployável e testável independentemente.

### Onda 1 — Fundação (~1 dia, 1 PR)

**Objetivo:** infraestrutura pronta. Único efeito visual: aliases `sara-*` apontam para tons novos, portanto qualquer classe `sara-gold`/`sara-terracotta`/`sara-linen`/`sara-cream` existente vira rose automaticamente (~70% do rebrand cromático "de graça").

**Escopo:**
- `tailwind.config.js`: adiciona paleta `mt-*`, remapeia aliases `sara-*`
- `src/index.css`: adiciona utilities `bg-mt-gradient*`, `rounded-mt*`, `shadow-mt*`
- `src/assets/brand/`: 5 SVGs (wordmark rose/cream, mark mono/gradient, tagline)
- `src/components/brand/Wordmark.tsx`, `Mark.tsx`
- `src/components/mt/`: 9 primitivos criados e testados, **ainda não usados nas telas**
- Android launcher (adaptive icon), splash Capacitor, favicons web/PWA
- `android/app/build.gradle`: `versionCode 3 → 4`, `versionName "1.2.0" → "1.3.0"`

**Testes:** unit tests para os 9 primitivos + 2 componentes de marca (snapshot, aria-label, variantes). Suite existente 100% verde.

**Critério de aceitação:**
- `npm run build` sem erros
- `npm run test` verde
- APK sample abre com wordmark cream centralizado no splash e ícone M no launcher
- Nenhuma tela existente teve seu markup alterado — só as cores mudaram por conta dos aliases

### Onda 2 — Superfícies-âncora (~1-2 dias, 1 PR)

**Objetivo:** aplicar o visual literal do PDF nas 4 telas que carregam a "cara" do app.

**Escopo:**
- `src/components/auth/LoginScreen.tsx`: MtScreen + MtCard + MtInput + MtPillButton + Wordmark cream + Mark rodapé
- `src/components/home/HomeScreen.tsx` + `DashboardScreen.tsx`: MtScreen + MtHeader (avatar + "Olá **Nome**" + sino) + `MtCard.Feature` "Rotina do bebê" (placeholder do círculo) + grid 2col MtCard.Compact Sono/Fraldas + botão "+ Registrar **amamentação**"
- `src/components/layout/SideDrawer.tsx` + `LeftSidebar.tsx`: avatar + nome + email + itens ícone/label + rodapé "Sair da conta" + `<Wordmark variant="rose" size="sm" />`
- `src/components/layout/BottomTabBar.tsx` → substitui por `MtBottomNav` + `MtQuickActionSheet` com atalhos: "Falar com a **MãeIA**", "Novo post", "Adicionar rotina", "Registrar (amamentação/sono/fralda)"
- `src/App.tsx`: bridge do M-CTA para overlay do MtQuickActionSheet
- Correção terminologia: "Registrar mamada" → "Registrar amamentação" em `DashboardScreen.tsx`, `DashboardScreen.test.tsx`, `QuickRegisterSheet.tsx`, `QuickRegisterSheet.test.tsx`

**Testes:**
- LoginScreen.test.tsx, HomeScreen.test.tsx / DashboardScreen.test.tsx, SideDrawer.test.tsx, BottomTabBar.test.tsx atualizados
- Regressão: `closeAllOverlays()` e `bumpTabRefresh()` continuam sendo chamados nos taps de abas normais

**Critério de aceitação visual (agent-browser):**
- `npm run dev` local
- `agent-browser resize 390 844` (iPhone 12/13)
- Para cada tela âncora: `agent-browser open http://localhost:5173/<rota>` → `screenshot .tmp-materials/wave2-<tela>.png` → comparação visual contra `.tmp-materials/layout_p04.png`
- Aprovação humana antes de partir pra Onda 3

**Critério de aceitação funcional:**
- Todos os testes verdes
- Nenhum warning novo de acessibilidade (aria-labels obrigatórios nos primitivos)
- M-CTA elevado com `padding-bottom: env(safe-area-inset-bottom) + 24px` para não ser cortado pelo gesture bar Android
- `versionCode 4 → 5`, deploy frontend + APK internal testing

### Onda 3 — Consistência total (~2 dias, 1 PR)

**Objetivo:** aplicar primitivos em todo o restante e apagar a paleta Sara.

**Escopo (grep-and-substitute com julgamento por componente):**
- Comunidade: `ComunidadeScreen.tsx`, `CommunityCard.tsx`, `PostCard.tsx`, `PostDetailScreen.tsx`, `CommunityScreen.tsx`
- Chat: `ChatListScreen.tsx`, `ChatScreen.tsx` (bolhas outbound = `bg-mt-gradient`, inbound = `bg-white`; reply preview border rose)
- Perfil: `ProfileScreen.tsx`, `EditProfileScreen.tsx`, `ProfileRouter.tsx`
- Shopping: `StoreScreen.tsx`, `ProductCard.tsx`, `ProductDetailScreen.tsx`, `CheckoutScreen.tsx`, `CartScreen.tsx`, `OrderDetailScreen.tsx`
- Jornada: `JornadaScreen.tsx`, `JornadaWeekCard.tsx`
- MãeIA: `MaeIAScreen.tsx` (fundo `bg-mt-gradient-pastel`, botão conectar com `<Mark variant="gradient" size={80} />` + pulse; usar texto "MãeIA" em todos os labels)
- Onboarding: `SocialOnboardingScreen.tsx` (fundo gradient, card central com pergunta, MtPillButton para alternativas)
- Notifications: `NotificationsScreen.tsx`, `NotificationItem.tsx` (border-l-4 rose para não-lidas)
- Search: `SearchScreen.tsx`, `SearchResults.tsx`
- Admin: `AdminScreen.tsx` (light-touch — MtCard, MtInput, MtPillButton, mas fundo neutro `bg-mt-cream`, sem gradient)
- Shared: qualquer badge/chip/modal com classes `sara-*` diretas

**Cleanup:**
- Remove aliases `sara-*`, `graphite`, `graphite-*`, `offwhite` do `tailwind.config.js`
- Confirma `grep -rn "sara-\|graphite\|offwhite" src` retorna zero
- Remove pasta `.tmp-materials/` (materiais temporários do brainstorm)

**Testes:**
- Suite completa 100% verde
- Snapshots atualizados
- E2E principais: login → home → criar post → chat funcionais

**Critério de aceitação visual (agent-browser):**
- Screenshots de cada tela restante em 390×844
- Review humano antes de merge

**Deploy:** frontend + APK `versionCode 6`, `versionName 1.4.0`. Promoção pra Play Store production a critério do dono.

## Riscos e mitigação

| Risco | Prob | Mitigação |
|---|---|---|
| Contraste texto sobre gradient rose fora WCAG AA | Média | Forçar `text-white` sobre gradient; corpo sempre sobre card. Cream sobre rose só em título ≥18px bold. |
| M-CTA elevado cortado pelo gesture bar Android | Alta | `padding-bottom: env(safe-area-inset-bottom) + 24px`; validar em Pixel/Samsung reais |
| Testes existentes com asserção em classes `bg-sara-gold` | Média | Grep antes de remover aliases; migrar para testIds |
| Bundle inflado com SVGs | Baixa | SVGO otimização; alvo <8KB por SVG de marca |
| Regressão de a11y em botões pill sem label textual | Média | `aria-label` obrigatório em TypeScript em `MtPillButton`, `Mark`, `Wordmark` icon-only |
| Adaptive icon Android cortado em masks circulares | Baixa | Foreground ocupa 66% do canvas (padrão adaptive icon); validar API 26+ |

## Fora de escopo (V2 ou depois)

- Modo dark (PDF é só light)
- Animações elaboradas de transição entre telas
- Redesign de ilustrações de arquétipos (Sara/Maria/etc)
- Arte final do bebê no útero (placeholder até material chegar)
- Refatoração de código não-visual (arquitetura de state, roteamento)
