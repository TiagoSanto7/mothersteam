# Spec — Redesign Estratégico · Grupo B

**Data:** 2026-07-18  
**Baseado em:** Feedback do designer no fix-document (seção "Review do designer")  
**Escopo:** Navegação + DashboardScreen como narrativa, seguindo a regra dos 5 blocos.

---

## Princípio central

> O Dashboard deve responder "Como vocês estão hoje?" — não "O que existe no aplicativo?"

A primeira dobra da Home nunca pode conter mais de 5 blocos de informação:
1. Header
2. Sara (hero)
3. Hoje (timeline)
4. Desenvolvimento do bebê
5. Momento com Deus

---

## 1. Navegação — Comunidade no tab bar, Shopping no sidebar

### 1.1 BottomTabBar

**Arquivo:** `src/components/layout/BottomTabBar.tsx`

Substituir o botão `shopping` pelo botão `comunidade`:

```
[Home] [MãeIA] [🌸 Bebê] [Rotina] [Comunidade]
```

- Ícone para Comunidade: `Users` do lucide-react (já instalado)
- Label: "Comunidade"
- `id="comunidade"` (mesma `TabId` existente)
- Remover o botão Shopping e seu import `ShoppingBag`

### 1.2 SideDrawer

**Arquivo:** `src/components/layout/SideDrawer.tsx`

Adicionar item "Shopping" no `<nav>`, entre Configurações e o separador de Sair:

```tsx
import { ShoppingBag } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

// dentro do nav, após Configurações:
const setActiveTab = useAppStore((s) => s.setActiveTab);

<button
  onClick={() => handleItem(() => setActiveTab('shopping'))}
  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-graphite hover:bg-white/50 active:bg-white/70 transition-colors"
>
  <ShoppingBag size={20} strokeWidth={1.8} />
  <span className="text-sm font-medium">Shopping</span>
</button>
```

Nenhuma mudança de props necessária — o drawer já usa o store internamente para logout.

### 1.3 App.tsx

Nenhuma mudança necessária. `isHomeTab` já inclui `comunidade`. O screen record já mapeia `comunidade → ComunidadeScreen`.

---

## 2. DashboardScreen — redesign como narrativa

**Arquivo principal:** `src/components/home/DashboardScreen.tsx`

### 2.1 Header emocional

**Remover:** badge de fase como pill separado.

**Adicionar:** frase contextual abaixo do nome.

Nova função `getContextualPhrase(phase: PregnancyPhase): string` (no mesmo arquivo ou em `src/lib/helpers.ts`):

```ts
pregnant week 1–13   → "Primeiro trimestre — cada dia é uma descoberta. ✨"
pregnant week 14–27  → "Você está no meio do caminho. Seu bebê está crescendo! 💛"
pregnant week 28–36  → "Reta final chegando. Você está indo muito bem. 🌷"
pregnant week 37–40  → "A hora está chegando. Respira — você foi feita para isso. ❤️"
pregnant week 41+    → "Seu bebê está prestes a chegar. Coragem! 🌸"
postpartum 0–30 d    → "Você está fazendo lindo, mesmo exausta. Isso é amor. 💪"
postpartum 31–180 d  → "Seu bebê está descobrindo o mundo com você. 🌟"
postpartum 181+ d    → "Olha até onde vocês chegaram juntos. ☀️"
```

**Layout do header:**
```
Bom dia,              ← text-[12px], text-graphite-muted
Ana 🌷               ← text-[22px], font-bold, font-serif, text-graphite
Reta final chegando…  ← text-[12px], text-graphite-muted, mt-0.5
```

O avatar continua no canto direito.

### 2.2 Sara como hero

**Arquivo:** seção no `DashboardScreen.tsx`

Aumentar o card para ter mais protagonismo:

- `p-5` (era `p-3.5`)
- Label "✦ SARA" em `text-[9px]` (mantém)
- Mensagem em `text-[13px]` → `text-[14px]`, `leading-relaxed`
- **Novo:** botão no rodapé do card:

```tsx
<button
  onClick={() => setActiveTab('maeIA')}
  className="mt-3 self-start bg-white/20 text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl"
>
  Conversar com a Sara →
</button>
```

O card passa a usar `flex flex-col` para acomodar o botão.

### 2.3 Bloco "Hoje" — substitui a row dupla

**Remover:** a `div.flex.gap-2.px-4` com os dois cards lado a lado (próximo compromisso + última mamada).

**Adicionar:** card único "Hoje" com timeline cronológica:

```
┌──────────────────────────────┐
│  Hoje                        │
│  ─────────────────────────   │
│  ○  09:30  Mamada            │
│  ✓  14:00  Pediatra          │  ← riscado se done
│  ○  20:00  Vitamina          │
│                               │
│  [+ Registrar mamada]         │
└──────────────────────────────┘
```

**Lógica de dados:**
```ts
// Entradas da rotina de hoje (routineItems já existe)
const routineRows = (routineItems ?? []).map(r => ({
  time: r.time,
  label: r.title,
  done: r.done,
  type: 'rotina' as const,
}))

// Última mamada de hoje
const todayStr = selectedDate
const lastFeedToday = babyEntries?.find(e =>
  e.type === 'feed' && e.createdAt.startsWith(todayStr)
) ?? null

const feedRow = lastFeedToday ? {
  time: new Date(lastFeedToday.createdAt).toTimeString().slice(0, 5),
  label: 'Mamada',
  done: true,
  type: 'feed' as const,
} : null

// Merge e ordenar por time
const timelineRows = [...routineRows, ...(feedRow ? [feedRow] : [])]
  .sort((a, b) => a.time.localeCompare(b.time))
```

**Renderização:**
- Cada linha: `HH:MM · [label]` — done items em `text-graphite-muted line-through`
- Se `timelineRows.length === 0`: texto "Dia livre hoje 🌸"
- Botão "Registrar mamada" no rodapé abre `QuickRegisterSheet` (mantém comportamento atual)

### 2.4 Remover card Comunidade

**Remover** o card de Comunidade da `DashboardScreen` inteiramente.

Motivação: Comunidade agora está no tab bar com acesso direto. O card na home era apenas um atalho — redundante.

### 2.5 BabyDevCard

Sem mudanças estruturais neste ciclo. Permanece como está.

### 2.6 MomentoDeusCard — redesign como convite

**Arquivo:** `src/components/home/MomentoDeusCard.tsx`

O card deixa de ser um "preview do versículo" e vira um **convite experiencial**:

```
┌──────────────────────────────┐  ← gradiente por período do dia
│  ☀️                          │  ← ícone grande, centralizado
│                               │
│  Separe um minuto.            │  ← headline bold, text-white
│  Tem uma palavra para você.   │  ← subtitle white/70
│                               │
│  ─────────────────────────   │  ← divisor white/20
│                               │
│  "Antes de te formar…"        │  ← versículo truncado (50 chars)
│  Jeremias 1:5                 │  ← referência white/70
│                               │
│  Entrar nesse momento →       │  ← CTA white/80, text-[11px]
└──────────────────────────────┘
```

**Mudanças no layout:**
- Remover o label uppercase "MOMENTO COM DEUS"
- Adicionar ícone do mood centralizado (`text-3xl`, `text-center`)
- Headline: `"Separe um minuto."` em `text-[15px] font-bold text-white`
- Subtitle: `"Tem uma palavra para você."` em `text-[12px] text-white/70`
- Divisor: `<hr className="border-white/20 my-3" />`
- Versículo: max 50 chars (era 80) — mais impactante, menos explicativo
- CTA: `"Entrar nesse momento →"` em `text-[11px] text-white/80`

---

## 3. Resumo de arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/components/layout/BottomTabBar.tsx` | Shopping → Comunidade |
| `src/components/layout/SideDrawer.tsx` | Adicionar item Shopping |
| `src/components/home/DashboardScreen.tsx` | Header emocional, Sara hero, bloco Hoje, remover Comunidade card |
| `src/components/home/MomentoDeusCard.tsx` | Redesign como convite |

Função `getContextualPhrase` deve ser adicionada em `src/lib/helpers.ts` (onde já vivem `buildPhase` e `apiPostToCommunityPost`) e importada no `DashboardScreen.tsx`.

---

## 4. Fora de escopo deste ciclo

- Substituir emojis do BabyDevCard por ilustrações próprias (requer assets de design)
- Carrossel de novidades da Comunidade no Dashboard
- Microinterações e linguagem de animações consistente para o app inteiro
- Qualquer mudança no Grupo A (spec separado)
