# Mother's Team MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o MVP do Mother's Team — web app mobile-first com shell de 390px, 5 abas de navegação, rotina da mãe, rastreador do bebê, chat MãeIA, fórum e vitrine estática.

**Architecture:** SPA Vite + React contido em um shell de 390×844px centralizado no browser. Estado global via Zustand persistido em localStorage. Sem backend no MVP — dados seed/estáticos ou armazenados localmente.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3, Zustand, Lucide React, Vitest, React Testing Library

---

## Mapa de Arquivos

```
mothers-team/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── setupTests.ts
│   ├── types/
│   │   └── index.ts                          — todos os tipos compartilhados
│   ├── utils/
│   │   ├── pregnancyUtils.ts                 — cálculos de fase, saudação, estágio evolutivo
│   │   └── pregnancyUtils.test.ts
│   ├── store/
│   │   └── useAppStore.ts                    — estado global (aba ativa, fase, entradas)
│   └── components/
│       ├── layout/
│       │   ├── MobileShell.tsx               — frame de 390px
│       │   ├── BottomTabBar.tsx              — nav bar com botão central elevado
│       │   └── BottomTabBar.test.tsx
│       ├── home/
│       │   ├── HomeScreen.tsx                — orquestrador da tela Home
│       │   ├── WeekCalendar.tsx              — calendário horizontal rolável
│       │   ├── WeekCalendar.test.tsx
│       │   └── RoutineTimeline.tsx           — lista cronológica de tarefas
│       ├── baby/
│       │   ├── BabyScreen.tsx                — orquestrador da tela Baby
│       │   ├── BabyEvolutionIcon.tsx         — emoji que muda com a gestação
│       │   ├── BreastfeedingCard.tsx         — timer + último lado
│       │   ├── SleepCard.tsx                 — total de sono do dia
│       │   ├── DiaperCard.tsx                — contador de fraldas
│       │   ├── DiaperCard.test.tsx
│       │   └── BabyTimeline.tsx              — atividades do bebê no dia
│       ├── maeIA/
│       │   └── MaeIAScreen.tsx               — chat UI + quick chips
│       ├── comunidade/
│       │   ├── ComunidadeScreen.tsx          — feed com filtro de categoria
│       │   └── ComunidadeScreen.test.tsx
│       └── shopping/
│           └── ShoppingScreen.tsx            — vitrine estática "em breve"
```

---

## Task 1: Setup, Design System & Mobile Shell

**Files:**
- Create: `package.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/setupTests.ts`
- Create: `src/types/index.ts`
- Create: `src/utils/pregnancyUtils.ts`
- Test: `src/utils/pregnancyUtils.test.ts`
- Create: `src/store/useAppStore.ts`
- Create: `src/components/layout/MobileShell.tsx`
- Create: `src/components/layout/BottomTabBar.tsx`
- Test: `src/components/layout/BottomTabBar.test.tsx`

- [ ] **Step 1.1: Inicializar projeto Vite**

Execute no diretório `mothers-team/`:

```bash
npm create vite@latest . -- --template react-ts
npm install
npm install tailwindcss@3 postcss autoprefixer zustand lucide-react
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npx tailwindcss init -p
```

- [ ] **Step 1.2: Configurar Tailwind**

Substituir `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        lavender: {
          50:  '#F5F3FA',
          100: '#EBE8F5',
          200: '#D4CCE8',
          400: '#9D8FCC',
          600: '#7B6BB8',
        },
        sage: {
          100: '#E8EFE8',
          400: '#8FAF8F',
          600: '#5A805A',
        },
        blush: {
          100: '#F5EBE8',
          300: '#D4A898',
          500: '#C49A8A',
        },
        babyblue: {
          100: '#E8F0F5',
          300: '#9BC4D0',
        },
        graphite:         '#2C2C2C',
        'graphite-light': '#4A4A4A',
        'graphite-muted': '#7A7A7A',
        offwhite:         '#F8F5F0',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 1.3: Configurar Vite para testes**

Substituir `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
})
```

Criar `src/setupTests.ts`:

```ts
import '@testing-library/jest-dom'
```

Adicionar em `tsconfig.json` → `compilerOptions`:

```json
"types": ["vitest/globals"]
```

Adicionar em `package.json` → `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 1.4: CSS base com design tokens**

Substituir `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    background-color: #E8E4DF;
    color: #2C2C2C;
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
}
```

- [ ] **Step 1.5: Definir tipos compartilhados**

Criar `src/types/index.ts`:

```ts
export type TabId = 'home' | 'maeIA' | 'baby' | 'comunidade' | 'shopping';

export type PregnancyPhase =
  | { stage: 'pregnant'; week: number }
  | { stage: 'postpartum'; ageInDays: number };

export type EvolutionStage = 'embryo' | 'fetus-early' | 'fetus-late' | 'newborn';

export interface RoutineEntry {
  id: string;
  time: string;
  title: string;
  category: 'task' | 'appointment' | 'medication';
  done: boolean;
}

export interface BabyEntry {
  id: string;
  time: string;
  type: 'sleep' | 'feed' | 'diaper';
  detail: string;
}
```

- [ ] **Step 1.6: Escrever teste com falha para pregnancyUtils**

Criar `src/utils/pregnancyUtils.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getEvolutionStage, getHeaderGreeting } from './pregnancyUtils';

describe('getEvolutionStage', () => {
  it('returns embryo for weeks 1–8', () => {
    expect(getEvolutionStage({ stage: 'pregnant', week: 1 })).toBe('embryo');
    expect(getEvolutionStage({ stage: 'pregnant', week: 8 })).toBe('embryo');
  });
  it('returns fetus-early for weeks 9–20', () => {
    expect(getEvolutionStage({ stage: 'pregnant', week: 9 })).toBe('fetus-early');
    expect(getEvolutionStage({ stage: 'pregnant', week: 20 })).toBe('fetus-early');
  });
  it('returns fetus-late for weeks 21–40', () => {
    expect(getEvolutionStage({ stage: 'pregnant', week: 21 })).toBe('fetus-late');
    expect(getEvolutionStage({ stage: 'pregnant', week: 40 })).toBe('fetus-late');
  });
  it('returns newborn for postpartum', () => {
    expect(getEvolutionStage({ stage: 'postpartum', ageInDays: 7 })).toBe('newborn');
  });
});

describe('getHeaderGreeting', () => {
  it('shows remaining weeks for pregnant (plural)', () => {
    expect(getHeaderGreeting({ stage: 'pregnant', week: 36 }, 'Mariana', 'Léo'))
      .toBe('Olá, Mariana! Faltam 4 semanas para o parto');
  });
  it('shows 1 week singular', () => {
    expect(getHeaderGreeting({ stage: 'pregnant', week: 39 }, 'Ana', 'Léo'))
      .toBe('Olá, Ana! Falta 1 semana para o parto');
  });
  it('shows weeks for postpartum', () => {
    expect(getHeaderGreeting({ stage: 'postpartum', ageInDays: 21 }, 'Mariana', 'Léo'))
      .toBe('Mariana, o Léo já está com 3 semanas!');
  });
  it('shows days when under 1 week', () => {
    expect(getHeaderGreeting({ stage: 'postpartum', ageInDays: 5 }, 'Mariana', 'Léo'))
      .toBe('Mariana, o Léo já está com 5 dias!');
  });
});
```

- [ ] **Step 1.7: Verificar que o teste falha**

```bash
npm test -- src/utils/pregnancyUtils.test.ts
```

Esperado: FAIL — `Cannot find module './pregnancyUtils'`

- [ ] **Step 1.8: Implementar pregnancyUtils**

Criar `src/utils/pregnancyUtils.ts`:

```ts
import type { PregnancyPhase, EvolutionStage } from '../types';

export function getEvolutionStage(phase: PregnancyPhase): EvolutionStage {
  if (phase.stage === 'postpartum') return 'newborn';
  if (phase.week <= 8) return 'embryo';
  if (phase.week <= 20) return 'fetus-early';
  return 'fetus-late';
}

export function getEvolutionEmoji(phase: PregnancyPhase): string {
  const map: Record<EvolutionStage, string> = {
    embryo:       '🌱',
    'fetus-early': '🫘',
    'fetus-late':  '🤰',
    newborn:      '👶',
  };
  return map[getEvolutionStage(phase)];
}

export function getHeaderGreeting(
  phase: PregnancyPhase,
  motherName: string,
  babyName: string,
): string {
  if (phase.stage === 'postpartum') {
    const weeks = Math.floor(phase.ageInDays / 7);
    if (weeks >= 1) {
      return `${motherName}, o ${babyName} já está com ${weeks} semana${weeks > 1 ? 's' : ''}!`;
    }
    return `${motherName}, o ${babyName} já está com ${phase.ageInDays} dias!`;
  }
  const remaining = 40 - phase.week;
  const plural = remaining !== 1;
  return `Olá, ${motherName}! Falt${plural ? 'am' : 'a'} ${remaining} semana${plural ? 's' : ''} para o parto`;
}
```

- [ ] **Step 1.9: Verificar que o teste passa**

```bash
npm test -- src/utils/pregnancyUtils.test.ts
```

Esperado: PASS (4 suites, 8 testes)

- [ ] **Step 1.10: Criar Zustand store**

Criar `src/store/useAppStore.ts`:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TabId, PregnancyPhase, RoutineEntry, BabyEntry } from '../types';

const SEED_ROUTINE: RoutineEntry[] = [
  { id: '1', time: '08:00', title: 'Tomar Vitamina', category: 'medication', done: false },
  { id: '2', time: '14:00', title: 'Consulta Obstetra', category: 'appointment', done: false },
  { id: '3', time: '19:00', title: 'Caminhada leve 20min', category: 'task', done: false },
];

const SEED_BABY: BabyEntry[] = [
  { id: '1', time: '09:15', type: 'sleep', detail: 'Dormiu por 45 min' },
  { id: '2', time: '10:30', type: 'feed', detail: 'Mamou 15 min (esq.)' },
  { id: '3', time: '12:00', type: 'diaper', detail: 'Fralda trocada — xixi' },
];

interface AppState {
  activeTab: TabId;
  phase: PregnancyPhase;
  motherName: string;
  babyName: string;
  selectedDate: string;
  routineEntries: RoutineEntry[];
  babyEntries: BabyEntry[];
  diaperCount: number;
  lastFeedSide: 'left' | 'right';
  setActiveTab: (tab: TabId) => void;
  setSelectedDate: (date: string) => void;
  toggleRoutineDone: (id: string) => void;
  incrementDiaper: () => void;
  toggleFeedSide: () => void;
  addBabyEntry: (entry: BabyEntry) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeTab: 'home',
      phase: { stage: 'pregnant', week: 28 },
      motherName: 'Mariana',
      babyName: 'Léo',
      selectedDate: new Date().toISOString().split('T')[0],
      routineEntries: SEED_ROUTINE,
      babyEntries: SEED_BABY,
      diaperCount: 0,
      lastFeedSide: 'left',
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      toggleRoutineDone: (id) =>
        set((s) => ({
          routineEntries: s.routineEntries.map((e) =>
            e.id === id ? { ...e, done: !e.done } : e,
          ),
        })),
      incrementDiaper: () =>
        set((s) => ({
          diaperCount: s.diaperCount + 1,
          babyEntries: [
            ...s.babyEntries,
            {
              id: Date.now().toString(),
              time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              type: 'diaper',
              detail: 'Fralda trocada',
            },
          ],
        })),
      toggleFeedSide: () =>
        set((s) => ({ lastFeedSide: s.lastFeedSide === 'left' ? 'right' : 'left' })),
      addBabyEntry: (entry) =>
        set((s) => ({ babyEntries: [...s.babyEntries, entry] })),
    }),
    { name: 'mothers-team-v1' },
  ),
);
```

- [ ] **Step 1.11: Escrever teste com falha para BottomTabBar**

Criar `src/components/layout/BottomTabBar.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { BottomTabBar } from './BottomTabBar';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  useAppStore.setState({ activeTab: 'home', phase: { stage: 'pregnant', week: 28 } });
});

describe('BottomTabBar', () => {
  it('renders 5 navigation items', () => {
    render(<BottomTabBar />);
    expect(screen.getByTestId('tab-home')).toBeInTheDocument();
    expect(screen.getByTestId('tab-maeIA')).toBeInTheDocument();
    expect(screen.getByTestId('baby-central-button')).toBeInTheDocument();
    expect(screen.getByTestId('tab-comunidade')).toBeInTheDocument();
    expect(screen.getByTestId('tab-shopping')).toBeInTheDocument();
  });

  it('activates the clicked tab', () => {
    render(<BottomTabBar />);
    fireEvent.click(screen.getByTestId('tab-comunidade'));
    expect(useAppStore.getState().activeTab).toBe('comunidade');
  });

  it('activates baby tab via central button', () => {
    render(<BottomTabBar />);
    fireEvent.click(screen.getByTestId('baby-central-button'));
    expect(useAppStore.getState().activeTab).toBe('baby');
  });

  it('shows 🤰 emoji for week 28', () => {
    render(<BottomTabBar />);
    expect(screen.getByTestId('baby-central-button')).toHaveTextContent('🤰');
  });

  it('shows 🌱 emoji for week 4', () => {
    useAppStore.setState({ phase: { stage: 'pregnant', week: 4 } });
    render(<BottomTabBar />);
    expect(screen.getByTestId('baby-central-button')).toHaveTextContent('🌱');
  });
});
```

- [ ] **Step 1.12: Verificar que o teste falha**

```bash
npm test -- src/components/layout/BottomTabBar.test.tsx
```

Esperado: FAIL — `Cannot find module './BottomTabBar'`

- [ ] **Step 1.13: Criar BottomTabBar**

Criar `src/components/layout/BottomTabBar.tsx`:

```tsx
import { Home, MessageCircle, Users, ShoppingBag } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getEvolutionEmoji } from '../../utils/pregnancyUtils';
import type { TabId } from '../../types';

function TabBtn({
  id, label, active, onClick, children,
}: {
  id: TabId; label: string; active: boolean; onClick: () => void; children: ReactNode;
}) {
  return (
    <button
      data-testid={`tab-${id}`}
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`flex flex-col items-center gap-0.5 w-14 py-1 rounded-xl transition-colors ${
        active ? 'text-lavender-600' : 'text-graphite-muted'
      }`}
    >
      {children}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export function BottomTabBar() {
  const { activeTab, setActiveTab, phase } = useAppStore();

  return (
    <nav
      data-testid="bottom-tab-bar"
      className="flex-shrink-0 bg-white border-t border-gray-100 flex items-center justify-around px-2 pt-1 pb-2 h-[68px]"
    >
      <TabBtn id="home" label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')}>
        <Home size={22} strokeWidth={1.8} />
      </TabBtn>

      <TabBtn id="maeIA" label="MãeIA" active={activeTab === 'maeIA'} onClick={() => setActiveTab('maeIA')}>
        <MessageCircle size={22} strokeWidth={1.8} />
      </TabBtn>

      {/* Botão central elevado */}
      <div className="flex flex-col items-center -translate-y-3">
        <button
          data-testid="baby-central-button"
          onClick={() => setActiveTab('baby')}
          aria-label="Abrir rotina do bebê"
          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg shadow-lavender-400/30 transition-all active:scale-95 ${
            activeTab === 'baby'
              ? 'bg-lavender-600 ring-2 ring-lavender-400 ring-offset-2'
              : 'bg-lavender-400'
          }`}
        >
          {getEvolutionEmoji(phase)}
        </button>
        <span className="text-[10px] font-medium text-graphite-muted mt-1">Bebê</span>
      </div>

      <TabBtn id="comunidade" label="Comunidade" active={activeTab === 'comunidade'} onClick={() => setActiveTab('comunidade')}>
        <Users size={22} strokeWidth={1.8} />
      </TabBtn>

      <TabBtn id="shopping" label="Shopping" active={activeTab === 'shopping'} onClick={() => setActiveTab('shopping')}>
        <ShoppingBag size={22} strokeWidth={1.8} />
      </TabBtn>
    </nav>
  );
}
```

- [ ] **Step 1.14: Criar MobileShell**

Criar `src/components/layout/MobileShell.tsx`:

```tsx
import type { ReactNode } from 'react';
import { BottomTabBar } from './BottomTabBar';

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#E8E4DF] flex items-center justify-center">
      <div className="relative w-[390px] h-[844px] bg-offwhite shadow-2xl overflow-hidden flex flex-col rounded-[2px] sm:rounded-[44px]">
        {/* Status bar */}
        <div className="h-11 flex-shrink-0 bg-white/80 backdrop-blur-sm" />
        {/* Conteúdo rolável */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {children}
        </main>
        <BottomTabBar />
      </div>
    </div>
  );
}
```

- [ ] **Step 1.15: Criar App.tsx e main.tsx**

Criar `src/App.tsx`:

```tsx
import { useAppStore } from './store/useAppStore';
import { MobileShell } from './components/layout/MobileShell';

function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[600px] gap-3">
      <span className="text-5xl">🚧</span>
      <p className="text-graphite-muted font-medium">{name}</p>
    </div>
  );
}

export default function App() {
  const activeTab = useAppStore((s) => s.activeTab);

  const screens: Record<typeof activeTab, JSX.Element> = {
    home:       <Placeholder name="Home — em construção" />,
    maeIA:      <Placeholder name="MãeIA — em construção" />,
    baby:       <Placeholder name="Rotina do Bebê — em construção" />,
    comunidade: <Placeholder name="Comunidade — em construção" />,
    shopping:   <Placeholder name="Shopping — em construção" />,
  };

  return <MobileShell>{screens[activeTab]}</MobileShell>;
}
```

Substituir `src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 1.16: Verificar que todos os testes passam**

```bash
npm test
```

Esperado: PASS (todos os testes de pregnancyUtils e BottomTabBar)

- [ ] **Step 1.17: Verificar visualmente no browser**

```bash
npm run dev
```

Abrir `http://localhost:5173`. Verificar:
- Fundo bege (#E8E4DF) com o frame de 390px centralizado
- Status bar branca translúcida no topo
- 5 abas na bottom bar, botão central com 🤰 elevado
- Clicar em cada aba muda a cor ativa para lavanda
- Botão bebê muda para ring quando ativo

- [ ] **Step 1.18: Commit**

```bash
git add src/ index.html package.json vite.config.ts tailwind.config.js postcss.config.js tsconfig.json
git commit -m "feat: project setup, design tokens, mobile shell e 5-tab navigation"
```

---

## Task 2: Home Screen — Calendário & Timeline de Rotina

**Files:**
- Create: `src/components/home/HomeScreen.tsx`
- Create: `src/components/home/WeekCalendar.tsx`
- Test: `src/components/home/WeekCalendar.test.tsx`
- Create: `src/components/home/RoutineTimeline.tsx`
- Modify: `src/App.tsx` (substituir placeholder Home)

- [ ] **Step 2.1: Escrever teste com falha para WeekCalendar**

Criar `src/components/home/WeekCalendar.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { WeekCalendar } from './WeekCalendar';
import { useAppStore } from '../../store/useAppStore';

const FIXED_DATE = '2026-06-27';

beforeEach(() => {
  useAppStore.setState({ selectedDate: FIXED_DATE });
});

describe('WeekCalendar', () => {
  it('renders 7 day buttons', () => {
    render(<WeekCalendar referenceDate={FIXED_DATE} />);
    expect(screen.getAllByRole('button')).toHaveLength(7);
  });

  it('highlights the selected date', () => {
    render(<WeekCalendar referenceDate={FIXED_DATE} />);
    const buttons = screen.getAllByRole('button');
    const selectedBtn = buttons.find((b) => b.getAttribute('aria-pressed') === 'true');
    expect(selectedBtn).toBeTruthy();
  });

  it('clicking a day updates selectedDate in store', () => {
    render(<WeekCalendar referenceDate={FIXED_DATE} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(useAppStore.getState().selectedDate).not.toBe('');
  });
});
```

- [ ] **Step 2.2: Verificar que o teste falha**

```bash
npm test -- src/components/home/WeekCalendar.test.tsx
```

Esperado: FAIL — `Cannot find module './WeekCalendar'`

- [ ] **Step 2.3: Implementar WeekCalendar**

Criar `src/components/home/WeekCalendar.tsx`:

```tsx
import { useAppStore } from '../../store/useAppStore';

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getWeekDays(referenceDate: string): Date[] {
  const ref = new Date(referenceDate + 'T12:00:00');
  const day = ref.getDay();
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - day + (day === 0 ? -6 : 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function WeekCalendar({ referenceDate }: { referenceDate: string }) {
  const { selectedDate, setSelectedDate } = useAppStore();
  const days = getWeekDays(referenceDate);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-2">
      {days.map((day) => {
        const iso = toISO(day);
        const isSelected = iso === selectedDate;
        const isToday = iso === today;

        return (
          <button
            key={iso}
            aria-pressed={isSelected}
            onClick={() => setSelectedDate(iso)}
            className={`flex-shrink-0 flex flex-col items-center gap-1 w-11 py-2 rounded-2xl transition-all ${
              isSelected
                ? 'bg-lavender-600 text-white shadow-md shadow-lavender-400/30'
                : 'bg-white text-graphite'
            }`}
          >
            <span className="text-[11px] font-medium">
              {DAYS_PT[day.getDay()]}
            </span>
            <span className={`text-base font-semibold ${isToday && !isSelected ? 'text-lavender-600' : ''}`}>
              {day.getDate()}
            </span>
            {isToday && (
              <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-lavender-400'}`} />
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2.4: Verificar que o teste passa**

```bash
npm test -- src/components/home/WeekCalendar.test.tsx
```

Esperado: PASS

- [ ] **Step 2.5: Criar RoutineTimeline**

Criar `src/components/home/RoutineTimeline.tsx`:

```tsx
import { Check, Pill, Calendar, CheckSquare } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { RoutineEntry } from '../../types';

const CATEGORY_CONFIG = {
  medication:  { icon: Pill, color: 'text-blush-500', bg: 'bg-blush-100' },
  appointment: { icon: Calendar, color: 'text-babyblue-300', bg: 'bg-babyblue-100' },
  task:        { icon: CheckSquare, color: 'text-sage-400', bg: 'bg-sage-100' },
} as const;

function EntryCard({ entry }: { entry: RoutineEntry }) {
  const toggleRoutineDone = useAppStore((s) => s.toggleRoutineDone);
  const cfg = CATEGORY_CONFIG[entry.category];

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-2xl bg-white shadow-sm transition-opacity ${
        entry.done ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
        <cfg.icon size={18} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${entry.done ? 'line-through text-graphite-muted' : 'text-graphite'}`}>
          {entry.title}
        </p>
        <p className="text-xs text-graphite-muted">{entry.time}</p>
      </div>
      <button
        onClick={() => toggleRoutineDone(entry.id)}
        aria-label={entry.done ? 'Desmarcar tarefa' : 'Marcar como feita'}
        className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
          entry.done
            ? 'bg-lavender-600 border-lavender-600'
            : 'border-gray-200 bg-white'
        }`}
      >
        {entry.done && <Check size={14} className="text-white" strokeWidth={2.5} />}
      </button>
    </div>
  );
}

export function RoutineTimeline() {
  const routineEntries = useAppStore((s) => s.routineEntries);
  const sorted = [...routineEntries].sort((a, b) => a.time.localeCompare(b.time));

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
      {sorted.map((entry) => (
        <EntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2.6: Criar HomeScreen**

Criar `src/components/home/HomeScreen.tsx`:

```tsx
import { Bell, Plus } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getHeaderGreeting } from '../../utils/pregnancyUtils';
import { WeekCalendar } from './WeekCalendar';
import { RoutineTimeline } from './RoutineTimeline';

export function HomeScreen() {
  const { phase, motherName, babyName, selectedDate } = useAppStore();
  const greeting = getHeaderGreeting(phase, motherName, babyName);

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4">
        <div>
          <p className="text-xs text-graphite-muted font-medium">Bom dia ☀️</p>
          <h1 className="text-base font-semibold text-graphite leading-snug mt-0.5 max-w-[260px]">
            {greeting}
          </h1>
        </div>
        <button
          aria-label="Notificações"
          className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center"
        >
          <Bell size={18} className="text-graphite-light" strokeWidth={1.8} />
        </button>
      </div>

      {/* Calendário semanal */}
      <WeekCalendar referenceDate={selectedDate} />

      {/* Título da seção */}
      <div className="flex items-center justify-between px-4">
        <h2 className="text-sm font-semibold text-graphite">Sua Rotina</h2>
        <span className="text-xs text-graphite-muted">
          {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </span>
      </div>

      {/* Timeline de tarefas */}
      <RoutineTimeline />

      {/* FAB */}
      <button
        aria-label="Adicionar lembrete ou evento"
        className="fixed bottom-24 right-6 w-12 h-12 rounded-full bg-lavender-600 shadow-lg shadow-lavender-400/40 flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus size={22} className="text-white" strokeWidth={2.5} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2.7: Substituir placeholder Home no App.tsx**

Editar `src/App.tsx` — adicionar import e trocar o placeholder:

```tsx
import { useAppStore } from './store/useAppStore';
import { MobileShell } from './components/layout/MobileShell';
import { HomeScreen } from './components/home/HomeScreen';

function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[600px] gap-3">
      <span className="text-5xl">🚧</span>
      <p className="text-graphite-muted font-medium">{name}</p>
    </div>
  );
}

export default function App() {
  const activeTab = useAppStore((s) => s.activeTab);

  const screens: Record<typeof activeTab, JSX.Element> = {
    home:       <HomeScreen />,
    maeIA:      <Placeholder name="MãeIA — em construção" />,
    baby:       <Placeholder name="Rotina do Bebê — em construção" />,
    comunidade: <Placeholder name="Comunidade — em construção" />,
    shopping:   <Placeholder name="Shopping — em construção" />,
  };

  return <MobileShell>{screens[activeTab]}</MobileShell>;
}
```

- [ ] **Step 2.8: Verificar todos os testes**

```bash
npm test
```

Esperado: PASS (todos os testes anteriores + WeekCalendar)

- [ ] **Step 2.9: Verificar Home visualmente**

Abrir `http://localhost:5173`. Verificar:
- Saudação "Olá, Mariana! Faltam 12 semanas para o parto"
- 7 dias rolável, dia atual destacado em lavanda
- 3 tarefas listadas com ícones e horários
- Checar tarefa a marca como feita (riscado + opacidade)
- Botão + roxo flutuante no canto inferior direito

- [ ] **Step 2.10: Commit**

```bash
git add src/
git commit -m "feat: home screen com calendário semanal e timeline de rotina"
```

---

## Task 3: Tela Baby — Rastreadores & Timeline

**Files:**
- Create: `src/components/baby/BabyEvolutionIcon.tsx`
- Create: `src/components/baby/BreastfeedingCard.tsx`
- Create: `src/components/baby/SleepCard.tsx`
- Create: `src/components/baby/DiaperCard.tsx`
- Test: `src/components/baby/DiaperCard.test.tsx`
- Create: `src/components/baby/BabyTimeline.tsx`
- Create: `src/components/baby/BabyScreen.tsx`
- Modify: `src/App.tsx` (substituir placeholder Baby)

- [ ] **Step 3.1: Escrever teste com falha para DiaperCard**

Criar `src/components/baby/DiaperCard.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DiaperCard } from './DiaperCard';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  useAppStore.setState({ diaperCount: 0, babyEntries: [] });
});

describe('DiaperCard', () => {
  it('shows initial count of 0', () => {
    render(<DiaperCard />);
    expect(screen.getByTestId('diaper-count')).toHaveTextContent('0');
  });

  it('increments count on button click', () => {
    render(<DiaperCard />);
    fireEvent.click(screen.getByRole('button', { name: /registrar troca/i }));
    expect(useAppStore.getState().diaperCount).toBe(1);
    expect(screen.getByTestId('diaper-count')).toHaveTextContent('1');
  });

  it('increments multiple times', () => {
    render(<DiaperCard />);
    const btn = screen.getByRole('button', { name: /registrar troca/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(useAppStore.getState().diaperCount).toBe(3);
  });
});
```

- [ ] **Step 3.2: Verificar que o teste falha**

```bash
npm test -- src/components/baby/DiaperCard.test.tsx
```

Esperado: FAIL — `Cannot find module './DiaperCard'`

- [ ] **Step 3.3: Implementar DiaperCard**

Criar `src/components/baby/DiaperCard.tsx`:

```tsx
import { Plus } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function DiaperCard() {
  const { diaperCount, incrementDiaper } = useAppStore();

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">👶</span>
          <span className="text-sm font-semibold text-graphite">Fraldas</span>
        </div>
        <span className="text-xs text-graphite-muted">hoje</span>
      </div>

      <div className="flex items-center justify-between">
        <span
          data-testid="diaper-count"
          className="text-4xl font-bold text-graphite tabular-nums"
        >
          {diaperCount}
        </span>
        <button
          aria-label="Registrar troca de fralda"
          onClick={incrementDiaper}
          className="w-11 h-11 rounded-2xl bg-lavender-100 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus size={20} className="text-lavender-600" strokeWidth={2.5} />
        </button>
      </div>

      <p className="text-xs text-graphite-muted">
        {diaperCount === 0
          ? 'Nenhuma troca registrada'
          : `${diaperCount} troca${diaperCount > 1 ? 's' : ''} registrada${diaperCount > 1 ? 's' : ''}`}
      </p>
    </div>
  );
}
```

- [ ] **Step 3.4: Verificar que o teste passa**

```bash
npm test -- src/components/baby/DiaperCard.test.tsx
```

Esperado: PASS

- [ ] **Step 3.5: Criar BreastfeedingCard**

Criar `src/components/baby/BreastfeedingCard.tsx`:

```tsx
import { useAppStore } from '../../store/useAppStore';

export function BreastfeedingCard() {
  const { lastFeedSide, toggleFeedSide, addBabyEntry } = useAppStore();

  function handleRegister() {
    const side = lastFeedSide === 'left' ? 'esquerdo' : 'direito';
    addBabyEntry({
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      type: 'feed',
      detail: `Mamou — seio ${side}`,
    });
    toggleFeedSide();
  }

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">🤱</span>
        <span className="text-sm font-semibold text-graphite">Amamentação</span>
      </div>

      <div className="flex gap-2">
        {(['left', 'right'] as const).map((side) => (
          <button
            key={side}
            onClick={() => useAppStore.setState({ lastFeedSide: side })}
            aria-pressed={lastFeedSide === side}
            className={`flex-1 py-2 rounded-2xl text-sm font-medium transition-colors ${
              lastFeedSide === side
                ? 'bg-blush-500 text-white'
                : 'bg-blush-100 text-blush-500'
            }`}
          >
            {side === 'left' ? '⬅️ Esquerdo' : 'Direito ➡️'}
          </button>
        ))}
      </div>

      <button
        onClick={handleRegister}
        className="w-full py-2.5 rounded-2xl bg-lavender-100 text-lavender-600 text-sm font-semibold active:scale-[0.98] transition-transform"
      >
        Registrar mamada
      </button>
    </div>
  );
}
```

- [ ] **Step 3.6: Criar SleepCard**

Criar `src/components/baby/SleepCard.tsx`:

```tsx
import { Moon, Plus } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function SleepCard() {
  const { babyEntries, addBabyEntry } = useAppStore();
  const [minutes, setMinutes] = useState(45);

  const totalMinutes = babyEntries
    .filter((e) => e.type === 'sleep')
    .reduce((acc, e) => {
      const match = e.detail.match(/(\d+)/);
      return acc + (match ? parseInt(match[1]) : 0);
    }, 0);

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  function handleAdd() {
    addBabyEntry({
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      type: 'sleep',
      detail: `Dormiu por ${minutes} min`,
    });
  }

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Moon size={18} className="text-lavender-600" strokeWidth={1.8} />
        <span className="text-sm font-semibold text-graphite">Sono</span>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-bold text-graphite tabular-nums">
          {hours > 0 ? `${hours}h` : ''}{mins > 0 ? `${mins}m` : '0m'}
        </span>
        <span className="text-xs text-graphite-muted">total hoje</span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="range"
          min={5}
          max={180}
          step={5}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="flex-1 accent-lavender-600"
          aria-label="Duração da soneca em minutos"
        />
        <span className="text-xs text-graphite-muted w-10 text-right">{minutes}m</span>
      </div>

      <button
        onClick={handleAdd}
        className="w-full py-2.5 rounded-2xl bg-lavender-100 text-lavender-600 text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
      >
        <Plus size={16} strokeWidth={2.5} />
        Registrar soneca
      </button>
    </div>
  );
}
```

- [ ] **Step 3.7: Criar BabyEvolutionIcon**

Criar `src/components/baby/BabyEvolutionIcon.tsx`:

```tsx
import { useAppStore } from '../../store/useAppStore';
import { getEvolutionStage, getEvolutionEmoji } from '../../utils/pregnancyUtils';

const STAGE_LABELS = {
  embryo:       'Embrião',
  'fetus-early': 'Feto inicial',
  'fetus-late':  'Bebê formado',
  newborn:      'Recém-nascido',
} as const;

export function BabyEvolutionIcon() {
  const { phase, babyName } = useAppStore();
  const stage = getEvolutionStage(phase);
  const emoji = getEvolutionEmoji(phase);

  const subtitle =
    phase.stage === 'pregnant'
      ? `Semana ${phase.week} — ${STAGE_LABELS[stage]}`
      : `${babyName} — ${Math.floor(phase.ageInDays / 7)} semanas de vida`;

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <div className="w-20 h-20 rounded-full bg-lavender-100 flex items-center justify-center text-5xl shadow-inner">
        {emoji}
      </div>
      <p className="text-xs text-graphite-muted font-medium text-center">{subtitle}</p>
    </div>
  );
}
```

- [ ] **Step 3.8: Criar BabyTimeline**

Criar `src/components/baby/BabyTimeline.tsx`:

```tsx
import { useAppStore } from '../../store/useAppStore';
import type { BabyEntry } from '../../types';

const TYPE_EMOJI: Record<BabyEntry['type'], string> = {
  sleep: '😴',
  feed:  '🤱',
  diaper: '👶',
};

export function BabyTimeline() {
  const babyEntries = useAppStore((s) => s.babyEntries);
  const sorted = [...babyEntries].sort((a, b) => b.time.localeCompare(a.time));

  return (
    <div className="flex flex-col gap-2 px-4">
      <h3 className="text-sm font-semibold text-graphite">Timeline de hoje</h3>
      {sorted.length === 0 ? (
        <p className="text-xs text-graphite-muted py-4 text-center">Nenhuma atividade registrada</p>
      ) : (
        sorted.map((entry) => (
          <div key={entry.id} className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm">
            <span className="text-lg">{TYPE_EMOJI[entry.type]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-graphite truncate">{entry.detail}</p>
              <p className="text-xs text-graphite-muted">{entry.time}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 3.9: Criar BabyScreen**

Criar `src/components/baby/BabyScreen.tsx`:

```tsx
import { BabyEvolutionIcon } from './BabyEvolutionIcon';
import { BreastfeedingCard } from './BreastfeedingCard';
import { SleepCard } from './SleepCard';
import { DiaperCard } from './DiaperCard';
import { BabyTimeline } from './BabyTimeline';

export function BabyScreen() {
  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Header */}
      <div className="px-4 pt-4">
        <h1 className="text-base font-semibold text-graphite">Rotina do Bebê</h1>
        <p className="text-xs text-graphite-muted">Registre e acompanhe o dia do seu bebê</p>
      </div>

      {/* Ícone evolutivo com comparativo */}
      <BabyEvolutionIcon />

      {/* Grid de rastreadores */}
      <div className="grid grid-cols-2 gap-3 px-4">
        <div className="col-span-2">
          <BreastfeedingCard />
        </div>
        <SleepCard />
        <DiaperCard />
      </div>

      {/* Timeline do bebê */}
      <BabyTimeline />
    </div>
  );
}
```

- [ ] **Step 3.10: Substituir placeholder Baby no App.tsx**

Editar `src/App.tsx`:

```tsx
import { useAppStore } from './store/useAppStore';
import { MobileShell } from './components/layout/MobileShell';
import { HomeScreen } from './components/home/HomeScreen';
import { BabyScreen } from './components/baby/BabyScreen';

function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[600px] gap-3">
      <span className="text-5xl">🚧</span>
      <p className="text-graphite-muted font-medium">{name}</p>
    </div>
  );
}

export default function App() {
  const activeTab = useAppStore((s) => s.activeTab);

  const screens: Record<typeof activeTab, JSX.Element> = {
    home:       <HomeScreen />,
    maeIA:      <Placeholder name="MãeIA — em construção" />,
    baby:       <BabyScreen />,
    comunidade: <Placeholder name="Comunidade — em construção" />,
    shopping:   <Placeholder name="Shopping — em construção" />,
  };

  return <MobileShell>{screens[activeTab]}</MobileShell>;
}
```

- [ ] **Step 3.11: Verificar todos os testes**

```bash
npm test
```

Esperado: PASS (todos, incluindo DiaperCard)

- [ ] **Step 3.12: Verificar Baby Screen visualmente**

Clicar no botão central (🤰). Verificar:
- Ícone evolutivo com label "Semana 28 — Bebê formado"
- Card de amamentação com seletor esquerdo/direito + botão registrar
- Card de sono com slider e total acumulado
- Card de fraldas com contador que incrementa ao clicar
- Timeline com entradas seed listadas por horário

- [ ] **Step 3.13: Commit**

```bash
git add src/
git commit -m "feat: tela baby com rastreadores de amamentação, sono e fraldas"
```

---

## Task 4: MãeIA, Comunidade & Shopping

**Files:**
- Create: `src/components/maeIA/MaeIAScreen.tsx`
- Create: `src/components/comunidade/ComunidadeScreen.tsx`
- Test: `src/components/comunidade/ComunidadeScreen.test.tsx`
- Create: `src/components/shopping/ShoppingScreen.tsx`
- Modify: `src/App.tsx` (substituir todos os placeholders restantes)

- [ ] **Step 4.1: Escrever teste com falha para ComunidadeScreen**

Criar `src/components/comunidade/ComunidadeScreen.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ComunidadeScreen } from './ComunidadeScreen';

describe('ComunidadeScreen', () => {
  it('renders category filter tabs', () => {
    render(<ComunidadeScreen />);
    expect(screen.getByRole('button', { name: /gestação/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pós-parto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /amamentação/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /saúde mental/i })).toBeInTheDocument();
  });

  it('filters posts by category', () => {
    render(<ComunidadeScreen />);
    fireEvent.click(screen.getByRole('button', { name: /amamentação/i }));
    const posts = screen.getAllByTestId('post-card');
    posts.forEach((post) => {
      expect(post.getAttribute('data-category')).toBe('amamentação');
    });
  });

  it('shows all posts on Todos tab', () => {
    render(<ComunidadeScreen />);
    const allBtn = screen.getByRole('button', { name: /todos/i });
    fireEvent.click(allBtn);
    expect(screen.getAllByTestId('post-card').length).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 4.2: Verificar que o teste falha**

```bash
npm test -- src/components/comunidade/ComunidadeScreen.test.tsx
```

Esperado: FAIL — `Cannot find module './ComunidadeScreen'`

- [ ] **Step 4.3: Implementar ComunidadeScreen**

Criar `src/components/comunidade/ComunidadeScreen.tsx`:

```tsx
import { useState } from 'react';
import { MessageCircle, Heart } from 'lucide-react';

type Category = 'todos' | 'gestação' | 'pós-parto' | 'amamentação' | 'saúde mental';

interface Post {
  id: string;
  category: Exclude<Category, 'todos'>;
  author: string;
  badge?: 'experiente' | 'profissional';
  content: string;
  likes: number;
  replies: number;
  time: string;
}

const SEED_POSTS: Post[] = [
  {
    id: '1', category: 'gestação', author: 'Fernanda S.', badge: 'experiente',
    content: 'Dicas para aliviar o enjoo do primeiro trimestre: gengibre em cápsulas ajudou muito!',
    likes: 24, replies: 8, time: '2h',
  },
  {
    id: '2', category: 'amamentação', author: 'Dra. Carla Lima', badge: 'profissional',
    content: 'Posição correta para amamentar: costas apoiadas, bebê de frente para o peito, barriga com barriga.',
    likes: 67, replies: 12, time: '4h',
  },
  {
    id: '3', category: 'saúde mental', author: 'Juliana M.',
    content: 'Alguém mais sentiu que a solidão do puerpério é diferente de tudo? Precisava desabafar.',
    likes: 89, replies: 31, time: '5h',
  },
  {
    id: '4', category: 'pós-parto', author: 'Renata P.', badge: 'experiente',
    content: 'Cinta pós-cesárea: comecei a usar no hospital e fez diferença na recuperação. Vale perguntar ao médico.',
    likes: 45, replies: 9, time: '8h',
  },
  {
    id: '5', category: 'amamentação', author: 'Priscila T.',
    content: 'Meu bebê estava com dificuldade de pegar o bico. A fonoaudióloga resolveu em 2 sessões!',
    likes: 33, replies: 14, time: '10h',
  },
];

const BADGE_CONFIG = {
  experiente:   { label: 'Mãe Experiente', color: 'bg-blush-100 text-blush-500' },
  profissional: { label: 'Profissional de Saúde', color: 'bg-sage-100 text-sage-600' },
} as const;

const CATEGORIES: Category[] = ['todos', 'gestação', 'pós-parto', 'amamentação', 'saúde mental'];

function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false);
  const badge = post.badge ? BADGE_CONFIG[post.badge] : null;

  return (
    <div
      data-testid="post-card"
      data-category={post.category}
      className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-graphite">{post.author}</p>
          {badge && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
              {badge.label}
            </span>
          )}
        </div>
        <span className="text-xs text-graphite-muted flex-shrink-0">{post.time}</span>
      </div>

      <p className="text-sm text-graphite-light leading-relaxed">{post.content}</p>

      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={() => setLiked((v) => !v)}
          aria-label="Curtir"
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            liked ? 'text-blush-500' : 'text-graphite-muted'
          }`}
        >
          <Heart size={14} fill={liked ? 'currentColor' : 'none'} strokeWidth={1.8} />
          {post.likes + (liked ? 1 : 0)}
        </button>
        <button
          aria-label="Ver respostas"
          className="flex items-center gap-1.5 text-xs text-graphite-muted"
        >
          <MessageCircle size={14} strokeWidth={1.8} />
          {post.replies}
        </button>
      </div>
    </div>
  );
}

export function ComunidadeScreen() {
  const [activeCategory, setActiveCategory] = useState<Category>('todos');

  const filtered = activeCategory === 'todos'
    ? SEED_POSTS
    : SEED_POSTS.filter((p) => p.category === activeCategory);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="px-4 pt-4 flex items-center justify-between">
        <h1 className="text-base font-semibold text-graphite">Comunidade</h1>
        <button className="px-3 py-1.5 rounded-xl bg-lavender-600 text-white text-xs font-semibold">
          Desabafar
        </button>
      </div>

      {/* Filtros de categoria */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4">
        {CATEGORIES.map((cat) => {
          const label = cat === 'todos' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1);
          return (
            <button
              key={cat}
              aria-pressed={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-lavender-600 text-white'
                  : 'bg-white text-graphite-muted'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      <div className="flex flex-col gap-3 px-4">
        {filtered.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4.4: Verificar que o teste passa**

```bash
npm test -- src/components/comunidade/ComunidadeScreen.test.tsx
```

Esperado: PASS

- [ ] **Step 4.5: Criar MaeIAScreen**

Criar `src/components/maeIA/MaeIAScreen.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const QUICK_CHIPS = [
  'Dicas para cólica do bebê',
  'Como lidar com o cansaço no puerpério?',
  'Amamentação: posição correta',
  'Quando voltar à academia?',
];

const STATIC_REPLIES: Record<string, string> = {
  'Dicas para cólica do bebê':
    'A cólica é comum nas primeiras semanas. Tente: massagem circular na barriga no sentido horário, a posição "aviãozinho" (barriga do bebê sobre seu antebraço) e calor suave com fralda morna. Se persistir por mais de 3h/dia, consulte seu pediatra. 💚',
  'Como lidar com o cansaço no puerpério?':
    'O cansaço pós-parto é real e validado pela ciência. Dicas que ajudam: dormir quando o bebê dorme (mesmo que seja 20min), pedir ajuda sem culpa, e não exigir perfeição de si mesma. Se o cansaço vier com tristeza persistente, procure apoio profissional. Você está fazendo muito bem! 💜',
  'Amamentação: posição correta':
    'A pega correta é fundamental: bebê de frente para o peito (barriga com barriga), boca bem aberta cobrindo toda a aréola, não só o bico. Costas da mãe apoiadas. A posição "invertida" ou "bola de futebol americano" é ótima para recém-nascidos. Dói? A pega pode não estar certa. 🤱',
  'Quando voltar à academia?':
    'Geralmente a liberação é com 6 semanas após parto normal ou 8 semanas após cesárea — sempre com avaliação médica. Comece com caminhadas leves. Priorize o assoalho pélvico com fisioterapia antes de exercícios de impacto. O corpo de cada mulher tem seu tempo. 💪',
};

const DEFAULT_REPLY =
  'Estou aqui para te ajudar! Lembro sempre que cada mãe e cada bebê são únicos. Para questões específicas de saúde, consulte seu médico ou pediatra. O que mais posso esclarecer para você? 💜';

export function MaeIAScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      text: 'Olá! Sou a MãeIA, sua assistente de saúde materno-infantil. Como posso te ajudar hoje? 💜',
    },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: text.trim() };
    const reply = STATIC_REPLIES[text.trim()] ?? DEFAULT_REPLY;
    const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: reply };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <h1 className="text-base font-semibold text-graphite">MãeIA</h1>
        <p className="text-xs text-graphite-muted">Assistente de saúde materno-infantil</p>
      </div>

      {/* Quick chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 bg-offwhite">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => sendMessage(chip)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-lavender-100 text-lavender-600 text-xs font-medium whitespace-nowrap"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3 flex flex-col gap-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-lavender-600 text-white rounded-br-sm'
                  : 'bg-white text-graphite shadow-sm rounded-bl-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2 bg-offwhite rounded-2xl px-3 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="Pergunte à MãeIA…"
            className="flex-1 bg-transparent text-sm text-graphite placeholder:text-graphite-muted outline-none"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            aria-label="Enviar mensagem"
            className="w-8 h-8 rounded-xl bg-lavender-600 flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
          >
            <Send size={14} className="text-white" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4.6: Criar ShoppingScreen**

Criar `src/components/shopping/ShoppingScreen.tsx`:

```tsx
const STATIC_PRODUCTS = [
  { id: '1', emoji: '🧴', name: 'Creme Hidratante Baby', price: 'R$ 29,90', category: 'Cuidados' },
  { id: '2', emoji: '🛁', name: 'Sabonete Líquido', price: 'R$ 19,90', category: 'Higiene' },
  { id: '3', emoji: '💊', name: 'Vitamina D Gotas', price: 'R$ 34,90', category: 'Saúde' },
  { id: '4', emoji: '🩺', name: 'Termômetro Digital', price: 'R$ 49,90', category: 'Saúde' },
  { id: '5', emoji: '🍼', name: 'Mamadeira Anti-cólica', price: 'R$ 59,90', category: 'Alimentação' },
  { id: '6', emoji: '🧸', name: 'Pelúcia Musical', price: 'R$ 89,90', category: 'Entretenimento' },
];

export function ShoppingScreen() {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="px-4 pt-4">
        <h1 className="text-base font-semibold text-graphite">Baby Team Store</h1>
        <p className="text-xs text-graphite-muted">Produtos selecionados para você e seu bebê</p>
      </div>

      {/* Banner "em breve" */}
      <div className="mx-4 rounded-3xl bg-gradient-to-br from-lavender-400 to-lavender-600 p-5 text-white">
        <p className="text-xs font-medium opacity-80 mb-1">Em breve</p>
        <p className="text-base font-bold leading-snug">Seus produtos Baby Team a um clique</p>
        <p className="text-xs opacity-75 mt-1">Loja completa disponível na Fase 2</p>
      </div>

      {/* Grid de produtos */}
      <div className="grid grid-cols-2 gap-3 px-4">
        {STATIC_PRODUCTS.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-2"
          >
            <div className="w-12 h-12 rounded-2xl bg-lavender-50 flex items-center justify-center text-2xl">
              {product.emoji}
            </div>
            <div>
              <p className="text-xs text-graphite-muted">{product.category}</p>
              <p className="text-sm font-medium text-graphite leading-tight">{product.name}</p>
            </div>
            <p className="text-sm font-bold text-lavender-600">{product.price}</p>
            <button
              disabled
              className="w-full py-2 rounded-xl bg-gray-100 text-graphite-muted text-xs font-medium cursor-not-allowed"
            >
              Em breve
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4.7: Substituir todos os placeholders no App.tsx**

Substituir `src/App.tsx` completo:

```tsx
import { useAppStore } from './store/useAppStore';
import { MobileShell } from './components/layout/MobileShell';
import { HomeScreen } from './components/home/HomeScreen';
import { BabyScreen } from './components/baby/BabyScreen';
import { MaeIAScreen } from './components/maeIA/MaeIAScreen';
import { ComunidadeScreen } from './components/comunidade/ComunidadeScreen';
import { ShoppingScreen } from './components/shopping/ShoppingScreen';

export default function App() {
  const activeTab = useAppStore((s) => s.activeTab);

  const screens: Record<typeof activeTab, JSX.Element> = {
    home:       <HomeScreen />,
    maeIA:      <MaeIAScreen />,
    baby:       <BabyScreen />,
    comunidade: <ComunidadeScreen />,
    shopping:   <ShoppingScreen />,
  };

  return <MobileShell>{screens[activeTab]}</MobileShell>;
}
```

- [ ] **Step 4.8: Verificar todos os testes**

```bash
npm test
```

Esperado: PASS — todos os testes (pregnancyUtils, BottomTabBar, WeekCalendar, DiaperCard, ComunidadeScreen)

- [ ] **Step 4.9: Verificar build sem erros de TypeScript**

```bash
npm run build
```

Esperado: `dist/` gerado sem erros. Warning de bundle size é aceitável.

- [ ] **Step 4.10: Verificar todas as telas visualmente**

Percorrer cada aba verificando o checklist do PDCA.md:
- **Home**: saudação, calendário, timeline, marcar tarefas
- **MãeIA**: quick chips disparam resposta, input funciona, scroll para baixo
- **Baby (botão central)**: rastreadores interativos, timeline atualiza ao registrar
- **Comunidade**: filtros funcionam, posts filtrados corretamente
- **Shopping**: banner "em breve" visível, botões desabilitados

- [ ] **Step 4.11: Commit final da Task 4**

```bash
git add src/
git commit -m "feat: MaeIA, Comunidade e Shopping — MVP completo"
```

---

## Checklist de Self-Review

### Cobertura do Spec (briefing.md)
- [x] Shell mobile-first 390px — Task 1
- [x] Bottom Tab Bar 5 posições — Task 1
- [x] Botão central evolutivo (4 estágios) — Task 1 + utils
- [x] Saudação contextualizada — Task 2 (HomeScreen)
- [x] Mini calendário horizontal deslizante — Task 2 (WeekCalendar)
- [x] Timeline de rotina da mãe — Task 2 (RoutineTimeline)
- [x] Rastreador de amamentação — Task 3 (BreastfeedingCard)
- [x] Rastreador de sono — Task 3 (SleepCard)
- [x] Contador de fraldas — Task 3 (DiaperCard)
- [x] Timeline exclusiva do bebê — Task 3 (BabyTimeline)
- [x] Interface de chat MãeIA com quick chips — Task 4
- [x] Feed de comunidade com filtro de categorias — Task 4
- [x] Selos de "Mãe Experiente" e "Profissional de Saúde" — Task 4
- [x] Vitrine estática com aviso "em breve" — Task 4

### Itens Fora do Escopo MVP (confirmados)
- Botão (+) na Home abre modal — placeholder funcional (FAB visível, sem modal)
- Calendário expandido (tela cheia mensal) — próximo ciclo PDCA
- Programa de pontos / convênios — Fase 2
- Integração IA real — Fase 2
- Autenticação — Fase 2

---

## Deploy (após Task 4 completa)

- [ ] Instalar Vercel CLI: `npm i -g vercel`
- [ ] Login: `vercel login`
- [ ] Deploy preview: `vercel`
- [ ] Deploy produção: `vercel --prod`
- [ ] Atualizar link no PDCA.md com URL do deploy
