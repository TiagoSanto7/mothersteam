# Visual Redesign — Sara Warm Sanctuary

**Data:** 2026-07-04  
**Escopo:** Todas as telas  
**Abordagem:** Por camadas (4 commits atômicos)

---

## Contexto

Os materiais de reunião (reunioes/materiais) revelaram que o produto central é a **Sara** — uma presença permanente que acompanha a mãe da gravidez à autonomia da criança. O visual atual (lavanda, sage, blush) não reflete o tom acolhedor, orgânico e sofisticado que a marca promete. Esta redesign alinha a identidade visual do app com o posicionamento da Sara.

---

## Paleta de Cores — Warm Sanctuary

| Token | Hex | Uso |
|---|---|---|
| `sara-gold` | `#A07844` | Botões primários, tab ativa, labels dourados |
| `sara-terracotta` | `#BC8474` | Avatar, central button, badges, elementos secundários |
| `sara-linen` | `#F5EFE6` | Backgrounds de card selecionado, tab bar |
| `sara-cream` | `#FAF7F2` | Background de cards, modais, offwhite |
| `sara-charcoal` | `#3D342E` | Textos principais |
| `sara-muted` | `#9E8E84` | Textos secundários, labels |
| `sara-warm` | `#7A6B62` | Textos de apoio |

**Aliases mantidos** (valores atualizados, nomes preservados para evitar refatoração extra):

| Token alias | Novo valor |
|---|---|
| `graphite` | `#3D342E` |
| `graphite-light` | `#7A6B62` |
| `graphite-muted` | `#9E8E84` |
| `offwhite` | `#FAF7F2` |

**Background global:** `#EDE6DC` (era `#E8E4DF`)

---

## Tipografia

- **Títulos, saudações, nomes de seção:** `Playfair Display` (400, 600, 700, italic 400)
- **Textos corridos, botões, labels, UI:** `Inter` (400, 500, 600, 700)
- Fonte carregada via Google Fonts no `index.html`
- Utilitário `.font-serif` adicionado ao `index.css`

**Onde aplicar `font-serif` (Playfair Display):**
- Saudação principal no Home (`h1` com o greeting)
- Título do `InsightCard` (nome do arquétipo + semana)
- Títulos de seção de primeiro nível (`Sua Rotina`, `Comunidade`, títulos de modais)
- Nome da mãe no `ProfileScreen`
- Introdução da Sara no chat (`MaeIAScreen` — primeira mensagem de boas-vindas)

**Onde manter Inter:**
- Opções do onboarding, labels de tab, botões, timestamps, textos de cards, badges

---

## Glassmorphism

Padrão aplicado nos elementos flutuantes:

```
bg-white/70 backdrop-blur-md border border-white/50
```

Componentes que recebem glassmorphism:

| Componente | Antes | Depois |
|---|---|---|
| Cards de `RoutineTimeline` / `BabyTimeline` | `bg-white shadow-sm` | `bg-sara-cream/75 backdrop-blur-md border border-white/50` |
| `InsightCard` | `bg-gradient lavender/blush` | `bg-sara-cream/75 backdrop-blur-md border border-white/50` |
| `AddRoutineModal` (painel interno) | `bg-white` | `bg-sara-linen/90 backdrop-blur-md` |
| `BottomTabBar` | `bg-white border-t border-gray-100` | `bg-sara-linen/90 backdrop-blur-md border-t border-white/40` |
| Botões de ícone (sino, mensagem) | `bg-white shadow-sm` | `bg-white/70 backdrop-blur-sm border border-white/50` |

---

## Animações — Framer Motion

**Dependência:** `framer-motion` (npm install)

### A. Staggered fade-in no Onboarding

- A pergunta aparece com `opacity: 0→1`, `y: 8→0`, `duration: 0.3s`
- Cada opção entra com `opacity: 0→1`, `y: 16→0`, `delay: index * 0.08s`
- Implementado com `motion.div` no `OnboardingScreen.tsx`

### B. Feedback de seleção (tap)

- Todo botão primário e opção clicável recebe `whileTap={{ scale: 0.97 }}`
- Substitui `active:scale-95` do Tailwind
- `transition: { duration: 0.15, ease: "easeOut" }`

### C. Timelines vivas

- Linha vertical: `scaleY: 0→1`, `transformOrigin: "top"`, `duration: 0.5s`
- Cards da timeline: stagger de `0.06s` por item, `opacity + y: 12→0`
- Aplicado em `RoutineTimeline.tsx` e `BabyTimeline.tsx`

---

## Substituição de Classes por Componente (Camada 2)

| Classe antiga | Classe nova |
|---|---|
| `bg-lavender-600` | `bg-sara-gold` |
| `bg-lavender-400` | `bg-sara-terracotta` |
| `bg-lavender-50` / `bg-lavender-100` | `bg-sara-linen` |
| `text-lavender-600` | `text-sara-gold` |
| `border-lavender-600` / `border-lavender-200` | `border-sara-gold` |
| `ring-lavender-400` | `ring-sara-terracotta` |
| `shadow-lavender-400/40` | `shadow-sara-terracotta/30` |
| `bg-blush-500` / `bg-blush-300` / `bg-blush-100` | `bg-sara-terracotta` / `bg-sara-linen` |
| `bg-sage-*` | `bg-sara-linen` |
| `bg-babyblue-*` | `bg-sara-cream` |
| `border-gray-200` (onboarding não-selecionado) | `border-sara-linen` |
| `bg-gray-100` / `border-gray-100` (separadores) | `border-sara-linen/60` |

**Arquivos tocados:**
`BottomTabBar.tsx`, `HomeScreen.tsx`, `OnboardingScreen.tsx`, `InsightCard.tsx`, `AddRoutineModal.tsx`, `RoutineTimeline.tsx`, `BabyTimeline.tsx`, `BabyScreen.tsx`, `ProfileScreen.tsx`, `ComunidadeScreen.tsx`, `ChatScreen.tsx`, `ChatListScreen.tsx`, `MaeIAScreen.tsx`, `ShoppingScreen.tsx`, `LoginScreen.tsx`

> `graphite`, `graphite-light`, `graphite-muted`, `offwhite` **não precisam ser substituídos** — os aliases da Camada 1 já resolvem.

---

## Ordem de Implementação

| Camada | O que muda | Commit |
|---|---|---|
| 1 | `tailwind.config.js` + `index.html` + `index.css` | `style: fundação Sara Warm Sanctuary` |
| 2 | Substituição de classes de cor em todos os TSX | `style: substitui paleta lavanda pela paleta Sara` |
| 3 | Glassmorphism nos cards, modais e tab bar | `style: glassmorphism nos elementos flutuantes` |
| 4 | `npm i framer-motion` + animações nas 3 áreas | `feat: micro-animações com Framer Motion` |

---

## Fora de Escopo

- Presença visual da Sara (foto/avatar) no Home — próximo ciclo
- Estrutura de fases da jornada (Fase 0–7) — próximo ciclo
- Dark mode / temas — não está no roadmap próximo
