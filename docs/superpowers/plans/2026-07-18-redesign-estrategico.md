# Redesign Estratégico — Dashboard + Navegação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o Dashboard de uma lista de cards em uma narrativa, e mover Comunidade para o tab bar substituindo Shopping (que vai para o SideDrawer).

**Architecture:** Mudanças focadas em 5 arquivos existentes — BottomTabBar, SideDrawer, helpers.ts, DashboardScreen e MomentoDeusCard. Nenhum novo arquivo é criado. A função `getContextualPhrase` vai para `helpers.ts` e é importada em `DashboardScreen`. O bloco "Hoje" processa `routineItems` + `babyEntries` inline no DashboardScreen.

**Tech Stack:** React 18 + TypeScript, Vite, Zustand 5, Framer Motion 11, Tailwind CSS, Vitest + React Testing Library

---

## File Map

| Arquivo | Mudança |
|---|---|
| `src/components/layout/BottomTabBar.tsx` | Shopping → Comunidade (tab + ícone) |
| `src/components/layout/BottomTabBar.test.tsx` | Atualizar testes que checam `tab-shopping` |
| `src/components/layout/SideDrawer.tsx` | Adicionar item Shopping |
| `src/lib/helpers.ts` | Adicionar `getContextualPhrase(phase)` |
| `src/components/home/DashboardScreen.tsx` | Header emocional + Sara hero + bloco Hoje + remover card Comunidade |
| `src/components/home/DashboardScreen.test.tsx` | Atualizar testes do row duplo; adicionar testes do bloco Hoje |
| `src/components/home/MomentoDeusCard.tsx` | Redesign como convite |

---

### Task 1: Navegação — BottomTabBar (Shopping → Comunidade) + SideDrawer

**Files:**
- Modify: `src/components/layout/BottomTabBar.tsx`
- Modify: `src/components/layout/BottomTabBar.test.tsx`
- Modify: `src/components/layout/SideDrawer.tsx`

- [ ] **Step 1: Atualizar testes do BottomTabBar para refletir a mudança**

Em `src/components/layout/BottomTabBar.test.tsx`, substituir os dois testes afetados:

```ts
// ANTES (apagar estas duas):
it('renders 5 navigation items including Rotina', () => {
  render(<BottomTabBar />);
  expect(screen.getByTestId('tab-shopping')).toBeInTheDocument();
  // ...
});

it('does not render Comunidade tab', () => {
  render(<BottomTabBar />);
  expect(screen.queryByTestId('tab-comunidade')).not.toBeInTheDocument();
});

// DEPOIS (substituir por estas duas):
it('renders 5 navigation items with Comunidade (not Shopping)', () => {
  render(<BottomTabBar />);
  expect(screen.getByTestId('tab-home')).toBeInTheDocument();
  expect(screen.getByTestId('tab-maeIA')).toBeInTheDocument();
  expect(screen.getByTestId('baby-central-button')).toBeInTheDocument();
  expect(screen.getByTestId('tab-rotina')).toBeInTheDocument();
  expect(screen.getByTestId('tab-comunidade')).toBeInTheDocument();
  expect(screen.queryByTestId('tab-shopping')).not.toBeInTheDocument();
});

it('activates comunidade tab when clicked', () => {
  render(<BottomTabBar />);
  fireEvent.click(screen.getByTestId('tab-comunidade'));
  expect(useAppStore.getState().activeTab).toBe('comunidade');
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/layout/BottomTabBar.test.tsx
```

Expected: FAIL — `tab-comunidade` not found, `tab-shopping` still present.

- [ ] **Step 3: Update BottomTabBar — replace Shopping with Comunidade**

Em `src/components/layout/BottomTabBar.tsx`:

Trocar o import do ícone:
```tsx
// REMOVER: ShoppingBag
// ADICIONAR: Users
import { Home, MessageCircle, Calendar, Users } from 'lucide-react';
```

Substituir o botão Shopping (último botão) pelo botão Comunidade:
```tsx
// REMOVER:
<TabBtn id="shopping" label="Shopping" active={activeTab === 'shopping'} onClick={() => setActiveTab('shopping')}>
  <ShoppingBag size={22} strokeWidth={1.8} />
</TabBtn>

// ADICIONAR:
<TabBtn id="comunidade" label="Comunidade" active={activeTab === 'comunidade'} onClick={() => setActiveTab('comunidade')}>
  <Users size={22} strokeWidth={1.8} />
</TabBtn>
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/layout/BottomTabBar.test.tsx
```

Expected: PASS (todos os 6 testes).

- [ ] **Step 5: Add Shopping to SideDrawer**

Em `src/components/layout/SideDrawer.tsx`:

Adicionar import:
```tsx
import { X, User, Settings, LogOut, ShoppingBag } from 'lucide-react';
```

Adicionar `setActiveTab` do store (no início da função, junto com `motherName` e `clearAuth`):
```tsx
const setActiveTab = useAppStore((s) => s.setActiveTab);
```

No `<nav>`, após o botão de Configurações, adicionar:
```tsx
<button
  onClick={() => handleItem(() => setActiveTab('shopping'))}
  aria-label="Shopping"
  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-graphite hover:bg-white/50 active:bg-white/70 transition-colors"
>
  <ShoppingBag size={20} strokeWidth={1.8} />
  <span className="text-sm font-medium">Shopping</span>
</button>
```

- [ ] **Step 6: Run SideDrawer tests**

```bash
npx vitest run src/components/layout/SideDrawer.test.tsx
```

Expected: PASS (verificar que nenhum teste existente quebrou).

- [ ] **Step 7: Verify in browser**

```bash
npm run dev
```

- Tab bar deve mostrar: Home | MãeIA | 🌸 | Rotina | Comunidade
- Hamúrger menu → SideDrawer deve ter "Shopping" entre Configurações e Sair
- Tocar "Shopping" no drawer deve abrir a tela de shopping

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/BottomTabBar.tsx src/components/layout/BottomTabBar.test.tsx src/components/layout/SideDrawer.tsx
git commit -m "feat(nav): replace Shopping tab with Comunidade; move Shopping to SideDrawer"
```

---

### Task 2: helpers.ts — getContextualPhrase

**Files:**
- Modify: `src/lib/helpers.ts`

- [ ] **Step 1: Write the failing test**

Em `src/lib/helpers.test.ts` (criar se não existir):
```ts
import { describe, it, expect } from 'vitest'
import { getContextualPhrase } from './helpers'
import type { PregnancyPhase } from '../types'

describe('getContextualPhrase', () => {
  it('returns trimester 1 phrase for week 8', () => {
    const phase: PregnancyPhase = { stage: 'pregnant', week: 8 }
    expect(getContextualPhrase(phase)).toContain('Primeiro trimestre')
  })

  it('returns trimester 2 phrase for week 20', () => {
    const phase: PregnancyPhase = { stage: 'pregnant', week: 20 }
    expect(getContextualPhrase(phase)).toContain('meio do caminho')
  })

  it('returns trimester 3 phrase for week 32', () => {
    const phase: PregnancyPhase = { stage: 'pregnant', week: 32 }
    expect(getContextualPhrase(phase)).toContain('Reta final')
  })

  it('returns pre-term phrase for week 38', () => {
    const phase: PregnancyPhase = { stage: 'pregnant', week: 38 }
    expect(getContextualPhrase(phase)).toContain('hora está chegando')
  })

  it('returns overdue phrase for week 42', () => {
    const phase: PregnancyPhase = { stage: 'pregnant', week: 42 }
    expect(getContextualPhrase(phase)).toContain('prestes a chegar')
  })

  it('returns newborn phrase for ageInDays 10', () => {
    const phase: PregnancyPhase = { stage: 'postpartum', ageInDays: 10 }
    expect(getContextualPhrase(phase)).toContain('mesmo exausta')
  })

  it('returns early postpartum phrase for ageInDays 60', () => {
    const phase: PregnancyPhase = { stage: 'postpartum', ageInDays: 60 }
    expect(getContextualPhrase(phase)).toContain('descobrindo o mundo')
  })

  it('returns late postpartum phrase for ageInDays 200', () => {
    const phase: PregnancyPhase = { stage: 'postpartum', ageInDays: 200 }
    expect(getContextualPhrase(phase)).toContain('até onde vocês chegaram')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/helpers.test.ts
```

Expected: FAIL — `getContextualPhrase` not exported from helpers.

- [ ] **Step 3: Add getContextualPhrase to helpers.ts**

Em `src/lib/helpers.ts`, adicionar no final do arquivo (antes de qualquer último export se houver):
```ts
import type { PregnancyPhase } from '../types'

export function getContextualPhrase(phase: PregnancyPhase): string {
  if (phase.stage === 'pregnant') {
    if (phase.week <= 13) return 'Primeiro trimestre — cada dia é uma descoberta. ✨'
    if (phase.week <= 27) return 'Você está no meio do caminho. Seu bebê está crescendo! 💛'
    if (phase.week <= 36) return 'Reta final chegando. Você está indo muito bem. 🌷'
    if (phase.week <= 40) return 'A hora está chegando. Respira — você foi feita para isso. ❤️'
    return 'Seu bebê está prestes a chegar. Coragem! 🌸'
  }
  // postpartum
  if (phase.ageInDays <= 30) return 'Você está fazendo lindo, mesmo exausta. Isso é amor. 💪'
  if (phase.ageInDays <= 180) return 'Seu bebê está descobrindo o mundo com você. 🌟'
  return 'Olha até onde vocês chegaram juntos. ☀️'
}
```

Note: `PregnancyPhase` is already imported in `helpers.ts` — check if the import exists; if not, add it. The type is defined in `src/types/index.ts` or `src/types.ts`.

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/helpers.test.ts
```

Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/helpers.ts src/lib/helpers.test.ts
git commit -m "feat(helpers): add getContextualPhrase for emotional dashboard header"
```

---

### Task 3: DashboardScreen — header emocional + Sara hero

**Files:**
- Modify: `src/components/home/DashboardScreen.tsx`
- Modify: `src/components/home/DashboardScreen.test.tsx`

- [ ] **Step 1: Write failing tests**

Em `src/components/home/DashboardScreen.test.tsx`, adicionar ao final do arquivo:

```tsx
describe('DashboardScreen — emotional header', () => {
  it('shows contextual phrase for pregnant phase', () => {
    useAppStore.setState({
      isLoggedIn: true,
      motherName: 'Ana',
      phase: { stage: 'pregnant', week: 32 },
    })
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    expect(screen.getByText(/Reta final chegando/i)).toBeTruthy()
  })

  it('shows contextual phrase for postpartum phase', () => {
    useAppStore.setState({
      isLoggedIn: true,
      motherName: 'Ana',
      phase: { stage: 'postpartum', ageInDays: 10 },
    })
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    expect(screen.getByText(/mesmo exausta/i)).toBeTruthy()
  })
})

describe('DashboardScreen — Sara hero CTA', () => {
  it('shows "Conversar com a Sara" button', () => {
    useAppStore.setState({ isLoggedIn: true, motherName: 'Ana', phase: { stage: 'pregnant', week: 28 } })
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /conversar com a sara/i })).toBeTruthy()
  })

  it('"Conversar com a Sara" navigates to maeIA tab', () => {
    useAppStore.setState({ isLoggedIn: true, motherName: 'Ana', phase: { stage: 'pregnant', week: 28 }, activeTab: 'home' })
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /conversar com a sara/i }))
    expect(useAppStore.getState().activeTab).toBe('maeIA')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/home/DashboardScreen.test.tsx
```

Expected: FAIL — contextual phrase not found, "Conversar com a Sara" button not found.

- [ ] **Step 3: Update DashboardScreen — import getContextualPhrase**

Em `src/components/home/DashboardScreen.tsx`:

Adicionar import:
```tsx
import { getContextualPhrase } from '../../lib/helpers'
```

- [ ] **Step 4: Update the header JSX**

No `DashboardScreen`, substituir o bloco `{/* Header */}` inteiro (linhas 83-97 aproximadamente):

```tsx
{/* Header */}
<div className="flex items-start justify-between px-4 pt-5">
  <div>
    <p className="text-[12px] text-graphite-muted font-medium">
      {getGreeting()},
    </p>
    <p className="text-[22px] font-bold font-serif text-graphite leading-tight">
      {motherName || 'Mãe'} 🌷
    </p>
    <p className="text-[12px] text-graphite-muted mt-0.5">
      {getContextualPhrase(phase)}
    </p>
  </div>
  <div className="w-9 h-9 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
    {initial}
  </div>
</div>
```

- [ ] **Step 5: Update the Sara card JSX — make it a hero**

Substituir o bloco `{/* Sara card */}` (linhas 99-108 aproximadamente):

```tsx
{/* Sara card — hero */}
<div className="mx-4 rounded-2xl p-5 bg-gradient-to-br from-sara-gold to-sara-terracotta shadow-md flex flex-col">
  <p className="text-[9px] font-bold text-white/75 uppercase tracking-wide mb-2">
    ✦ Sara diz
  </p>
  <p className="text-[14px] font-medium text-white leading-relaxed flex-1">
    "{saraMensagem.mensagem}"
  </p>
  <button
    onClick={() => setActiveTab('maeIA')}
    aria-label="Conversar com a Sara"
    className="mt-3 self-start bg-white/20 text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl"
  >
    Conversar com a Sara →
  </button>
</div>
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run src/components/home/DashboardScreen.test.tsx
```

Expected: All tests pass including the 4 new ones.

- [ ] **Step 7: Commit**

```bash
git add src/components/home/DashboardScreen.tsx src/components/home/DashboardScreen.test.tsx
git commit -m "feat(dashboard): emotional header with contextual phrase + Sara hero card with CTA"
```

---

### Task 4: DashboardScreen — bloco "Hoje" (substitui row dupla)

**Files:**
- Modify: `src/components/home/DashboardScreen.tsx`
- Modify: `src/components/home/DashboardScreen.test.tsx`

- [ ] **Step 1: Write failing tests**

Em `src/components/home/DashboardScreen.test.tsx`, adicionar:

```tsx
describe('DashboardScreen — bloco Hoje', () => {
  it('renders "Hoje" section heading', () => {
    useAppStore.setState({ isLoggedIn: true, motherName: 'Ana', phase: { stage: 'pregnant', week: 28 } })
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    expect(screen.getByText('Hoje')).toBeTruthy()
  })

  it('shows "Dia livre hoje" when no routine items and no feed', () => {
    useAppStore.setState({ isLoggedIn: true, motherName: 'Ana', phase: { stage: 'pregnant', week: 28 } })
    render(<DashboardScreen />, { wrapper: makeWrapper([], []) })
    expect(screen.getByText(/dia livre hoje/i)).toBeTruthy()
  })

  it('shows routine item in timeline', () => {
    useAppStore.setState({ isLoggedIn: true, motherName: 'Ana', phase: { stage: 'pregnant', week: 28 } })
    render(<DashboardScreen />, { wrapper: makeWrapper([ROUTINE_ENTRY], []) })
    expect(screen.getByText('Pediatra')).toBeTruthy()
    expect(screen.getByText('23:59')).toBeTruthy()
  })

  it('shows mamada in timeline from today feed entry', () => {
    useAppStore.setState({
      isLoggedIn: true,
      motherName: 'Ana',
      phase: { stage: 'postpartum', ageInDays: 60 },
      selectedDate: new Date().toISOString().split('T')[0],
    })
    // FEED_ENTRY has createdAt = now - 80min (today)
    render(<DashboardScreen />, { wrapper: makeWrapper([], [FEED_ENTRY]) })
    expect(screen.getByText('Mamada')).toBeTruthy()
  })

  it('shows "Registrar mamada" button', () => {
    useAppStore.setState({ isLoggedIn: true, motherName: 'Ana', phase: { stage: 'postpartum', ageInDays: 60 } })
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /registrar mamada/i })).toBeTruthy()
  })
})
```

Note: os testes existentes que testam "Próximo compromisso" e "Última mamada" como cards separados devem ser removidos, pois o layout mudou. Buscar e deletar testes que contenham `screen.getByText(/próximo/i)` ou `screen.getByText(/última mamada/i)` como headings de cards separados.

- [ ] **Step 2: Remove obsolete "row dupla" tests**

No `DashboardScreen.test.tsx`, localizar e deletar testes que testem o layout antigo de row dupla. Procurar por testes com:
- `'Nenhum compromisso hoje'` como texto esperado em um card separado
- `'Nenhum registro ainda'` como texto de card separado
- Verificações de `'Próximo'` como label uppercase de card

Manter os testes de `formatPhase`, `relativeTimeFeed` e `getGreeting` (são pure functions e não mudam).

- [ ] **Step 3: Run tests to verify new ones fail (old ones removed)**

```bash
npx vitest run src/components/home/DashboardScreen.test.tsx
```

Expected: novos testes FAIL; testes de pure functions PASS.

- [ ] **Step 4: Replace the row dupla with bloco "Hoje" in DashboardScreen**

No `DashboardScreen.tsx`:

**Remover** o bloco `{/* Row: next appointment + last feed */}` inteiro (a `div.flex.gap-2.px-4` com os dois cards side-by-side).

**Adicionar** após o Sara card, no lugar do bloco removido:

Primeiro, adicionar o processamento de dados inline (antes do `return`):

```tsx
const todayStr = selectedDate

const timelineRows = useMemo(() => {
  const routineRows = (routineItems ?? []).map((r) => ({
    time: r.time,
    label: r.title,
    done: r.done,
    type: 'rotina' as const,
  }))

  const lastFeedToday = babyEntries?.find(
    (e) => e.type === 'feed' && e.createdAt.startsWith(todayStr)
  ) ?? null

  const feedRow = lastFeedToday
    ? {
        time: (() => {
          const d = new Date(lastFeedToday.createdAt)
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        })(),
        label: 'Mamada',
        done: true,
        type: 'feed' as const,
      }
    : null

  return [...routineRows, ...(feedRow ? [feedRow] : [])].sort((a, b) =>
    a.time.localeCompare(b.time)
  )
}, [routineItems, babyEntries, todayStr])
```

**Adicionar o JSX do bloco "Hoje":**

```tsx
{/* Bloco Hoje */}
<div className="mx-4 bg-white rounded-2xl p-3.5 shadow-sm">
  <p className="text-[9px] font-bold text-graphite-muted uppercase tracking-wide mb-2">
    Hoje
  </p>

  {timelineRows.length === 0 ? (
    <p className="text-[12px] text-graphite-muted">Dia livre hoje 🌸</p>
  ) : (
    <div className="flex flex-col gap-2">
      {timelineRows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              row.done ? 'bg-graphite-muted/40' : 'bg-sara-gold'
            }`}
          />
          <span className="text-[11px] text-graphite-muted w-9 flex-shrink-0">
            {row.time}
          </span>
          <span
            className={`text-[12px] font-medium ${
              row.done && row.type === 'rotina' ? 'line-through text-graphite-muted' : 'text-graphite'
            }`}
          >
            {row.label}
          </span>
        </div>
      ))}
    </div>
  )}

  <button
    onClick={() => setSheetOpen(true)}
    aria-label="Registrar mamada"
    className="mt-2.5 inline-block bg-sara-gold text-white rounded-xl text-[10px] font-semibold px-2.5 py-1"
  >
    + Registrar mamada
  </button>
</div>
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/components/home/DashboardScreen.test.tsx
```

Expected: PASS (todos os testes incluindo os 5 novos do bloco Hoje).

- [ ] **Step 6: Commit**

```bash
git add src/components/home/DashboardScreen.tsx src/components/home/DashboardScreen.test.tsx
git commit -m "feat(dashboard): replace dual-card row with unified 'Hoje' timeline"
```

---

### Task 5: DashboardScreen — remover card Comunidade

**Files:**
- Modify: `src/components/home/DashboardScreen.tsx`
- Modify: `src/components/home/DashboardScreen.test.tsx`

- [ ] **Step 1: Remove Comunidade card tests**

No `DashboardScreen.test.tsx`, remover qualquer teste que verifique:
- `screen.getByText(/comunidade/i)` como heading de card no dashboard
- `screen.getByText(/ir para o feed/i)`
- `screen.getByRole('button', { name: /ir para a comunidade/i })`

- [ ] **Step 2: Run tests to verify the suite still passes without those tests**

```bash
npx vitest run src/components/home/DashboardScreen.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Remove the Comunidade card JSX from DashboardScreen**

No `DashboardScreen.tsx`, localizar e deletar o bloco `{/* Community card */}`:

```tsx
// DELETAR este bloco inteiro (aproximadamente linhas 150-170 após as mudanças anteriores):
{/* Community card */}
<div className="mx-4 bg-white rounded-2xl p-3.5 shadow-sm">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-[9px] font-bold text-graphite-muted uppercase tracking-wide mb-0.5">
        Comunidade
      </p>
      <p className="text-[13px] font-semibold text-graphite">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-sara-terracotta mr-1.5 align-middle" />
        Ir para o feed
      </p>
    </div>
    <button
      onClick={() => setActiveTab('comunidade')}
      aria-label="Ir para a comunidade"
      className="text-[10px] font-semibold text-sara-gold"
    >
      Ver →
    </button>
  </div>
</div>
```

- [ ] **Step 4: Verify the final dashboard card order**

Após a remoção, o DashboardScreen deve renderizar nesta ordem:
1. Header (emocional)
2. Sara card (hero)
3. Bloco Hoje (timeline)
4. BabyDevCard
5. MomentoDeusCard (ainda não redesenhado — próxima task)

Verificar visualmente em `npm run dev` que a ordem está correta e que não há card de Comunidade.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/DashboardScreen.tsx src/components/home/DashboardScreen.test.tsx
git commit -m "feat(dashboard): remove Comunidade card — community accessible via tab bar"
```

---

### Task 6: MomentoDeusCard — redesign como convite

**Files:**
- Modify: `src/components/home/MomentoDeusCard.tsx`

- [ ] **Step 1: Write failing tests**

Criar `src/components/home/MomentoDeusCard.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MomentoDeusCard } from './MomentoDeusCard'
import { useAppStore } from '../../store/useAppStore'

beforeEach(() => {
  useAppStore.setState({ isLoggedIn: true })
})

describe('MomentoDeusCard — convite', () => {
  it('renders "Separe um minuto." headline', () => {
    render(<MomentoDeusCard onClick={vi.fn()} />)
    expect(screen.getByText('Separe um minuto.')).toBeTruthy()
  })

  it('renders "Tem uma palavra para você." subtitle', () => {
    render(<MomentoDeusCard onClick={vi.fn()} />)
    expect(screen.getByText('Tem uma palavra para você.')).toBeTruthy()
  })

  it('renders "Entrar nesse momento →" CTA', () => {
    render(<MomentoDeusCard onClick={vi.fn()} />)
    expect(screen.getByText('Entrar nesse momento →')).toBeTruthy()
  })

  it('calls onClick when tapped', () => {
    const onClick = vi.fn()
    render(<MomentoDeusCard onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: /abrir momento com deus/i }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/home/MomentoDeusCard.test.tsx
```

Expected: FAIL — "Separe um minuto." não encontrado.

- [ ] **Step 3: Rewrite MomentoDeusCard**

Substituir todo o conteúdo de `src/components/home/MomentoDeusCard.tsx`:
```tsx
import { useMemo } from 'react'
import { getMomentoDoDia, getMoodPeriod, MOOD_CONFIG } from '../../data/momentoDeus'

interface Props { onClick: () => void }

export function MomentoDeusCard({ onClick }: Props) {
  const momento = useMemo(() => getMomentoDoDia(), [])
  const mood = useMemo(() => getMoodPeriod(), [])
  const config = MOOD_CONFIG[mood]

  const versoPreview = momento.verso.slice(0, 50) + (momento.verso.length > 50 ? '…' : '')

  return (
    <button
      onClick={onClick}
      aria-label="Abrir Momento com Deus"
      className="mx-4 w-[calc(100%-2rem)] rounded-2xl p-5 text-left active:scale-[0.98] transition-transform overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${config.gradientFrom}, ${config.gradientTo})` }}
    >
      {/* Ícone do período */}
      <p className="text-2xl text-center mb-3">{config.icon}</p>

      {/* Headline */}
      <p className="text-[15px] font-bold text-white text-center leading-snug">
        Separe um minuto.
      </p>
      <p className="text-[12px] text-white/70 text-center mt-0.5 mb-4">
        Tem uma palavra para você.
      </p>

      {/* Divisor */}
      <hr className="border-white/20 mb-4" />

      {/* Preview do versículo */}
      <p className="text-[13px] font-medium text-white leading-snug text-center mb-1">
        "{versoPreview}"
      </p>
      <p className="text-[10px] text-white/60 text-center mb-3">
        {momento.referencia}
      </p>

      {/* CTA */}
      <p className="text-[11px] text-white/80 text-center font-semibold">
        Entrar nesse momento →
      </p>
    </button>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/home/MomentoDeusCard.test.tsx
```

Expected: PASS (4 tests).

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
npx vitest run
```

Expected: PASS em todos os testes.

- [ ] **Step 6: Verify visually in browser**

```bash
npm run dev
```

Verificar no Dashboard:
- MomentoDeusCard exibe ícone do período grande, "Separe um minuto.", versículo curto, "Entrar nesse momento →"
- Gradiente muda conforme o horário do dia
- Tocar abre MomentoDeusScreen normalmente

- [ ] **Step 7: Commit**

```bash
git add src/components/home/MomentoDeusCard.tsx src/components/home/MomentoDeusCard.test.tsx
git commit -m "feat(dashboard): redesign MomentoDeusCard as experiential invite"
```

---

## Done

Todas as 6 tasks completas:
- Comunidade no tab bar, Shopping no SideDrawer
- `getContextualPhrase` adicionada a helpers.ts
- Header com saudação + nome + frase emocional contextual
- Sara card com mais espaço e botão "Conversar com a Sara"
- Bloco "Hoje" unificando rotina + mamada em timeline cronológica
- Card Comunidade removido do Dashboard
- MomentoDeusCard redesenhado como convite experiencial
