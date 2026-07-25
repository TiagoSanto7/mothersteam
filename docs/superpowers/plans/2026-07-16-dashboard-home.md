# Dashboard Home (Fase 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the community feed as the home tab with a personalised dashboard (Sara message, next appointment, last feeding, community link, daily verse) and a quick-register bottom sheet for breastfeeding.

**Architecture:** Two new components under `src/components/home/` — `DashboardScreen` (container, two TanStack queries, no server-side changes) and `QuickRegisterSheet` (bottom sheet, one POST mutation). A single line changes in `App.tsx` to route the `home` tab to the new screen. No backend changes, no navigation changes, no schema changes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS (custom colour tokens: `sara-gold`, `sara-terracotta`, `sara-linen`, `graphite`, `graphite-muted`), TanStack Query v5, Zustand 5, Vitest + Testing Library.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/components/home/DashboardScreen.tsx` | Full dashboard layout; two queries (`/routine`, `/baby`); opens sheet |
| Create | `src/components/home/QuickRegisterSheet.tsx` | Bottom sheet overlay; POST `/baby`; invalidates `['baby']` cache |
| Create | `src/components/home/DashboardScreen.test.tsx` | Tests for greeting, phase label, empty states, navigation |
| Create | `src/components/home/QuickRegisterSheet.test.tsx` | Tests for side toggle, POST mutation |
| Modify | `src/App.tsx:145` | `home: <ComunidadeScreen />` → `home: <DashboardScreen />` |

---

## Task 1 — QuickRegisterSheet

**Files:**
- Create: `src/components/home/QuickRegisterSheet.tsx`
- Create: `src/components/home/QuickRegisterSheet.test.tsx`

- [ ] **Step 1.1 — Write the failing tests**

```tsx
// src/components/home/QuickRegisterSheet.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { QuickRegisterSheet } from './QuickRegisterSheet'
import { useAppStore } from '../../store/useAppStore'

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }))
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }))

function makeWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

beforeEach(() => {
  useAppStore.setState({ isLoggedIn: true, lastFeedSide: 'left' })
  mockApiFetch.mockResolvedValue({})
})

describe('QuickRegisterSheet', () => {
  it('pre-selects Direito when lastFeedSide is left', () => {
    useAppStore.setState({ lastFeedSide: 'left' })
    render(<QuickRegisterSheet open onClose={vi.fn()} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /direito/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /esquerdo/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('pre-selects Esquerdo when lastFeedSide is right', () => {
    useAppStore.setState({ lastFeedSide: 'right' })
    render(<QuickRegisterSheet open onClose={vi.fn()} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /esquerdo/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('switches selection when user taps the other side', () => {
    render(<QuickRegisterSheet open onClose={vi.fn()} />, { wrapper: makeWrapper() })
    // starts with Direito selected (lastFeedSide: left)
    fireEvent.click(screen.getByRole('button', { name: /esquerdo/i }))
    expect(screen.getByRole('button', { name: /esquerdo/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls POST /baby with type feed and the selected detail on submit', async () => {
    useAppStore.setState({ lastFeedSide: 'left' })
    render(<QuickRegisterSheet open onClose={vi.fn()} />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /registrar mamada agora/i }))
    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/baby',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"detail":"Direito"'),
        }),
      ),
    )
  })

  it('calls onClose after successful registration', async () => {
    const onClose = vi.fn()
    render(<QuickRegisterSheet open onClose={onClose} />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /registrar mamada agora/i }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
```

- [ ] **Step 1.2 — Run tests to confirm they fail**

```
npx vitest run src/components/home/QuickRegisterSheet.test.tsx
```

Expected: 5 failures — `QuickRegisterSheet` does not exist yet.

- [ ] **Step 1.3 — Implement QuickRegisterSheet**

```tsx
// src/components/home/QuickRegisterSheet.tsx
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../../store/useAppStore'
import { apiFetch } from '../../lib/api'

interface QuickRegisterSheetProps {
  open: boolean
  onClose: () => void
}

export function QuickRegisterSheet({ open, onClose }: QuickRegisterSheetProps) {
  const lastFeedSide = useAppStore((s) => s.lastFeedSide)
  const setFeedSide = useAppStore((s) => s.setFeedSide)
  const queryClient = useQueryClient()

  const [selectedSide, setSelectedSide] = useState<'Esquerdo' | 'Direito'>(
    lastFeedSide === 'left' ? 'Direito' : 'Esquerdo',
  )

  useEffect(() => {
    if (open) setSelectedSide(lastFeedSide === 'left' ? 'Direito' : 'Esquerdo')
  }, [open, lastFeedSide])

  const nowDisplay = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const mutation = useMutation({
    mutationFn: () => {
      const time = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
      return apiFetch('/baby', {
        method: 'POST',
        body: JSON.stringify({ type: 'feed', time, detail: selectedSide }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baby'] })
      setFeedSide(selectedSide === 'Esquerdo' ? 'left' : 'right')
      onClose()
    },
  })

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end transition-all duration-200 ${
        open ? 'bg-black/40' : 'bg-transparent pointer-events-none'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`w-full bg-[#FAF7F2] rounded-t-3xl px-5 pb-8 pt-4 transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="w-9 h-1 rounded-full bg-[#D4C0A8] mx-auto mb-4" />

        <p className="text-[15px] font-bold text-graphite mb-4">Registrar mamada</p>

        <p className="text-[10px] font-semibold text-graphite-muted uppercase tracking-wide mb-2">
          Qual seio?
        </p>
        <div className="flex gap-2 mb-4">
          {(['Esquerdo', 'Direito'] as const).map((side) => (
            <button
              key={side}
              onClick={() => setSelectedSide(side)}
              aria-pressed={selectedSide === side}
              className={`flex-1 py-2.5 rounded-2xl text-[13px] font-semibold border-2 transition-colors ${
                selectedSide === side
                  ? 'border-sara-gold bg-sara-gold/10 text-sara-gold'
                  : 'border-sara-linen bg-white text-graphite-muted'
              }`}
            >
              {side === 'Esquerdo' ? '← Esquerdo' : 'Direito →'}
            </button>
          ))}
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          aria-label="Registrar mamada agora"
          className="w-full py-3.5 rounded-2xl bg-sara-gold text-white text-[14px] font-bold disabled:opacity-60"
        >
          {mutation.isPending ? 'Registrando...' : 'Registrar agora'}
        </button>

        <p className="text-[11px] text-graphite-muted text-center mt-3">
          Horário: agora · {nowDisplay}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 1.4 — Run tests to confirm they pass**

```
npx vitest run src/components/home/QuickRegisterSheet.test.tsx
```

Expected: 5 passing.

- [ ] **Step 1.5 — Commit**

```bash
git add src/components/home/QuickRegisterSheet.tsx src/components/home/QuickRegisterSheet.test.tsx
git commit -m "feat(home): add QuickRegisterSheet bottom sheet for breastfeeding"
```

---

## Task 2 — DashboardScreen

**Files:**
- Create: `src/components/home/DashboardScreen.tsx`
- Create: `src/components/home/DashboardScreen.test.tsx`

- [ ] **Step 2.1 — Write the failing tests**

```tsx
// src/components/home/DashboardScreen.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardScreen, formatPhase, relativeTimeFeed } from './DashboardScreen'
import { useAppStore } from '../../store/useAppStore'
import type { ApiRoutineEntry, ApiBabyEntry } from '../../lib/types'
import type { PregnancyPhase } from '../../types'

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }))
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }))

const ROUTINE_ENTRY: ApiRoutineEntry = {
  id: '1', title: 'Pediatra', time: '23:59', date: new Date().toISOString().split('T')[0],
  category: 'appointment', done: false, userId: 'u1', createdAt: new Date().toISOString(),
}

const FEED_ENTRY: ApiBabyEntry = {
  id: '1', time: '10:00', type: 'feed', detail: 'Esquerdo',
  userId: 'u1', createdAt: new Date(Date.now() - 80 * 60_000).toISOString(),
}

function makeWrapper(
  routineItems: ApiRoutineEntry[] = [],
  babyEntries: ApiBabyEntry[] = [],
) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const today = new Date().toISOString().split('T')[0]
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    qc.setQueryData(['routine', today], routineItems)
    qc.setQueryData(['baby'], babyEntries)
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

beforeEach(() => {
  useAppStore.setState({
    isLoggedIn: true,
    motherName: 'Ana',
    phase: { stage: 'postpartum', ageInDays: 132 } as PregnancyPhase,
    lastFeedSide: 'left',
  })
  mockApiFetch.mockResolvedValue([])
})

// ── Pure helper unit tests ──────────────────────────────────────────────────

describe('formatPhase', () => {
  it('formats pregnant phase', () => {
    expect(formatPhase({ stage: 'pregnant', week: 20 })).toBe('Grávida · semana 20')
  })

  it('formats postpartum with months and days', () => {
    expect(formatPhase({ stage: 'postpartum', ageInDays: 132 })).toBe('Bebê · 4 meses e 12 dias')
  })

  it('formats postpartum with only months when days is 0', () => {
    expect(formatPhase({ stage: 'postpartum', ageInDays: 60 })).toBe('Bebê · 2 meses')
  })

  it('formats postpartum with only days when less than 30', () => {
    expect(formatPhase({ stage: 'postpartum', ageInDays: 10 })).toBe('Bebê · 10 dias')
  })
})

describe('relativeTimeFeed', () => {
  it('returns "agora" for less than 1 minute ago', () => {
    expect(relativeTimeFeed(new Date(Date.now() - 30_000).toISOString())).toBe('agora')
  })

  it('returns minutes only when less than an hour', () => {
    expect(relativeTimeFeed(new Date(Date.now() - 45 * 60_000).toISOString())).toBe('há 45min')
  })

  it('returns hours and minutes combined', () => {
    expect(relativeTimeFeed(new Date(Date.now() - 80 * 60_000).toISOString())).toBe('há 1h20')
  })

  it('returns hours only when minutes is 0', () => {
    expect(relativeTimeFeed(new Date(Date.now() - 120 * 60_000).toISOString())).toBe('há 2h')
  })
})

// ── Component integration tests ─────────────────────────────────────────────

describe('DashboardScreen', () => {
  it('shows mother name in greeting', () => {
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    expect(screen.getByText(/Ana/)).toBeInTheDocument()
  })

  it('shows phase badge', () => {
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    expect(screen.getByText('Bebê · 4 meses e 12 dias')).toBeInTheDocument()
  })

  it('shows Sara card', () => {
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    expect(screen.getByText(/Sara diz/i)).toBeInTheDocument()
  })

  it('shows empty state when no routine items', () => {
    render(<DashboardScreen />, { wrapper: makeWrapper([]) })
    expect(screen.getByText('Nenhum compromisso hoje')).toBeInTheDocument()
  })

  it('shows next appointment title when available', () => {
    render(<DashboardScreen />, { wrapper: makeWrapper([ROUTINE_ENTRY]) })
    expect(screen.getByText('Pediatra')).toBeInTheDocument()
  })

  it('shows empty state when no feed entries', () => {
    render(<DashboardScreen />, { wrapper: makeWrapper([], []) })
    expect(screen.getByText('Nenhum registro ainda')).toBeInTheDocument()
  })

  it('shows relative time when last feed entry exists', () => {
    render(<DashboardScreen />, { wrapper: makeWrapper([], [FEED_ENTRY]) })
    expect(screen.getByText('há 1h20')).toBeInTheDocument()
  })

  it('opens QuickRegisterSheet when Registrar button is clicked', () => {
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /registrar/i }))
    expect(screen.getByText('Registrar mamada')).toBeInTheDocument()
  })

  it('calls setActiveTab with comunidade when Ver → is clicked', () => {
    const setActiveTab = vi.fn()
    useAppStore.setState({ setActiveTab } as any)
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /ir para a comunidade/i }))
    expect(setActiveTab).toHaveBeenCalledWith('comunidade')
  })
})
```

- [ ] **Step 2.2 — Run tests to confirm they fail**

```
npx vitest run src/components/home/DashboardScreen.test.tsx
```

Expected: all tests fail — `DashboardScreen`, `formatPhase`, `relativeTimeFeed` do not exist yet.

- [ ] **Step 2.3 — Implement DashboardScreen**

```tsx
// src/components/home/DashboardScreen.tsx
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '../../store/useAppStore'
import { apiFetch } from '../../lib/api'
import { getMensagemParaFase } from '../../data/mensagemDeDeus'
import { getVersiculoDoDia } from '../../data/versiculos'
import type { ApiRoutineEntry, ApiBabyEntry } from '../../lib/types'
import type { PregnancyPhase } from '../../types'
import { QuickRegisterSheet } from './QuickRegisterSheet'

export function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function formatPhase(phase: PregnancyPhase): string {
  if (phase.stage === 'pregnant') return `Grávida · semana ${phase.week}`
  const months = Math.floor(phase.ageInDays / 30)
  const days = phase.ageInDays % 30
  if (months === 0) return `Bebê · ${days} dias`
  if (days === 0) return `Bebê · ${months} ${months === 1 ? 'mês' : 'meses'}`
  return `Bebê · ${months} ${months === 1 ? 'mês' : 'meses'} e ${days} dias`
}

export function relativeTimeFeed(iso: string): string {
  const totalMins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (totalMins < 1) return 'agora'
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h === 0) return `há ${m}min`
  if (m === 0) return `há ${h}h`
  return `há ${h}h${m}`
}

export function DashboardScreen() {
  const motherName = useAppStore((s) => s.motherName)
  const phase = useAppStore((s) => s.phase)
  const isLoggedIn = useAppStore((s) => s.isLoggedIn)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const [sheetOpen, setSheetOpen] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const { data: routineItems } = useQuery({
    queryKey: ['routine', today],
    queryFn: () => apiFetch<ApiRoutineEntry[]>(`/routine?date=${today}`),
    enabled: isLoggedIn,
    staleTime: 60_000,
  })

  const { data: babyEntries } = useQuery({
    queryKey: ['baby'],
    queryFn: () => apiFetch<ApiBabyEntry[]>('/baby?limit=5'),
    enabled: isLoggedIn,
    staleTime: 30_000,
  })

  const saraMensagem = useMemo(() => {
    const semanaOuDias = phase.stage === 'pregnant' ? phase.week : phase.ageInDays
    return getMensagemParaFase(phase.stage, semanaOuDias)
  }, [phase])

  const versiculo = getVersiculoDoDia('home')

  const nextAppointment = routineItems?.find((r) => !r.done && r.time >= nowTime) ?? null
  const lastFeed = babyEntries?.find((e) => e.type === 'feed') ?? null
  const initial = (motherName || 'M').charAt(0).toUpperCase()

  return (
    <>
      <div className="flex flex-col gap-3 pb-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-5">
          <div>
            <p className="text-[17px] font-bold text-graphite">
              {getGreeting()},{' '}
              <span className="text-sara-gold">{motherName || 'Mãe'}</span> 🌷
            </p>
            <span className="text-[10px] font-semibold text-sara-gold bg-sara-gold/10 rounded-full px-2 py-0.5 mt-1 inline-block">
              {formatPhase(phase)}
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {initial}
          </div>
        </div>

        {/* Sara card */}
        <div className="mx-4 rounded-2xl p-3.5 bg-gradient-to-br from-sara-gold to-sara-terracotta shadow-md">
          <p className="text-[9px] font-bold text-white/75 uppercase tracking-wide mb-1.5">
            ✦ Sara diz
          </p>
          <p className="text-[12px] font-medium text-white leading-relaxed">
            "{saraMensagem.mensagem}"
          </p>
        </div>

        {/* Row: next appointment + last feed */}
        <div className="flex gap-2 px-4">
          <div className="flex-1 bg-white rounded-2xl p-3.5 shadow-sm">
            <p className="text-[9px] font-bold text-graphite-muted uppercase tracking-wide mb-1">
              Próximo
            </p>
            {nextAppointment ? (
              <>
                <p className="text-[13px] font-semibold text-graphite leading-tight">
                  {nextAppointment.title}
                </p>
                <p className="text-[11px] text-graphite-muted mt-0.5">
                  Hoje · {nextAppointment.time}
                </p>
              </>
            ) : (
              <p className="text-[12px] text-graphite-muted">Nenhum compromisso hoje</p>
            )}
          </div>

          <div className="flex-1 bg-white rounded-2xl p-3.5 shadow-sm">
            <p className="text-[9px] font-bold text-graphite-muted uppercase tracking-wide mb-1">
              Última mamada
            </p>
            {lastFeed ? (
              <p className="text-[13px] font-semibold text-graphite">
                {relativeTimeFeed(lastFeed.createdAt)}
              </p>
            ) : (
              <p className="text-[12px] text-graphite-muted">Nenhum registro ainda</p>
            )}
            <button
              onClick={() => setSheetOpen(true)}
              aria-label="Registrar mamada"
              className="mt-1.5 inline-block bg-sara-gold text-white rounded-xl text-[10px] font-semibold px-2.5 py-1"
            >
              Registrar
            </button>
          </div>
        </div>

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

        {/* Daily verse */}
        <div className="px-4 pt-1">
          <p className="text-[10px] text-graphite-muted/70 italic leading-relaxed text-center">
            "{versiculo.texto}"
          </p>
          <p className="text-[9px] text-graphite-muted/50 text-center mt-0.5">
            {versiculo.referencia} · NVI
          </p>
        </div>
      </div>

      <QuickRegisterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  )
}
```

- [ ] **Step 2.4 — Run tests to confirm they pass**

```
npx vitest run src/components/home/DashboardScreen.test.tsx
```

Expected: all tests pass.

- [ ] **Step 2.5 — Commit**

```bash
git add src/components/home/DashboardScreen.tsx src/components/home/DashboardScreen.test.tsx
git commit -m "feat(home): add DashboardScreen with Sara card, appointments, feeding and verse"
```

---

## Task 3 — Wire DashboardScreen into App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 3.1 — Add import and swap the home screen**

In `src/App.tsx`, add the import after the existing home-related imports (around line 13):

```tsx
import { DashboardScreen } from './components/home/DashboardScreen';
```

Then on line 145, change the `home` entry in the `screens` object:

```tsx
// Before:
home: <ComunidadeScreen />,

// After:
home: <DashboardScreen />,
```

- [ ] **Step 3.2 — Run TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 new errors. (Pre-existing errors from Prisma client not being generated are unrelated and should be unchanged.)

- [ ] **Step 3.3 — Run full test suite**

```
npx vitest run
```

Expected: all tests pass (no regressions).

- [ ] **Step 3.4 — Commit**

```bash
git add src/App.tsx
git commit -m "feat(home): route home tab to DashboardScreen"
```

---

## Validation Checklist (manual, after all tasks)

Run the dev server (`npm run dev`) and verify visually:

- [ ] Mobile (< 768 px): cards stack vertically without horizontal overflow
- [ ] Tablet / Desktop: dashboard renders inside the `WebLayout` three-column frame without breakage
- [ ] Greeting changes by time of day (Bom dia / Boa tarde / Boa noite)
- [ ] Phase badge shows correctly for postpartum (e.g. "Bebê · 4 meses e 12 dias") and pregnant ("Grávida · semana 28")
- [ ] Sara card shows a non-empty message
- [ ] "Próximo" card shows appointment or "Nenhum compromisso hoje"
- [ ] "Última mamada" card shows relative time or "Nenhum registro ainda"
- [ ] Tapping "Registrar" opens the bottom sheet with slide-up animation
- [ ] Bottom sheet pre-selects opposite of last side used
- [ ] Tapping the other side toggles selection
- [ ] "Registrar agora" sends POST, sheet closes, next opening pre-selects the opposite again
- [ ] "Ver →" navigates to the Comunidade tab
- [ ] Daily verse appears at the bottom in muted italic
- [ ] Community tab still works exactly as before (no regressions)
