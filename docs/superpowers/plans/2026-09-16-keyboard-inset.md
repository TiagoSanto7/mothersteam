# Teclado cobre os inputs de texto (TIA-5) — Plano de Implementação

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA: usar `superpowers:subagent-driven-development` para executar este plano tarefa a tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Goal:** Fazer todo input de texto do app (MãeIA, chat, comentário) subir junto com o teclado, no iOS e no Android.

**Architecture:** Um hook único publica a altura do teclado — vinda do plugin `@capacitor/keyboard` no nativo, do `visualViewport` na web — numa CSS var (`--keyboard-height`) e num booleano do store (`keyboardOpen`). Os dois containers de altura travada do app passam a descontar essa var da própria altura; a tab bar some enquanto o teclado está aberto.

**Tech Stack:** React 18, Zustand, Tailwind, Capacitor 8 (`@capacitor/keyboard@8.0.5` — já instalado), vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-16-keyboard-inset-design.md`

---

## Divisão por agente e modelo

| Tarefa | Agente | Modelo | Por quê |
|---|---|---|---|
| 1. Hook `useKeyboardInset` + testes | implementer | **Sonnet** | Dois caminhos (nativo/web), cleanup assíncrono de listeners e mock de módulo no vitest — tem sutileza real |
| 2. Campo `keyboardOpen` no store | implementer | **Haiku** | Mecânico: 3 linhas num padrão que já existe no arquivo |
| 3. CSS var + 2 containers | implementer | **Haiku** | Mecânico: substituição exata de classe em 2 pontos já localizados |
| 4. Esconder a `BottomTabBar` | implementer | **Haiku** | Renderização condicional simples com o booleano da tarefa 2 |
| 5. Revisão de spec-compliance | spec-reviewer | **Sonnet** | Conferir escopo: nada a mais, nada a menos |
| 6. Revisão de qualidade final | code-reviewer | **Opus** | Julgamento de arquitetura sobre o conjunto: vazamento de listener, re-render, regressão de safe-area |
| 7. Verificação em device | — (manual, com o Tiago) | — | Exige device físico; não delegável |

**Ordem:** 1 → 2 → 3 → 4 são sequenciais (3 e 4 dependem de 1 e 2). Não despachar implementers em paralelo.

---

### Task 1: Hook `useKeyboardInset`

**Files:**
- Create: `src/hooks/useKeyboardInset.ts`
- Test: `src/hooks/useKeyboardInset.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardInset } from './useKeyboardInset'

const addListener = vi.fn()
const isNativePlatform = vi.fn()

vi.mock('@capacitor/keyboard', () => ({
  Keyboard: { addListener: (...a: unknown[]) => addListener(...a) },
}))
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNativePlatform() },
}))

function cssVar() {
  return document.documentElement.style.getPropertyValue('--keyboard-height')
}

describe('useKeyboardInset', () => {
  beforeEach(() => {
    addListener.mockReset()
    isNativePlatform.mockReset()
    document.documentElement.style.removeProperty('--keyboard-height')
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('publica a altura do teclado na CSS var quando o plugin nativo avisa', async () => {
    isNativePlatform.mockReturnValue(true)
    const handlers: Record<string, (i: { keyboardHeight: number }) => void> = {}
    addListener.mockImplementation((evt: string, cb: (i: { keyboardHeight: number }) => void) => {
      handlers[evt] = cb
      return Promise.resolve({ remove: vi.fn() })
    })

    renderHook(() => useKeyboardInset())
    handlers['keyboardWillShow']({ keyboardHeight: 320 })

    expect(cssVar()).toBe('320px')
  })

  it('zera a CSS var quando o teclado fecha', async () => {
    isNativePlatform.mockReturnValue(true)
    const handlers: Record<string, (i?: { keyboardHeight: number }) => void> = {}
    addListener.mockImplementation((evt: string, cb: (i?: { keyboardHeight: number }) => void) => {
      handlers[evt] = cb
      return Promise.resolve({ remove: vi.fn() })
    })

    renderHook(() => useKeyboardInset())
    handlers['keyboardWillShow']({ keyboardHeight: 320 })
    handlers['keyboardWillHide']()

    expect(cssVar()).toBe('0px')
  })

  it('remove os listeners do plugin ao desmontar', async () => {
    isNativePlatform.mockReturnValue(true)
    const remove = vi.fn()
    addListener.mockResolvedValue({ remove })

    const { unmount } = renderHook(() => useKeyboardInset())
    await Promise.resolve()
    unmount()
    await Promise.resolve()

    expect(remove).toHaveBeenCalledTimes(2)
  })

  it('na web, usa a sobreposição do visualViewport', () => {
    isNativePlatform.mockReturnValue(false)
    const listeners: Record<string, () => void> = {}
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 500,
        offsetTop: 0,
        addEventListener: (evt: string, cb: () => void) => { listeners[evt] = cb },
        removeEventListener: vi.fn(),
      },
    })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })

    renderHook(() => useKeyboardInset())
    listeners['resize']()

    expect(cssVar()).toBe('300px')
  })

  it('ignora variações pequenas do visualViewport (barra de URL, não teclado)', () => {
    isNativePlatform.mockReturnValue(false)
    const listeners: Record<string, () => void> = {}
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 760,
        offsetTop: 0,
        addEventListener: (evt: string, cb: () => void) => { listeners[evt] = cb },
        removeEventListener: vi.fn(),
      },
    })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })

    renderHook(() => useKeyboardInset())
    listeners['resize']()

    expect(cssVar()).toBe('0px')
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falham**

Rodar: `npx vitest run src/hooks/useKeyboardInset.test.ts`
Esperado: FAIL — `Failed to resolve import "./useKeyboardInset"`

- [ ] **Step 3: Implementar o hook**

```ts
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { useAppStore } from '../store/useAppStore';

const CSS_VAR = '--keyboard-height';

// Abaixo disso a mudança de viewport é chrome do browser (barra de URL), não teclado.
const MIN_KEYBOARD_PX = 120;

function publish(px: number) {
  document.documentElement.style.setProperty(CSS_VAR, `${px}px`);
  useAppStore.getState().setKeyboardOpen(px > 0);
}

/**
 * Fonte única da altura do teclado. O Capacitor está com `resize: 'none'` (iOS) e o
 * Android 15+ não redimensiona mais a janela, então nada encolhe a viewport sozinho —
 * quem faz isso é o CSS, consumindo a var publicada aqui.
 */
export function useKeyboardInset() {
  useEffect(() => {
    publish(0);

    if (Capacitor.isNativePlatform()) {
      const show = Keyboard.addListener('keyboardWillShow', (info) => publish(info.keyboardHeight));
      const hide = Keyboard.addListener('keyboardWillHide', () => publish(0));
      return () => {
        void show.then((h) => h.remove());
        void hide.then((h) => h.remove());
        publish(0);
      };
    }

    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const overlap = window.innerHeight - vv.height - vv.offsetTop;
      publish(overlap >= MIN_KEYBOARD_PX ? Math.round(overlap) : 0);
    };
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
      publish(0);
    };
  }, []);
}
```

- [ ] **Step 4: Rodar os testes**

Rodar: `npx vitest run src/hooks/useKeyboardInset.test.ts`
Esperado: PASS (5 testes)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useKeyboardInset.ts src/hooks/useKeyboardInset.test.ts
git commit -m "feat(keyboard): add useKeyboardInset as single source of keyboard height"
```

---

### Task 2: Campo `keyboardOpen` no store

**Files:**
- Modify: `src/store/useAppStore.ts` (interface ~linha 51, estado inicial ~linha 189, action ~linha 266)

- [ ] **Step 1: Adicionar à interface do state**

Junto de `quickActionsOpen: boolean;` (linha ~51):
```ts
  keyboardOpen: boolean;
```

Junto das actions (linha ~82):
```ts
  setKeyboardOpen: (open: boolean) => void;
```

- [ ] **Step 2: Adicionar o valor inicial**

Junto de `quickActionsOpen: false,` (linha ~189):
```ts
      keyboardOpen: false,
```

- [ ] **Step 3: Adicionar a action**

Junto de `closeQuickActions` (linha ~266):
```ts
      setKeyboardOpen: (open) => set({ keyboardOpen: open }),
```

- [ ] **Step 4: Verificar que nada quebrou**

Rodar: `npx vitest run src/store/useAppStore.test.ts`
Esperado: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/useAppStore.ts
git commit -m "feat(keyboard): track keyboardOpen in the app store"
```

---

### Task 3: CSS var nos dois containers de altura travada

**Files:**
- Modify: `src/index.css` (adicionar utilitário)
- Modify: `src/components/layout/MobileShell.tsx:57`
- Modify: `src/App.tsx:368`
- Modify: `src/App.tsx` (montar o hook)

- [ ] **Step 1: Adicionar o utilitário no `src/index.css`**

```css
/* Altura de viewport que desconta o teclado. A var é publicada por useKeyboardInset —
   nem o iOS (resize: 'none') nem o Android 15+ (edge-to-edge) encolhem a WebView sozinhos. */
.app-viewport {
  height: calc(100vh - var(--keyboard-height, 0px));
  height: calc(100dvh - var(--keyboard-height, 0px));
}
```

- [ ] **Step 2: Montar o hook no `src/App.tsx`**

Adicionar o import junto dos outros:
```ts
import { useKeyboardInset } from './hooks/useKeyboardInset';
```

E chamar dentro do componente `App`, junto dos outros hooks de topo:
```ts
  useKeyboardInset();
```

- [ ] **Step 3: Trocar a classe no `MobileShell.tsx` (linha 57)**

```tsx
// antes
<div className="md:hidden w-full h-screen">
// depois
<div className="md:hidden w-full app-viewport">
```

- [ ] **Step 4: Trocar a classe no `App.tsx` (linha 368)**

Somente a altura de mobile muda; a de desktop (`md:h-[85vh]`) continua igual.
```tsx
// antes
className="w-full h-[96vh] md:w-[480px] md:h-[85vh] md:rounded-3xl overflow-hidden bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF]"
// depois
className="w-full h-[calc(96vh-var(--keyboard-height,0px))] md:w-[480px] md:h-[85vh] md:rounded-3xl overflow-hidden bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF]"
```

- [ ] **Step 5: Rodar a suíte completa**

Rodar: `npx vitest run`
Esperado: PASS (nenhuma regressão)

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/App.tsx src/components/layout/MobileShell.tsx
git commit -m "fix(keyboard): shrink viewport containers by the keyboard height"
```

---

### Task 4: Esconder a `BottomTabBar` com o teclado aberto

**Files:**
- Modify: `src/components/layout/MobileShell.tsx:77`
- Test: `src/components/layout/MobileShell.test.tsx` (criar se não existir)

**Contexto:** a `BottomTabBar` é irmã do `<main>` na coluna. Com o shell encolhendo, ela subiria e ficaria encavalada logo acima do teclado.

- [ ] **Step 1: Escrever o teste que falha**

Se o arquivo não existir, criar com os mocks necessários seguindo o padrão de `src/components/chat/ChatListScreen.test.tsx`. O teste essencial:

```tsx
it('esconde a tab bar enquanto o teclado está aberto', () => {
  useAppStore.setState({ keyboardOpen: true })
  renderShell()
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
})

it('mostra a tab bar quando o teclado está fechado', () => {
  useAppStore.setState({ keyboardOpen: false })
  renderShell()
  expect(screen.getByRole('navigation')).toBeInTheDocument()
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Rodar: `npx vitest run src/components/layout/MobileShell.test.tsx`
Esperado: FAIL — a tab bar é renderizada nos dois casos

- [ ] **Step 3: Implementar**

Ler o booleano com selector direto (regra 2 do `CLAUDE.md` — nunca `useAppStore()` sem selector):
```tsx
  const keyboardOpen = useAppStore((s) => s.keyboardOpen);
```

E na linha 77:
```tsx
// antes
<BottomTabBar />
// depois
{!keyboardOpen && <BottomTabBar />}
```

- [ ] **Step 4: Rodar os testes**

Rodar: `npx vitest run src/components/layout/MobileShell.test.tsx`
Esperado: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/MobileShell.tsx src/components/layout/MobileShell.test.tsx
git commit -m "fix(keyboard): hide bottom tab bar while the keyboard is open"
```

---

## CORREÇÃO DE ROTA (após a revisão de código, 2026-09-16)

A revisão com Opus derrubou duas premissas do plano original. **Ambas confirmadas no código.**

**Erro 1 — a análise dizia que havia só dois containers de altura travada. Há 11.** O `App.tsx` tem 10 overlays com o mesmo pai (`fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center`) e filhos `h-[96vh]`. Só a MãeIA (dentro do `MobileShell`) foi realmente corrigida.

**Erro 2 — a Task 3 aplicou a var no lugar errado, virando no-op.** O pai do overlay é `fixed inset-0`, ou seja, o **viewport de layout**, que o teclado não encolhe — essa é a premissa do bug. Com `items-end`, reduzir a altura do filho desce o **topo** dele e mantém a base colada no fim da tela: o input continua sob o teclado e ainda se perde conteúdo no topo.

**Correção:** o desconto vai no **pai** (`padding-bottom`), e o filho ganha `max-h-full` para caber no espaço restante.

**Erro 3 — risco de subtração dupla no Android ≤14.** Sem `windowSoftInputMode`, versões antigas resolvem para `adjustResize` e a WebView encolhe sozinha; a CSS var subtrairia de novo. O device de teste (Motorola one fusion) é Android 11 — cai exatamente nesse caso.

---

### Task 8: Corrigir os overlays do `App.tsx`

**Files:**
- Modify: `src/App.tsx` (10 pais de overlay + 11 filhos)

- [ ] **Step 1: Adicionar o desconto no pai**

Em **todas as 10** ocorrências (linhas ~255, 272, 291, 309, 327, 347, 366, 379, 388, 406), acrescentar a classe de padding ao final:
```tsx
// antes
className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center"
// depois
className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center pb-[var(--keyboard-height,0px)]"
```

- [ ] **Step 2: Deixar o filho caber no espaço restante**

Em **todas as 11** ocorrências de filho (linhas ~259, 276, 295, 313, 331, 351, 370, 380, 392, 410, 430), acrescentar `max-h-full` logo após `h-[96vh]`:
```tsx
// antes
className="w-full h-[96vh] md:w-[480px] md:h-[85vh] ..."
// depois
className="w-full h-[96vh] max-h-full md:w-[480px] md:h-[85vh] ..."
```

**A linha 370 é a exceção:** ela recebeu a alteração equivocada da Task 3 e precisa voltar ao padrão:
```tsx
// antes
className="w-full h-[calc(96vh-var(--keyboard-height,0px))] md:w-[480px] md:h-[85vh] md:rounded-3xl overflow-hidden bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF]"
// depois
className="w-full h-[96vh] max-h-full md:w-[480px] md:h-[85vh] md:rounded-3xl overflow-hidden bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF]"
```

**Por que funciona:** o pai continua com 100vh, mas seu *content box* passa a ser `100vh - keyboardHeight`. Com `items-end`, o filho é empurrado para cima do teclado; `max-h-full` (=100% do content box) o impede de estourar, já que `96vh` seria maior que o espaço restante.

- [ ] **Step 3: Rodar a suíte**

Rodar: `npx vitest run`
Esperado: PASS, sem regressão (587 antes desta task)

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "fix(keyboard): inset overlay parents instead of resizing their children"
```

---

### Task 9: Tornar o Android determinístico

**Files:**
- Modify: `android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: Declarar `adjustNothing` na MainActivity**

Adicionar o atributo junto de `android:name=".MainActivity"`:
```xml
android:windowSoftInputMode="adjustNothing"
```

**Por quê:** iguala o comportamento ao do iOS (`resize: 'none'`) em **todas** as versões do Android. Sem isso, Android ≤14 redimensiona a WebView sozinho e a CSS var subtrai a altura uma segunda vez. O plugin continua reportando `keyboardHeight` normalmente, porque lê `WindowInsets.Type.ime()` — que independe do modo de ajuste.

- [ ] **Step 2: Commit**

```bash
git add android/app/src/main/AndroidManifest.xml
git commit -m "fix(keyboard): make Android never resize the WebView, matching iOS"
```

---

### Task 7: Verificação em device (manual, com o Tiago)

Não delegável — exige device físico.

- [ ] Rodar `npm run build && npx cap sync android && cd android && ./gradlew assembleDebug`
- [ ] Instalar no Motorola: `adb -s 0072675254 install -r -t android/app/build/outputs/apk/debug/app-debug.apk`
- [ ] Testar as três telas: MãeIA, chat, comentário de publicação
- [ ] Em cada uma: focar o input → o campo sobe acima do teclado, a tab bar some, e a lista continua rolável
- [ ] Fechar o teclado → o layout volta ao normal e a tab bar reaparece
- [ ] iOS: fica para o próximo build de TestFlight (padrão adotado nesta sprint)
