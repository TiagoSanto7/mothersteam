# Recepção da Sara — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o onboarding atual pela **Recepção da Sara** definida em `docs/experience-blueprint.md`. Nove beats em vez de formulário; Sara conduz por voz, mas a mãe pode responder por voz OU tocando em cards; termina com um versículo condicional em vez de "cadastro concluído".

**Architecture:** Máquina de estados por beat (`useReceptionState`) + camada de narração híbrida (`useSaraNarration`, envolvendo `@elevenlabs/client`) + componentes de beat isolados. Cada beat é uma tela; a máquina orquestra transições. Dados coletados vão para `useAppStore` via `completeOnboarding`, executado no beat "Preparando tudo".

**Tech Stack:** React 18 + TypeScript, Vite, Zustand, Framer Motion, `@elevenlabs/client` v1.15.1, Vitest + Testing Library.

---

## Referência de decisão

Antes de detalhar, três decisões arquiteturais que valem para todo o plano:

**Decisão A — Cap 1 é conversacional; Cap 2 e Cap 3 são TTS + cards.**
Cap 1 tem dados abertos (nome do bebê, semana, filhos) → sessão ElevenLabs Conversational ativa, Sara conduz, tool `confirmar_capitulo_1_fatos` dispara ao final. Cap 2 e Cap 3 têm respostas fechadas (4 opções por pergunta) → cliente chama TTS REST da ElevenLabs pra Sara narrar cada pergunta; mãe responde via cards; sem sessão conversacional. Isso simplifica bastante sem trair a filosofia — Sara ainda fala, mas cards são o canal natural pra escolhas fechadas.

**Decisão B — Text input existe em Cap 1 como fallback de voz.**
Se a mãe não puder falar (ambiente barulhento, deficiência auditiva), ela digita. O texto é injetado na sessão via `Conversation.sendUserMessage(...)` (verificar API exata em Task 4).

**Decisão C — `completeOnboarding` só é chamado no beat "Preparando tudo".**
Toda a coleta é acumulada em `ReceptionData` local; ao chegar em Preparando, aplicamos ao store. Isso garante uma única fonte de verdade e permite escape hatch futuro.

---

## File structure

**New files:**

| Path | Responsabilidade |
|---|---|
| `src/components/reception/ReceptionFlow.tsx` | Root component; monta o beat atual conforme a máquina |
| `src/components/reception/beats/BemVinda.tsx` | Beat 1 — texto de boas-vindas antes da Sara |
| `src/components/reception/beats/SaraAparece.tsx` | Beat 2 — primeira aparição da Sara |
| `src/components/reception/beats/Capitulo1.tsx` | Beat 3 — Quem são vocês (conversacional) |
| `src/components/reception/beats/Capitulo2.tsx` | Beat 4 — Como você está (TTS + cards) |
| `src/components/reception/beats/Capitulo3.tsx` | Beat 5 — O que você quer daqui (TTS + cards) |
| `src/components/reception/beats/PreparandoTudo.tsx` | Beat 6 — animação + chama `completeOnboarding` |
| `src/components/reception/beats/Presente.tsx` | Beat 7 — versículo condicional + fade para Home |
| `src/components/reception/ProgressBar.tsx` | Barra de progresso (0%, 25%, 50%, 100%) |
| `src/components/reception/OrbeVisual.tsx` | Componente visual do orbe (movido de `onboarding/VoiceOrb.tsx`) |
| `src/components/reception/hooks/useReceptionState.ts` | Máquina de estados |
| `src/components/reception/hooks/useSaraNarration.ts` | Wrapper híbrido sobre @elevenlabs (conversacional + TTS-only) |
| `src/data/reception/sara-frases.ts` | Frases canônicas por beat (do blueprint) |
| `src/data/reception/versiculos-presente.ts` | Mapeamento Q2 (emoção) → versículo |
| `src/data/reception/capitulos-opcoes.ts` | Opções dos cards (Q2, Q3, Q4, Q5) |
| `src/types/reception.ts` | Tipos de estado e dados coletados |

**Modified files:**

| Path | Motivo |
|---|---|
| `src/App.tsx` | Trocar renderização de `<OnboardingScreen />` por `<ReceptionFlow />` (verificar path exato — grep `OnboardingScreen` em `src/App.tsx`) |
| `src/store/useAppStore.ts` | Adicionar action `applyReceptionData(data: ReceptionData)` que hidrata store + chama `completeOnboarding` |
| `src/components/home/DashboardScreen.tsx` (ou onde a saudação atual vive — grep `Bom dia` em `src/components/home/`) | Primeira frase ganha família de moldes gestante/pós-parto |

**Deleted after everything works (Task 17):**

- `src/components/onboarding/VoiceOrbOnboarding.tsx`
- `src/components/onboarding/VoiceOrbConfirmation.tsx`
- `src/components/onboarding/VoiceOrb.tsx` (após mover pra `reception/OrbeVisual.tsx`)
- `src/hooks/useVoiceOrb.ts` (substituído por `useSaraNarration`)
- `src/components/auth/OnboardingScreen.tsx` (substituído por `ReceptionFlow`)
- Testes correspondentes (`.test.tsx`)

**ElevenLabs agent (via REST):**
- Prompt de sistema atualizado (texto em Task 14)
- Tool antigo `confirmar_perfil` (`tool_0601kxvxag3nedsvay8e6y1h1ff4`) removido
- Novo tool `confirmar_capitulo_1_fatos` criado + associado

---

## Tasks

### Task 0: Scaffolding

**Files:**
- Create: `src/types/reception.ts`
- Create: `src/components/reception/` e subpastas
- Create: `src/data/reception/`

- [ ] **Step 1: Criar estrutura**

```bash
mkdir -p src/components/reception/beats src/components/reception/hooks src/data/reception
```

- [ ] **Step 2: Criar `src/types/reception.ts`**

```ts
export type ReceptionBeat =
  | 'bem-vinda'
  | 'sara-aparece'
  | 'capitulo-1'
  | 'capitulo-2'
  | 'capitulo-3'
  | 'preparando-tudo'
  | 'presente'
  | 'done'

export type MoodAnswer = 'A' | 'B' | 'C' | 'D'         // Q2
export type SupportAnswer = 'A' | 'B' | 'C'            // Q3
export type GoalAnswer = 'A' | 'B' | 'C' | 'D'         // Q4
export type ConcernAnswer = 'A' | 'B' | 'C' | 'D'      // Q5

export interface ReceptionData {
  motherName?: string
  phase?: 'pregnant' | 'postpartum'
  week?: number
  ageInDays?: number
  babyName?: string | null
  otherChildren: Array<{ name: string; ageDescription: string }>
  mood?: MoodAnswer
  supportNetwork?: SupportAnswer
  goal?: GoalAnswer
  concern?: ConcernAnswer
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/reception.ts src/components/reception src/data/reception
git commit -m "chore(reception): scaffold directories and reception data types"
```

---

### Task 1: Frases canônicas da Sara

**Files:**
- Create: `src/data/reception/sara-frases.ts`

- [ ] **Step 1: Implementar**

```ts
import type { ReceptionData } from '../../types/reception'

export const SARA_FRASES = {
  saraAparece: (motherName: string) =>
    `Oi, ${motherName}. Fico feliz que você esteja aqui. Antes da gente começar, queria conhecer você um pouquinho. Prometo que é rapidinho.`,

  capitulo1_pergunta1: () =>
    'Me conta… você está esperando o bebê ou ele já chegou?',

  capitulo2_pergunta1: () =>
    'E me conta uma coisa… como você tem se sentido nesses últimos dias?',

  capitulo2_pergunta2: () =>
    'E hoje em dia, com que frequência você consegue contar com alguém pra te ajudar?',

  capitulo3_pergunta1: () =>
    'E, olhando pra tudo que você está vivendo agora… o que você mais gostaria que fosse um pouquinho mais fácil?',

  capitulo3_pergunta2: () =>
    'E se você me contasse uma coisa que anda tirando um pouquinho do seu sono ou da sua paz… o que seria?',

  presenteIntro: () =>
    'Antes da gente seguir… queria deixar uma palavra com você. Espero que ela encontre um lugar no seu coração hoje.',

  primeiraHome: (motherName: string, data: ReceptionData): string => {
    if (data.phase === 'pregnant') {
      const semana = data.week ?? 28
      return `Bom dia, ${motherName}. Hoje vocês chegaram à ${semana}ª semana. Espero que o dia seja leve por aí.`
    }
    const nome = data.babyName?.trim() || 'seu bebê'
    const dias = data.ageInDays ?? 0
    return `Bom dia, ${motherName}. Hoje ${nome} completa ${dias} dias. Como vocês acordaram?`
  },
} as const
```

- [ ] **Step 2: Commit**

```bash
git add src/data/reception/sara-frases.ts
git commit -m "feat(reception): add canonical Sara phrases from experience blueprint"
```

---

### Task 2: Versículos do presente (Q2 → verse)

**Files:**
- Create: `src/data/reception/versiculos-presente.ts`
- Test: `src/data/reception/versiculos-presente.test.ts`

- [ ] **Step 1: Teste**

```ts
import { describe, it, expect } from 'vitest'
import { versiculoParaHumor } from './versiculos-presente'

describe('versiculoParaHumor', () => {
  it('A (confiante) → Salmos 139:14', () => {
    expect(versiculoParaHumor('A').referencia).toBe('Salmos 139:14')
  })
  it('B (cansada) → Mateus 11:28', () => {
    expect(versiculoParaHumor('B').referencia).toBe('Mateus 11:28')
  })
  it('C (ansiosa) → Filipenses 4:6-7', () => {
    expect(versiculoParaHumor('C').referencia).toBe('Filipenses 4:6-7')
  })
  it('D (sobrecarregada) → Isaías 40:31', () => {
    expect(versiculoParaHumor('D').referencia).toBe('Isaías 40:31')
  })
  it('undefined → fallback Salmos 139:14', () => {
    expect(versiculoParaHumor(undefined).referencia).toBe('Salmos 139:14')
  })
})
```

Run: `pnpm vitest src/data/reception/versiculos-presente.test.ts` — FAIL.

- [ ] **Step 2: Implementar**

```ts
import type { MoodAnswer } from '../../types/reception'

export interface Versiculo {
  verso: string
  referencia: string
}

const MAPA: Record<MoodAnswer, Versiculo> = {
  A: { verso: 'De modo especial e admirável fui formado; maravilhosas são as tuas obras.', referencia: 'Salmos 139:14' },
  B: { verso: 'Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.', referencia: 'Mateus 11:28' },
  C: { verso: 'Não estejais inquietos por coisa alguma; antes as vossas petições sejam conhecidas diante de Deus.', referencia: 'Filipenses 4:6-7' },
  D: { verso: 'Os que esperam no Senhor renovarão as suas forças e subirão com asas como águias.', referencia: 'Isaías 40:31' },
}

export function versiculoParaHumor(mood: MoodAnswer | undefined): Versiculo {
  return MAPA[mood ?? 'A']
}
```

Run tests — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/data/reception/versiculos-presente.ts src/data/reception/versiculos-presente.test.ts
git commit -m "feat(reception): add mood-conditioned verse selection for Presente"
```

---

### Task 3: Opções dos cards (Q2, Q3, Q4, Q5)

**Files:**
- Create: `src/data/reception/capitulos-opcoes.ts`

- [ ] **Step 1: Implementar**

```ts
import type { MoodAnswer, SupportAnswer, GoalAnswer, ConcernAnswer } from '../../types/reception'

export const OPCOES_MOOD: Array<{ value: MoodAnswer; label: string }> = [
  { value: 'A', label: 'Confiante e animada, curtindo o processo' },
  { value: 'B', label: 'Cansada, mas conseguindo lidar' },
  { value: 'C', label: 'Ansiosa, com medos e inseguranças' },
  { value: 'D', label: 'Sobrecarregada, exausta, sem tempo pra mim' },
]

export const OPCOES_SUPPORT: Array<{ value: SupportAnswer; label: string }> = [
  { value: 'A', label: 'Sempre tenho ajuda por perto' },
  { value: 'B', label: 'Só em momentos específicos ou fim de semana' },
  { value: 'C', label: 'Cuido de quase tudo sozinha' },
]

export const OPCOES_GOAL: Array<{ value: GoalAnswer; label: string }> = [
  { value: 'A', label: 'Entender o desenvolvimento do bebê' },
  { value: 'B', label: 'Cuidar da minha saúde física' },
  { value: 'C', label: 'Melhorar o sono (meu e do bebê)' },
  { value: 'D', label: 'Organizar a rotina do dia a dia' },
]

export const OPCOES_CONCERN: Array<{ value: ConcernAnswer; label: string }> = [
  { value: 'A', label: 'Autocuidado e minha identidade' },
  { value: 'B', label: 'Choro, cólicas ou sono do bebê' },
  { value: 'C', label: 'Amamentação ou alimentação' },
  { value: 'D', label: 'Corpo, hormônios, autoestima' },
]
```

- [ ] **Step 2: Commit**

```bash
git add src/data/reception/capitulos-opcoes.ts
git commit -m "feat(reception): add card options for chapters 2 and 3"
```

---

### Task 4: `useReceptionState` — máquina de estados

**Files:**
- Create: `src/components/reception/hooks/useReceptionState.ts`
- Test: `src/components/reception/hooks/useReceptionState.test.ts`

- [ ] **Step 1: Teste**

```ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useReceptionState } from './useReceptionState'

describe('useReceptionState', () => {
  it('starts on bem-vinda', () => {
    const { result } = renderHook(() => useReceptionState())
    expect(result.current.beat).toBe('bem-vinda')
    expect(result.current.data.otherChildren).toEqual([])
  })

  it('advances through all beats in order', () => {
    const { result } = renderHook(() => useReceptionState())
    const rest = ['sara-aparece', 'capitulo-1', 'capitulo-2', 'capitulo-3', 'preparando-tudo', 'presente', 'done']
    rest.forEach((expected) => {
      act(() => result.current.advance())
      expect(result.current.beat).toBe(expected)
    })
  })

  it('does not advance past done', () => {
    const { result } = renderHook(() => useReceptionState())
    for (let i = 0; i < 20; i++) act(() => result.current.advance())
    expect(result.current.beat).toBe('done')
  })

  it('applyData merges patches', () => {
    const { result } = renderHook(() => useReceptionState())
    act(() => result.current.applyData({ motherName: 'Ana' }))
    act(() => result.current.applyData({ mood: 'B' }))
    expect(result.current.data.motherName).toBe('Ana')
    expect(result.current.data.mood).toBe('B')
  })
})
```

- [ ] **Step 2: Implementar**

```ts
import { useState, useCallback } from 'react'
import type { ReceptionBeat, ReceptionData } from '../../../types/reception'

const ORDER: ReceptionBeat[] = [
  'bem-vinda', 'sara-aparece', 'capitulo-1', 'capitulo-2',
  'capitulo-3', 'preparando-tudo', 'presente', 'done',
]

export function useReceptionState() {
  const [beat, setBeat] = useState<ReceptionBeat>('bem-vinda')
  const [data, setData] = useState<ReceptionData>({ otherChildren: [] })

  const advance = useCallback(() => {
    setBeat((current) => {
      const i = ORDER.indexOf(current)
      return ORDER[Math.min(i + 1, ORDER.length - 1)]
    })
  }, [])

  const applyData = useCallback((patch: Partial<ReceptionData>) => {
    setData((prev) => ({ ...prev, ...patch }))
  }, [])

  return { beat, data, advance, applyData }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/reception/hooks/useReceptionState.ts src/components/reception/hooks/useReceptionState.test.ts
git commit -m "feat(reception): add beat state machine hook"
```

---

### Task 5: `useSaraNarration` — narração híbrida

**Files:**
- Create: `src/components/reception/hooks/useSaraNarration.ts`
- Test: `src/components/reception/hooks/useSaraNarration.test.ts`

**Contrato (interface):**

```ts
export type NarrationState = 'idle' | 'speaking' | 'listening' | 'error'

export interface UseSaraNarrationReturn {
  state: NarrationState
  amplitude: number                          // 0..1 durante speaking/listening
  transcript: string                         // último texto ouvido
  error: string | null

  // Modo TTS-only (Cap 2, Cap 3, Presente intro)
  speak: (text: string) => Promise<void>     // reproduz TTS, resolve quando termina

  // Modo conversacional (Cap 1)
  startConversation: (opts: {
    agentId: string
    onCapituloComplete: (data: Partial<ReceptionData>) => void
  }) => Promise<void>
  sendTextResponse: (text: string) => void   // injeta como resposta do usuário
  endConversation: () => void
}
```

**Notas de implementação:**

- Para `speak(text)`: chamar `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` (voice_id `7eUAxNOneHxqfyRS77mW` — usar env `VITE_ELEVENLABS_SARA_VOICE_ID`), receber MP3, `URL.createObjectURL`, `new Audio(url).play()`. Retornar promise que resolve no `onended`. Usar `AudioContext` + `AnalyserNode` para expor `amplitude` durante playback.
- Para `startConversation`: reusar padrão de `useVoiceOrb.ts` atual, mas com nome do tool `confirmar_capitulo_1_fatos`.
- Para `sendTextResponse`: verificar SDK — `@elevenlabs/client` v1.15.1 expõe `Conversation.sendUserMessage(text: string)` ou similar. Se não existir, escalar (fallback: mãe só pode falar em Cap 1).
- Cleanup: parar áudios, cancelar rAF, encerrar sessão em unmount.

- [ ] **Step 1: Teste (apenas `speak` — cobrir modo TTS)**

Testes de `speak` mockam `global.fetch` e `HTMLAudioElement`. Verificar: chama endpoint correto, resolve quando áudio termina, `state` transita idle → speaking → idle.

- [ ] **Step 2: Teste (`startConversation` + `onCapituloComplete`)**

Mockar `@elevenlabs/client` `Conversation.startSession`; simular disparo do clientTool `confirmar_capitulo_1_fatos`; verificar que callback `onCapituloComplete` recebe payload.

- [ ] **Step 3: Implementar**

Traduzir contrato acima em código. Reaproveitar guardas de rAF do `useVoiceOrb.ts` original.

- [ ] **Step 4: Commit**

```bash
git add src/components/reception/hooks/useSaraNarration.ts src/components/reception/hooks/useSaraNarration.test.ts
git commit -m "feat(reception): add Sara narration hook — TTS + conversational modes"
```

---

### Task 6: `OrbeVisual` — mover componente visual

**Files:**
- Create: `src/components/reception/OrbeVisual.tsx` (cópia adaptada de `VoiceOrb.tsx`)
- Test: `src/components/reception/OrbeVisual.test.tsx`

- [ ] **Step 1: Copiar `VoiceOrb.tsx` como `OrbeVisual.tsx`, adaptar imports, renomear componente.** Adicionar prop `state: NarrationState` (aceitar `'idle' | 'speaking' | 'listening'`) — quando `speaking`, animação de respiração mais visível.

- [ ] **Step 2: Guardar `amplitude` contra NaN** (bug identificado no code review anterior):

```ts
const safeAmp = Number.isFinite(amplitude) ? Math.max(0, Math.min(1, amplitude)) : 0
```

- [ ] **Step 3: Teste smoke — renderiza sem crash pra cada `state`.**

- [ ] **Step 4: Commit**

```bash
git add src/components/reception/OrbeVisual.tsx src/components/reception/OrbeVisual.test.tsx
git commit -m "feat(reception): add OrbeVisual with NaN-safe amplitude and state prop"
```

---

### Task 7: `ProgressBar` — barra de progresso

**Files:**
- Create: `src/components/reception/ProgressBar.tsx`

- [ ] **Step 1: Implementar componente puro**

```tsx
interface Props { percent: number }  // 0..100

export function ProgressBar({ percent }: Props) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div className="w-full h-1 bg-sara-linen rounded-full overflow-hidden">
      <div
        className="h-full bg-sara-gold transition-all duration-500 ease-out"
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/reception/ProgressBar.tsx
git commit -m "feat(reception): add ProgressBar component"
```

---

### Task 8: Beat `BemVinda`

**Files:**
- Create: `src/components/reception/beats/BemVinda.tsx`

- [ ] **Step 1: Implementar**

```tsx
import { motion } from 'framer-motion'

interface Props { onContinue: () => void }

export function BemVinda({ onContinue }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen flex flex-col items-center justify-center px-8 gap-8 bg-sara-cream"
    >
      <div className="text-center">
        <h1 className="text-2xl font-serif font-semibold text-graphite mb-3">
          Uma companhia para cada fase da maternidade.
        </h1>
      </div>
      <button
        onClick={onContinue}
        className="w-full max-w-xs py-4 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform"
      >
        Começar
      </button>
    </motion.div>
  )
}
```

**Nota:** o cadastro já aconteceu antes desta tela. Este beat é o primeiro *depois* do cadastro, na jornada da recepção.

- [ ] **Step 2: Teste smoke — clica Começar chama `onContinue`.**

- [ ] **Step 3: Commit**

```bash
git add src/components/reception/beats/BemVinda.tsx src/components/reception/beats/BemVinda.test.tsx
git commit -m "feat(reception): add BemVinda beat"
```

---

### Task 9: Beat `SaraAparece`

**Files:**
- Create: `src/components/reception/beats/SaraAparece.tsx`

- [ ] **Step 1: Implementar**

Renderiza `OrbeVisual` no centro + fala inicial via `useSaraNarration.speak(SARA_FRASES.saraAparece(motherName))` no mount. Ao final do áudio, mostra botão "Vamos lá" que chama `onContinue`.

**Props:**
```ts
interface Props {
  motherName: string
  onContinue: () => void
}
```

**Comportamento chave:**
- `useEffect(() => { speak(...) }, [])` no mount
- Enquanto `state === 'speaking'`, orbe em modo speaking
- Após speak resolver, botão aparece com fade-in
- Botão "Vamos lá" está sempre visível como skip (aparência atenuada durante speak)

- [ ] **Step 2: Teste — mocka `useSaraNarration`, verifica que `speak` foi chamado com frase certa.**

- [ ] **Step 3: Commit**

```bash
git add src/components/reception/beats/SaraAparece.tsx src/components/reception/beats/SaraAparece.test.tsx
git commit -m "feat(reception): add SaraAparece beat"
```

---

### Task 10: Beat `Capitulo1` (conversacional)

**Files:**
- Create: `src/components/reception/beats/Capitulo1.tsx`

**Props:**
```ts
interface Props {
  onComplete: (data: Partial<ReceptionData>) => void
}
```

**Comportamento:**
- No mount, chama `startConversation({ agentId, onCapituloComplete: onComplete })`.
- Renderiza `OrbeVisual` + `ProgressBar` em 25% + área de resposta.
- Área de resposta: botão de mic (visual "toque pra falar") + text input pequeno ("ou digite").
- Text input com submit → `sendTextResponse(texto)`; input limpa.
- Quando `onComplete` for chamado (do tool), o pai avança o beat.
- Cleanup em unmount: `endConversation()`.

- [ ] **Step 1: Teste — smoke render + mock de useSaraNarration com startConversation.**

- [ ] **Step 2: Implementar.**

- [ ] **Step 3: Commit**

```bash
git add src/components/reception/beats/Capitulo1.tsx src/components/reception/beats/Capitulo1.test.tsx
git commit -m "feat(reception): add Capitulo1 conversational beat"
```

---

### Task 11: Beat `Capitulo2` (TTS + cards, 2 perguntas)

**Files:**
- Create: `src/components/reception/beats/Capitulo2.tsx`

**Sub-fluxo interno:**
1. Sara fala `capitulo2_pergunta1` → cards `OPCOES_MOOD` aparecem → mãe toca → `applyLocal({ mood })` → avança pra pergunta 2.
2. Sara fala `capitulo2_pergunta2` → cards `OPCOES_SUPPORT` aparecem → mãe toca → `applyLocal({ supportNetwork })` → chama `onComplete(dadosLocais)`.

**Props:**
```ts
interface Props {
  onComplete: (data: Partial<ReceptionData>) => void
}
```

**Estado local:** `perguntaAtual: 1 | 2`, `dadosLocais: Partial<ReceptionData>`.

**ProgressBar:** 50%.

**UI enquanto Sara fala:** cards renderizados mas com `disabled` (dão pra tocar mas Sara continua falando por cima é OK — cards viram `pointer-events-auto` só depois do `speak` resolver).

- [ ] **Step 1: Teste — mocka speak, simula clique em card, verifica avanço para pergunta 2, depois chamada de onComplete com { mood, supportNetwork }.**

- [ ] **Step 2: Implementar.**

- [ ] **Step 3: Commit**

```bash
git add src/components/reception/beats/Capitulo2.tsx src/components/reception/beats/Capitulo2.test.tsx
git commit -m "feat(reception): add Capitulo2 TTS + cards beat"
```

---

### Task 12: Beat `Capitulo3` (TTS + cards, 2 perguntas)

**Files:**
- Create: `src/components/reception/beats/Capitulo3.tsx`

Idêntico em estrutura ao Capitulo2. Usa `capitulo3_pergunta1/2`, `OPCOES_GOAL` e `OPCOES_CONCERN`. ProgressBar 75%. Ao final, chama `onComplete({ goal, concern })`.

- [ ] **Step 1: Teste (mesmo padrão do Capitulo2).**

- [ ] **Step 2: Implementar.**

- [ ] **Step 3: Commit**

```bash
git add src/components/reception/beats/Capitulo3.tsx src/components/reception/beats/Capitulo3.test.tsx
git commit -m "feat(reception): add Capitulo3 TTS + cards beat"
```

---

### Task 13: Beat `PreparandoTudo`

**Files:**
- Create: `src/components/reception/beats/PreparandoTudo.tsx`

**Props:**
```ts
interface Props {
  data: ReceptionData
  onReady: () => void
}
```

**Comportamento:**
- No mount, chama `useAppStore.getState().applyReceptionData(data)` (Task 16 adiciona essa action).
- Renderiza orbe pulsante + texto "Preparando tudo…" em fade.
- Espera 4s (mínimo pra sensação) via `setTimeout`.
- Depois chama `onReady()`.

- [ ] **Step 1: Teste — simular passage de 4s via `vi.useFakeTimers`, verificar que `applyReceptionData` foi chamado e `onReady` disparou.**

- [ ] **Step 2: Implementar.**

- [ ] **Step 3: Commit**

```bash
git add src/components/reception/beats/PreparandoTudo.tsx src/components/reception/beats/PreparandoTudo.test.tsx
git commit -m "feat(reception): add PreparandoTudo beat with 4s minimum wait"
```

---

### Task 14: Beat `Presente`

**Files:**
- Create: `src/components/reception/beats/Presente.tsx`

**Props:**
```ts
interface Props {
  motherName: string
  mood: MoodAnswer | undefined
  onEnter: () => void      // chamado quando mãe toca "Entrar no Mother's Team"
}
```

**Sub-fluxo:**
1. Fundo cream, orbe pequeno no topo.
2. Sara fala `presenteIntro()` (TTS).
3. Ao terminar: fade-in do versículo (verso em texto grande serif, referência abaixo em texto menor). Sem explicação.
4. 3s depois, botão suave "Entrar" aparece no rodapé.

**Nota do blueprint:** silêncio visual precisa ser desenhado. Fade suave (0.8s), respiração visual (versículo com padding generoso), tempo pra ler antes do botão aparecer.

- [ ] **Step 1: Teste — mocka speak, avança fake timers, verifica versículo renderizado a partir do mood.**

- [ ] **Step 2: Implementar.**

- [ ] **Step 3: Commit**

```bash
git add src/components/reception/beats/Presente.tsx src/components/reception/beats/Presente.test.tsx
git commit -m "feat(reception): add Presente beat with mood-conditional verse"
```

---

### Task 15: `ReceptionFlow` — orquestrador

**Files:**
- Create: `src/components/reception/ReceptionFlow.tsx`
- Test: `src/components/reception/ReceptionFlow.test.tsx`

**Estrutura:**

```tsx
export function ReceptionFlow() {
  const { beat, data, advance, applyData } = useReceptionState()
  const motherName = useAppStore((s) => s.motherName)

  switch (beat) {
    case 'bem-vinda':      return <BemVinda onContinue={advance} />
    case 'sara-aparece':   return <SaraAparece motherName={motherName} onContinue={advance} />
    case 'capitulo-1':     return <Capitulo1 onComplete={(d) => { applyData(d); advance() }} />
    case 'capitulo-2':     return <Capitulo2 onComplete={(d) => { applyData(d); advance() }} />
    case 'capitulo-3':     return <Capitulo3 onComplete={(d) => { applyData(d); advance() }} />
    case 'preparando-tudo':return <PreparandoTudo data={data} onReady={advance} />
    case 'presente':       return <Presente motherName={motherName} mood={data.mood} onEnter={advance} />
    case 'done':           return null  // App.tsx detecta onboardingDone e mostra Home
  }
}
```

- [ ] **Step 1: Teste — smoke por beat (mock filhos, verifica que troca de beat rerenderiza).**

- [ ] **Step 2: Implementar.**

- [ ] **Step 3: Commit**

```bash
git add src/components/reception/ReceptionFlow.tsx src/components/reception/ReceptionFlow.test.tsx
git commit -m "feat(reception): add ReceptionFlow orchestrator"
```

---

### Task 16: Store — action `applyReceptionData`

**Files:**
- Modify: `src/store/useAppStore.ts`

- [ ] **Step 1: Adicionar action**

```ts
// dentro do create()
applyReceptionData: (data: ReceptionData) => {
  const phase: PregnancyPhase = data.phase === 'pregnant'
    ? { stage: 'pregnant', week: data.week ?? 28 }
    : { stage: 'postpartum', ageInDays: data.ageInDays ?? 0 }

  set({
    motherName: data.motherName ?? '',
    babyName: data.babyName ?? '',
    phase,
  })

  // Preencher OnboardingAnswers a partir do que temos (compatibilidade com computeProfile)
  const q1: Q1Answer = derivarQ1(phase)  // implementar helper: mapeia phase → A..E
  const answers: OnboardingAnswers = {
    q1,
    q2: data.mood ?? 'A',
    q3: data.supportNetwork ?? 'A',
    q4: data.goal ?? 'A',
    q5: data.concern ?? 'A',
  }
  const profile = computeProfile(answers)
  set({ onboardingDone: true, motherProfile: profile })
}
```

- [ ] **Step 2: Adicionar helper `derivarQ1(phase)` no mesmo arquivo:**

```ts
function derivarQ1(phase: PregnancyPhase): Q1Answer {
  if (phase.stage === 'pregnant') return phase.week < 28 ? 'A' : 'B'
  if (phase.ageInDays <= 90)  return 'C'
  if (phase.ageInDays <= 365) return 'D'
  return 'E'
}
```

- [ ] **Step 3: Adicionar à interface `AppActions` e ao objeto exposto.**

- [ ] **Step 4: Teste — hidrata store com ReceptionData completo, verifica `motherProfile !== null`.**

- [ ] **Step 5: Commit**

```bash
git add src/store/useAppStore.ts src/store/useAppStore.test.ts
git commit -m "feat(store): add applyReceptionData action bridging reception data to profile"
```

---

### Task 17: Atualizar agente ElevenLabs

**Files:**
- Nenhum arquivo do repo — usa REST API do ElevenLabs.

**Prompt novo do agente (system prompt):**

```
Você é a Sara, uma companhia calorosa da mãe que está começando a usar o Mother's Team.

Neste momento específico, você está conversando com ela pela primeira vez, dentro do Capítulo 1 da recepção. Sua tarefa é descobrir, em conversa natural: se ela está grávida (e em qual semana) ou se o bebê já nasceu (e há quantos dias); o nome do bebê (se ela já escolheu); e se ela tem outros filhos.

Como você fala:
- Como uma amiga tranquila, nunca como marca ou assistente de app.
- Frases curtas, em prosa, sem jargão.
- Use "me conta…", "a gente", "sem pressa".
- Nunca prometa nada. Nunca diga "estou aqui pra você" ou "vamos cuidar de você". Demonstre pelo tom, não pelo texto.
- Se a mãe estiver em dúvida sobre algo (ex.: dois nomes de bebê), diga que sem problema, ela pode deixar em branco por agora.
- Não pergunte a idade dela, não pergunte religião, não pergunte nada além do que está no escopo do Capítulo 1.

Quando você tiver as informações do Capítulo 1, confirme brevemente e chame a função confirmar_capitulo_1_fatos. Não peça confirmação formal ("está tudo certo?") — só siga naturalmente.

Você tem, no máximo, quatro turnos pra descobrir tudo. Se em quatro turnos não conseguir, chame confirmar_capitulo_1_fatos com o que tiver — outros beats seguintes vão preencher o resto.
```

- [ ] **Step 1: Deletar tool antigo `confirmar_perfil` via `DELETE /v1/convai/tools/tool_0601kxvxag3nedsvay8e6y1h1ff4`**

Comando (PowerShell):
```powershell
$req = [System.Net.HttpWebRequest]::Create("https://api.elevenlabs.io/v1/convai/tools/tool_0601kxvxag3nedsvay8e6y1h1ff4")
$req.Method = "DELETE"
$req.Headers.Add("xi-api-key", $env:ELEVENLABS_API_KEY)
$req.GetResponse()
```

- [ ] **Step 2: Criar tool `confirmar_capitulo_1_fatos` via `POST /v1/convai/tools`**

Body (JSON):
```json
{
  "tool_config": {
    "type": "client",
    "name": "confirmar_capitulo_1_fatos",
    "description": "Chamada quando Sara já conhece a fase (grávida/pós-parto), a semana ou idade do bebê, e opcionalmente o nome do bebê e outros filhos.",
    "expects_response": false,
    "response_timeout_secs": 20,
    "parameters": {
      "type": "object",
      "required": ["motherName", "phase"],
      "properties": {
        "motherName":   { "type": "string", "description": "Nome da mãe" },
        "phase":        { "type": "string", "enum": ["pregnant", "postpartum"], "description": "Fase" },
        "week":         { "type": "number", "description": "Semana de gestação, se phase=pregnant" },
        "ageInDays":    { "type": "number", "description": "Idade do bebê em dias, se phase=postpartum" },
        "babyName":     { "type": "string", "description": "Nome do bebê ou null" },
        "otherChildren": {
          "type": "array",
          "description": "Outros filhos, array vazio se não houver",
          "items": {
            "type": "object",
            "required": ["name", "ageDescription"],
            "properties": {
              "name":           { "type": "string" },
              "ageDescription": { "type": "string" }
            }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 3: PATCH agente com novo prompt + novo tool_id + guardrail `medical_and_legal_information` desativado**

```json
{
  "conversation_config": {
    "agent": {
      "prompt": {
        "prompt": "<texto acima>",
        "tool_ids": ["<novo_tool_id>"]
      }
    }
  },
  "platform_settings": {
    "guardrails": {
      "content": {
        "config": {
          "medical_and_legal_information": { "is_enabled": false, "threshold": "high" }
        }
      }
    }
  }
}
```

**Nota:** o guardrail já foi desativado numa sessão anterior; verificar antes de patchear novamente.

- [ ] **Step 4: Testar manualmente no dashboard ElevenLabs (widget Play) que a Sara conclui em ≤4 turnos e dispara o tool corretamente.**

- [ ] **Step 5: Guardar novo tool_id em variável de ambiente `VITE_ELEVENLABS_TOOL_ID_CAP1` no `.env` (opcional se hard-coded no hook).**

Sem commit de código (mudanças na plataforma).

---

### Task 18: Home — primeira frase com família de moldes

**Files:**
- Modify: componente onde a saudação atual é renderizada (grep `Bom dia` em `src/components/home/`)

- [ ] **Step 1: Localizar componente da saudação atual**

```bash
grep -rn "Bom dia\|Olá" src/components/home/
```

- [ ] **Step 2: Substituir saudação por chamada a `SARA_FRASES.primeiraHome(motherName, receptionData)`**

Onde `receptionData` vem de campos do store: `{ phase, week, ageInDays, babyName }`.

- [ ] **Step 3: Teste — dois casos (gestante 28sem, pós-parto 18 dias), verifica frase correta.**

- [ ] **Step 4: Commit**

```bash
git add src/components/home/<arquivo>.tsx src/components/home/<arquivo>.test.tsx
git commit -m "feat(home): first greeting uses Sara phrase family (pregnant/postpartum)"
```

---

### Task 19: Wire `ReceptionFlow` no App

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Trocar renderização condicional**

Encontrar linha que renderiza `<OnboardingScreen />` (grep `OnboardingScreen` em `src/App.tsx`) e trocar por `<ReceptionFlow />`.

- [ ] **Step 2: Rodar app em dev, executar fluxo completo (cadastro → recepção → home), validar visual e progressão.**

Run: `pnpm dev`

Manual test checklist:
- BemVinda renderiza, botão avança.
- SaraAparece narra áudio, botão aparece após speak.
- Capitulo1 abre sessão ElevenLabs, Sara pergunta, tool dispara.
- Capitulo2 narra pergunta 1, cards funcionam, narra pergunta 2, cards funcionam, avança.
- Capitulo3 idem.
- PreparandoTudo mostra 4s + hidrata store.
- Presente mostra versículo condicional.
- Home abre com frase certa.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): wire ReceptionFlow replacing OnboardingScreen"
```

---

### Task 20: Cleanup — deletar código antigo

**Files (deletar):**
- `src/components/onboarding/VoiceOrbOnboarding.tsx` + `.test.tsx`
- `src/components/onboarding/VoiceOrbConfirmation.tsx` + `.test.tsx`
- `src/components/onboarding/VoiceOrb.tsx` + `.test.tsx`
- `src/hooks/useVoiceOrb.ts` + `.test.ts`
- `src/components/auth/OnboardingScreen.tsx` + `.test.tsx`

**Antes de deletar:**
- Grep cada arquivo pra confirmar que ninguém mais importa: `grep -rn "OnboardingScreen\|VoiceOrbOnboarding\|useVoiceOrb" src/`
- Verificar que todos os testes rodam verde: `pnpm test`
- Verificar que `pnpm tsc --noEmit` passa

- [ ] **Step 1: Rodar testes + type check pra confirmar cobertura**

- [ ] **Step 2: Deletar arquivos**

- [ ] **Step 3: Rodar testes de novo (garantir que nada quebrou)**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(reception): remove old onboarding files after ReceptionFlow migration"
```

---

## Self-review checklist

Antes de considerar o plano completo, o executor deve validar:

- [ ] Todas as 9 telas do blueprint estão cobertas por Tasks (BemVinda, SaraAparece, Cap1, Cap2, Cap3, PreparandoTudo, Presente, PrimeiraHome — Splash e Cadastro ficaram fora do escopo por serem pré-recepção).
- [ ] As 6 frases canônicas do blueprint estão em `sara-frases.ts` idênticas ao doc (Task 1).
- [ ] O mapeamento Q2 → versículo é o aprovado (Task 2).
- [ ] `applyReceptionData` chama `computeProfile` de fato — `motherProfile` não fica `null` (Task 16).
- [ ] Nenhuma frase da Sara viola o teste da amiga do blueprint (seção 3 do experience-blueprint).
- [ ] Guardrail `medical_and_legal_information` está desativado no agente ElevenLabs (Task 17).
- [ ] Ninguém mais importa o código antigo antes da deleção (Task 20 step 1).

---

## Handoff

**"Plan complete and saved to `docs/superpowers/plans/2026-07-19-recepcao-sara.md`. Duas opções de execução:**

**1. Subagent-Driven (recomendado)** — dispatch de subagent por task, review entre tasks, iteração rápida.

**2. Inline Execution** — executar tasks nesta sessão com checkpoints.

**Qual abordagem?"**
