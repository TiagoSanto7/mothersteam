# Voice Orb Onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional voice-based onboarding path where Sara (ElevenLabs Conversational AI) collects the mother's profile data via conversation, the user reviews and confirms, then continues to the existing archetype Q1–Q5 questions.

**Architecture:** `useVoiceOrb` hook wraps `@elevenlabs/client`'s `Conversation.startSession`, managing connection state and receiving a `confirmar_perfil` client-tool call with structured profile data. `VoiceOrbOnboarding` orchestrates hook + animated circle + confirmation form. `OnboardingScreen` gains a post-intro choice screen to route to either the existing form or the new voice path.

**Tech Stack:** React 18 + TypeScript, `@elevenlabs/client` v1.15.1, Framer Motion 12, Vitest + React Testing Library, Zustand 5

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/hooks/useVoiceOrb.ts` | Create | ElevenLabs connection, states, amplitude, tool_call handling |
| `src/hooks/useVoiceOrb.test.ts` | Create | Unit tests for hook states and tool_call |
| `src/components/onboarding/VoiceOrb.tsx` | Create | Animated circle reacting to amplitude |
| `src/components/onboarding/VoiceOrbConfirmation.tsx` | Create | Editable review form for Sara's collected data |
| `src/components/onboarding/VoiceOrbConfirmation.test.tsx` | Create | Tests for confirmation form |
| `src/components/onboarding/VoiceOrbOnboarding.tsx` | Create | Main screen: intro → listening → confirmation |
| `src/components/onboarding/VoiceOrbOnboarding.test.tsx` | Create | Tests for screen state transitions |
| `src/components/auth/OnboardingScreen.tsx` | Modify | Add `introSeen` + `voiceMode` states, choice screen after intro |
| `src/components/auth/OnboardingScreen.test.tsx` | Create | Tests for split choice and routing |
| `.env.local` | Modify | Add `VITE_ELEVENLABS_AGENT_ID` |

---

## Task 0: Configure ElevenLabs Agent Sara via REST API

Before any code, the Sara agent must be updated with an onboarding system prompt and the `confirmar_perfil` client tool. This is a one-time setup using the ElevenLabs REST API.

**No files to touch — this is an API configuration step.**

- [ ] **Step 1: Get current agent config to inspect its structure**

Run in PowerShell (use your terminal, not Claude Code):

```powershell
$headers = @{ "xi-api-key" = "sk_c674a2c748b5196b11676dfa762055139b80fcf90353b708" }
Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents/agent_4301kxv5d1q3fsf85z1xb1sz90nt" -Headers $headers | ConvertTo-Json -Depth 10
```

- [ ] **Step 2: Update agent with onboarding system prompt and confirmar_perfil tool**

```powershell
$headers = @{
  "xi-api-key" = "sk_c674a2c748b5196b11676dfa762055139b80fcf90353b708"
  "Content-Type" = "application/json"
}

$body = @'
{
  "conversation_config": {
    "agent": {
      "prompt": {
        "prompt": "Você é a Sara, assistente calorosa do app Mothers Team. Sua missão agora é conhecer a mãe que está chegando ao app pela primeira vez. Pergunte de forma natural e empática: 1) O nome dela. 2) Se está grávida (e em qual semana) ou se o bebê já nasceu (e há quantos dias/meses). 3) O nome do bebê — ou se ainda não tem nome. 4) Se tem outros filhos, e a idade aproximada de cada um. Quando tiver todas as informações, confirme e chame a função confirmar_perfil. Seja breve, carinhosa e direta. Máximo 2 perguntas por mensagem. Fale em português do Brasil.",
        "tools": [
          {
            "type": "client",
            "name": "confirmar_perfil",
            "description": "Chamada quando Sara coletou e confirmou todos os dados de perfil da mãe",
            "parameters": {
              "type": "object",
              "properties": {
                "motherName": { "type": "string" },
                "primaryChild": {
                  "type": "object",
                  "properties": {
                    "name": { "type": ["string", "null"] },
                    "phase": { "type": "string", "enum": ["pregnant", "postpartum"] },
                    "week": { "type": "number" },
                    "ageInDays": { "type": "number" }
                  },
                  "required": ["phase"]
                },
                "otherChildren": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "name": { "type": "string" },
                      "ageDescription": { "type": "string" }
                    }
                  }
                }
              },
              "required": ["motherName", "primaryChild", "otherChildren"]
            }
          }
        ]
      }
    }
  }
}
'@

Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents/agent_4301kxv5d1q3fsf85z1xb1sz90nt" -Method Patch -Headers $headers -Body $body
```

Expected: Response JSON with the updated agent config.

- [ ] **Step 3: Verify update succeeded**

Re-run the GET from Step 1 and confirm the `prompt` field contains "Você é a Sara" and `tools` contains `confirmar_perfil`.

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "chore: configure ElevenLabs Sara agent for voice onboarding (no code change)"
```

---

## Task 1: Install Dependency + Add Env Var

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Install @elevenlabs/client**

```bash
npm install @elevenlabs/client
```

Expected output: added `@elevenlabs/client` to package.json dependencies.

- [ ] **Step 2: Add env var to .env.local**

Open `.env.local` (create if doesn't exist at project root) and add:

```
VITE_ELEVENLABS_AGENT_ID=agent_4301kxv5d1q3fsf85z1xb1sz90nt
```

- [ ] **Step 3: Verify Vite exposes the var**

Run `npm run dev` and in the browser console type:
```javascript
import.meta.env.VITE_ELEVENLABS_AGENT_ID
```
Expected: `"agent_4301kxv5d1q3fsf85z1xb1sz90nt"`

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @elevenlabs/client for voice orb onboarding"
```

Note: do NOT commit `.env.local` (it's in .gitignore).

---

## Task 2: useVoiceOrb Hook

**Files:**
- Create: `src/hooks/useVoiceOrb.ts`
- Create: `src/hooks/useVoiceOrb.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/hooks/useVoiceOrb.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useVoiceOrb } from './useVoiceOrb'

const mockEndSession = vi.fn().mockResolvedValue(undefined)
const mockGetOutputVolume = vi.fn(() => 0.5)

const { mockStartSession } = vi.hoisted(() => ({
  mockStartSession: vi.fn(),
}))

vi.mock('@elevenlabs/client', () => ({
  Conversation: { startSession: mockStartSession },
}))

describe('useVoiceOrb', () => {
  let capturedOpts: Parameters<typeof mockStartSession>[0]

  beforeEach(() => {
    vi.clearAllMocks()
    capturedOpts = null as unknown as Parameters<typeof mockStartSession>[0]
    mockStartSession.mockImplementation(async (opts: typeof capturedOpts) => {
      capturedOpts = opts
      setTimeout(() => opts.onStatusChange?.({ status: 'connected' }), 0)
      return { endSession: mockEndSession, getOutputVolume: mockGetOutputVolume }
    })
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 0 })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  it('starts with idle state', () => {
    const { result } = renderHook(() => useVoiceOrb())
    expect(result.current.state).toBe('idle')
    expect(result.current.collectedData).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('transitions connecting → listening on start()', async () => {
    const { result } = renderHook(() => useVoiceOrb())
    await act(async () => { await result.current.start() })
    expect(mockStartSession).toHaveBeenCalledOnce()
    expect(result.current.state).toBe('listening')
  })

  it('sets collectedData and state=done when confirmar_perfil is called', async () => {
    const { result } = renderHook(() => useVoiceOrb())
    await act(async () => { await result.current.start() })

    const fakeData = {
      motherName: 'Ana',
      primaryChild: { name: 'Beto', phase: 'postpartum' as const, ageInDays: 60 },
      otherChildren: [],
    }
    await act(async () => {
      await capturedOpts.clientTools!.confirmar_perfil(fakeData)
    })

    expect(result.current.collectedData).toEqual(fakeData)
    expect(result.current.state).toBe('done')
  })

  it('stop() before tool call resets to idle with null collectedData', async () => {
    const { result } = renderHook(() => useVoiceOrb())
    await act(async () => { await result.current.start() })
    act(() => { result.current.stop() })
    expect(result.current.state).toBe('idle')
    expect(result.current.collectedData).toBeNull()
  })

  it('sets state=error on connection failure', async () => {
    mockStartSession.mockRejectedValueOnce(new Error('Sem microfone'))
    const { result } = renderHook(() => useVoiceOrb())
    await act(async () => { await result.current.start() })
    expect(result.current.state).toBe('error')
    expect(result.current.error).toBe('Sem microfone')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/hooks/useVoiceOrb.test.ts
```

Expected: FAIL — `Cannot find module './useVoiceOrb'`

- [ ] **Step 3: Create the hook**

Create `src/hooks/useVoiceOrb.ts`:

```typescript
import { useState, useRef, useCallback } from 'react'
import { Conversation } from '@elevenlabs/client'

export type VoiceOrbState = 'idle' | 'connecting' | 'listening' | 'done' | 'error'

export interface VoiceCollectedProfile {
  motherName: string
  primaryChild: {
    name: string | null
    phase: 'pregnant' | 'postpartum'
    week?: number
    ageInDays?: number
  }
  otherChildren: Array<{ name: string; ageDescription: string }>
}

export interface UseVoiceOrbReturn {
  state: VoiceOrbState
  amplitude: number
  transcript: string
  collectedData: VoiceCollectedProfile | null
  error: string | null
  start: () => Promise<void>
  stop: () => void
}

export function useVoiceOrb(): UseVoiceOrbReturn {
  const [state, setState] = useState<VoiceOrbState>('idle')
  const [amplitude, setAmplitude] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [collectedData, setCollectedData] = useState<VoiceCollectedProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const conversationRef = useRef<{ endSession: () => Promise<void>; getOutputVolume: () => number } | null>(null)
  const rafRef = useRef<number>(0)

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    conversationRef.current?.endSession()
    conversationRef.current = null
    setState((s) => (s === 'done' ? 'done' : 'idle'))
    setAmplitude(0)
  }, [])

  const start = useCallback(async () => {
    cancelAnimationFrame(rafRef.current)
    conversationRef.current?.endSession()
    conversationRef.current = null
    setState('connecting')
    setError(null)
    setCollectedData(null)
    setTranscript('')

    try {
      const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string
      const conversation = await Conversation.startSession({
        agentId,
        onStatusChange: ({ status }: { status: string }) => {
          if (status === 'connected') setState('listening')
          if (status === 'disconnected') setState((s) => (s === 'done' ? 'done' : 'idle'))
        },
        onError: (msg: string) => {
          setError(msg)
          setState('error')
        },
        onMessage: ({ message, source }: { message: string; source: string }) => {
          if (source === 'ai' || source === 'user') setTranscript(message)
        },
        clientTools: {
          confirmar_perfil: async (params: unknown) => {
            const data = params as VoiceCollectedProfile
            setCollectedData(data)
            setState('done')
            cancelAnimationFrame(rafRef.current)
            conversationRef.current?.endSession()
            return 'ok'
          },
        },
      })

      conversationRef.current = conversation

      const pollAmplitude = () => {
        setAmplitude(conversation.getOutputVolume())
        rafRef.current = requestAnimationFrame(pollAmplitude)
      }
      rafRef.current = requestAnimationFrame(pollAmplitude)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro de conexão')
      setState('error')
    }
  }, [])

  return { state, amplitude, transcript, collectedData, error, start, stop }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/hooks/useVoiceOrb.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useVoiceOrb.ts src/hooks/useVoiceOrb.test.ts
git commit -m "feat: add useVoiceOrb hook for ElevenLabs conversational onboarding"
```

---

## Task 3: VoiceOrb Animated Component

**Files:**
- Create: `src/components/onboarding/VoiceOrb.tsx`

This is a purely visual component — no logic, no side effects.

- [ ] **Step 1: Create the component**

First create the directory if it doesn't exist:
```bash
mkdir -p src/components/onboarding
```

Create `src/components/onboarding/VoiceOrb.tsx`:

```tsx
import { motion } from 'framer-motion'
import type { VoiceOrbState } from '../../hooks/useVoiceOrb'

interface VoiceOrbProps {
  amplitude: number
  state: Exclude<VoiceOrbState, 'done' | 'error' | 'idle'>
}

export function VoiceOrb({ amplitude, state }: VoiceOrbProps) {
  const isListening = state === 'listening'

  return (
    <motion.div
      aria-label="Sara voice orb"
      animate={
        isListening
          ? { scale: 1 + amplitude * 0.3 }
          : { scale: [1, 1.06, 1] }
      }
      transition={
        isListening
          ? { duration: 0.05 }
          : { repeat: Infinity, duration: 3, ease: 'easeInOut' }
      }
      className="w-40 h-40 rounded-full flex items-center justify-center shadow-xl"
      style={{
        background: 'linear-gradient(135deg, #D4A84B, #C0604A)',
        boxShadow: `0 0 ${24 + amplitude * 40}px rgba(212, 168, 75, 0.4)`,
      }}
    >
      <span className="text-white text-3xl select-none">✦</span>
    </motion.div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to VoiceOrb.

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/VoiceOrb.tsx
git commit -m "feat: add VoiceOrb animated circle component"
```

---

## Task 4: VoiceOrbConfirmation Component

**Files:**
- Create: `src/components/onboarding/VoiceOrbConfirmation.tsx`
- Create: `src/components/onboarding/VoiceOrbConfirmation.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/onboarding/VoiceOrbConfirmation.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { VoiceOrbConfirmation } from './VoiceOrbConfirmation'
import type { VoiceCollectedProfile } from '../../hooks/useVoiceOrb'

const baseData: VoiceCollectedProfile = {
  motherName: 'Ana',
  primaryChild: { name: 'Beto', phase: 'postpartum', ageInDays: 60 },
  otherChildren: [{ name: 'Pedro', ageDescription: '3 anos' }],
}

describe('VoiceOrbConfirmation', () => {
  it('renders mother name', () => {
    render(<VoiceOrbConfirmation data={baseData} onConfirm={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByDisplayValue('Ana')).toBeTruthy()
  })

  it('renders baby name', () => {
    render(<VoiceOrbConfirmation data={baseData} onConfirm={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByDisplayValue('Beto')).toBeTruthy()
  })

  it('renders other children', () => {
    render(<VoiceOrbConfirmation data={baseData} onConfirm={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(/Pedro/)).toBeTruthy()
    expect(screen.getByText(/3 anos/)).toBeTruthy()
  })

  it('calls onConfirm with updated name when edited', () => {
    const onConfirm = vi.fn()
    render(<VoiceOrbConfirmation data={baseData} onConfirm={onConfirm} onBack={vi.fn()} />)
    fireEvent.change(screen.getByDisplayValue('Ana'), { target: { value: 'Maria' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ motherName: 'Maria' }))
  })

  it('calls onBack when back button clicked', () => {
    const onBack = vi.fn()
    render(<VoiceOrbConfirmation data={baseData} onConfirm={vi.fn()} onBack={onBack} />)
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('removes other child when remove button clicked', () => {
    const onConfirm = vi.fn()
    render(<VoiceOrbConfirmation data={baseData} onConfirm={onConfirm} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /remover pedro/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ otherChildren: [] })
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/onboarding/VoiceOrbConfirmation.test.tsx
```

Expected: FAIL — `Cannot find module './VoiceOrbConfirmation'`

- [ ] **Step 3: Create the component**

Create `src/components/onboarding/VoiceOrbConfirmation.tsx`:

```tsx
import { useState } from 'react'
import type { VoiceCollectedProfile } from '../../hooks/useVoiceOrb'

interface Props {
  data: VoiceCollectedProfile
  onConfirm: (data: VoiceCollectedProfile) => void
  onBack: () => void
}

export function VoiceOrbConfirmation({ data, onConfirm, onBack }: Props) {
  const [form, setForm] = useState<VoiceCollectedProfile>(data)

  return (
    <div className="flex flex-col gap-5 px-6 py-8 bg-sara-cream min-h-screen">
      <p className="text-[16px] font-semibold font-serif text-graphite">Sara entendeu:</p>

      <div className="flex flex-col gap-4">
        <Field label="Seu nome">
          <input
            value={form.motherName}
            onChange={(e) => setForm((f) => ({ ...f, motherName: e.target.value }))}
            className="w-full border-b border-sara-linen/60 text-sm text-graphite py-1 bg-transparent outline-none"
          />
        </Field>

        <Field label="Nome do bebê">
          <input
            value={form.primaryChild.name ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                primaryChild: { ...f.primaryChild, name: e.target.value || null },
              }))
            }
            placeholder="ainda não definido"
            className="w-full border-b border-sara-linen/60 text-sm text-graphite py-1 bg-transparent outline-none placeholder:text-graphite-muted"
          />
        </Field>

        <Field label="Fase">
          <p className="text-sm text-graphite py-1">
            {form.primaryChild.phase === 'pregnant'
              ? `Grávida — semana ${form.primaryChild.week ?? '?'}`
              : `Bebê com ${form.primaryChild.ageInDays ?? '?'} dias`}
          </p>
        </Field>

        {form.otherChildren.length > 0 && (
          <Field label="Outros filhos">
            <div className="flex flex-col gap-2 mt-1">
              {form.otherChildren.map((child, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm text-graphite flex-1">
                    {child.name}, {child.ageDescription}
                  </span>
                  <button
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        otherChildren: f.otherChildren.filter((_, idx) => idx !== i),
                      }))
                    }
                    aria-label={`Remover ${child.name}`}
                    className="text-graphite-muted text-xs px-2 py-0.5 rounded-full hover:bg-black/5"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </Field>
        )}
      </div>

      <div className="flex gap-3 mt-auto pt-4">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="flex-1 py-3 rounded-2xl border-2 border-sara-gold text-sara-gold text-sm font-semibold"
        >
          Voltar
        </button>
        <button
          onClick={() => onConfirm(form)}
          aria-label="Confirmar"
          className="flex-1 py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold"
        >
          Confirmar →
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-graphite-muted font-medium mb-0.5">{label}</p>
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/onboarding/VoiceOrbConfirmation.test.tsx
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/onboarding/VoiceOrbConfirmation.tsx src/components/onboarding/VoiceOrbConfirmation.test.tsx
git commit -m "feat: add VoiceOrbConfirmation component with editable profile review"
```

---

## Task 5: VoiceOrbOnboarding Screen

**Files:**
- Create: `src/components/onboarding/VoiceOrbOnboarding.tsx`
- Create: `src/components/onboarding/VoiceOrbOnboarding.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/onboarding/VoiceOrbOnboarding.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VoiceOrbOnboarding } from './VoiceOrbOnboarding'
import type { VoiceCollectedProfile } from '../../hooks/useVoiceOrb'

const mockStart = vi.fn()
const mockStop = vi.fn()
let mockState = 'idle'
let mockCollectedData: VoiceCollectedProfile | null = null

vi.mock('../../hooks/useVoiceOrb', () => ({
  useVoiceOrb: () => ({
    state: mockState,
    amplitude: 0,
    transcript: '',
    collectedData: mockCollectedData,
    error: null,
    start: mockStart,
    stop: mockStop,
  }),
}))

describe('VoiceOrbOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState = 'idle'
    mockCollectedData = null
  })

  it('shows intro text and Começar button on idle state', () => {
    render(<VoiceOrbOnboarding onComplete={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(/Sou a Sara/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /começar/i })).toBeTruthy()
  })

  it('calls start() when Começar is clicked', () => {
    render(<VoiceOrbOnboarding onComplete={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /começar/i }))
    expect(mockStart).toHaveBeenCalledOnce()
  })

  it('shows orb and Encerrar button when state is listening', () => {
    mockState = 'listening'
    render(<VoiceOrbOnboarding onComplete={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByLabelText('Sara voice orb')).toBeTruthy()
    expect(screen.getByRole('button', { name: /encerrar/i })).toBeTruthy()
  })

  it('shows VoiceOrbConfirmation when state is done with data', () => {
    mockState = 'done'
    mockCollectedData = {
      motherName: 'Ana',
      primaryChild: { name: null, phase: 'pregnant', week: 28 },
      otherChildren: [],
    }
    render(<VoiceOrbOnboarding onComplete={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(/Sara entendeu/i)).toBeTruthy()
  })

  it('calls onComplete when user confirms collected data', () => {
    mockState = 'done'
    mockCollectedData = {
      motherName: 'Ana',
      primaryChild: { name: null, phase: 'pregnant', week: 28 },
      otherChildren: [],
    }
    const onComplete = vi.fn()
    render(<VoiceOrbOnboarding onComplete={onComplete} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(onComplete).toHaveBeenCalledWith(mockCollectedData)
  })

  it('calls onBack when back button clicked on intro', () => {
    const onBack = vi.fn()
    render(<VoiceOrbOnboarding onComplete={vi.fn()} onBack={onBack} />)
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/onboarding/VoiceOrbOnboarding.test.tsx
```

Expected: FAIL — `Cannot find module './VoiceOrbOnboarding'`

- [ ] **Step 3: Create the component**

Create `src/components/onboarding/VoiceOrbOnboarding.tsx`:

```tsx
import { useEffect } from 'react'
import { useVoiceOrb } from '../../hooks/useVoiceOrb'
import { VoiceOrb } from './VoiceOrb'
import { VoiceOrbConfirmation } from './VoiceOrbConfirmation'
import type { VoiceCollectedProfile } from '../../hooks/useVoiceOrb'

interface Props {
  onComplete: (data: VoiceCollectedProfile) => void
  onBack: () => void
}

export function VoiceOrbOnboarding({ onComplete, onBack }: Props) {
  const { state, amplitude, transcript, collectedData, error, start, stop } = useVoiceOrb()

  useEffect(() => () => { stop() }, [stop])

  if (state === 'done' && collectedData) {
    return (
      <VoiceOrbConfirmation
        data={collectedData}
        onConfirm={onComplete}
        onBack={() => start()}
      />
    )
  }

  if (state === 'listening' || state === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-sara-cream gap-8 px-6">
        <VoiceOrb amplitude={amplitude} state={state === 'listening' ? 'listening' : 'connecting'} />
        {transcript ? (
          <p className="text-sm text-graphite text-center leading-relaxed max-w-xs">
            &ldquo;{transcript}&rdquo;
          </p>
        ) : (
          <p className="text-sm text-graphite-muted text-center">
            {state === 'connecting' ? 'Conectando com a Sara…' : 'Ouvindo…'}
          </p>
        )}
        <button
          onClick={stop}
          aria-label="Encerrar conversa"
          className="text-sm text-graphite-muted px-5 py-2 rounded-full border border-sara-linen"
        >
          Encerrar conversa
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-sara-cream gap-6 px-6">
      <div className="text-center">
        <p className="text-[20px] font-semibold font-serif text-graphite mb-2">
          Olá! Sou a Sara 🌷
        </p>
        <p className="text-[14px] text-graphite-muted leading-relaxed max-w-xs">
          Vou te fazer algumas perguntas para personalizar sua experiência.
          Pode falar normalmente — estou aqui para te ouvir.
        </p>
      </div>
      {error && (
        <p className="text-sara-terracotta text-sm text-center">{error}</p>
      )}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={start}
          aria-label="Começar conversa"
          className="w-full py-4 rounded-2xl bg-sara-gold text-white text-sm font-semibold"
        >
          Começar conversa 🎙️
        </button>
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="text-sm text-graphite-muted text-center py-2"
        >
          Voltar
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/onboarding/VoiceOrbOnboarding.test.tsx
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/onboarding/VoiceOrbOnboarding.tsx src/components/onboarding/VoiceOrbOnboarding.test.tsx
git commit -m "feat: add VoiceOrbOnboarding screen with intro/listening/confirmation states"
```

---

## Task 6: Modify OnboardingScreen — Add Choice After Intro

**Files:**
- Modify: `src/components/auth/OnboardingScreen.tsx`
- Create: `src/components/auth/OnboardingScreen.test.tsx`

**Context:** The current `OnboardingScreen` has:
- `step === -1` → intro video (auto-advances to Q1 on video end via `setStep(0)`)
- `step === 0-4` → Q1–Q5 archetype questions
- `step === 5` → closing

We add two states: `introSeen` (replaces the direct `setStep(0)` on intro video end) and `voiceMode` (renders `VoiceOrbOnboarding` instead of questions).

- [ ] **Step 1: Write failing tests**

Create `src/components/auth/OnboardingScreen.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OnboardingScreen } from './OnboardingScreen'
import { useAppStore } from '../../store/useAppStore'

// Mock apiFetch to avoid network calls in closing screen
const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }))
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }))

// Mock VoiceOrbOnboarding to isolate OnboardingScreen tests
vi.mock('../onboarding/VoiceOrbOnboarding', () => ({
  VoiceOrbOnboarding: ({ onBack }: { onBack: () => void }) => (
    <div>
      <span>VoiceOrbOnboarding</span>
      <button onClick={onBack}>Voltar</button>
    </div>
  ),
}))

beforeEach(() => {
  mockApiFetch.mockResolvedValue({})
  useAppStore.setState({
    isLoggedIn: true,
    motherName: 'Ana',
    phase: { stage: 'pregnant', week: 28 },
    babyName: '',
    onboardingDone: false,
  })
})

describe('OnboardingScreen — intro split choice', () => {
  it('shows Pular button on intro step', () => {
    render(<OnboardingScreen />)
    expect(screen.getByRole('button', { name: /pular/i })).toBeTruthy()
  })

  it('shows choice screen after intro skip', () => {
    render(<OnboardingScreen />)
    fireEvent.click(screen.getByRole('button', { name: /pular/i }))
    expect(screen.getByRole('button', { name: /preencher você mesmo/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /falar com a sara/i })).toBeTruthy()
  })

  it('shows Q1 question when Preencher você mesmo is chosen', () => {
    render(<OnboardingScreen />)
    fireEvent.click(screen.getByRole('button', { name: /pular/i }))
    fireEvent.click(screen.getByRole('button', { name: /preencher você mesmo/i }))
    expect(screen.getByText(/fase da maternidade/i)).toBeTruthy()
  })

  it('renders VoiceOrbOnboarding when Falar com a Sara is chosen', () => {
    render(<OnboardingScreen />)
    fireEvent.click(screen.getByRole('button', { name: /pular/i }))
    fireEvent.click(screen.getByRole('button', { name: /falar com a sara/i }))
    expect(screen.getByText('VoiceOrbOnboarding')).toBeTruthy()
  })

  it('returns to choice screen when VoiceOrbOnboarding onBack is called', () => {
    render(<OnboardingScreen />)
    fireEvent.click(screen.getByRole('button', { name: /pular/i }))
    fireEvent.click(screen.getByRole('button', { name: /falar com a sara/i }))
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(screen.getByRole('button', { name: /preencher você mesmo/i })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/auth/OnboardingScreen.test.tsx
```

Expected: FAIL — tests about "choice screen" not found.

- [ ] **Step 3: Modify OnboardingScreen**

Open `src/components/auth/OnboardingScreen.tsx`. Make these changes:

**a) Add imports at top (after existing imports):**
```tsx
import { VoiceOrbOnboarding } from '../onboarding/VoiceOrbOnboarding'
import type { VoiceCollectedProfile } from '../../hooks/useVoiceOrb'
```

**b) Add two new state variables inside the component function (after existing state declarations):**
```tsx
const [introSeen, setIntroSeen] = useState(false)
const [voiceMode, setVoiceMode] = useState(false)
```

**c) Replace the intro block:**

Find the existing intro block (the `if (isIntro)` block, lines ~113–133) and replace it with:

```tsx
  if (isIntro) {
    // After intro video, show choice screen
    if (introSeen) {
      if (voiceMode) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-[#1C1510] sm:bg-[#EDE6DC]">
            <div className="relative w-full min-h-screen sm:w-[390px] sm:min-h-[844px] sm:max-h-[844px] bg-sara-cream sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
              <VoiceOrbOnboarding
                onComplete={(data: VoiceCollectedProfile) => {
                  useAppStore.setState({
                    motherName: data.motherName,
                    babyName: data.primaryChild.name ?? '',
                    phase: data.primaryChild.phase === 'pregnant'
                      ? { stage: 'pregnant' as const, week: data.primaryChild.week ?? 28 }
                      : { stage: 'postpartum' as const, ageInDays: data.primaryChild.ageInDays ?? 0 },
                  })
                  setVoiceMode(false)
                  setIntroSeen(false)
                  setStep(0)
                }}
                onBack={() => setVoiceMode(false)}
              />
            </div>
          </div>
        )
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#1C1510] sm:bg-[#EDE6DC]">
          <div className="relative w-full min-h-screen sm:w-[390px] sm:min-h-[844px] sm:max-h-[844px] bg-sara-cream sm:rounded-[44px] sm:shadow-2xl overflow-hidden flex flex-col items-center justify-center gap-6 px-8">
            <div className="text-center">
              <p className="text-[20px] font-semibold font-serif text-graphite mb-2">
                Como prefere começar?
              </p>
              <p className="text-[13px] text-graphite-muted leading-relaxed">
                Você pode responder as perguntas ou conversar com a Sara — o resultado é o mesmo.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => setStep(0)}
                aria-label="Preencher você mesmo"
                className="w-full py-4 rounded-2xl border-2 border-sara-gold text-sara-gold text-sm font-semibold"
              >
                📝 Preencher você mesmo
              </button>
              <button
                onClick={() => setVoiceMode(true)}
                aria-label="Falar com a Sara"
                className="w-full py-4 rounded-2xl bg-sara-gold text-white text-sm font-semibold"
              >
                🎙️ Falar com a Sara
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1C1510] sm:bg-[#EDE6DC]">
        <div className="relative w-full min-h-screen sm:w-[390px] sm:min-h-[844px] sm:max-h-[844px] bg-[#1C1510] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
          <video
            src="/videos/onboarding-scene-0.mp4"
            autoPlay
            playsInline
            onEnded={() => setIntroSeen(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <button
            onClick={() => setIntroSeen(true)}
            aria-label="Pular introdução"
            className="absolute bottom-12 right-6 px-4 py-2 bg-black/30 backdrop-blur-sm rounded-full text-white/70 text-xs font-medium active:scale-95 transition-transform"
          >
            Pular →
          </button>
        </div>
      </div>
    )
  }
```

**d) Add `useAppStore` direct import** — check if `useAppStore` is already imported. It is (line 3). Add access to `setState`:

No extra import needed. `useAppStore.setState` is available directly on the store.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/auth/OnboardingScreen.test.tsx
```

Expected: 5 tests PASS.

- [ ] **Step 5: Run full test suite to check no regressions**

```bash
npx vitest run
```

Expected: all existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/OnboardingScreen.tsx src/components/auth/OnboardingScreen.test.tsx
git commit -m "feat: add voice orb path to onboarding — split choice after intro video"
```

---

## Task 7: Integration Smoke Test

Manually verify the complete flow works in the browser.

**Files:** none — this is a manual verification step.

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Reach the OnboardingScreen**

Open the app. Log out if already logged in. Register a new test account to reach the onboarding flow.

- [ ] **Step 3: Test form path**

Click "Pular →" on the intro → see choice screen → click "Preencher você mesmo" → verify Q1 question appears → complete questions normally.

- [ ] **Step 4: Test voice path**

Register another test account. On choice screen click "Falar com a Sara" → grant microphone permission if prompted → wait for Sara to connect and speak → answer Sara's questions naturally → verify Sara calls `confirmar_perfil` → see `VoiceOrbConfirmation` with your data → click Confirmar → verify Q1-Q5 still appear for archetype selection.

- [ ] **Step 5: Final commit**

```bash
git add -p  # stage any debug-only changes to remove
git commit -m "feat: voice orb onboarding — complete ElevenLabs conversational flow"
```
