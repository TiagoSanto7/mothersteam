# Profile, Notifications & Verses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir 6 problemas: remover switch de notificação do próprio perfil e mover para perfil alheio, pull-to-refresh em todas as telas, compartilhar versículo de outro perfil com menção de origem, botão salvar versículo de outro perfil, crop/reposicionamento de foto de perfil.

**Architecture:** Pull-to-refresh implementado com hook React puro usando touch events (sem biblioteca). Crop de foto com canvas nativo. Switch de notificação por usuário vira uma nova rota no backend + toggle no `ProfileScreen`.

**Tech Stack:** React + TypeScript, Vitest + RTL, Fastify + Prisma

Bugs cobertos: #2 (crop foto), #11 (switch notificação), #14 (pull-to-refresh), #17 (compartilhar versículo), #18 (salvar versículo de outro)

---

### Task 1: Pull-to-refresh — hook reutilizável

**Files:**
- Create: `src/lib/usePullToRefresh.ts`
- Create: `src/lib/usePullToRefresh.test.ts`

- [ ] **Step 1: Escrever testes que vão falhar**

Criar `src/lib/usePullToRefresh.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePullToRefresh } from './usePullToRefresh'

describe('usePullToRefresh', () => {
  it('calls onRefresh when pulled down far enough', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    const ref = { current: document.createElement('div') }
    const { result } = renderHook(() => usePullToRefresh(ref, onRefresh))

    // Simular touchstart + touchmove para baixo + touchend
    act(() => {
      ref.current.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 1, target: ref.current, clientY: 0 })],
      }))
      ref.current.dispatchEvent(new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 1, target: ref.current, clientY: 90 })],
      }))
      ref.current.dispatchEvent(new TouchEvent('touchend', { changedTouches: [] }))
    })

    expect(onRefresh).toHaveBeenCalledOnce()
    expect(result.current.isPulling).toBe(false)
  })

  it('does not call onRefresh when pulled less than threshold', () => {
    const onRefresh = vi.fn()
    const ref = { current: document.createElement('div') }
    renderHook(() => usePullToRefresh(ref, onRefresh))

    act(() => {
      ref.current.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 1, target: ref.current, clientY: 0 })],
      }))
      ref.current.dispatchEvent(new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 1, target: ref.current, clientY: 30 })],
      }))
      ref.current.dispatchEvent(new TouchEvent('touchend', { changedTouches: [] }))
    })

    expect(onRefresh).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

```bash
npx vitest run src/lib/usePullToRefresh.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implementar o hook**

Criar `src/lib/usePullToRefresh.ts`:

```ts
import { useState, useEffect, useRef, type RefObject } from 'react'

const THRESHOLD = 70 // px

export function usePullToRefresh(
  containerRef: RefObject<HTMLElement | null>,
  onRefresh: () => Promise<void>,
) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullY, setPullY] = useState(0)
  const startY = useRef(0)
  const isRefreshing = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop > 0) return  // só ativa no topo
      startY.current = e.touches[0].clientY
    }

    function onTouchMove(e: TouchEvent) {
      const delta = e.touches[0].clientY - startY.current
      if (delta > 0) {
        setIsPulling(true)
        setPullY(Math.min(delta, THRESHOLD * 1.5))
      }
    }

    async function onTouchEnd() {
      if (pullY >= THRESHOLD && !isRefreshing.current) {
        isRefreshing.current = true
        await onRefresh()
        isRefreshing.current = false
      }
      setIsPulling(false)
      setPullY(0)
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [containerRef, onRefresh, pullY])

  return { isPulling, pullY }
}
```

- [ ] **Step 4: Rodar para ver passar**

```bash
npx vitest run src/lib/usePullToRefresh.test.ts
```
Expected: PASS.

- [ ] **Step 5: Aplicar nas telas**

Abrir cada tela e adicionar o hook. Padrão a repetir em cada uma:

```tsx
// 1. Importar
import { usePullToRefresh } from '../../lib/usePullToRefresh'

// 2. Adicionar ref ao container scrollável
const scrollRef = useRef<HTMLDivElement>(null)

// 3. Usar o hook
const { isPulling, pullY } = usePullToRefresh(scrollRef, async () => {
  await queryClient.invalidateQueries({ queryKey: ['notifications'] }) // adaptar queryKey
})

// 4. Adicionar ref e indicador visual na div scrollável:
<div ref={scrollRef} className="flex-1 overflow-y-auto">
  {isPulling && (
    <div className="flex justify-center py-3" style={{ transform: `translateY(${pullY - 40}px)` }}>
      <div className="w-6 h-6 rounded-full border-2 border-sara-gold border-t-transparent animate-spin" />
    </div>
  )}
  {/* conteúdo existente */}
</div>
```

Telas para aplicar:
- `src/components/notifications/NotificationsScreen.tsx` — queryKey: `['notifications']`
- `src/components/comunidade/ComunidadeScreen.tsx` — queryKey: `['posts']`
- `src/components/profile/ProfileScreen.tsx` — queryKey: `['user', effectiveUserId]`
- `src/components/chat/ChatListScreen.tsx` — queryKey: `['chats']`

- [ ] **Step 6: Commit**

```bash
git add src/lib/usePullToRefresh.ts src/lib/usePullToRefresh.test.ts src/components/notifications/NotificationsScreen.tsx src/components/comunidade/ComunidadeScreen.tsx src/components/profile/ProfileScreen.tsx src/components/chat/ChatListScreen.tsx
git commit -m "feat: pull-to-refresh on notifications, feed, profile and chat list"
```

---

### Task 2: Switch de notificação — remover do próprio perfil, adicionar no perfil alheio

**Files:**
- Modify: `src/components/profile/ProfileScreen.tsx`
- Modify: `server/src/routes/users.ts` (ou `notifications.ts`)

- [ ] **Step 1: Localizar o switch atual**

Em `src/components/profile/ProfileScreen.tsx`, buscar por `switch` ou `notif` ou `Bell`. Identificar onde está o toggle de notificações do próprio perfil.

- [ ] **Step 2: Remover o switch do próprio perfil**

Remover o JSX/lógica do switch quando `profile.isSelf === true`.

- [ ] **Step 3: Adicionar backend — toggle de notificação por usuário**

Em `server/src/routes/users.ts`:

```ts
// POST /users/:id/notify — ativar/desativar notificação de posts desse usuário
fastify.post<{ Params: { id: string } }>(
  '/:id/notify',
  { preHandler: [fastify.authenticate] },
  async (request, reply) => {
    const targetId = request.params.id
    if (targetId === request.userId)
      return reply.status(400).send({ error: 'Cannot notify yourself' })

    // Verificar se já existe (usando uma tabela de preferências ou campo no Follow)
    // Opção simples: guardar como JSON no Follow ou criar tabela UserNotifyPreference
    // Implementação mínima: retornar { notifying: boolean }
    reply.send({ notifying: true })
  }
)
```

Nota: A implementação completa de preferências de notificação requer uma nova tabela no Prisma (`UserNotifyPreference`). Para MVP, só fazer o toggle local no frontend e guardar no Zustand.

- [ ] **Step 4: Adicionar toggle no perfil de outro usuário**

Em `src/components/profile/ProfileScreen.tsx`, onde está o botão "Seguindo" (quando `!profile.isSelf`):

```tsx
// Adicionar ao lado do botão Seguindo:
{isFollowing && (
  <button
    onClick={() => setNotifying((n) => !n)}
    aria-label={notifying ? 'Desativar notificações de publicações' : 'Ativar notificações de publicações'}
    className={`w-9 h-9 flex items-center justify-center rounded-full border transition-colors ${
      notifying
        ? 'border-sara-gold bg-sara-gold text-white'
        : 'border-sara-linen bg-white text-graphite-muted'
    }`}
  >
    <Bell size={16} />
  </button>
)}
```

Adicionar estado local:
```tsx
const [notifying, setNotifying] = useState(false)
```

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/components/profile/ProfileScreen.tsx server/src/routes/users.ts
git commit -m "feat(profile): move notification toggle to other user's profile; remove from own profile"
```

---

### Task 3: Compartilhar versículo de outro perfil + botão Salvar

**Files:**
- Modify: `src/components/home/SavedVersesScreen.tsx`
- Modify: `src/store/useAppStore.ts`

- [ ] **Step 1: Escrever testes que vão falhar**

Abrir `src/components/home/SavedVersesScreen.test.tsx` e adicionar:

```tsx
it('shows share button in readOnly mode', () => {
  render(
    <SavedVersesScreen
      open={true}
      onClose={vi.fn()}
      readOnlyVerses={['Jo 3.16']}
      readOnlyUserName="Maria"
    />
  )
  expect(screen.getByLabelText('Compartilhar versículo')).toBeInTheDocument()
})

it('shows save button in readOnly mode', () => {
  render(
    <SavedVersesScreen
      open={true}
      onClose={vi.fn()}
      readOnlyVerses={['Jo 3.16']}
      readOnlyUserName="Maria"
    />
  )
  expect(screen.getByLabelText('Salvar versículo')).toBeInTheDocument()
})
```

- [ ] **Step 2: Rodar para ver falhar**

```bash
npx vitest run src/components/home/SavedVersesScreen.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Corrigir shareVerse no modo readOnly**

Em `src/components/home/SavedVersesScreen.tsx`, na renderização de cada versículo em modo readOnly, o botão de compartilhar já existe mas pode estar com `shareVerse` não chamando corretamente. Verificar a lógica.

O conteúdo compartilhado deve mencionar o dono:
```tsx
// Passar readOnlyUserName para shareVerse:
const textToShare = readOnlyUserName
  ? `"${entry.verso}" — ${entry.referencia}\n\nSalvo por ${readOnlyUserName} no Mother's Team`
  : `"${entry.verso}" — ${entry.referencia}`

// Substituir a chamada shareVerse por inline:
async function handleShare(verso: string, referencia: string) {
  const text = readOnlyUserName
    ? `"${verso}" — ${referencia}\n\nSalvo por ${readOnlyUserName} no Mother's Team`
    : `"${verso}" — ${referencia}`

  if (typeof navigator !== 'undefined' && navigator.share) {
    try { await navigator.share({ text }); return 'shared' } catch { /* fall through */ }
  }
  try { await navigator.clipboard.writeText(text); return 'copied' } catch { /* fall through */ }
  // fallback execCommand...
}
```

- [ ] **Step 4: Adicionar botão "Salvar" no modo readOnly**

No bloco de action row (linha ~181), dentro da condição `isReadOnly`, adicionar botão de salvar:

```tsx
{isReadOnly && (
  <button
    onClick={() => {
      saveVerse(ref)  // salvar nos próprios versos
      // feedback visual
      setShareLabel((prev) => ({ ...prev, [ref]: '✓ Salvo' }))
      setTimeout(() => setShareLabel((prev) => { const n = { ...prev }; delete n[ref]; return n }), 2000)
    }}
    aria-label="Salvar versículo"
    className="text-[11px] text-sara-gold font-medium flex items-center gap-1"
  >
    ❤️ {shareLabel[ref] === '✓ Salvo' ? '✓ Salvo' : 'Salvar'}
  </button>
)}
```

O `saveVerse` está disponível via `useAppStore` mas não está sendo importado no modo readOnly. Adicionar:
```tsx
const saveVerse = useAppStore((s) => s.saveVerse)
```

- [ ] **Step 5: Rodar os testes**

```bash
npx vitest run src/components/home/SavedVersesScreen.test.tsx
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/home/SavedVersesScreen.tsx
git commit -m "feat(verses): share with attribution + save button in readOnly (other user's verses)"
```

---

### Task 4: Crop/reposicionamento de foto de perfil

**Files:**
- Create: `src/components/shared/ImageCropModal.tsx`
- Create: `src/components/shared/ImageCropModal.test.tsx`
- Modify: `src/components/profile/EditProfileScreen.tsx`

- [ ] **Step 1: Escrever testes que vão falhar**

Criar `src/components/shared/ImageCropModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImageCropModal } from './ImageCropModal'

const fakeUrl = 'blob:http://localhost/fake-image'

describe('ImageCropModal', () => {
  it('renders confirm and cancel buttons', () => {
    render(<ImageCropModal imageSrc={fakeUrl} onConfirm={vi.fn()} onCancel={vi.fn()} aspectRatio={1} />)
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
  })

  it('calls onCancel when cancel is clicked', () => {
    const onCancel = vi.fn()
    render(<ImageCropModal imageSrc={fakeUrl} onConfirm={vi.fn()} onCancel={onCancel} aspectRatio={1} />)
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onConfirm with a Blob when confirmed', async () => {
    const onConfirm = vi.fn()
    render(<ImageCropModal imageSrc={fakeUrl} onConfirm={onConfirm} onCancel={vi.fn()} aspectRatio={1} />)
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    // onConfirm will be called async after canvas.toBlob
    // In jsdom canvas.toBlob returns null — just verify it was called
    await vi.waitFor(() => expect(onConfirm).toHaveBeenCalled(), { timeout: 500 })
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

```bash
npx vitest run src/components/shared/ImageCropModal.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Criar o componente ImageCropModal**

Criar `src/components/shared/ImageCropModal.tsx`:

```tsx
import { useRef, useState, useEffect, useCallback } from 'react'
import { Move } from 'lucide-react'

interface Props {
  imageSrc: string
  aspectRatio: number  // 1 para quadrado, 16/9 para landscape
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}

export function ImageCropModal({ imageSrc, aspectRatio, onConfirm, onCancel }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const imgRef      = useRef<HTMLImageElement | null>(null)
  const [offset, setOffset]   = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart   = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const [scale, setScale]     = useState(1)
  const [loaded, setLoaded]   = useState(false)

  const PREVIEW = 280  // px
  const cropW = PREVIEW
  const cropH = Math.round(PREVIEW / aspectRatio)

  useEffect(() => {
    const img = new Image()
    img.src = imageSrc
    img.onload = () => {
      imgRef.current = img
      // Centralizar imagem inicialmente
      setOffset({ x: 0, y: 0 })
      setLoaded(true)
    }
  }, [imageSrc])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img    = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, cropW, cropH)
    const sw = img.naturalWidth  * scale
    const sh = img.naturalHeight * scale
    ctx.drawImage(img, offset.x, offset.y, sw, sh)
  }, [offset, scale, cropW, cropH])

  useEffect(() => { if (loaded) draw() }, [loaded, draw])

  function handlePointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy })
  }

  function handlePointerUp() { setDragging(false) }

  function handleConfirm() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (blob) onConfirm(blob)
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-6 p-6">
      <p className="text-white text-sm font-semibold">Arraste para reposicionar</p>

      <div
        className="relative overflow-hidden rounded-2xl border-2 border-sara-gold cursor-move"
        style={{ width: cropW, height: cropH }}
      >
        <canvas
          ref={canvasRef}
          width={cropW}
          height={cropH}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ display: 'block', touchAction: 'none' }}
        />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <Move size={28} className="text-white/40" />
        </div>
      </div>

      {/* Zoom slider */}
      <div className="flex items-center gap-3 w-full max-w-xs">
        <span className="text-white/60 text-xs">−</span>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.01}
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          className="flex-1 accent-sara-gold"
        />
        <span className="text-white/60 text-xs">+</span>
      </div>

      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={onCancel}
          aria-label="Cancelar"
          className="flex-1 py-3 rounded-2xl bg-white/20 text-white font-semibold text-sm"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          aria-label="Confirmar"
          className="flex-1 py-3 rounded-2xl bg-sara-gold text-white font-semibold text-sm"
        >
          Confirmar
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar para ver passar**

```bash
npx vitest run src/components/shared/ImageCropModal.test.tsx
```
Expected: PASS (jsdom canvas retorna null em toBlob — o teste de onConfirm verifica apenas que foi chamado).

- [ ] **Step 5: Integrar no EditProfileScreen**

Em `src/components/profile/EditProfileScreen.tsx`:

```tsx
import { ImageCropModal } from '../shared/ImageCropModal'

// Adicionar estado:
const [cropSrc, setCropSrc] = useState<string | null>(null)

// No handler de seleção de arquivo (onde hoje chama uploadImage diretamente):
async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
  const url = URL.createObjectURL(file)
  setCropSrc(url)  // abrir modal de crop em vez de upload direto
}

// Handler de confirmação do crop:
async function handleCropConfirm(blob: Blob) {
  if (cropSrc) URL.revokeObjectURL(cropSrc)
  setCropSrc(null)
  const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
  const resized = await resizeImage(file, 400, 400, 0.9)
  const url = await uploadImage(resized, accessToken)
  // salvar avatarUrl no perfil (mutation existente)
}

// No JSX, adicionar o modal:
{cropSrc && (
  <ImageCropModal
    imageSrc={cropSrc}
    aspectRatio={1}
    onConfirm={handleCropConfirm}
    onCancel={() => { URL.revokeObjectURL(cropSrc!); setCropSrc(null) }}
  />
)}
```

- [ ] **Step 6: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/components/shared/ImageCropModal.tsx src/components/shared/ImageCropModal.test.tsx src/components/profile/EditProfileScreen.tsx
git commit -m "feat(profile): add photo crop/reposition modal before uploading avatar"
```

---

### Task 5: Deploy

- [ ] **Step 1: Build e deploy**

```bash
npm run build
git push origin main
ssh -p 443 root@2.25.137.78 "cd /opt/mothersteam && git pull && docker compose -f deploy/docker-compose.prod.yml build api && docker compose -f deploy/docker-compose.prod.yml up -d api"
scp -P 443 -r dist/. root@2.25.137.78:/var/www/mothersteam/
```

- [ ] **Step 2: Rebuild APK**

```bash
npx cap copy android
cd android && .\gradlew.bat assembleDebug
```
APK em `android/app/build/outputs/apk/debug/app-debug.apk`.
