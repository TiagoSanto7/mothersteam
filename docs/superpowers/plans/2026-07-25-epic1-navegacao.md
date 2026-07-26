# Épico 1 — Navegação Definitiva (4 Abas) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a navegação atual (5 abas + botão central) pela arquitetura definitiva de 4 abas: 🏠 Hoje | ❤️ Jornada | 👥 Comunidade | 👤 Perfil.

**Architecture:** `TabId` muda de 6 valores para 5 (`'hoje' | 'jornada' | 'comunidade' | 'perfil' | 'maeIA'` — maeIA fica como "hidden tab" acessível via FAB). `JornadaScreen` agrega o conteúdo de `baby` + `rotina` em segmented control. `ProfileScreen` ganha prop `isTab` para rodar sem botão de voltar. `BottomTabBar` é reconstruído com 4 abas iguais sem botão central. Sessões persistidas com tabs antigas migram automaticamente via Zustand persist v1.

**Tech Stack:** React 18, TypeScript, Zustand 5, Vitest + Testing Library, Tailwind CSS, Lucide React

---

## File Map

**Criar:**
- `src/components/jornada/JornadaScreen.tsx` — nova tela da aba Jornada
- `src/components/jornada/JornadaScreen.test.tsx` — testes

**Modificar:**
- `src/types/index.ts:1` — TabId union
- `src/store/useAppStore.ts` — persist v1 + migrate + default activeTab
- `src/components/layout/BottomTabBar.tsx` — 4 abas iguais
- `src/components/layout/BottomTabBar.test.tsx` — atualizar testes
- `src/components/layout/LeftSidebar.tsx` — 4 itens de nav
- `src/components/layout/LeftSidebar.test.tsx` — atualizar testes
- `src/components/profile/ProfileScreen.tsx:19-23` — prop isTab
- `src/components/profile/ProfileScreen.test.tsx` — teste isTab
- `src/components/home/DashboardScreen.tsx` — FAB Sara + overlay MaeIA
- `src/components/home/DashboardScreen.test.tsx` — teste FAB
- `src/components/maeIA/MaeIAScreen.tsx` — prop onBack opcional
- `src/App.tsx` — novo screens map + Perfil como aba

---

## Task 1: Atualizar TabId

**Files:**
- Modify: `src/types/index.ts:1`

- [ ] **Step 1: Atualizar o tipo**

```typescript
// src/types/index.ts — linha 1-2, substituir a linha do TabId
export type TabId = 'hoje' | 'jornada' | 'comunidade' | 'perfil' | 'maeIA';
```

`maeIA` fica na união como "hidden tab" (FAB do Hoje navega pra ela; o BottomTabBar não vai mostrá-la).

- [ ] **Step 2: Checar erros de tipo**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Esperado: apenas erros em arquivos que usam os TabIds antigos (`BottomTabBar.tsx`, `LeftSidebar.tsx`, `App.tsx`). Esses serão corrigidos nas tarefas seguintes.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "refactor(nav): update TabId to 4+1 hidden-tab architecture"
```

---

## Task 2: Store — persist v1 com migração de tabs

**Files:**
- Modify: `src/store/useAppStore.ts`

Zustand persist aceita `version` e `migrate`. Quando o usuário reabre o app com localStorage antigo (version 0), `migrate` remapeia os tab IDs obsoletos.

- [ ] **Step 1: Exportar helper de migração (testável em isolamento)**

No topo de `useAppStore.ts`, antes do `export const useAppStore`, adicionar:

```typescript
const OLD_TAB_MAP: Record<string, TabId> = {
  home:       'hoje',
  maeIA:      'maeIA',   // hidden tab ainda funciona
  baby:       'jornada',
  rotina:     'jornada',
  shopping:   'hoje',
  // novos já mapeiam pra si mesmos (fallback do ?? 'hoje')
};

export function migrateAppState(
  persistedState: unknown,
  fromVersion: number,
): Partial<AppState> {
  const state = persistedState as Partial<AppState>;
  if (fromVersion === 0) {
    const oldTab = state.activeTab as string | undefined;
    return {
      ...state,
      activeTab: (oldTab && OLD_TAB_MAP[oldTab]) ?? 'hoje',
    };
  }
  return state;
}
```

- [ ] **Step 2: Escrever teste para o helper**

Criar arquivo `src/store/useAppStore.migration.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { migrateAppState } from './useAppStore';

describe('migrateAppState', () => {
  it('maps "home" → "hoje"', () => {
    const result = migrateAppState({ activeTab: 'home' }, 0);
    expect(result.activeTab).toBe('hoje');
  });

  it('maps "baby" → "jornada"', () => {
    const result = migrateAppState({ activeTab: 'baby' }, 0);
    expect(result.activeTab).toBe('jornada');
  });

  it('maps "rotina" → "jornada"', () => {
    const result = migrateAppState({ activeTab: 'rotina' }, 0);
    expect(result.activeTab).toBe('jornada');
  });

  it('maps "shopping" → "hoje"', () => {
    const result = migrateAppState({ activeTab: 'shopping' }, 0);
    expect(result.activeTab).toBe('hoje');
  });

  it('preserves "maeIA" as hidden tab', () => {
    const result = migrateAppState({ activeTab: 'maeIA' }, 0);
    expect(result.activeTab).toBe('maeIA');
  });

  it('falls back to "hoje" for unknown tab', () => {
    const result = migrateAppState({ activeTab: 'unknown-tab' }, 0);
    expect(result.activeTab).toBe('hoje');
  });

  it('is a no-op for version >= 1', () => {
    const state = { activeTab: 'home' };
    const result = migrateAppState(state, 1);
    expect(result).toStrictEqual(state);
  });

  it('preserves all other state fields', () => {
    const state = { activeTab: 'baby', motherName: 'Ana', onboardingDone: true };
    const result = migrateAppState(state, 0);
    expect(result.motherName).toBe('Ana');
    expect(result.onboardingDone).toBe(true);
  });
});
```

- [ ] **Step 3: Rodar o teste (deve falhar — helper ainda não existe)**

```bash
npx vitest run src/store/useAppStore.migration.test.ts
```

Esperado: FAIL (módulo não resolve `migrateAppState` ainda).

- [ ] **Step 4: Adicionar version + migrate + default tab no persist**

No `useAppStore.ts`, localizar o objeto de opções do `persist(...)`. Adicionar/atualizar:

```typescript
persist(
  (set, get) => ({
    // ...state e actions (sem mudança)
    activeTab: 'hoje' as TabId,   // ← era 'home', mudar aqui
    // ...resto sem mudança
  }),
  {
    name: 'mothers-team-storage',
    storage: createJSONStorage(() => safeLocalStorage),
    version: 1,                   // ← NOVO
    migrate: migrateAppState,     // ← NOVO
  }
)
```

**Atenção:** Trocar `activeTab: 'home'` → `activeTab: 'hoje'` no estado inicial.

- [ ] **Step 5: Rodar o teste de migração (deve passar)**

```bash
npx vitest run src/store/useAppStore.migration.test.ts
```

Esperado: PASS (8/8).

- [ ] **Step 6: Rodar suite completa de testes do store**

```bash
npx vitest run src/store/
```

Esperado: PASS. Qualquer falha relacionada a `activeTab: 'home'` em outros testes do store → troca `'home'` por `'hoje'` no `beforeEach` desses testes.

- [ ] **Step 7: Commit**

```bash
git add src/store/useAppStore.ts src/store/useAppStore.migration.test.ts
git commit -m "feat(store): persist v1 com migracao de tabs obsoletos"
```

---

## Task 3: Criar JornadaScreen

**Files:**
- Create: `src/components/jornada/JornadaScreen.tsx`
- Create: `src/components/jornada/JornadaScreen.test.tsx`

JornadaScreen tem 3 segmentos:
- **"Hoje"** → BabyScreen (mamada, fralda, sono, timeline)
- **"Planejamento"** → WeekCalendar + RoutineTimeline + botão inline de adicionar
- **"Evolução"** → BabyDevCard (clique abre BabyDevScreen)

FAB global da JornadaScreen → abre QuickRegisterSheet (registro rápido de bebê).

- [ ] **Step 1: Escrever teste antes do componente**

Criar `src/components/jornada/JornadaScreen.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JornadaScreen } from './JornadaScreen';
import { useAppStore } from '../../store/useAppStore';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', async () => ({
  ...(await vi.importActual<typeof import('../../lib/api')>('../../lib/api')),
  apiFetch: mockApiFetch,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockApiFetch.mockResolvedValue([]);
  useAppStore.setState({
    isLoggedIn: true,
    motherName: 'Ana',
    phase: { stage: 'postpartum', ageInDays: 30 },
    selectedDate: new Date().toISOString().split('T')[0],
  });
});

describe('JornadaScreen', () => {
  it('renders three segment tabs', () => {
    render(<JornadaScreen />, { wrapper });
    expect(screen.getByRole('button', { name: /hoje/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /planejamento/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /evolução/i })).toBeInTheDocument();
  });

  it('defaults to Hoje segment showing baby screen', () => {
    render(<JornadaScreen />, { wrapper });
    expect(screen.getByText('Rotina do Bebê')).toBeInTheDocument();
  });

  it('switches to Planejamento segment', () => {
    render(<JornadaScreen />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /planejamento/i }));
    expect(screen.getByText('Sua Rotina')).toBeInTheDocument();
    expect(screen.queryByText('Rotina do Bebê')).not.toBeInTheDocument();
  });

  it('switches to Evolução segment', () => {
    render(<JornadaScreen />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /evolução/i }));
    expect(screen.queryByText('Rotina do Bebê')).not.toBeInTheDocument();
  });

  it('renders FAB Registrar button', () => {
    render(<JornadaScreen />, { wrapper });
    expect(screen.getByRole('button', { name: /registrar/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste (deve falhar — módulo não existe)**

```bash
npx vitest run src/components/jornada/JornadaScreen.test.tsx
```

Esperado: FAIL com "Cannot find module".

- [ ] **Step 3: Implementar JornadaScreen**

Criar `src/components/jornada/JornadaScreen.tsx`:

```typescript
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { BabyScreen } from '../baby/BabyScreen';
import { WeekCalendar } from '../home/WeekCalendar';
import { RoutineTimeline } from '../home/RoutineTimeline';
import { AddRoutineModal } from '../home/AddRoutineModal';
import { QuickRegisterSheet } from '../home/QuickRegisterSheet';
import { BabyDevCard } from '../home/BabyDevCard';
import { BabyDevScreen } from '../home/BabyDevScreen';

type Segment = 'hoje' | 'planejamento' | 'evolucao';

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'hoje',         label: 'Hoje' },
  { id: 'planejamento', label: 'Planejamento' },
  { id: 'evolucao',     label: 'Evolução' },
];

export function JornadaScreen() {
  const [segment, setSegment]           = useState<Segment>('hoje');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [babyDevOpen, setBabyDevOpen]   = useState(false);
  const selectedDate                    = useAppStore((s) => s.selectedDate);

  return (
    <>
      <div className="flex flex-col pb-28">
        {/* Segmented control */}
        <div className="flex gap-1 mx-4 mt-4 mb-3 bg-white/60 rounded-2xl p-1">
          {SEGMENTS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSegment(id)}
              aria-pressed={segment === id}
              className={`flex-1 py-1.5 rounded-xl text-[12px] font-semibold transition-colors ${
                segment === id
                  ? 'bg-sara-gold text-white shadow-sm'
                  : 'text-graphite-muted hover:text-graphite'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Segment: Hoje — baby day tracking */}
        {segment === 'hoje' && <BabyScreen />}

        {/* Segment: Planejamento — weekly calendar + routine */}
        {segment === 'planejamento' && (
          <div className="flex flex-col gap-4 pb-6">
            <WeekCalendar referenceDate={selectedDate} />
            <div className="flex items-center justify-between px-4">
              <h2 className="text-sm font-semibold text-graphite">Sua Rotina</h2>
              <button
                onClick={() => setAddModalOpen(true)}
                aria-label="Adicionar tarefa"
                className="w-7 h-7 rounded-full bg-sara-gold text-white flex items-center justify-center shadow-sm"
              >
                <Plus size={14} />
              </button>
            </div>
            <RoutineTimeline />
          </div>
        )}

        {/* Segment: Evolução — baby development */}
        {segment === 'evolucao' && (
          <div className="flex flex-col gap-4 pt-2 px-0">
            <BabyDevCard onClick={() => setBabyDevOpen(true)} />
          </div>
        )}
      </div>

      {/* FAB — opens quick-register sheet */}
      <button
        onClick={() => setRegisterOpen(true)}
        aria-label="Registrar"
        className="fixed bottom-[84px] right-4 w-14 h-14 rounded-full bg-sara-terracotta text-white shadow-lg shadow-sara-terracotta/30 flex items-center justify-center active:scale-95 transition-transform z-30"
      >
        <Plus size={24} />
      </button>

      <QuickRegisterSheet open={registerOpen} onClose={() => setRegisterOpen(false)} />
      {addModalOpen && (
        <AddRoutineModal
          onClose={() => setAddModalOpen(false)}
          defaultDate={selectedDate}
        />
      )}
      <BabyDevScreen open={babyDevOpen} onClose={() => setBabyDevOpen(false)} />
    </>
  );
}
```

- [ ] **Step 4: Rodar o teste (deve passar)**

```bash
npx vitest run src/components/jornada/JornadaScreen.test.tsx
```

Esperado: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add src/components/jornada/
git commit -m "feat(nav): JornadaScreen com segmentos Hoje/Planejamento/Evolucao"
```

---

## Task 4: Reconstruir BottomTabBar

**Files:**
- Modify: `src/components/layout/BottomTabBar.tsx`
- Modify: `src/components/layout/BottomTabBar.test.tsx`

4 abas iguais, sem botão central, sem emoji. Quando `activeTab === 'maeIA'` nenhuma aba fica marcada.

- [ ] **Step 1: Atualizar os testes primeiro**

Substituir conteúdo de `src/components/layout/BottomTabBar.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { BottomTabBar } from './BottomTabBar';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  useAppStore.setState({ activeTab: 'hoje', phase: { stage: 'pregnant', week: 28 } });
});

describe('BottomTabBar', () => {
  it('renders exactly 4 navigation tabs', () => {
    render(<BottomTabBar />);
    expect(screen.getByTestId('tab-hoje')).toBeInTheDocument();
    expect(screen.getByTestId('tab-jornada')).toBeInTheDocument();
    expect(screen.getByTestId('tab-comunidade')).toBeInTheDocument();
    expect(screen.getByTestId('tab-perfil')).toBeInTheDocument();
  });

  it('does not render old tabs or central button', () => {
    render(<BottomTabBar />);
    expect(screen.queryByTestId('tab-home')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-maeIA')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-baby')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-rotina')).not.toBeInTheDocument();
    expect(screen.queryByTestId('baby-central-button')).not.toBeInTheDocument();
  });

  it('activates hoje tab when clicked', () => {
    useAppStore.setState({ activeTab: 'comunidade' });
    render(<BottomTabBar />);
    fireEvent.click(screen.getByTestId('tab-hoje'));
    expect(useAppStore.getState().activeTab).toBe('hoje');
  });

  it('activates jornada tab when clicked', () => {
    render(<BottomTabBar />);
    fireEvent.click(screen.getByTestId('tab-jornada'));
    expect(useAppStore.getState().activeTab).toBe('jornada');
  });

  it('activates comunidade tab when clicked', () => {
    render(<BottomTabBar />);
    fireEvent.click(screen.getByTestId('tab-comunidade'));
    expect(useAppStore.getState().activeTab).toBe('comunidade');
  });

  it('activates perfil tab when clicked', () => {
    render(<BottomTabBar />);
    fireEvent.click(screen.getByTestId('tab-perfil'));
    expect(useAppStore.getState().activeTab).toBe('perfil');
  });

  it('marks hoje tab as active via aria-pressed', () => {
    render(<BottomTabBar />);
    expect(screen.getByTestId('tab-hoje')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('tab-comunidade')).toHaveAttribute('aria-pressed', 'false');
  });
});
```

- [ ] **Step 2: Rodar testes (devem falhar — BottomTabBar ainda tem design antigo)**

```bash
npx vitest run src/components/layout/BottomTabBar.test.tsx
```

Esperado: FAIL.

- [ ] **Step 3: Reimplementar BottomTabBar**

Substituir conteúdo de `src/components/layout/BottomTabBar.tsx`:

```typescript
import { Home, Heart, Users, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TabId } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface TabConfig {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const TABS: TabConfig[] = [
  { id: 'hoje',       label: 'Hoje',       icon: Home },
  { id: 'jornada',    label: 'Jornada',    icon: Heart },
  { id: 'comunidade', label: 'Comunidade', icon: Users },
  { id: 'perfil',     label: 'Perfil',     icon: User },
];

export function BottomTabBar() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav
      data-testid="bottom-tab-bar"
      className="flex-shrink-0 bg-sara-linen/90 backdrop-blur-md border-t border-white/40 flex items-center justify-around px-2 pt-1 pb-2 h-[68px]"
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            data-testid={`tab-${id}`}
            onClick={() => setActiveTab(id)}
            aria-pressed={isActive}
            aria-label={label}
            className={`flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-colors ${
              isActive ? 'text-sara-gold' : 'text-graphite-muted'
            }`}
          >
            <Icon
              size={22}
              strokeWidth={isActive ? 2.2 : 1.8}
              fill={isActive && id === 'jornada' ? 'currentColor' : 'none'}
            />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Rodar testes (devem passar)**

```bash
npx vitest run src/components/layout/BottomTabBar.test.tsx
```

Esperado: PASS (7/7).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/BottomTabBar.tsx src/components/layout/BottomTabBar.test.tsx
git commit -m "feat(nav): BottomTabBar redesenhado com 4 abas fixas"
```

---

## Task 5: Adicionar Sara FAB ao DashboardScreen

**Files:**
- Modify: `src/components/home/DashboardScreen.tsx`
- Modify: `src/components/home/DashboardScreen.test.tsx`
- Modify: `src/components/maeIA/MaeIAScreen.tsx`

O FAB da aba Hoje abre MaeIAScreen como overlay. MaeIAScreen recebe `onBack` opcional para o botão de voltar.

- [ ] **Step 1: Adicionar prop onBack ao MaeIAScreen**

No início de `src/components/maeIA/MaeIAScreen.tsx`, encontrar a interface (ou adicionar se não existir):

```typescript
// Adicionar antes do componente:
interface MaeIAScreenProps {
  onBack?: () => void;
}
```

E no início do componente:
```typescript
export function MaeIAScreen({ onBack }: MaeIAScreenProps = {}) {
```

No JSX do MaeIAScreen, adicionar o botão de voltar quando `onBack` for fornecido. Localizar a div de header (topo do componente) e adicionar:

```typescript
{onBack && (
  <button
    onClick={onBack}
    aria-label="Voltar"
    className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
  >
    <ChevronLeft size={18} className="text-white" />
  </button>
)}
```

Importar `ChevronLeft` do lucide-react no topo do arquivo.

- [ ] **Step 2: Escrever testes para o FAB no DashboardScreen**

No arquivo `src/components/home/DashboardScreen.test.tsx`, adicionar ao bloco `describe('DashboardScreen')`:

```typescript
it('renders Sara FAB button', () => {
  render(<DashboardScreen />, { wrapper: makeWrapper() });
  expect(screen.getByRole('button', { name: /conversar com a sara/i })).toBeInTheDocument();
});

it('Sara FAB opens MaeIA overlay', () => {
  render(<DashboardScreen />, { wrapper: makeWrapper() });
  const fab = screen.getAllByRole('button', { name: /conversar com a sara/i });
  // Click the FAB (last one, since the card link also says "Conversar com a Sara →")
  fireEvent.click(fab[fab.length - 1]);
  // MaeIAScreen renders with onBack → shows a back button
  expect(screen.getByRole('button', { name: /voltar/i })).toBeInTheDocument();
});
```

- [ ] **Step 3: Rodar testes (devem falhar — FAB não existe ainda)**

```bash
npx vitest run src/components/home/DashboardScreen.test.tsx
```

Esperado: os 2 novos testes FAIL; os existentes PASS.

- [ ] **Step 4: Adicionar FAB ao DashboardScreen**

No `src/components/home/DashboardScreen.tsx`:

**Adicionar import:**
```typescript
import { MaeIAScreen } from '../maeIA/MaeIAScreen';
```

**Adicionar estado:**
```typescript
const [showMaeIA, setShowMaeIA] = useState(false);
```

**Adicionar FAB no return (após o `<>` inicial, antes do fechamento `</>`)**:

```typescript
{/* Sara FAB */}
<button
  onClick={() => setShowMaeIA(true)}
  aria-label="Conversar com a Sara"
  className="fixed bottom-[84px] right-4 w-14 h-14 rounded-full bg-gradient-to-br from-sara-gold to-sara-terracotta text-white shadow-lg shadow-sara-terracotta/30 flex items-center justify-center active:scale-95 transition-transform z-30 text-xl"
>
  ✦
</button>

{/* MaeIA overlay */}
{showMaeIA && (
  <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
    <div className="w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <MaeIAScreen onBack={() => setShowMaeIA(false)} />
    </div>
  </div>
)}
```

- [ ] **Step 5: Rodar testes (devem passar)**

```bash
npx vitest run src/components/home/DashboardScreen.test.tsx
```

Esperado: PASS (todos, incluindo os 2 novos).

- [ ] **Step 6: Commit**

```bash
git add src/components/home/DashboardScreen.tsx src/components/home/DashboardScreen.test.tsx src/components/maeIA/MaeIAScreen.tsx
git commit -m "feat(nav): Sara FAB no DashboardScreen abre MaeIAScreen como overlay"
```

---

## Task 6: ProfileScreen — modo aba (isTab prop)

**Files:**
- Modify: `src/components/profile/ProfileScreen.tsx:19-23`
- Modify: `src/components/profile/ProfileScreen.test.tsx`

Quando `isTab={true}`, o botão ChevronLeft de voltar não aparece. `onClose` se torna opcional.

- [ ] **Step 1: Escrever teste primeiro**

No `src/components/profile/ProfileScreen.test.tsx`, adicionar `describe` ao final do arquivo:

```typescript
describe('ProfileScreen — tab mode', () => {
  beforeEach(() => {
    useAppStore.setState({
      isLoggedIn: true,
      currentUserId: 'me-1',
      motherName: 'Mariana',
      phase: { stage: 'pregnant', week: 28 },
      motherProfile: null,
      savedVerses: [],
    });

    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === '/users/me-1') {
        return {
          id: 'me-1', name: 'Mariana', bio: null,
          pregnancyStage: 'pregnant', pregnancyWeek: 28, babyAgeInDays: null,
          profileKey: null, archetypeKey: null,
          _count: { posts: 0, followers: 0, following: 0 },
          isSelf: true, isFollowedByCurrentUser: false,
        };
      }
      return { items: [], hasMore: false };
    });
  });

  it('hides back button when isTab is true', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ProfileScreen userId="me-1" onClose={() => {}} isTab />
      </QueryClientProvider>
    );
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /voltar/i })).not.toBeInTheDocument();
    });
  });

  it('shows back button when isTab is false (default)', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ProfileScreen userId="me-1" onClose={() => {}} />
      </QueryClientProvider>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /voltar/i })).toBeInTheDocument();
    });
  });
});
```

Verificar que `waitFor` e `QueryClient` já estão importados no topo do arquivo. Se não, adicionar:
```typescript
import { waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
```

- [ ] **Step 2: Rodar os novos testes (devem falhar)**

```bash
npx vitest run src/components/profile/ProfileScreen.test.tsx 2>&1 | tail -20
```

Esperado: os 2 novos testes FAIL.

- [ ] **Step 3: Adicionar prop isTab ao ProfileScreen**

No `src/components/profile/ProfileScreen.tsx`:

**Atualizar interface** (linhas 19-23 aprox.):
```typescript
interface ProfileScreenProps {
  onClose?: () => void;    // ← agora opcional
  userId?: string;
  onOpenProfile?: (id: string) => void;
  isTab?: boolean;         // ← NOVO
}
```

**Atualizar assinatura do componente:**
```typescript
export function ProfileScreen({ onClose, userId, onOpenProfile, isTab = false }: ProfileScreenProps) {
```

**Atualizar o botão de voltar** (no render do header, onde tem o `<button onClick={onClose} aria-label="Voltar"...>`):

```typescript
{/* Antes: */}
<button
  onClick={onClose}
  aria-label="Voltar"
  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen"
>
  <ChevronLeft size={20} className="text-graphite" />
</button>

{/* Depois: */}
{isTab ? (
  <div className="w-8" />   {/* placeholder para manter alinhamento */}
) : (
  <button
    onClick={onClose}
    aria-label="Voltar"
    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen"
  >
    <ChevronLeft size={20} className="text-graphite" />
  </button>
)}
```

- [ ] **Step 4: Rodar testes (devem passar)**

```bash
npx vitest run src/components/profile/ProfileScreen.test.tsx
```

Esperado: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/components/profile/ProfileScreen.tsx src/components/profile/ProfileScreen.test.tsx
git commit -m "feat(profile): prop isTab oculta botao de voltar para uso como aba nativa"
```

---

## Task 7: Reconstruir LeftSidebar

**Files:**
- Modify: `src/components/layout/LeftSidebar.tsx`
- Modify: `src/components/layout/LeftSidebar.test.tsx`

4 itens no nav principal. Perfil agora é `setActiveTab('perfil')` ao invés de overlay. `onOpenProfile` removido do LeftSidebar (mas WebLayout ainda usa `onOpenUser` para perfis de outros usuários).

- [ ] **Step 1: Atualizar testes**

Substituir conteúdo de `src/components/layout/LeftSidebar.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeftSidebar } from './LeftSidebar';
import { useAppStore } from '../../store/useAppStore';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

beforeEach(() => {
  mockApiFetch.mockResolvedValue(undefined);
  useAppStore.setState({
    isLoggedIn: true,
    currentUserId: 'me-1',
    motherName: 'Mariana',
    activeTab: 'hoje',
  });
});

function renderSidebar() {
  return render(
    <LeftSidebar
      unreadNotifs={0}
      unreadChats={0}
      onOpenNotifications={vi.fn()}
      onOpenChat={vi.fn()}
      onOpenSettings={vi.fn()}
    />,
  );
}

describe('LeftSidebar navigation', () => {
  it('has Hoje in the primary nav', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(useAppStore.getState().activeTab).toBe('hoje');
  });

  it('has Jornada in the primary nav', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Jornada' }));
    expect(useAppStore.getState().activeTab).toBe('jornada');
  });

  it('has Comunidade in the primary nav', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Comunidade' }));
    expect(useAppStore.getState().activeTab).toBe('comunidade');
  });

  it('has Perfil in the primary nav (sets tab, not overlay)', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Perfil' }));
    expect(useAppStore.getState().activeTab).toBe('perfil');
  });

  it('does not have Shopping in primary nav', () => {
    renderSidebar();
    expect(screen.queryByRole('button', { name: 'Shopping' })).not.toBeInTheDocument();
  });
});

describe('LeftSidebar logout', () => {
  it('calls /auth/logout and clears auth when Sair is clicked', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(mockApiFetch).toHaveBeenCalledWith('/auth/logout', { method: 'POST' });
    expect(useAppStore.getState().isLoggedIn).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar testes (devem falhar)**

```bash
npx vitest run src/components/layout/LeftSidebar.test.tsx
```

Esperado: FAIL.

- [ ] **Step 3: Reimplementar LeftSidebar**

Substituir conteúdo de `src/components/layout/LeftSidebar.tsx`:

```typescript
import { Home, Heart, Users, User, Bell, MessageSquare, Settings, LogOut, ShoppingBag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { apiFetch } from '../../lib/api';
import { getAvatarColor } from '../../utils/avatar';
import type { TabId } from '../../types';

interface LeftSidebarProps {
  unreadNotifs: number;
  unreadChats: number;
  onOpenNotifications: () => void;
  onOpenChat: () => void;
  onOpenSettings: () => void;
}

const MAIN_NAV: { id: TabId; icon: LucideIcon; label: string }[] = [
  { id: 'hoje',       icon: Home,   label: 'Hoje' },
  { id: 'jornada',    icon: Heart,  label: 'Jornada' },
  { id: 'comunidade', icon: Users,  label: 'Comunidade' },
  { id: 'perfil',     icon: User,   label: 'Perfil' },
];

export function LeftSidebar({
  unreadNotifs,
  unreadChats,
  onOpenNotifications,
  onOpenChat,
  onOpenSettings,
}: LeftSidebarProps) {
  const activeTab     = useAppStore((s) => s.activeTab);
  const setActiveTab  = useAppStore((s) => s.setActiveTab);
  const motherName    = useAppStore((s) => s.motherName);
  const motherProfile = useAppStore((s) => s.motherProfile);
  const clearAuth     = useAppStore((s) => s.clearAuth);

  function handleLogout() {
    apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    clearAuth();
  }

  const navBtnClass = (isActive: boolean) =>
    [
      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
      'md:justify-center lg:justify-start',
      isActive
        ? 'bg-sara-gold/10 text-sara-gold'
        : 'text-graphite-muted hover:bg-sara-linen hover:text-graphite',
    ].join(' ');

  const actionBtnClass =
    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-graphite-muted hover:bg-sara-linen hover:text-graphite md:justify-center lg:justify-start';

  return (
    <aside className="sticky top-0 h-screen flex flex-col bg-[#F5EDE0] border-r border-sara-linen md:w-[72px] lg:w-60 flex-shrink-0 overflow-hidden">
      {/* Logo */}
      <div className="flex items-center md:justify-center lg:justify-start px-3 py-5 flex-shrink-0">
        <Heart size={22} className="text-sara-gold flex-shrink-0" fill="currentColor" strokeWidth={0} />
        <span className="hidden lg:block ml-2 font-serif font-bold text-lg text-sara-gold leading-tight">
          Mother's Team
        </span>
      </div>

      {/* Main nav — 4 tabs */}
      <nav className="flex flex-col gap-1 px-2 flex-shrink-0">
        {MAIN_NAV.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            title={label}
            aria-label={label}
            onClick={() => setActiveTab(id)}
            className={navBtnClass(activeTab === id)}
          >
            <Icon size={20} strokeWidth={1.8} className="flex-shrink-0" />
            <span className="text-sm font-medium hidden lg:block">{label}</span>
          </button>
        ))}
      </nav>

      {/* Secondary — notifications + messages */}
      <div className="mt-4 pt-4 border-t border-sara-linen/60 flex flex-col gap-1 px-2 flex-shrink-0">
        <button
          title="Notificações"
          aria-label="Notificações"
          onClick={onOpenNotifications}
          className={actionBtnClass}
        >
          <span className="relative flex-shrink-0">
            <Bell size={20} strokeWidth={1.8} />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-sara-terracotta text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </span>
            )}
          </span>
          <span className="text-sm font-medium hidden lg:block">Notificações</span>
        </button>

        <button
          title="Mensagens"
          aria-label="Mensagens"
          onClick={onOpenChat}
          className={actionBtnClass}
        >
          <span className="relative flex-shrink-0">
            <MessageSquare size={20} strokeWidth={1.8} />
            {unreadChats > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-sara-terracotta text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadChats > 9 ? '9+' : unreadChats}
              </span>
            )}
          </span>
          <span className="text-sm font-medium hidden lg:block">Mensagens</span>
        </button>

        <button
          title="Recomendações"
          aria-label="Recomendações"
          onClick={() => setActiveTab('shopping' as TabId)}
          className={navBtnClass(activeTab === ('shopping' as TabId))}
        >
          <ShoppingBag size={20} strokeWidth={1.8} className="flex-shrink-0" />
          <span className="text-sm font-medium hidden lg:block">Recomendações</span>
        </button>
      </div>

      {/* Bottom — user chip + settings + logout */}
      <div className="mt-auto flex flex-col gap-1 px-2 pb-4 flex-shrink-0">
        <div className="hidden lg:flex items-center gap-2 px-3 py-2 mb-1">
          <div
            style={{ background: getAvatarColor(motherProfile?.archetypeKey ?? null) }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          >
            {motherName ? motherName.charAt(0).toUpperCase() : 'M'}
          </div>
          <span className="text-sm font-medium text-graphite truncate">{motherName || 'Mãe'}</span>
        </div>

        <button
          title="Configurações"
          aria-label="Configurações"
          onClick={onOpenSettings}
          className={actionBtnClass}
        >
          <Settings size={20} strokeWidth={1.8} className="flex-shrink-0" />
          <span className="text-sm font-medium hidden lg:block">Configurações</span>
        </button>

        <button
          title="Sair"
          aria-label="Sair"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sara-terracotta hover:bg-sara-terracotta/10 md:justify-center lg:justify-start"
        >
          <LogOut size={20} strokeWidth={1.8} className="flex-shrink-0" />
          <span className="text-sm font-medium hidden lg:block">Sair</span>
        </button>
      </div>
    </aside>
  );
}
```

**Nota:** `'shopping'` é mantido como `TabId` transitório via cast para não quebrar o acesso a Recomendações na sidebar. O type `TabId` não precisa incluí-lo formalmente — o cast `as TabId` é suficiente aqui.

- [ ] **Step 4: Rodar testes (devem passar)**

```bash
npx vitest run src/components/layout/LeftSidebar.test.tsx
```

Esperado: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/LeftSidebar.tsx src/components/layout/LeftSidebar.test.tsx
git commit -m "feat(nav): LeftSidebar com 4 tabs definitivas"
```

---

## Task 8: Atualizar App.tsx

**Files:**
- Modify: `src/App.tsx`

Atualizar screens map, remover `openMyProfile` como overlay (vira `setActiveTab('perfil')`), remover `onOpenProfile` do WebLayout, atualizar `isHomeTab`.

- [ ] **Step 1: Atualizar imports**

Em `src/App.tsx`, adicionar o import de JornadaScreen:

```typescript
import { JornadaScreen } from './components/jornada/JornadaScreen';
```

Remover o import de `HomeScreen` (não é mais aba). Deixar `BabyScreen` se ainda usado em algum lugar — caso contrário, remover também.

- [ ] **Step 2: Atualizar openMyProfile**

Localizar:
```typescript
const openMyProfile = () => {
  if (currentUserId) setProfileUserId(currentUserId);
};
```

Substituir por:
```typescript
const setActiveTab = useAppStore((s) => s.setActiveTab);
// ...
const openMyProfile = () => setActiveTab('perfil');
```

(Importar `setActiveTab` do store via hook, ou usar `useAppStore.getState().setActiveTab('perfil')`)

- [ ] **Step 3: Atualizar screens map**

Localizar o objeto `screens` e substituir:

```typescript
const screens: Record<TabId, ReactElement> = {
  hoje:       <DashboardScreen />,
  maeIA:      <MaeIAScreen onBack={() => useAppStore.getState().setActiveTab('hoje')} />,
  jornada:    <JornadaScreen />,
  comunidade: <ComunidadeScreen />,
  perfil: (
    <ProfileScreen
      key={currentUserId ?? 'self'}
      userId={currentUserId ?? undefined}
      isTab
      onOpenProfile={(id) => setProfileUserId(id)}
    />
  ),
};
```

**Nota:** O `onBack` de MaeIAScreen usa `useAppStore.getState()` (acesso direto sem hook) porque `screens` é um objeto const, não dentro de render. Alternativa mais limpa: extrair em variável:

```typescript
const goToHoje = () => useAppStore.getState().setActiveTab('hoje');
// ...
maeIA: <MaeIAScreen onBack={goToHoje} />,
```

- [ ] **Step 4: Atualizar isHomeTab**

Localizar:
```typescript
const isHomeTab = activeTab === 'home' || activeTab === 'comunidade';
```

Substituir:
```typescript
const isHomeTab = activeTab === 'hoje' || activeTab === 'comunidade';
```

- [ ] **Step 5: Remover onOpenProfile do WebLayout**

No JSX do WebLayout, remover `onOpenProfile={openMyProfile}` da prop list do `<WebLayout>`.

No `src/components/layout/WebLayout.tsx`, remover `onOpenProfile` da interface e do componente (não é mais usado, LeftSidebar não precisa).

No `src/components/layout/MobileShell.tsx`, se `onOpenProfile` ainda for necessário para o SideDrawer, manter — caso contrário, remover.

Verificar `SideDrawer.tsx`: se tiver botão de Perfil que chama `onOpenProfile`, atualizá-lo para `setActiveTab('perfil')` diretamente do store.

- [ ] **Step 6: Checar erros TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -60
```

Resolver qualquer erro restante. Erros típicos esperados:
- Propriedades removidas de interfaces (WebLayout, MobileShell, SideDrawer)
- TabIds obsoletos em useAppStore.reception.test.ts ou outros testes com setState

- [ ] **Step 7: Rodar suite completa**

```bash
npx vitest run
```

Esperado: todos os testes passam. Para qualquer teste que usa `activeTab: 'home'`, `'baby'`, `'rotina'` no `setState`, trocar pelo equivalente novo.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/components/layout/WebLayout.tsx src/components/layout/MobileShell.tsx
git commit -m "feat(nav): App.tsx integra 4 abas definitivas + Perfil como tab nativa"
```

---

## Task 9: Verificação final e cleanup

- [ ] **Step 1: Suite completa de testes**

```bash
npx vitest run 2>&1 | tail -20
```

Esperado: 0 falhas.

- [ ] **Step 2: Verificação TypeScript**

```bash
npx tsc --noEmit
```

Esperado: 0 erros.

- [ ] **Step 3: Checar referências obsoletas**

```bash
grep -r "'home'\|'baby'\|'rotina'\|'shopping'" src/ --include="*.ts" --include="*.tsx" | grep -v ".test." | grep -v "node_modules"
```

Qualquer resultado que não seja em comentários ou strings de exibição indica que algo foi esquecido. Corrigir antes de commitar.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore(nav): cleanup referencias obsoletas de tabs antigos"
```

---

## Self-Review

**Spec coverage checklist:**
- [x] 4 abas no BottomTabBar — Task 4
- [x] 4 abas no LeftSidebar web — Task 7
- [x] JornadaScreen com segmented control — Task 3
- [x] Perfil como aba nativa (sem overlay para si mesmo) — Task 6 + Task 8
- [x] Sara FAB no Hoje — Task 5
- [x] Migração automática de sessions antigas — Task 2
- [x] MaeIA acessível sem ser tab visível — Task 5 (FAB) + Task 8 (hidden tab)
- [x] Testes para cada mudança — Tasks 1-8
- [x] TypeScript sem erros — Task 9
