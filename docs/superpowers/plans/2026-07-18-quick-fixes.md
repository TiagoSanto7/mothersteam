# Quick Fixes — Grupo A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 quick-fix items from the fix-document: remove InsightCard and VersiculoDiario, fix persisted date bug, add SavedVersesScreen (3 access points), and replace the share button in MomentoDeusScreen with a full ShareMomentoSheet.

**Architecture:** Store-centric: `pendingShareContent` in Zustand (not persisted) decouples MomentoDeusScreen share flow from App.tsx without prop drilling. `SavedVersesScreen` is a standalone overlay component accessed from 3 entry points. `ShareMomentoSheet` is a new bottom sheet component.

**Tech Stack:** React 18 + TypeScript, Vite, Zustand 5, Framer Motion 11, Tailwind CSS, Vitest + React Testing Library

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/components/home/HomeScreen.tsx` | Modify | Remove `<InsightCard>` |
| `src/store/useAppStore.ts` | Modify | Remove `selectedDate` from partialize; add `pendingShareContent` |
| `src/components/comunidade/ComunidadeScreen.tsx` | Modify | Remove `VersiculoDiario` component and import |
| `src/data/momentoDeus.ts` | Modify | Export `findMomentoByRef` helper |
| `src/components/home/SavedVersesScreen.tsx` | **Create** | Full-screen overlay listing saved verses |
| `src/components/home/MomentoDeusScreen.tsx` | Modify | Add "📖 Salvos" button + wire ShareMomentoSheet |
| `src/components/profile/ProfileScreen.tsx` | Modify | Add "Versículos salvos" row that opens SavedVersesScreen |
| `src/components/layout/SideDrawer.tsx` | Modify | Add "📖 Meus versículos" nav item |
| `src/components/home/ShareMomentoSheet.tsx` | **Create** | Bottom sheet: toggle oração + 3 share actions |
| `src/components/comunidade/CreatePostScreen.tsx` | Modify | Add `initialContent?: string` prop |
| `src/App.tsx` | Modify | Observe `pendingShareContent`, open CreatePostScreen |

---

### Task 1: Quick removals + date fix

**Files:**
- Modify: `src/components/home/HomeScreen.tsx:43`
- Modify: `src/store/useAppStore.ts:109-120` (partialize)
- Modify: `src/components/comunidade/ComunidadeScreen.tsx:17,153,245-end`

- [ ] **Step 1: Remove InsightCard from HomeScreen**

In `src/components/home/HomeScreen.tsx`, delete line 43:
```tsx
// DELETE THIS LINE:
{motherProfile && <InsightCard profile={motherProfile} />}
```

Also remove the `InsightCard` import at line 8:
```tsx
// DELETE THIS LINE:
import { InsightCard } from './InsightCard';
```

- [ ] **Step 2: Remove selectedDate from partialize in useAppStore**

In `src/store/useAppStore.ts`, in the `partialize` function (around line 110), remove `selectedDate`:
```ts
// BEFORE:
partialize: (state) => ({
  onboardingDone: state.onboardingDone,
  motherProfile: state.motherProfile,
  motherName: state.motherName,
  babyName: state.babyName,
  phase: state.phase,
  socialOnboardingDone: state.socialOnboardingDone,
  activeTab: state.activeTab,
  selectedDate: state.selectedDate,   // ← DELETE this line
  lastFeedSide: state.lastFeedSide,
  savedVerses: state.savedVerses,
}),
```

After: `selectedDate` is gone from the persisted object. It will always reinitialize to `new Date().toISOString().split('T')[0]` (today).

- [ ] **Step 3: Remove VersiculoDiario from ComunidadeScreen**

In `src/components/comunidade/ComunidadeScreen.tsx`:

Delete line 17 (import):
```ts
// DELETE:
import { getVersiculoDoDia } from '../../data/versiculos';
```

Delete the JSX usage (around line 153):
```tsx
// DELETE:
<VersiculoDiario />
```

Delete the entire `VersiculoDiario` function (around line 245 to end of file):
```tsx
// DELETE the entire function:
function VersiculoDiario() {
  const v = getVersiculoDoDia('home');
  // ... everything until the closing }
}
```

- [ ] **Step 4: Run the dev server and verify**

```bash
npm run dev
```

- Open the app and navigate to the Rotina tab — `InsightCard` should NOT appear.
- Open the Comunidade tab — no verse banner should appear.
- Close and reopen the app — the Rotina tab calendar should show the current week (today highlighted).

- [ ] **Step 5: Commit**

```bash
git add src/components/home/HomeScreen.tsx src/store/useAppStore.ts src/components/comunidade/ComunidadeScreen.tsx
git commit -m "fix: remove InsightCard from Rotina, VersiculoDiario from Comunidade, unpin selectedDate"
```

---

### Task 2: Store — add pendingShareContent

**Files:**
- Modify: `src/store/useAppStore.ts`

- [ ] **Step 1: Write the failing test**

In `src/store/useAppStore.test.ts` (create if it doesn't exist):
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from './useAppStore'

beforeEach(() => {
  useAppStore.setState({
    pendingShareContent: null,
  })
})

describe('pendingShareContent', () => {
  it('initializes as null', () => {
    expect(useAppStore.getState().pendingShareContent).toBeNull()
  })

  it('setPendingShareContent sets the content', () => {
    useAppStore.getState().setPendingShareContent('"Verso" — Referência')
    expect(useAppStore.getState().pendingShareContent).toBe('"Verso" — Referência')
  })

  it('setPendingShareContent(null) clears the content', () => {
    useAppStore.getState().setPendingShareContent('something')
    useAppStore.getState().setPendingShareContent(null)
    expect(useAppStore.getState().pendingShareContent).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/store/useAppStore.test.ts
```

Expected: FAIL — `pendingShareContent` not defined on state.

- [ ] **Step 3: Add pendingShareContent to useAppStore**

In `src/store/useAppStore.ts`:

Add to the `AppState` interface (after `savedVerses`):
```ts
pendingShareContent: string | null
setPendingShareContent: (content: string | null) => void
```

Add to the initial state (after `savedVerses: []`):
```ts
pendingShareContent: null,
```

Add to the actions (after `unsaveVerse`):
```ts
setPendingShareContent: (content) => set({ pendingShareContent: content }),
```

Do NOT add `pendingShareContent` to `partialize` — it must never be persisted.

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/store/useAppStore.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/useAppStore.ts src/store/useAppStore.test.ts
git commit -m "feat(store): add pendingShareContent for share-to-feed flow"
```

---

### Task 3: CreatePostScreen — initialContent prop

**Files:**
- Modify: `src/components/comunidade/CreatePostScreen.tsx:18-37`

- [ ] **Step 1: Write the failing test**

In `src/components/comunidade/CreatePostScreen.test.tsx` (create if it doesn't exist):
```tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreatePostScreen } from './CreatePostScreen'
import { useAppStore } from '../../store/useAppStore'

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }))
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, uploadImage: vi.fn() }))

function makeWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

beforeEach(() => {
  useAppStore.setState({ accessToken: 'tok' })
  mockApiFetch.mockResolvedValue({})
})

describe('CreatePostScreen initialContent', () => {
  it('pre-fills the textarea when initialContent is provided', () => {
    render(
      <CreatePostScreen onBack={vi.fn()} initialContent='"Verso" — Referência' />,
      { wrapper: makeWrapper() }
    )
    const textarea = screen.getByRole('textbox')
    expect((textarea as HTMLTextAreaElement).value).toBe('"Verso" — Referência')
  })

  it('starts with empty textarea when initialContent is not provided', () => {
    render(<CreatePostScreen onBack={vi.fn()} />, { wrapper: makeWrapper() })
    const textarea = screen.getByRole('textbox')
    expect((textarea as HTMLTextAreaElement).value).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/comunidade/CreatePostScreen.test.tsx
```

Expected: FAIL — `initialContent` prop unknown.

- [ ] **Step 3: Add initialContent prop to CreatePostScreen**

In `src/components/comunidade/CreatePostScreen.tsx`:

Update the interface (line 18):
```ts
interface CreatePostScreenProps {
  onBack: () => void
  autoOpenImage?: boolean
  initialCommunityId?: string
  initialContent?: string   // ← add
}
```

Update the destructure (line 24):
```ts
export function CreatePostScreen({ onBack, autoOpenImage, initialCommunityId, initialContent }: CreatePostScreenProps) {
```

Update the content state initialization (line 26):
```ts
const [content, setContent] = useState(initialContent ?? '')
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/comunidade/CreatePostScreen.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/comunidade/CreatePostScreen.tsx src/components/comunidade/CreatePostScreen.test.tsx
git commit -m "feat(create-post): add initialContent prop for pre-filled share flow"
```

---

### Task 4: momentoDeus.ts lookup + SavedVersesScreen

**Files:**
- Modify: `src/data/momentoDeus.ts`
- Create: `src/components/home/SavedVersesScreen.tsx`

- [ ] **Step 1: Export findMomentoByRef from momentoDeus.ts**

In `src/data/momentoDeus.ts`, change `const MOMENTOS` to `export const MOMENTOS` and add the helper at the end of the file (before the last export):

```ts
// Change line 8:
export const MOMENTOS: MomentoDeusEntry[] = [

// Add at the end of the file, before getMomentoDoDia:
export function findMomentoByRef(ref: string): MomentoDeusEntry | undefined {
  return MOMENTOS.find((m) => m.referencia === ref)
}
```

- [ ] **Step 2: Write the failing test for SavedVersesScreen**

Create `src/components/home/SavedVersesScreen.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SavedVersesScreen } from './SavedVersesScreen'
import { useAppStore } from '../../store/useAppStore'

beforeEach(() => {
  useAppStore.setState({ savedVerses: [], savedVerses: [] })
})

describe('SavedVersesScreen', () => {
  it('does not render when open is false', () => {
    useAppStore.setState({ savedVerses: ['Mateus 11:28'] })
    render(<SavedVersesScreen open={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows empty state when no verses saved', () => {
    useAppStore.setState({ savedVerses: [] })
    render(<SavedVersesScreen open onClose={vi.fn()} />)
    expect(screen.getByText(/ainda não salvou nenhum versículo/i)).toBeTruthy()
  })

  it('shows verse text for a saved reference', () => {
    useAppStore.setState({ savedVerses: ['Mateus 11:28'] })
    render(<SavedVersesScreen open onClose={vi.fn()} />)
    // "Mateus 11:28" is the referencia for "Venham a mim, todos os que estão cansados..."
    expect(screen.getByText(/cansados e sobrecarregados/i)).toBeTruthy()
    expect(screen.getByText('Mateus 11:28')).toBeTruthy()
  })

  it('calls unsaveVerse when remove button is tapped', () => {
    useAppStore.setState({ savedVerses: ['Mateus 11:28'] })
    render(<SavedVersesScreen open onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /remover/i }))
    expect(useAppStore.getState().savedVerses).toEqual([])
  })

  it('calls onClose when × button is tapped', () => {
    const onClose = vi.fn()
    useAppStore.setState({ savedVerses: [] })
    render(<SavedVersesScreen open onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run src/components/home/SavedVersesScreen.test.tsx
```

Expected: FAIL — `SavedVersesScreen` not found.

- [ ] **Step 4: Create SavedVersesScreen**

Create `src/components/home/SavedVersesScreen.tsx`:
```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { findMomentoByRef } from '../../data/momentoDeus'

interface Props { open: boolean; onClose: () => void }

export function SavedVersesScreen({ open, onClose }: Props) {
  const savedVerses = useAppStore((s) => s.savedVerses)
  const unsaveVerse = useAppStore((s) => s.unsaveVerse)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed inset-0 z-[60] bg-sara-cream flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Versículos salvos"
        >
          <div className="flex items-center justify-between px-5 pt-14 pb-4 flex-shrink-0">
            <p className="text-[11px] font-bold text-graphite-muted uppercase tracking-wide">
              Versículos salvos
            </p>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-sara-linen text-graphite text-lg"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-10">
            {savedVerses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
                <span className="text-4xl">📖</span>
                <p className="text-[13px] text-graphite-muted text-center">
                  Você ainda não salvou nenhum versículo.
                </p>
                <p className="text-[11px] text-graphite-muted/60 text-center">
                  Abra o Momento com Deus e toque em ❤️ Salvar.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 pt-2">
                {savedVerses.map((ref) => {
                  const entry = findMomentoByRef(ref)
                  if (!entry) return null
                  return (
                    <div
                      key={ref}
                      className="bg-white rounded-2xl p-4 shadow-sm"
                    >
                      <p className="text-[13px] font-serif text-graphite leading-relaxed mb-2">
                        "{entry.verso}"
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-sara-gold">
                          {entry.referencia}
                        </p>
                        <button
                          onClick={() => unsaveVerse(ref)}
                          aria-label="Remover versículo dos salvos"
                          className="text-[10px] text-graphite-muted/60 font-medium"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/components/home/SavedVersesScreen.test.tsx
```

Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/data/momentoDeus.ts src/components/home/SavedVersesScreen.tsx src/components/home/SavedVersesScreen.test.tsx
git commit -m "feat(home): add SavedVersesScreen + findMomentoByRef helper"
```

---

### Task 5: Access point 1 — MomentoDeusScreen "Ver salvos" button

**Files:**
- Modify: `src/components/home/MomentoDeusScreen.tsx`

- [ ] **Step 1: Write the failing test**

In `src/components/home/MomentoDeusScreen.test.tsx` (create):
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MomentoDeusScreen } from './MomentoDeusScreen'
import { useAppStore } from '../../store/useAppStore'

beforeEach(() => {
  useAppStore.setState({ savedVerses: [] })
})

describe('MomentoDeusScreen — salvos button', () => {
  it('renders the "Salvos" button in the action bar', () => {
    render(<MomentoDeusScreen open onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /ver versículos salvos/i })).toBeTruthy()
  })

  it('opens SavedVersesScreen when "Salvos" button is tapped', () => {
    render(<MomentoDeusScreen open onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /ver versículos salvos/i }))
    expect(screen.getByRole('dialog', { name: /versículos salvos/i })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/home/MomentoDeusScreen.test.tsx
```

Expected: FAIL — button not found.

- [ ] **Step 3: Add "Ver salvos" button and wire SavedVersesScreen**

In `src/components/home/MomentoDeusScreen.tsx`:

Add import at top:
```tsx
import { SavedVersesScreen } from './SavedVersesScreen'
```

Add state (alongside `showPrayer`):
```tsx
const [savedOpen, setSavedOpen] = useState(false)
```

In the action bar (`<div className="px-6 pb-12 flex gap-3">`), add a 4th button after the share button:
```tsx
<button
  onClick={() => setSavedOpen(true)}
  aria-label="Ver versículos salvos"
  className="flex-1 py-3 rounded-2xl bg-white/10 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
>
  📖 Salvos
</button>
```

**Important — stacking context:** `SavedVersesScreen` must NOT be a child of the main `motion.div` (which is `fixed z-50` and creates its own stacking context). Wrap the return in a fragment:

```tsx
return (
  <>
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex flex-col" ...>
          {/* ...all existing content... */}
        </motion.div>
      )}
    </AnimatePresence>
    <SavedVersesScreen open={open && savedOpen} onClose={() => setSavedOpen(false)} />
  </>
)
```

Using `open && savedOpen` ensures `SavedVersesScreen` only renders when both conditions are true. At `z-[60]`, it layers correctly above everything.

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/home/MomentoDeusScreen.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/home/MomentoDeusScreen.tsx src/components/home/MomentoDeusScreen.test.tsx
git commit -m "feat(momento-deus): add 'Ver salvos' button opening SavedVersesScreen"
```

---

### Task 6: Access point 2 — ProfileScreen "Versículos salvos" section

**Files:**
- Modify: `src/components/profile/ProfileScreen.tsx`

- [ ] **Step 1: Write the failing test**

In `src/components/profile/ProfileScreen.test.tsx` (it already exists — add tests to it). Append these tests:
```tsx
// Add these tests to the existing describe block, or create a new one:

import { SavedVersesScreen } from '../home/SavedVersesScreen'
// (No need to import if just testing the row appears)

describe('ProfileScreen — versículos salvos', () => {
  it('does not show saved verses row when savedVerses is empty', () => {
    useAppStore.setState({ savedVerses: [], isLoggedIn: true, currentUserId: 'u1', motherName: 'Ana' })
    // render ProfileScreen (check existing test file for setup)
    // ...
    expect(screen.queryByText(/versículos salvos/i)).toBeNull()
  })

  it('shows saved verses row when savedVerses has items', () => {
    useAppStore.setState({ savedVerses: ['Mateus 11:28'], isLoggedIn: true, currentUserId: 'u1', motherName: 'Ana' })
    // render ProfileScreen
    // ...
    expect(screen.getByText(/versículos salvos/i)).toBeTruthy()
  })
})
```

Read the existing `ProfileScreen.test.tsx` to copy the render setup (QueryClientProvider, mocks) before running.

- [ ] **Step 2: Check existing ProfileScreen test setup**

```bash
cat src/components/profile/ProfileScreen.test.tsx
```

Copy the `makeWrapper()` and `beforeEach` setup into the new tests.

- [ ] **Step 3: Add the versículos row to ProfileScreen**

In `src/components/profile/ProfileScreen.tsx`:

Add imports at top:
```tsx
import { useState } from 'react'; // already imported
import { SavedVersesScreen } from '../home/SavedVersesScreen'
// add savedVerses to store reads:
const savedVerses = useAppStore((s) => s.savedVerses);
```

Add state:
```tsx
const [showSavedVerses, setShowSavedVerses] = useState(false)
```

Add the row between the "Editar perfil" button block and `<div className="border-t border-gray-100 flex-shrink-0" />` (around line 139):
```tsx
{savedVerses.length > 0 && (
  <button
    onClick={() => setShowSavedVerses(true)}
    className="w-full flex items-center justify-between mt-2 px-1 py-2 rounded-xl active:bg-sara-linen transition-colors"
  >
    <span className="text-[12px] font-semibold text-graphite flex items-center gap-2">
      📖 Versículos salvos
    </span>
    <span className="text-[11px] text-sara-gold font-semibold">
      {savedVerses.length} →
    </span>
  </button>
)}
```

Before the closing `</div>` of the main return (line 184), add:
```tsx
<SavedVersesScreen open={showSavedVerses} onClose={() => setShowSavedVerses(false)} />
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/profile/ProfileScreen.test.tsx
```

Expected: PASS (all tests including the two new ones).

- [ ] **Step 5: Commit**

```bash
git add src/components/profile/ProfileScreen.tsx src/components/profile/ProfileScreen.test.tsx
git commit -m "feat(profile): add versículos salvos row opening SavedVersesScreen"
```

---

### Task 7: Access point 3 — SideDrawer "Meus versículos" item

**Files:**
- Modify: `src/components/layout/SideDrawer.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing test**

In `src/components/layout/SideDrawer.test.tsx` (it already exists — add test):
```tsx
describe('SideDrawer — meus versículos', () => {
  it('renders the "Meus versículos" item', () => {
    // copy render setup from existing SideDrawer test
    // render(<SideDrawer isOpen onClose={vi.fn()} onOpenProfile={vi.fn()} onOpenSettings={vi.fn()} onOpenSavedVerses={vi.fn()} />)
    expect(screen.getByRole('button', { name: /meus versículos/i })).toBeTruthy()
  })

  it('calls onOpenSavedVerses and closes drawer when item is tapped', () => {
    const onClose = vi.fn()
    const onOpenSavedVerses = vi.fn()
    // render(...)
    fireEvent.click(screen.getByRole('button', { name: /meus versículos/i }))
    expect(onOpenSavedVerses).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/layout/SideDrawer.test.tsx
```

Expected: FAIL — button not found, prop not accepted.

- [ ] **Step 3: Update SideDrawer**

In `src/components/layout/SideDrawer.tsx`:

Add `BookOpen` to the lucide import:
```tsx
import { X, User, Settings, LogOut, BookOpen } from 'lucide-react';
```

Add `onOpenSavedVerses` to the interface:
```tsx
interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenSavedVerses: () => void;  // ← add
}
```

Destructure it in the function signature:
```tsx
export function SideDrawer({ isOpen, onClose, onOpenProfile, onOpenSettings, onOpenSavedVerses }: SideDrawerProps) {
```

Add the button in `<nav>`, after the Configurações button:
```tsx
<button
  onClick={() => handleItem(onOpenSavedVerses)}
  aria-label="Meus versículos"
  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-graphite hover:bg-white/50 active:bg-white/70 transition-colors"
>
  <BookOpen size={20} strokeWidth={1.8} />
  <span className="text-sm font-medium">Meus versículos</span>
</button>
```

- [ ] **Step 4: Update MobileShell and App.tsx**

`MobileShell` passes props to `SideDrawer`. Add `onOpenSavedVerses` to `MobileShellProps` in `src/components/layout/MobileShell.tsx`:
```tsx
interface MobileShellProps {
  // ... existing props
  onOpenSavedVerses: () => void;  // ← add
}

// pass it through:
<SideDrawer
  isOpen={drawerOpen}
  onClose={onCloseDrawer}
  onOpenProfile={onOpenProfile}
  onOpenSettings={onOpenSettings}
  onOpenSavedVerses={onOpenSavedVerses}  // ← add
/>
```

In `src/App.tsx`:

Add state:
```tsx
const [showSavedVerses, setShowSavedVerses] = useState(false)
```

Add import:
```tsx
import { SavedVersesScreen } from './components/home/SavedVersesScreen'
```

Pass prop to `MobileShell`:
```tsx
<MobileShell
  drawerOpen={drawerOpen}
  onOpenDrawer={() => setDrawerOpen(true)}
  onCloseDrawer={() => setDrawerOpen(false)}
  onOpenProfile={() => setShowProfile(true)}
  onOpenSettings={() => setShowSettings(true)}
  onOpenSavedVerses={() => setShowSavedVerses(true)}  // ← add
  headerRightSlot={headerRightSlot}
>
```

Add the overlay after the existing ones:
```tsx
{showSavedVerses && (
  <div className="fixed inset-0 z-50">
    <SavedVersesScreen open onClose={() => setShowSavedVerses(false)} />
  </div>
)}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/components/layout/SideDrawer.test.tsx src/components/layout/MobileShell.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/SideDrawer.tsx src/components/layout/MobileShell.tsx src/App.tsx
git commit -m "feat(drawer): add 'Meus versículos' item opening SavedVersesScreen"
```

---

### Task 8: ShareMomentoSheet component

**Files:**
- Create: `src/components/home/ShareMomentoSheet.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/home/ShareMomentoSheet.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ShareMomentoSheet } from './ShareMomentoSheet'
import { useAppStore } from '../../store/useAppStore'

const mockNavigatorShare = vi.fn()
const mockClipboard = vi.fn()

beforeEach(() => {
  useAppStore.setState({ pendingShareContent: null })
  Object.defineProperty(navigator, 'share', { value: mockNavigatorShare, configurable: true })
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: mockClipboard },
    configurable: true,
  })
  mockNavigatorShare.mockResolvedValue(undefined)
  mockClipboard.mockResolvedValue(undefined)
})

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  verso: 'Venham a mim, todos os que estão cansados.',
  referencia: 'Mateus 11:28',
  oracao: 'Senhor, eu chego até Ti com esse cansaço.',
  onShareToFeed: vi.fn(),
  onShareToCommunity: vi.fn(),
}

describe('ShareMomentoSheet', () => {
  it('does not render when open is false', () => {
    render(<ShareMomentoSheet {...defaultProps} open={false} />)
    expect(screen.queryByText(/compartilhar versículo/i)).toBeNull()
  })

  it('renders toggle and 3 action buttons when open', () => {
    render(<ShareMomentoSheet {...defaultProps} />)
    expect(screen.getByRole('button', { name: /com oração/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /compartilhar com amigos/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /publicar no feed/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /compartilhar em comunidade/i })).toBeTruthy()
  })

  it('"Compartilhar com amigos" calls navigator.share with verse + oração when toggle is on', async () => {
    render(<ShareMomentoSheet {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /compartilhar com amigos/i }))
    expect(mockNavigatorShare).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('Senhor, eu chego') })
    )
  })

  it('"Publicar no feed" calls onShareToFeed with the text content', () => {
    const onShareToFeed = vi.fn()
    render(<ShareMomentoSheet {...defaultProps} onShareToFeed={onShareToFeed} />)
    fireEvent.click(screen.getByRole('button', { name: /publicar no feed/i }))
    expect(onShareToFeed).toHaveBeenCalledWith(expect.stringContaining('Mateus 11:28'))
  })

  it('"Compartilhar em comunidade" calls onShareToCommunity', () => {
    const onShareToCommunity = vi.fn()
    render(<ShareMomentoSheet {...defaultProps} onShareToCommunity={onShareToCommunity} />)
    fireEvent.click(screen.getByRole('button', { name: /compartilhar em comunidade/i }))
    expect(onShareToCommunity).toHaveBeenCalled()
  })

  it('toggle switches between com/sem oração', () => {
    render(<ShareMomentoSheet {...defaultProps} />)
    const semOracao = screen.getByRole('button', { name: /só o versículo/i })
    fireEvent.click(semOracao)
    // Now share excludes oração
    fireEvent.click(screen.getByRole('button', { name: /compartilhar com amigos/i }))
    expect(mockNavigatorShare).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.not.stringContaining('Senhor, eu chego') })
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/home/ShareMomentoSheet.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create ShareMomentoSheet**

Create `src/components/home/ShareMomentoSheet.tsx`:
```tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  open: boolean
  onClose: () => void
  verso: string
  referencia: string
  oracao: string
  onShareToFeed: (content: string) => void
  onShareToCommunity: (content: string) => void
}

export function ShareMomentoSheet({ open, onClose, verso, referencia, oracao, onShareToFeed, onShareToCommunity }: Props) {
  const [incluirOracao, setIncluirOracao] = useState(true)

  function buildText() {
    const base = `"${verso}" — ${referencia}`
    return incluirOracao ? `${base}\n\n${oracao}` : base
  }

  function handleAmigos() {
    const text = buildText()
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text).catch(() => {})
    }
    onClose()
  }

  function handleFeed() {
    onShareToFeed(buildText())
    onClose()
  }

  function handleComunidade() {
    onShareToCommunity(buildText())
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl px-5 pt-5 pb-12 max-w-[390px] mx-auto"
          >
            <div className="w-9 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="text-[11px] font-bold text-graphite-muted uppercase tracking-wide mb-4">
              Compartilhar versículo
            </p>

            {/* Toggle com/sem oração */}
            <div className="flex bg-sara-linen rounded-xl p-1 mb-5 gap-1">
              <button
                onClick={() => setIncluirOracao(true)}
                aria-label="Com oração"
                aria-pressed={incluirOracao}
                className={`flex-1 rounded-lg py-2 text-[12px] font-semibold transition-colors ${
                  incluirOracao ? 'bg-sara-gold text-white' : 'text-graphite-muted'
                }`}
              >
                Com oração
              </button>
              <button
                onClick={() => setIncluirOracao(false)}
                aria-label="Só o versículo"
                aria-pressed={!incluirOracao}
                className={`flex-1 rounded-lg py-2 text-[12px] font-semibold transition-colors ${
                  !incluirOracao ? 'bg-sara-gold text-white' : 'text-graphite-muted'
                }`}
              >
                Só o versículo
              </button>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleAmigos}
                aria-label="Compartilhar com amigos"
                className="flex items-center gap-3 p-3.5 bg-sara-linen rounded-xl active:scale-[0.98] transition-transform"
              >
                <span className="text-xl">📱</span>
                <div className="text-left">
                  <p className="text-[13px] font-semibold text-graphite">Compartilhar com amigos</p>
                  <p className="text-[11px] text-graphite-muted">WhatsApp, Instagram, e-mail…</p>
                </div>
              </button>

              <button
                onClick={handleFeed}
                aria-label="Publicar no feed"
                className="flex items-center gap-3 p-3.5 bg-sara-linen rounded-xl active:scale-[0.98] transition-transform"
              >
                <span className="text-xl">✏️</span>
                <div className="text-left">
                  <p className="text-[13px] font-semibold text-graphite">Publicar no feed</p>
                  <p className="text-[11px] text-graphite-muted">Cria um post com o versículo</p>
                </div>
              </button>

              <button
                onClick={handleComunidade}
                aria-label="Compartilhar em comunidade"
                className="flex items-center gap-3 p-3.5 bg-sara-linen rounded-xl active:scale-[0.98] transition-transform"
              >
                <span className="text-xl">👥</span>
                <div className="text-left">
                  <p className="text-[13px] font-semibold text-graphite">Compartilhar em comunidade</p>
                  <p className="text-[11px] text-graphite-muted">Escolhe a comunidade no post</p>
                </div>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/home/ShareMomentoSheet.test.tsx
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/home/ShareMomentoSheet.tsx src/components/home/ShareMomentoSheet.test.tsx
git commit -m "feat(home): add ShareMomentoSheet with toggle and 3 share actions"
```

---

### Task 9: Wire ShareMomentoSheet into MomentoDeusScreen + store

**Files:**
- Modify: `src/components/home/MomentoDeusScreen.tsx`
- Modify: `src/store/useAppStore.ts` (already done in Task 2)

- [ ] **Step 1: Update MomentoDeusScreen**

In `src/components/home/MomentoDeusScreen.tsx`:

Add imports:
```tsx
import { ShareMomentoSheet } from './ShareMomentoSheet'
import { useAppStore } from '../../store/useAppStore'  // already imported
```

Add `setPendingShareContent` to store reads (alongside `savedVerses`, `saveVerse`, `unsaveVerse`):
```tsx
const setPendingShareContent = useAppStore((s) => s.setPendingShareContent)
```

Add `shareOpen` state:
```tsx
const [shareOpen, setShareOpen] = useState(false)
```

Remove the existing `handleShare` function and the `📤 Compartilhar` button from the action bar.

Replace the `📤 Compartilhar` button with:
```tsx
<button
  onClick={() => setShareOpen(true)}
  aria-label="Compartilhar versículo"
  className="flex-1 py-3 rounded-2xl bg-white/10 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
>
  📤 Compartilhar
</button>
```

**Important — stacking context (same rule as Task 5):** Wrap the return in a fragment and place both `SavedVersesScreen` and `ShareMomentoSheet` outside the `AnimatePresence` / `motion.div`:

```tsx
return (
  <>
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex flex-col" ...>
          {/* ...all existing content... */}
        </motion.div>
      )}
    </AnimatePresence>
    <SavedVersesScreen open={open && savedOpen} onClose={() => setSavedOpen(false)} />
    <ShareMomentoSheet
      open={shareOpen}
      onClose={() => setShareOpen(false)}
      verso={momento.verso}
      referencia={momento.referencia}
      oracao={momento.oracao}
      onShareToFeed={(content) => {
        setShareOpen(false)
        onClose()
        setPendingShareContent(content)
      }}
      onShareToCommunity={(content) => {
        setShareOpen(false)
        onClose()
        setPendingShareContent(content)
      }}
    />
  </>
)
```

- [ ] **Step 2: Run existing MomentoDeusScreen tests**

```bash
npx vitest run src/components/home/MomentoDeusScreen.test.tsx
```

Expected: PASS (all existing tests + new "salvos" tests from Task 5 still pass).

- [ ] **Step 3: Commit**

```bash
git add src/components/home/MomentoDeusScreen.tsx
git commit -m "feat(momento-deus): wire ShareMomentoSheet, set pendingShareContent on share-to-feed"
```

---

### Task 10: App.tsx — observe pendingShareContent

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add pendingShareContent observation to App.tsx**

In `src/App.tsx`:

Read from store:
```tsx
const pendingShareContent = useAppStore((s) => s.pendingShareContent)
const setPendingShareContent = useAppStore((s) => s.setPendingShareContent)
```

In the `screens` record and overlay section, add after the chat overlay (around line 220):
```tsx
{pendingShareContent !== null && (
  <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
    <div className="w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <CreatePostScreen
        onBack={() => setPendingShareContent(null)}
        initialContent={pendingShareContent}
      />
    </div>
  </div>
)}
```

`CreatePostScreen` is already imported in `App.tsx`? Check — if not, add:
```tsx
import { CreatePostScreen } from './components/comunidade/CreatePostScreen'
```

Actually `CreatePostScreen` is used inside `ComunidadeScreen` internally, not directly from `App.tsx`. Add the import.

- [ ] **Step 2: Verify end-to-end manually**

```bash
npm run dev
```

1. Open the app, navigate to Home tab.
2. Tap the Momento com Deus card — overlay opens.
3. Tap "📤 Compartilhar" — `ShareMomentoSheet` appears from below.
4. Tap "✏️ Publicar no feed" — sheet closes, Momento closes, `CreatePostScreen` opens with the verse pre-filled.
5. Tap back — `CreatePostScreen` closes, app returns to home.
6. Tap "📱 Compartilhar com amigos" — `navigator.share` or clipboard fires.

- [ ] **Step 3: Run full test suite to check for regressions**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): open CreatePostScreen from pendingShareContent for share-to-feed flow"
```

---

## Done

All 10 tasks complete:
- InsightCard removed from Rotina
- Dates fixed (selectedDate not persisted)
- VersiculoDiario removed from Comunidade
- SavedVersesScreen accessible from 3 points (Momento, Perfil, Drawer)
- ShareMomentoSheet with toggle + 3 share actions
- Share-to-feed wired via `pendingShareContent` in Zustand
