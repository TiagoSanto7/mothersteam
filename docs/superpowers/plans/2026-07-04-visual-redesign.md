# Visual Redesign — Sara Warm Sanctuary — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a identidade visual do app (paleta lavanda/sage → Sara Warm Sanctuary) com glassmorphism, tipografia Playfair Display e micro-animações Framer Motion em todas as telas.

**Architecture:** Quatro camadas de commit atômico — fundação de tokens, substituição de classes de cor + tipografia, glassmorphism nos elementos flutuantes, e animações Framer Motion. Cada camada é testável e reversível independentemente.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3, Framer Motion (a instalar), Google Fonts (Playfair Display + Inter)

**Spec:** `docs/superpowers/specs/2026-07-04-visual-redesign-design.md`

---

## Mapa de arquivos

| Arquivo | Camada | O que muda |
|---|---|---|
| `tailwind.config.js` | 1 | Nova paleta sara-*, aliases graphite/offwhite |
| `index.html` | 1 | Google Fonts link |
| `src/index.css` | 1 | bg body, color body, utilitário `.font-serif` |
| `src/components/auth/LoginScreen.tsx` | 2 | Cores lavanda → sara, outer bg |
| `src/components/auth/OnboardingScreen.tsx` | 2+4 | Cores, tipografia, stagger animation |
| `src/components/layout/BottomTabBar.tsx` | 2+3 | Cores, glassmorphism |
| `src/components/layout/MobileShell.tsx` | 2 | Outer bg |
| `src/components/home/HomeScreen.tsx` | 2+3 | Cores, font-serif greeting, glass icon btns |
| `src/components/home/InsightCard.tsx` | 2+3 | Cores, font-serif, glassmorphism |
| `src/components/home/WeekCalendar.tsx` | 2 | Cores |
| `src/components/home/RoutineTimeline.tsx` | 2+3+4 | Cores, glassmorphism cards, timeline animation |
| `src/components/home/AddRoutineModal.tsx` | 2+3 | Cores, font-serif title, glassmorphism painel |
| `src/components/maeIA/MaeIAScreen.tsx` | 2 | Cores, font-serif header e welcome msg |
| `src/components/comunidade/ComunidadeScreen.tsx` | 2 | Cores badges, like button |
| `src/components/comunidade/CreatePostScreen.tsx` | 2 | Cores botões |
| `src/components/chat/ChatScreen.tsx` | 2 | Cores bubbles, send button |
| `src/components/chat/ChatListScreen.tsx` | 2 | Cores avatars, unread badges |
| `src/components/post/PostDetailScreen.tsx` | 2 | Cores botões, back button |
| `src/components/profile/ProfileScreen.tsx` | 2 | Cores hover, font-serif nome |
| `src/components/profile/SettingsScreen.tsx` | 2 | Cores botões destrutivos |
| `src/components/baby/BabyScreen.tsx` | 2 | Cores botões, tabs |
| `src/components/baby/BabyTimeline.tsx` | 2+3+4 | Cores, glassmorphism, timeline animation |
| `src/components/baby/DiaperCard.tsx` | 2 | Cores botões |
| `src/components/baby/SleepCard.tsx` | 2 | Cores botões |
| `src/components/baby/BreastfeedingCard.tsx` | 2 | Cores botões |
| `src/components/shopping/ShoppingScreen.tsx` | 2 | Cores |
| `src/components/notifications/NotificationsScreen.tsx` | 2 | Cores |
| `package.json` | 4 | framer-motion dependency |

---

## Task 1: Camada 1 — Fundação (tokens, fontes, body)

**Files:**
- Modify: `tailwind.config.js`
- Modify: `index.html`
- Modify: `src/index.css`

- [ ] **Step 1: Atualizar `tailwind.config.js`**

Substituir todo o conteúdo do `theme.extend.colors` por:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'sara-gold':       '#A07844',
        'sara-terracotta': '#BC8474',
        'sara-linen':      '#F5EFE6',
        'sara-cream':      '#FAF7F2',
        'sara-charcoal':   '#3D342E',
        'sara-muted':      '#9E8E84',
        'sara-warm':       '#7A6B62',
        // aliases — mantidos para não quebrar classes existentes
        graphite:          '#3D342E',
        'graphite-light':  '#7A6B62',
        'graphite-muted':  '#9E8E84',
        offwhite:          '#FAF7F2',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Adicionar Google Fonts no `index.html`**

Inserir antes do `</head>`:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 3: Atualizar `src/index.css`**

Substituir o bloco `@layer base` e adicionar utilitário:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    background-color: #EDE6DC;
    color: #3D342E;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
}

@layer utilities {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .font-serif {
    font-family: 'Playfair Display', Georgia, serif;
  }
}
```

- [ ] **Step 4: Verificar build sem erros**

```bash
npm run build
```

Expected: zero erros TypeScript. Avisos sobre classes CSS inexistentes são OK por agora (lavanda ainda existe nos componentes, será removida nas próximas tarefas).

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.js index.html src/index.css
git commit -m "style: fundação Sara Warm Sanctuary — paleta, fontes e body"
```

---

## Task 2: Camada 2 — Auth + Layout (cores e tipografia)

**Files:**
- Modify: `src/components/auth/LoginScreen.tsx`
- Modify: `src/components/auth/OnboardingScreen.tsx`
- Modify: `src/components/layout/BottomTabBar.tsx`
- Modify: `src/components/layout/MobileShell.tsx`

- [ ] **Step 1: Atualizar `LoginScreen.tsx`**

Substituições exatas:

```diff
- <div className="min-h-screen flex items-center justify-center bg-offwhite sm:bg-[#E8E4DF]">
+ <div className="min-h-screen flex items-center justify-center bg-sara-cream sm:bg-[#EDE6DC]">

- <div className="w-full min-h-screen sm:w-[390px] sm:min-h-[844px] sm:max-h-[844px] bg-offwhite flex flex-col items-center justify-center px-8 gap-8 sm:rounded-[44px] sm:shadow-2xl overflow-y-auto">
+ <div className="w-full min-h-screen sm:w-[390px] sm:min-h-[844px] sm:max-h-[844px] bg-sara-cream flex flex-col items-center justify-center px-8 gap-8 sm:rounded-[44px] sm:shadow-2xl overflow-y-auto">

- <div className="w-16 h-16 rounded-full bg-lavender-400 flex items-center justify-center text-2xl">
+ <div className="w-16 h-16 rounded-full bg-sara-terracotta flex items-center justify-center text-2xl">

- className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-sm text-graphite placeholder:text-gray-300 focus:outline-none focus:border-lavender-400"
+ className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-sara-muted focus:outline-none focus:border-sara-gold"
```
(aplicar essa substituição de input styles nas duas ocorrências — email e password)

```diff
- <p role="alert" className="text-xs text-blush-500 text-center">
+ <p role="alert" className="text-xs text-sara-terracotta text-center">

- className="w-full py-3 rounded-2xl bg-lavender-600 text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
+ className="w-full py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"

- className="w-full py-3 rounded-2xl bg-white border border-gray-200 text-sm font-medium text-graphite flex items-center justify-center gap-3 active:scale-95 transition-transform"
+ className="w-full py-3 rounded-2xl bg-white border border-sara-linen text-sm font-medium text-graphite flex items-center justify-center gap-3 active:scale-95 transition-transform"

- <p className="text-xs text-lavender-600 text-center font-medium">
+ <p className="text-xs text-sara-gold text-center font-medium">

- <div className="flex-1 h-px bg-gray-200" />
+ <div className="flex-1 h-px bg-sara-linen" />
```

- [ ] **Step 2: Atualizar `OnboardingScreen.tsx`**

```diff
- <div className="min-h-screen flex items-center justify-center bg-offwhite sm:bg-[#E8E4DF]">
+ <div className="min-h-screen flex items-center justify-center bg-sara-cream sm:bg-[#EDE6DC]">

- <div className="w-full min-h-screen sm:w-[390px] sm:min-h-[844px] sm:max-h-[844px] bg-offwhite flex flex-col sm:rounded-[44px] sm:shadow-2xl overflow-y-auto">
+ <div className="w-full min-h-screen sm:w-[390px] sm:min-h-[844px] sm:max-h-[844px] bg-sara-cream flex flex-col sm:rounded-[44px] sm:shadow-2xl overflow-y-auto">

- i <= step ? 'bg-lavender-600' : 'bg-lavender-100'
+ i <= step ? 'bg-sara-gold' : 'bg-sara-linen'

- <h2 className="text-base font-semibold text-graphite leading-snug">
+ <h2 className="text-base font-semibold font-serif text-graphite leading-snug">

- selected === opt.value
-   ? 'border-lavender-600 bg-lavender-50 text-graphite font-medium'
-   : 'border-gray-200 bg-white text-graphite-light'
+ selected === opt.value
+   ? 'border-sara-gold bg-sara-linen text-graphite font-medium'
+   : 'border-sara-linen bg-sara-cream text-graphite-light'

- className="flex-1 py-3 rounded-2xl border-2 border-lavender-200 text-lavender-600 text-sm font-semibold active:scale-95 transition-transform"
+ className="flex-1 py-3 rounded-2xl border-2 border-sara-gold/40 text-sara-gold text-sm font-semibold active:scale-95 transition-transform"

- className="flex-1 py-3 rounded-2xl bg-lavender-600 text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-40"
+ className="flex-1 py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-40"
```

- [ ] **Step 3: Atualizar `BottomTabBar.tsx`**

```diff
- className={`flex flex-col items-center gap-0.5 w-14 py-1 rounded-xl transition-colors ${
-   active ? 'text-lavender-600' : 'text-graphite-muted'
+ className={`flex flex-col items-center gap-0.5 w-14 py-1 rounded-xl transition-colors ${
+   active ? 'text-sara-gold' : 'text-graphite-muted'

- className="flex-shrink-0 bg-white border-t border-gray-100 flex items-center justify-around px-2 pt-1 pb-2 h-[68px]"
+ className="flex-shrink-0 bg-sara-linen/90 backdrop-blur-md border-t border-white/40 flex items-center justify-around px-2 pt-1 pb-2 h-[68px]"

- className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg shadow-lavender-400/30 transition-all active:scale-95 ${
-   activeTab === 'baby'
-     ? 'bg-lavender-600 ring-2 ring-lavender-400 ring-offset-2'
-     : 'bg-lavender-400'
+ className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg shadow-sara-terracotta/30 transition-all active:scale-95 ${
+   activeTab === 'baby'
+     ? 'bg-sara-gold ring-2 ring-sara-terracotta ring-offset-2'
+     : 'bg-sara-terracotta'
```

- [ ] **Step 4: Atualizar `MobileShell.tsx`**

```diff
- <div className="sm:min-h-screen sm:bg-[#E8E4DF] sm:flex sm:items-center sm:justify-center">
+ <div className="sm:min-h-screen sm:bg-[#EDE6DC] sm:flex sm:items-center sm:justify-center">
```

- [ ] **Step 5: Rodar testes**

```bash
npm test -- --watchAll=false
```

Expected: todos os testes passando. Estes testes verificam comportamento (cliques, renderização de labels), não classes CSS — devem continuar verdes.

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/LoginScreen.tsx src/components/auth/OnboardingScreen.tsx src/components/layout/BottomTabBar.tsx src/components/layout/MobileShell.tsx
git commit -m "style: paleta Sara em auth e layout"
```

---

## Task 3: Camada 2 — Home cluster (cores e tipografia)

**Files:**
- Modify: `src/components/home/HomeScreen.tsx`
- Modify: `src/components/home/InsightCard.tsx`
- Modify: `src/components/home/WeekCalendar.tsx`
- Modify: `src/components/home/RoutineTimeline.tsx`
- Modify: `src/components/home/AddRoutineModal.tsx`

- [ ] **Step 1: Atualizar `HomeScreen.tsx`**

```diff
- className="w-10 h-10 rounded-full bg-lavender-400 flex items-center justify-center text-base font-bold text-white shadow-sm flex-shrink-0 active:scale-95 transition-transform"
+ className="w-10 h-10 rounded-full bg-sara-terracotta flex items-center justify-center text-base font-bold text-white shadow-sm flex-shrink-0 active:scale-95 transition-transform"

- <h1 className="text-base font-semibold text-graphite leading-snug max-w-[220px]">
+ <h1 className="text-base font-semibold font-serif text-graphite leading-snug max-w-[220px]">

- className="fixed bottom-24 right-6 w-12 h-12 rounded-full bg-lavender-600 shadow-lg shadow-lavender-400/40 flex items-center justify-center active:scale-95 transition-transform"
+ className="fixed bottom-24 right-6 w-12 h-12 rounded-full bg-sara-gold shadow-lg shadow-sara-terracotta/30 flex items-center justify-center active:scale-95 transition-transform"
```

Os botões de sino e mensagem (`bg-white shadow-sm`) ficam para a Camada 3 (glassmorphism).

- [ ] **Step 2: Atualizar `InsightCard.tsx`**

```diff
- <div className="mx-4 bg-lavender-50 border border-lavender-200 rounded-3xl p-4">
+ <div className="mx-4 bg-sara-linen border border-sara-linen rounded-3xl p-4">

- <p className="text-[10px] font-semibold text-lavender-600 uppercase tracking-wide mb-0.5">
+ <p className="text-[10px] font-semibold text-sara-gold uppercase tracking-wide mb-0.5">

- <p className="text-sm font-semibold text-graphite leading-snug">
+ <p className="text-sm font-semibold font-serif text-graphite leading-snug">

- className="w-7 h-7 rounded-full bg-lavender-100 flex items-center justify-center flex-shrink-0"
+ className="w-7 h-7 rounded-full bg-sara-linen flex items-center justify-center flex-shrink-0"

- <X size={12} className="text-lavender-600" strokeWidth={2} />
+ <X size={12} className="text-sara-gold" strokeWidth={2} />
```

- [ ] **Step 3: Atualizar `WeekCalendar.tsx`**

```diff
- isSelected
-   ? 'bg-lavender-600 text-white shadow-md shadow-lavender-400/30'
-   : 'bg-white text-graphite'
+ isSelected
+   ? 'bg-sara-gold text-white shadow-md shadow-sara-gold/30'
+   : 'bg-white text-graphite'

- <span className={`text-base font-semibold ${isToday && !isSelected ? 'text-lavender-600' : ''}`}>
+ <span className={`text-base font-semibold ${isToday && !isSelected ? 'text-sara-gold' : ''}`}>

- <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-lavender-400'}`} />
+ <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-sara-terracotta'}`} />
```

- [ ] **Step 4: Atualizar `RoutineTimeline.tsx`**

Substituir o objeto `CATEGORY_CONFIG`:

```ts
const CATEGORY_CONFIG = {
  medication:  { icon: Pill,        color: 'text-sara-terracotta', bg: 'bg-sara-linen' },
  appointment: { icon: Calendar,    color: 'text-sara-gold',       bg: 'bg-sara-cream' },
  task:        { icon: CheckSquare, color: 'text-sara-warm',       bg: 'bg-sara-linen' },
} as const;
```

No botão de check dentro de `EntryCard`:

```diff
- entry.done
-   ? 'bg-lavender-600 border-lavender-600'
-   : 'border-gray-200 bg-white'
+ entry.done
+   ? 'bg-sara-gold border-sara-gold'
+   : 'border-sara-linen bg-sara-cream'
```

O `bg-white shadow-sm` do card fica para Camada 3.

- [ ] **Step 5: Atualizar `AddRoutineModal.tsx`**

```diff
- className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[390px] bg-offwhite rounded-t-[32px] z-50 px-6 pt-5 pb-10 flex flex-col gap-5 shadow-2xl"
+ className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[390px] bg-sara-cream rounded-t-[32px] z-50 px-6 pt-5 pb-10 flex flex-col gap-5 shadow-2xl"

- <h2 className="text-base font-semibold text-graphite pt-2">Adicionar à Rotina</h2>
+ <h2 className="text-base font-semibold font-serif text-graphite pt-2">Adicionar à Rotina</h2>

- className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-sm text-graphite placeholder:text-gray-300 focus:outline-none focus:border-lavender-400"
+ className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-sara-muted focus:outline-none focus:border-sara-gold"
```
(aplicar nas duas ocorrências de input — título e horário e data)

```diff
- category === cat.value
-   ? 'border-lavender-600 bg-lavender-50 text-graphite'
-   : 'border-gray-200 bg-white text-graphite-muted'
+ category === cat.value
+   ? 'border-sara-gold bg-sara-linen text-graphite'
+   : 'border-sara-linen bg-sara-cream text-graphite-muted'

- className="w-full py-3.5 rounded-2xl bg-lavender-600 text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-40"
+ className="w-full py-3.5 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-40"
```

- [ ] **Step 6: Rodar testes**

```bash
npm test -- --watchAll=false
```

Expected: todos passando.

- [ ] **Step 7: Commit**

```bash
git add src/components/home/HomeScreen.tsx src/components/home/InsightCard.tsx src/components/home/WeekCalendar.tsx src/components/home/RoutineTimeline.tsx src/components/home/AddRoutineModal.tsx
git commit -m "style: paleta Sara no cluster Home"
```

---

## Task 4: Camada 2 — Demais telas (cores e tipografia)

**Files:**
- Modify: `src/components/maeIA/MaeIAScreen.tsx`
- Modify: `src/components/comunidade/ComunidadeScreen.tsx`
- Modify: `src/components/comunidade/CreatePostScreen.tsx`
- Modify: `src/components/chat/ChatScreen.tsx`
- Modify: `src/components/chat/ChatListScreen.tsx`
- Modify: `src/components/post/PostDetailScreen.tsx`
- Modify: `src/components/profile/ProfileScreen.tsx`
- Modify: `src/components/profile/SettingsScreen.tsx`
- Modify: `src/components/baby/BabyScreen.tsx`
- Modify: `src/components/baby/BabyTimeline.tsx`
- Modify: `src/components/baby/DiaperCard.tsx`
- Modify: `src/components/baby/SleepCard.tsx`
- Modify: `src/components/baby/BreastfeedingCard.tsx`
- Modify: `src/components/shopping/ShoppingScreen.tsx`
- Modify: `src/components/notifications/NotificationsScreen.tsx`

- [ ] **Step 1: Atualizar `MaeIAScreen.tsx`**

```diff
- <div className="px-4 pt-4 pb-3 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
+ <div className="px-4 pt-4 pb-3 border-b border-sara-linen/60 bg-sara-cream/80 backdrop-blur-sm">

- <h1 className="text-base font-semibold text-graphite">MãeIA</h1>
+ <h1 className="text-base font-semibold font-serif text-graphite">MãeIA</h1>

- <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 bg-offwhite">
+ <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 bg-sara-cream">

- className="flex-shrink-0 px-3 py-1.5 rounded-full bg-lavender-100 text-lavender-600 text-xs font-medium whitespace-nowrap"
+ className="flex-shrink-0 px-3 py-1.5 rounded-full bg-sara-linen text-sara-gold text-xs font-medium whitespace-nowrap"

- msg.role === 'user'
-   ? 'bg-lavender-600 text-white rounded-br-sm'
-   : 'bg-white text-graphite shadow-sm rounded-bl-sm'
+ msg.role === 'user'
+   ? 'bg-sara-gold text-white rounded-br-sm'
+   : 'bg-white text-graphite shadow-sm rounded-bl-sm'

- <div className="px-4 pb-4 pt-2 bg-white border-t border-gray-100">
+ <div className="px-4 pb-4 pt-2 bg-sara-linen/80 border-t border-sara-linen/60">

- className="w-8 h-8 rounded-xl bg-lavender-600 flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
+ className="w-8 h-8 rounded-xl bg-sara-gold flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
```

Adicionalmente, na mensagem de boas-vindas da IA (id `'0'`), o texto já usa graphite — mas adicionar `font-serif` ao primeiro parágrafo da assistente seria feito via lógica condicional: `msg.id === '0' ? 'font-serif' : ''` na classe do div de bubble da assistente.

- [ ] **Step 2: Atualizar `ComunidadeScreen.tsx`**

```diff
# No objeto BADGE_CONFIG:
- experiente:   { label: 'Mãe Experiente',       color: 'bg-blush-100 text-blush-500' },
- profissional: { label: 'Profissional de Saúde', color: 'bg-sage-100 text-sage-600' },
+ experiente:   { label: 'Mãe Experiente',       color: 'bg-sara-linen text-sara-terracotta' },
+ profissional: { label: 'Profissional de Saúde', color: 'bg-sara-cream text-sara-warm' },

# No botão de like:
- liked ? 'text-blush-500' : 'text-graphite-muted'
+ liked ? 'text-sara-terracotta' : 'text-graphite-muted'
```

Buscar também quaisquer outras ocorrências de `lavender`, `blush`, `sage`, `babyblue` no arquivo e substituir pelo equivalente mais próximo da tabela do spec.

- [ ] **Step 3: Atualizar `CreatePostScreen.tsx`**

Buscar ocorrências de `lavender` e substituir:
- `bg-lavender-600` → `bg-sara-gold`
- `text-lavender-600` → `text-sara-gold`
- `border-lavender-*` → `border-sara-gold`
- `bg-lavender-50` / `bg-lavender-100` → `bg-sara-linen`

- [ ] **Step 4: Atualizar `ChatScreen.tsx` e `ChatListScreen.tsx`**

Padrão de chat segue o mesmo de `MaeIAScreen`:
- Bubble do usuário: `bg-lavender-600` → `bg-sara-gold`
- Send button: `bg-lavender-600` → `bg-sara-gold`
- Unread badge: `bg-lavender-600` → `bg-sara-gold` ou `bg-sara-terracotta`
- Avatar placeholders: `bg-lavender-400` → `bg-sara-terracotta`
- Border de input focus: `focus:border-lavender-400` → `focus:border-sara-gold`

- [ ] **Step 5: Atualizar `PostDetailScreen.tsx`**

Buscar `lavender`, `blush` e substituir pelo equivalente Sara conforme a tabela do spec.
- Back button hover: `hover:bg-lavender-50` → `hover:bg-sara-linen`
- Like button ativo: `text-blush-500` → `text-sara-terracotta`
- Share/reply buttons: `bg-lavender-600` → `bg-sara-gold`

- [ ] **Step 6: Atualizar `ProfileScreen.tsx`**

```diff
- className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-lavender-50"
+ className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen"
```
(duas ocorrências — botão back e botão settings)

```diff
- <p className="text-sm font-semibold text-graphite">{motherName}</p>
+ <p className="text-sm font-semibold font-serif text-graphite">{motherName}</p>
```

Buscar demais ocorrências de `lavender`, `blush`, `sage` no arquivo e substituir.

- [ ] **Step 7: Atualizar `SettingsScreen.tsx`**

Buscar `lavender` e substituir. O botão de logout/destrutivo geralmente usa uma variante vermelha — manter como está se não usar lavanda.

- [ ] **Step 8: Atualizar `BabyScreen.tsx`, `BabyTimeline.tsx`, cards do bebê**

Em `BabyTimeline.tsx`:
```diff
- <div className="w-8 h-8 rounded-xl bg-lavender-50 flex items-center justify-center text-lg flex-shrink-0">
+ <div className="w-8 h-8 rounded-xl bg-sara-linen flex items-center justify-center text-lg flex-shrink-0">
```

O card `bg-white rounded-2xl shadow-sm` fica para Camada 3.

Em `BabyScreen.tsx`: buscar `lavender`, `blush`, `sage`, `babyblue` e substituir pelo equivalente Sara.

Em `DiaperCard.tsx`, `SleepCard.tsx`, `BreastfeedingCard.tsx`:
- Botões primários: `bg-lavender-600` → `bg-sara-gold`
- Botões selecionados/ativos: `bg-lavender-50 border-lavender-600` → `bg-sara-linen border-sara-gold`
- Texto de label ativo: `text-lavender-600` → `text-sara-gold`

- [ ] **Step 9: Atualizar `ShoppingScreen.tsx` e `NotificationsScreen.tsx`**

Buscar `lavender`, `blush`, `sage`, `babyblue` e substituir pelo equivalente Sara conforme tabela do spec.

- [ ] **Step 10: Verificar ausência de classes antigas**

```bash
grep -r "lavender\|bg-blush\|text-blush\|bg-sage\|text-sage\|bg-babyblue\|text-babyblue" src/components --include="*.tsx" -l
```

Expected: zero arquivos listados. Se houver resultados, corrigir antes de continuar.

- [ ] **Step 11: Rodar testes**

```bash
npm test -- --watchAll=false
```

Expected: todos passando.

- [ ] **Step 12: Commit**

```bash
git add src/components/
git commit -m "style: paleta Sara em todas as telas restantes"
```

---

## Task 5: Camada 3 — Glassmorphism

**Files:**
- Modify: `src/components/home/InsightCard.tsx`
- Modify: `src/components/home/RoutineTimeline.tsx`
- Modify: `src/components/home/AddRoutineModal.tsx`
- Modify: `src/components/home/HomeScreen.tsx`
- Modify: `src/components/baby/BabyTimeline.tsx`
- Modify: `src/components/layout/BottomTabBar.tsx`

- [ ] **Step 1: Glassmorphism no `InsightCard.tsx`**

```diff
- <div className="mx-4 bg-sara-linen border border-sara-linen rounded-3xl p-4">
+ <div className="mx-4 bg-sara-cream/75 backdrop-blur-md border border-white/50 rounded-3xl p-4">
```

- [ ] **Step 2: Glassmorphism nos cards da `RoutineTimeline.tsx`**

No componente `EntryCard`, na div principal:

```diff
- className={`flex items-center gap-3 p-3 rounded-2xl bg-white shadow-sm transition-opacity ${
+ className={`flex items-center gap-3 p-3 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/50 transition-opacity ${
```

- [ ] **Step 3: Glassmorphism no painel do `AddRoutineModal.tsx`**

```diff
- className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[390px] bg-sara-cream rounded-t-[32px] z-50 px-6 pt-5 pb-10 flex flex-col gap-5 shadow-2xl"
+ className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[390px] bg-sara-linen/90 backdrop-blur-md rounded-t-[32px] z-50 px-6 pt-5 pb-10 flex flex-col gap-5 shadow-2xl"
```

- [ ] **Step 4: Glassmorphism nos botões de ícone do `HomeScreen.tsx`**

Nos dois botões de ícone (sino e mensagem):

```diff
- className="relative w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center"
+ className="relative w-9 h-9 rounded-xl bg-white/70 backdrop-blur-sm border border-white/50 flex items-center justify-center"
```

- [ ] **Step 5: Glassmorphism nos cards da `BabyTimeline.tsx`**

```diff
- className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm"
+ className="flex items-center gap-3 bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-3"
```

- [ ] **Step 6: Verificar build**

```bash
npm run build
```

Expected: zero erros.

- [ ] **Step 7: Commit**

```bash
git add src/components/home/InsightCard.tsx src/components/home/RoutineTimeline.tsx src/components/home/AddRoutineModal.tsx src/components/home/HomeScreen.tsx src/components/baby/BabyTimeline.tsx src/components/layout/BottomTabBar.tsx
git commit -m "style: glassmorphism nos elementos flutuantes"
```

---

## Task 6: Camada 4 — Framer Motion: instalação + whileTap global

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `src/components/auth/OnboardingScreen.tsx`
- Modify: `src/components/home/HomeScreen.tsx`
- Modify: `src/components/home/AddRoutineModal.tsx`
- Modify: `src/components/home/WeekCalendar.tsx`
- Modify: `src/components/maeIA/MaeIAScreen.tsx`
- Modify: `src/components/layout/BottomTabBar.tsx`

- [ ] **Step 1: Instalar Framer Motion**

```bash
npm install framer-motion
```

Expected: `framer-motion` aparece em `dependencies` no `package.json`.

- [ ] **Step 2: Substituir `active:scale-95` por `whileTap` nos botões primários**

O padrão é o mesmo em todos os arquivos. Substituir a classe `active:scale-95 transition-transform` e envolver o elemento com `motion.button` (ou `motion.div`):

**Exemplo de substituição em `OnboardingScreen.tsx` (botão "Continuar"):**

```diff
- import { useState } from 'react';
+ import { useState } from 'react';
+ import { motion } from 'framer-motion';

# Substituir o botão primário:
- <button
-   onClick={handleNext}
-   disabled={!selected}
-   className="flex-1 py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-40"
- >
+ <motion.button
+   onClick={handleNext}
+   disabled={!selected}
+   whileTap={{ scale: 0.97 }}
+   transition={{ duration: 0.15, ease: 'easeOut' }}
+   className="flex-1 py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold disabled:opacity-40"
+ >
```

Aplicar o mesmo padrão (remover `active:scale-95 transition-transform`, adicionar `whileTap={{ scale: 0.97 }}`) nos botões primários de:
- `OnboardingScreen.tsx` — botões "Continuar" e "Voltar"
- `HomeScreen.tsx` — FAB button
- `AddRoutineModal.tsx` — botão "Adicionar"
- `WeekCalendar.tsx` — cada botão de dia
- `MaeIAScreen.tsx` — send button
- `BottomTabBar.tsx` — central bubble button

> Nota: importar `motion` de `framer-motion` no topo de cada arquivo modificado.

- [ ] **Step 3: Rodar testes**

```bash
npm test -- --watchAll=false
```

Expected: todos passando.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/components/auth/OnboardingScreen.tsx src/components/home/HomeScreen.tsx src/components/home/AddRoutineModal.tsx src/components/home/WeekCalendar.tsx src/components/maeIA/MaeIAScreen.tsx src/components/layout/BottomTabBar.tsx
git commit -m "feat: framer-motion instalado + whileTap nos botões primários"
```

---

## Task 7: Camada 4 — Staggered fade-in no Onboarding

**Files:**
- Modify: `src/components/auth/OnboardingScreen.tsx`

- [ ] **Step 1: Adicionar `AnimatePresence` e animar a pergunta + opções**

> O código abaixo é o estado final completo do componente após as Tasks 2 e 6. Substituir o arquivo inteiro por este conteúdo.

No `OnboardingScreen.tsx`, a lógica de animação usa `step` como key para que o `AnimatePresence` detecte a mudança de pergunta e acione a animação de saída/entrada.

```tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import type { OnboardingAnswers, Q1Answer, Q2Answer, Q3Answer, Q4Answer, Q5Answer } from '../../types';

// ... (QUESTIONS array permanece igual)

export function OnboardingScreen() {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const question = QUESTIONS[step];
  const selected = answers[question.id as keyof Answers];
  const isLast = step === QUESTIONS.length - 1;

  function selectOption(value: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  }

  function handleNext() {
    if (isLast && isComplete(answers)) {
      completeOnboarding(answers as OnboardingAnswers);
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleBack() {
    setStep((s) => s - 1);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sara-cream sm:bg-[#EDE6DC]">
      <div className="w-full min-h-screen sm:w-[390px] sm:min-h-[844px] sm:max-h-[844px] bg-sara-cream flex flex-col sm:rounded-[44px] sm:shadow-2xl overflow-y-auto">
        <div className="px-6 pt-12 pb-4">
          <div className="flex items-center gap-2 mb-6">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-sara-gold' : 'bg-sara-linen'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-graphite-muted font-medium mb-2">
            Pergunta {step + 1} de {QUESTIONS.length}
          </p>
          <AnimatePresence mode="wait">
            <motion.h2
              key={`q-${step}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-base font-semibold font-serif text-graphite leading-snug"
            >
              {question.text}
            </motion.h2>
          </AnimatePresence>
        </div>

        <div className="flex-1 px-6 flex flex-col gap-3 overflow-y-auto pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={`opts-${step}`}
              className="flex flex-col gap-3"
            >
              {question.options.map((opt, index) => (
                <motion.button
                  key={opt.value}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.3 }}
                  onClick={() => selectOption(opt.value)}
                  whileTap={{ scale: 0.97 }}
                  aria-pressed={selected === opt.value}
                  className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm transition-colors ${
                    selected === opt.value
                      ? 'border-sara-gold bg-sara-linen text-graphite font-medium'
                      : 'border-sara-linen bg-sara-cream text-graphite-light'
                  }`}
                >
                  {opt.label}
                </motion.button>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="px-6 pb-10 pt-4 flex gap-3">
          {step > 0 && (
            <motion.button
              onClick={handleBack}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="flex-1 py-3 rounded-2xl border-2 border-sara-gold/40 text-sara-gold text-sm font-semibold"
            >
              Voltar
            </motion.button>
          )}
          <motion.button
            onClick={handleNext}
            disabled={!selected}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex-1 py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold disabled:opacity-40"
          >
            {isLast ? 'Ver meu perfil ✦' : 'Continuar'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function isComplete(a: Answers): a is OnboardingAnswers {
  return !!(a.q1 && a.q2 && a.q3 && a.q4 && a.q5);
}
```

- [ ] **Step 2: Rodar testes**

```bash
npm test -- --watchAll=false
```

Expected: todos passando.

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/OnboardingScreen.tsx
git commit -m "feat: staggered fade-in nas opções do onboarding"
```

---

## Task 8: Camada 4 — Timelines vivas (RoutineTimeline e BabyTimeline)

**Files:**
- Modify: `src/components/home/RoutineTimeline.tsx`
- Modify: `src/components/baby/BabyTimeline.tsx`

- [ ] **Step 1: Animar `RoutineTimeline.tsx`**

Substituir o componente `RoutineTimeline` (mantendo `EntryCard` intacto):

```tsx
import { motion } from 'framer-motion';
// ... (imports existentes permanecem)

export function RoutineTimeline() {
  const routineEntries = useAppStore((s) => s.routineEntries);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const sorted = [...routineEntries]
    .filter((e) => e.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10">
        <span className="text-4xl">🌿</span>
        <p className="text-sm text-graphite-muted">Nenhuma tarefa para hoje</p>
        <p className="text-xs text-graphite-muted">Toque em + para adicionar</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-4">
      {sorted.map((entry, index) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06, duration: 0.3 }}
        >
          <EntryCard entry={entry} />
        </motion.div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Animar `BabyTimeline.tsx`**

```tsx
import { motion } from 'framer-motion';
// ... (imports existentes permanecem)

export function BabyTimeline() {
  const babyEntries = useAppStore((s) => s.babyEntries);
  const sorted = [...babyEntries].sort((a, b) => b.time.localeCompare(a.time));

  return (
    <div className="flex flex-col gap-2 px-4">
      <h3 className="text-sm font-semibold font-serif text-graphite">Timeline de hoje</h3>
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <span className="text-3xl">🌙</span>
          <p className="text-xs text-graphite-muted">Nenhuma atividade registrada</p>
        </div>
      ) : (
        sorted.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.3 }}
            className="flex items-center gap-3 bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-3"
          >
            <div className="w-8 h-8 rounded-xl bg-sara-linen flex items-center justify-center text-lg flex-shrink-0">
              {TYPE_EMOJI[entry.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-graphite-muted font-medium">{TYPE_LABEL[entry.type]}</p>
              <p className="text-sm font-medium text-graphite truncate">{entry.detail}</p>
            </div>
            <span className="text-xs text-graphite-muted flex-shrink-0">{entry.time}</span>
          </motion.div>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 3: Rodar testes**

```bash
npm test -- --watchAll=false
```

Expected: todos passando.

- [ ] **Step 4: Commit final**

```bash
git add src/components/home/RoutineTimeline.tsx src/components/baby/BabyTimeline.tsx
git commit -m "feat: timelines animadas com Framer Motion"
```

---

## Verificação final

- [ ] `npm run build` — zero erros TypeScript
- [ ] `npm test -- --watchAll=false` — todos os testes passando
- [ ] Verificar visualmente no browser: Home, Onboarding, Baby, MãeIA, Comunidade
- [ ] Confirmar que classes `lavender`, `blush`, `sage`, `babyblue` não existem mais: `grep -r "lavender\|bg-blush\|text-blush\|bg-sage\|text-sage\|bg-babyblue" src/ --include="*.tsx" -l`
