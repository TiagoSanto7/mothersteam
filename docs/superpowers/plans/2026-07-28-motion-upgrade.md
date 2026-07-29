# Motion Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar 6 melhorias de motion/animação no app: pull-to-refresh com Sara SVG, micro-bounce no curtir, Sara frase-a-frase na MaeIA, Momento com Deus cinematic (blur), slide de post detail, e slide direcional entre abas com bolinhas de paginação.

**Architecture:** Todas as animações usam Framer Motion v12 já instalado. Cada feature é independente e pode ser commitada separadamente. Nenhuma feature quebra a arquitetura existente — são adições/substituições localizadas.

**Tech Stack:** React 18, TypeScript, Framer Motion v12, Vitest, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-07-28-motion-upgrade-design.md`

---

## Task 1: usePullToRefresh — expor `isLoading`

**Files:**
- Modify: `src/lib/usePullToRefresh.ts`

O hook atual não expõe se o `onRefresh()` está em execução. O `SaraPullIndicator` precisa dessa informação para mostrar a animação de loading (flor pulsando).

- [ ] **Step 1: Adicionar `isLoading` ao estado do hook**

Substituir o conteúdo de `src/lib/usePullToRefresh.ts`:

```ts
import { useState, useEffect, useRef, type RefObject } from 'react'

const THRESHOLD = 70

export function usePullToRefresh(
  containerRef: RefObject<HTMLElement | null>,
  onRefresh: () => Promise<void>,
) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullY, setPullY] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const startY = useRef(0)
  const pullYRef = useRef(0)
  const isRefreshing = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop > 0) return
      startY.current = e.touches[0].clientY
    }

    function onTouchMove(e: TouchEvent) {
      const delta = e.touches[0].clientY - startY.current
      if (delta > 0) {
        setIsPulling(true)
        const clamped = Math.min(delta, THRESHOLD * 1.5)
        pullYRef.current = clamped
        setPullY(clamped)
      }
    }

    async function onTouchEnd() {
      if (pullYRef.current >= THRESHOLD && !isRefreshing.current) {
        isRefreshing.current = true
        setIsLoading(true)
        await onRefresh()
        setIsLoading(false)
        isRefreshing.current = false
      }
      setIsPulling(false)
      setPullY(0)
      pullYRef.current = 0
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [containerRef, onRefresh])

  return { isPulling, pullY, isLoading }
}
```

- [ ] **Step 2: Verificar que os usos existentes não quebram**

Os 4 arquivos que usam o hook já desestruturavam `{ isPulling, pullY }` — o novo `isLoading` é adicional e não quebra nada. Confirmar que o TypeScript não reclama:

```bash
cd "C:/Users/User/OneDrive/Desktop/SANTTI/Portifólio/mothers-team"
npx tsc --noEmit
```

Expected: sem erros relacionados ao hook.

- [ ] **Step 3: Commit**

```bash
git add src/lib/usePullToRefresh.ts
git commit -m "feat(motion): expose isLoading from usePullToRefresh"
```

---

## Task 2: SaraPullIndicator — SVG flor animada

**Files:**
- Create: `src/components/shared/SaraPullIndicator.tsx`

Componente novo. Recebe `pullY` (0–105) e `isLoading`. Mostra SVG de flor onde as pétalas crescem conforme o pull progride.

- [ ] **Step 1: Criar o componente**

Criar `src/components/shared/SaraPullIndicator.tsx`:

```tsx
import { motion, AnimatePresence } from 'framer-motion'

interface SaraPullIndicatorProps {
  pullY: number
  isLoading: boolean
}

const PETAL_THRESHOLDS = [0, 12, 23, 35, 47, 58]
const MAX_PULL = 70

export function SaraPullIndicator({ pullY, isLoading }: SaraPullIndicatorProps) {
  const progress = Math.min(pullY / MAX_PULL, 1)

  function petalScale(threshold: number) {
    const petalProgress = Math.min(pullY / MAX_PULL, 1)
    const petalThresholdNorm = threshold / MAX_PULL
    if (pullY < threshold) return 0
    return Math.min((petalProgress - petalThresholdNorm) / (1 - petalThresholdNorm + 0.001), 1)
  }

  return (
    <div className="flex flex-col items-center gap-2 py-3">
      {/* SVG Flor */}
      <motion.div
        animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
        transition={isLoading ? { repeat: Infinity, duration: 3, ease: 'linear' } : { duration: 0 }}
      >
        <svg width="48" height="48" viewBox="0 0 48 48">
          {/* 6 pétalas */}
          {PETAL_THRESHOLDS.map((threshold, i) => (
            <motion.ellipse
              key={i}
              cx="24"
              cy="10"
              rx="4"
              ry="7"
              fill="#E8A090"
              opacity="0.85"
              transform={`rotate(${i * 60} 24 24)`}
              initial={{ scale: 0 }}
              animate={{ scale: isLoading ? 1 : petalScale(threshold) }}
              style={{ transformOrigin: '24px 24px' }}
              transition={isLoading ? { type: 'spring', stiffness: 300, damping: 20 } : { duration: 0 }}
            />
          ))}
          {/* Miolo */}
          <motion.circle
            cx="24"
            cy="24"
            r="7"
            fill="#C9A96E"
            animate={{ scale: isLoading ? [1, 1.1, 1] : progress > 0.1 ? 1 : 0 }}
            transition={isLoading ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' } : { duration: 0.2 }}
          />
        </svg>
      </motion.div>

      {/* Frase da Sara */}
      <AnimatePresence>
        {(pullY > 40 || isLoading) && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.25 }}
            className="text-[11px] text-sara-gold font-medium italic text-center px-4"
          >
            "Deixa eu ver se apareceu alguma novidade..."
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Testar no browser**

Rodar o app (`npm run dev`) e abrir NotificationsScreen. Adicionar temporariamente `<SaraPullIndicator pullY={50} isLoading={false} />` no topo para verificar que a flor aparece. Remover depois.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/SaraPullIndicator.tsx
git commit -m "feat(motion): SaraPullIndicator — SVG flor animada com pull"
```

---

## Task 3: Pull-to-refresh com Sara nos 4 screens

**Files:**
- Modify: `src/components/notifications/NotificationsScreen.tsx`
- Modify: `src/components/comunidade/ComunidadeScreen.tsx`
- Modify: `src/components/chat/ChatListScreen.tsx`
- Modify: `src/components/profile/ProfileScreen.tsx`

Substituir o spinner `animate-spin` existente pelo `SaraPullIndicator` em cada tela.

- [ ] **Step 1: Atualizar NotificationsScreen**

Em `src/components/notifications/NotificationsScreen.tsx`:

1. Adicionar import:
```tsx
import { SaraPullIndicator } from '../shared/SaraPullIndicator';
```

2. Atualizar o destructuring do hook (linha 35):
```tsx
const { isPulling, pullY, isLoading } = usePullToRefresh(scrollRef, async () => {
  await queryClient.invalidateQueries({ queryKey: ['notifications'] });
});
```

3. Substituir o bloco do spinner (dentro de `<div ref={scrollRef} ...>`):

Antes:
```tsx
{isPulling && (
  <div className="flex justify-center py-3" style={{ transform: `translateY(${pullY - 40}px)` }}>
    <div className="w-6 h-6 rounded-full border-2 border-sara-gold border-t-transparent animate-spin" />
  </div>
)}
```

Depois:
```tsx
{(isPulling || isLoading) && (
  <SaraPullIndicator pullY={pullY} isLoading={isLoading} />
)}
```

- [ ] **Step 2: Verificar ComunidadeScreen**

Abrir `src/components/comunidade/ComunidadeScreen.tsx` e localizar o uso de `usePullToRefresh`. Aplicar o mesmo padrão:

```tsx
// Adicionar import
import { SaraPullIndicator } from '../shared/SaraPullIndicator';

// Atualizar destructuring
const { isPulling, pullY, isLoading } = usePullToRefresh(scrollRef, async () => { ... });

// Substituir spinner por:
{(isPulling || isLoading) && (
  <SaraPullIndicator pullY={pullY} isLoading={isLoading} />
)}
```

- [ ] **Step 3: Verificar ChatListScreen**

Abrir `src/components/chat/ChatListScreen.tsx` e aplicar o mesmo padrão (import + destructuring + substituição do spinner).

- [ ] **Step 4: Verificar ProfileScreen**

Abrir `src/components/profile/ProfileScreen.tsx` e aplicar o mesmo padrão.

- [ ] **Step 5: Build check**

```bash
npx tsc --noEmit
```

Expected: sem erros de tipo.

- [ ] **Step 6: Commit**

```bash
git add src/components/notifications/NotificationsScreen.tsx src/components/comunidade/ComunidadeScreen.tsx src/components/chat/ChatListScreen.tsx src/components/profile/ProfileScreen.tsx
git commit -m "feat(motion): pull-to-refresh com Sara SVG nos 4 screens"
```

---

## Task 4: Heart micro-bounce no PostCard

**Files:**
- Modify: `src/components/comunidade/PostCard.tsx`

Substituir o `<button>` de curtir por `motion.button` com keyframes de bounce. Adicionar partícula "+1".

- [ ] **Step 1: Adicionar imports de Framer Motion**

Em `src/components/comunidade/PostCard.tsx`, adicionar ao topo:

```tsx
import { motion, AnimatePresence } from 'framer-motion'
```

- [ ] **Step 2: Adicionar estado para controle do bounce**

Dentro do componente `PostCard`, após as declarações existentes de `useState`:

```tsx
const [bounceKey, setBounceKey] = useState(0)
const [showParticle, setShowParticle] = useState(false)
```

- [ ] **Step 3: Atualizar o handler de like**

Localizar o `onClick` do botão de curtir (linha ~166). Atualizar para:

```tsx
onClick={(e) => {
  e.stopPropagation();
  const next = !liked;
  setLiked(next);
  likeMutation.mutate(next);
  if (next) {
    setBounceKey((k) => k + 1);
    setShowParticle(true);
    setTimeout(() => setShowParticle(false), 700);
  }
}}
```

- [ ] **Step 4: Substituir o button de curtir por motion.button**

Substituir o `<button ... aria-label={liked ? 'Descurtir' : 'Curtir'} ...>` por:

```tsx
<div className="relative inline-flex">
  <motion.button
    key={bounceKey}
    onClick={(e) => {
      e.stopPropagation();
      const next = !liked;
      setLiked(next);
      likeMutation.mutate(next);
      if (next) {
        setBounceKey((k) => k + 1);
        setShowParticle(true);
        setTimeout(() => setShowParticle(false), 700);
      }
    }}
    aria-label={liked ? 'Descurtir' : 'Curtir'}
    aria-pressed={liked}
    animate={liked ? { scale: [1, 1.4, 0.9, 1.15, 1] } : { scale: [1, 0.85, 1] }}
    transition={{ duration: liked ? 0.4 : 0.2, ease: 'easeOut' }}
    className={`flex items-center gap-1.5 text-xs transition-colors ${
      liked ? 'text-sara-terracotta' : 'text-graphite-muted'
    }`}
  >
    <Heart size={14} fill={liked ? 'currentColor' : 'none'} strokeWidth={1.8} />
    {post.likes}
  </motion.button>

  {/* Partícula +1 */}
  <AnimatePresence>
    {showParticle && (
      <motion.span
        initial={{ opacity: 0, y: 0, x: -4 }}
        animate={{ opacity: [0, 1, 1, 0], y: -20 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="absolute -top-1 left-3 text-[10px] font-bold text-sara-terracotta pointer-events-none"
      >
        +1
      </motion.span>
    )}
  </AnimatePresence>
</div>
```

- [ ] **Step 5: Verificar no browser**

`npm run dev` → feed de posts → curtir um post. Verificar bounce do ❤️ e partícula "+1" subindo.

- [ ] **Step 6: Commit**

```bash
git add src/components/comunidade/PostCard.tsx
git commit -m "feat(motion): micro-bounce no curtir + partícula +1 no PostCard"
```

---

## Task 5: Heart micro-bounce no PostDetailScreen

**Files:**
- Modify: `src/components/post/PostDetailScreen.tsx`

Mesma lógica do Task 4, mas no `PostDetailScreen` (o `<button>` de curtir na linha ~245).

- [ ] **Step 1: Adicionar import de Framer Motion**

Em `src/components/post/PostDetailScreen.tsx`, o import de `motion` já pode estar presente. Se não estiver, adicionar:

```tsx
import { motion, AnimatePresence } from 'framer-motion'
```

- [ ] **Step 2: Adicionar estado bounce no componente**

Após as declarações de `useState` existentes (linha ~53):

```tsx
const [bounceKey, setBounceKey] = useState(0)
const [showParticle, setShowParticle] = useState(false)
```

- [ ] **Step 3: Atualizar handleLike**

Localizar `function handleLike()` (linha ~132):

```tsx
function handleLike() {
  const next = !liked;
  setLiked(next);
  likeMutation.mutate(next);
  if (next) {
    setBounceKey((k) => k + 1);
    setShowParticle(true);
    setTimeout(() => setShowParticle(false), 700);
  }
}
```

- [ ] **Step 4: Substituir o button de curtir por motion.button**

Localizar o `<button onClick={handleLike} ...>` na área de ações do post (linha ~244). Substituir por:

```tsx
<div className="relative inline-flex">
  <motion.button
    key={bounceKey}
    onClick={handleLike}
    animate={liked ? { scale: [1, 1.4, 0.9, 1.15, 1] } : { scale: [1, 0.85, 1] }}
    transition={{ duration: liked ? 0.4 : 0.2, ease: 'easeOut' }}
    className={`flex items-center gap-1.5 text-xs transition-colors ${liked ? 'text-sara-terracotta' : 'text-graphite-muted'}`}
  >
    <Heart size={16} fill={liked ? 'currentColor' : 'none'} strokeWidth={1.8} />
    <span>{post.likes - (post.likedByCurrentUser ? 1 : 0) + (liked ? 1 : 0)}</span>
  </motion.button>
  <AnimatePresence>
    {showParticle && (
      <motion.span
        initial={{ opacity: 0, y: 0, x: -4 }}
        animate={{ opacity: [0, 1, 1, 0], y: -20 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="absolute -top-1 left-3 text-[10px] font-bold text-sara-terracotta pointer-events-none"
      >
        +1
      </motion.span>
    )}
  </AnimatePresence>
</div>
```

- [ ] **Step 5: Verificar no browser**

Abrir um post → curtir. Verificar bounce e partícula.

- [ ] **Step 6: Commit**

```bash
git add src/components/post/PostDetailScreen.tsx
git commit -m "feat(motion): micro-bounce no curtir + partícula +1 no PostDetailScreen"
```

---

## Task 6: Sara frase a frase na MaeIA

**Files:**
- Modify: `src/components/maeIA/MaeIAScreen.tsx`

Mensagens do assistente aparecem sentença a sentença com 150ms de delay entre frases.

- [ ] **Step 1: Atualizar o tipo Message**

Em `MaeIAScreen.tsx`, atualizar a interface `Message` (linha ~7):

```tsx
interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isNew?: boolean;
}
```

- [ ] **Step 2: Marcar mensagens novas no addMessage**

Atualizar `addMessage` (linha ~68):

```tsx
const addMessage = useCallback((role: 'user' | 'assistant', text: string) => {
  setMessages((prev) => [
    ...prev,
    { id: `${Date.now()}-${Math.random()}`, role, text, isNew: true },
  ]);
}, []);
```

- [ ] **Step 3: Adicionar import de motion**

Framer Motion já está importado (`import { motion } from 'framer-motion'`). Adicionar `AnimatePresence` se necessário:

```tsx
import { motion, AnimatePresence } from 'framer-motion'
```

- [ ] **Step 4: Criar componente de renderização de mensagem do assistente**

Adicionar antes da função `MaeIAScreen`:

```tsx
function AssistantMessage({ text, isNew }: { text: string; isNew?: boolean }) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);

  if (!isNew || sentences.length <= 1) {
    return <p className="text-sm leading-relaxed">{text}</p>;
  }

  return (
    <span className="text-sm leading-relaxed">
      {sentences.map((sentence, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15, duration: 0.3, ease: 'easeOut' }}
          className="inline"
        >
          {sentence}{i < sentences.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </span>
  );
}
```

- [ ] **Step 5: Usar AssistantMessage na renderização**

Localizar onde as mensagens são renderizadas no JSX. Procurar por `message.text` ou similar na lista de mensagens. Substituir a renderização do texto do assistente por:

```tsx
{msg.role === 'assistant' ? (
  <AssistantMessage text={msg.text} isNew={msg.isNew} />
) : (
  <p className="text-sm leading-relaxed">{msg.text}</p>
)}
```

- [ ] **Step 6: Testar no browser**

`npm run dev` → MaeIA → digitar uma pergunta (sem conectar por voz). A resposta estática aparece frase a frase.

Nota: o `sendText` fallback já chama `addMessage('assistant', '...')` com `isNew: true`, então dá para testar sem conectar.

- [ ] **Step 7: Commit**

```bash
git add src/components/maeIA/MaeIAScreen.tsx
git commit -m "feat(motion): Sara frase a frase na MaeIA (stagger 150ms)"
```

---

## Task 7: Momento com Deus — backdrop blur + scale entry

**Files:**
- Modify: `src/components/home/MomentoDeusScreen.tsx`

Mudar a entrada de `y: '100%'→0` para `scale: 0.92→1 + opacity: 0→1`. Adicionar overlay de backdrop blur.

- [ ] **Step 1: Abrir o arquivo e localizar o AnimatePresence**

Em `src/components/home/MomentoDeusScreen.tsx`, localizar o `<AnimatePresence>` na linha ~26. O bloco atual tem:

```tsx
<AnimatePresence>
  {open && (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex flex-col"
      ...
    >
```

- [ ] **Step 2: Substituir por backdrop blur + scale**

Substituir o bloco `{open && ( <motion.div ... > ... </motion.div> )}` por:

```tsx
{open && (
  <>
    {/* Backdrop blur */}
    <motion.div
      key="momento-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed inset-0 z-40"
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: 'rgba(245,237,224,0.3)',
      }}
    />

    {/* Momento card */}
    <motion.div
      key="momento-card"
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.92, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 1 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: `linear-gradient(160deg, ${config.gradientFrom}, ${config.gradientTo})` }}
      role="dialog"
      aria-modal="true"
      aria-label="Momento com Deus"
    >
      {/* ...todo o conteúdo interno permanece igual... */}
    </motion.div>
  </>
)}
```

**Importante:** o conteúdo interno do `motion.div` (botão fechar, verso, oração, etc.) não muda — apenas o wrapper externo.

- [ ] **Step 3: Verificar no browser**

`npm run dev` → Hoje → tocar em "Momento com Deus". Verificar:
- App fica desfocado por baixo (blur visível)
- Card aparece com scale suave (não com slide de baixo)
- Fechar: blur some e card encolhe

- [ ] **Step 4: Commit**

```bash
git add src/components/home/MomentoDeusScreen.tsx
git commit -m "feat(motion): Momento com Deus — backdrop blur + scale entry"
```

---

## Task 8: PostDetailScreen — slide de entrada com useAnimate

**Files:**
- Modify: `src/components/post/PostDetailScreen.tsx`

Adicionar slide de entrada (direita → centro) e saída (centro → direita) de forma self-contained, sem modificar os callers.

- [ ] **Step 1: Adicionar useAnimate ao import**

Em `src/components/post/PostDetailScreen.tsx`:

```tsx
import { motion, AnimatePresence, useAnimate } from 'framer-motion'
```

- [ ] **Step 2: Adicionar scope e handleBack**

Dentro do componente `PostDetailScreen`, após as declarações de estado existentes:

```tsx
const [scope, animate] = useAnimate()

async function handleBack() {
  await animate(scope.current, { x: '100%' }, { duration: 0.22, ease: [0.4, 0, 0.2, 1] })
  onBack()
}
```

- [ ] **Step 3: Adicionar ref e animação de entrada ao root div**

O root `div` do componente (linha ~149) já tem className. Transformar em `motion.div` e adicionar `ref={scope}`:

```tsx
<motion.div
  ref={scope}
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
  className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden relative"
>
```

- [ ] **Step 4: Substituir todas as chamadas de `onBack` por `handleBack`**

Procurar `onClick={onBack}` no arquivo. Há um botão Voltar no header (linha ~153) e possivelmente outros. Substituir por `onClick={handleBack}`.

**Atenção:** quando o componente renderiza recursivamente (`<PostDetailScreen onBack={() => setViewingOriginalId(null)} />`), o `onBack` interno também precisa do comportamento animado — mas como ele é outro `PostDetailScreen`, já terá seu próprio `handleBack`. Não é necessário mudar nada nesse caso.

- [ ] **Step 5: Verificar no browser**

Feed → tocar num post → PostDetailScreen desliza da direita → tocar Voltar → desliza de volta para a direita.

- [ ] **Step 6: Commit**

```bash
git add src/components/post/PostDetailScreen.tsx
git commit -m "feat(motion): PostDetailScreen — slide de entrada/saída da direita"
```

---

## Task 9: AppHeader — tab title com fade + bolinhas de paginação

**Files:**
- Modify: `src/components/layout/AppHeader.tsx`

Substituir o título fixo "Mother's Team" por um título que muda por aba (com fade) e 4 bolinhas de paginação.

- [ ] **Step 1: Reescrever AppHeader**

Substituir o conteúdo completo de `src/components/layout/AppHeader.tsx`:

```tsx
import { Menu } from 'lucide-react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import type { TabId } from '../../types';

const BOTTOM_TABS: TabId[] = ['hoje', 'jornada', 'comunidade', 'perfil'];

const TAB_LABELS: Record<string, string> = {
  hoje:       'Hoje',
  jornada:    'Jornada',
  comunidade: 'Comunidade',
  perfil:     'Perfil',
  maeIA:      'MãeIA',
  shopping:   'Shopping',
};

interface AppHeaderProps {
  onOpenDrawer: () => void;
  rightSlot?: ReactNode;
}

export function AppHeader({ onOpenDrawer, rightSlot }: AppHeaderProps) {
  const activeTab = useAppStore((s) => s.activeTab);
  const tabIndex = BOTTOM_TABS.indexOf(activeTab as TabId);

  return (
    <div className="flex flex-col flex-shrink-0 bg-gradient-to-r from-[#F5EDE0] to-[#EAD8C8] border-b border-white/30">
      <div className="flex items-center h-14 px-4">
        <button
          onClick={onOpenDrawer}
          aria-label="Abrir menu"
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
        >
          <Menu size={22} className="text-graphite" strokeWidth={1.8} />
        </button>

        <div className="flex-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-base font-semibold font-serif text-graphite tracking-wide"
            >
              {TAB_LABELS[activeTab] ?? "Mother's Team"}
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1 min-w-[36px] justify-end">
          {rightSlot}
        </div>
      </div>

      {/* Bolinhas de paginação — só para as 4 abas principais */}
      {tabIndex >= 0 && (
        <div className="flex items-center justify-center gap-1.5 pb-1.5">
          {BOTTOM_TABS.map((tab, i) => (
            <motion.div
              key={tab}
              animate={{
                scale: i === tabIndex ? 1.3 : 1,
                backgroundColor: i === tabIndex ? '#C9A96E' : '#D9C4AF',
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="w-1.5 h-1.5 rounded-full"
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar que os testes existentes do AppHeader passam**

```bash
npx vitest run src/components/layout/AppHeader.test.tsx
```

Se algum teste esperar "Mother's Team" no header, atualizar o teste para esperar o label da aba ativa, ou mockar `useAppStore` corretamente.

- [ ] **Step 3: Verificar no browser**

`npm run dev` → trocar de aba → ver o título trocar com fade e as bolinhas se mover.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/AppHeader.tsx
git commit -m "feat(motion): AppHeader — tab title fade + bolinhas de paginação"
```

---

## Task 10: MobileShell — tab content slide direcional

**Files:**
- Modify: `src/components/layout/MobileShell.tsx`

Adicionar slide direcional ao conteúdo das abas. A direção (esquerda/direita) depende do índice da nova aba vs aba anterior.

- [ ] **Step 1: Atualizar MobileShell para rastrear direção do slide**

Substituir o conteúdo de `src/components/layout/MobileShell.tsx`:

```tsx
import { useRef } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomTabBar } from './BottomTabBar';
import { AppHeader } from './AppHeader';
import { SideDrawer } from './SideDrawer';
import { useAppStore } from '../../store/useAppStore';

const TAB_ORDER = ['hoje', 'jornada', 'comunidade', 'perfil'];

interface MobileShellProps {
  children: ReactNode;
  drawerOpen: boolean;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
  onOpenSettings: () => void;
  onOpenSavedVerses: () => void;
  headerRightSlot?: ReactNode;
}

export function MobileShell({
  children,
  drawerOpen,
  onOpenDrawer,
  onCloseDrawer,
  onOpenSettings,
  onOpenSavedVerses,
  headerRightSlot,
}: MobileShellProps) {
  const activeTab = useAppStore((s) => s.activeTab);
  const prevTabRef = useRef(activeTab);

  const prevIndex = TAB_ORDER.indexOf(prevTabRef.current);
  const currIndex = TAB_ORDER.indexOf(activeTab);
  const direction = currIndex >= prevIndex ? 1 : -1;
  prevTabRef.current = activeTab;

  return (
    <div className="md:hidden sm:min-h-screen sm:bg-gradient-to-br sm:from-[#EDE6DC] sm:to-[#D4C0A8] sm:flex sm:items-center sm:justify-center">
      <div className="relative w-full h-screen sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:shadow-2xl overflow-hidden flex flex-col sm:rounded-[44px]">
        <div aria-hidden="true" className="hidden sm:block h-11 flex-shrink-0 bg-white/80 backdrop-blur-sm" />
        <AppHeader onOpenDrawer={onOpenDrawer} rightSlot={headerRightSlot} />
        <main aria-label="Conteúdo principal" className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={activeTab}
              custom={direction}
              variants={{
                enter: (dir: number) => ({ x: `${dir * 40}px`, opacity: 0.6 }),
                center: { x: 0, opacity: 1 },
                exit: (dir: number) => ({ x: `${-dir * 20}px`, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="absolute inset-0 overflow-y-auto overflow-x-hidden scrollbar-hide"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        <BottomTabBar />
        <SideDrawer
          isOpen={drawerOpen}
          onClose={onCloseDrawer}
          onOpenSettings={onOpenSettings}
          onOpenSavedVerses={onOpenSavedVerses}
        />
      </div>
    </div>
  );
}
```

**Nota:** o `<main>` muda de `overflow-y-auto` para `overflow-hidden relative`, e o scroll passa para o `motion.div` interno com `absolute inset-0 overflow-y-auto`. Isso é necessário para o slide funcionar corretamente (o overflow do pai precisa clip o filho animando).

- [ ] **Step 2: Verificar que os testes existentes passam**

```bash
npx vitest run src/components/layout/MobileShell.test.tsx
npx vitest run src/components/layout/BottomTabBar.test.tsx
```

Se algum teste acessa diretamente o `<main>` ou faz assertions sobre scroll, pode precisar de ajuste.

- [ ] **Step 3: Verificar no browser**

`npm run dev` → clicar nas abas → ver o conteúdo deslizar da direita (aba maior) ou da esquerda (aba menor). Verificar que o scroll interno de cada tela ainda funciona.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/MobileShell.tsx
git commit -m "feat(motion): tab content slide direcional com AnimatePresence"
```

---

## Task 11: Deploy

- [ ] **Step 1: Build e verificar sem erros**

```bash
npm run build
```

Expected: sem erros de TypeScript ou build.

- [ ] **Step 2: Deploy no VPS**

```bash
npm run build
```

Copiar o `dist/` para o VPS (via SSH na porta 443):

```bash
scp -P 443 -r dist/* root@2.25.137.78:/var/www/mothersteam/
```

- [ ] **Step 3: Verificar no browser mobile**

Abrir a URL do app no celular e testar:
- Pull-to-refresh (precisa de touch real)
- Curtir post (bounce)
- Trocar abas (slide)
- Abrir Momento com Deus (blur)
- Abrir um post (slide da direita)

---

## Self-Review

**Spec coverage:**
- ✅ Post slide (Task 8)
- ✅ Tab slide + header fade + dots (Tasks 9–10)
- ✅ Pull-to-refresh SVG flor (Tasks 1–3)
- ✅ Heart micro-bounce + partícula (Tasks 4–5)
- ✅ Sara frase a frase (Task 6)
- ✅ Momento com Deus blur (Task 7)

**Tipo consistency:**
- `SaraPullIndicator` props: `{ pullY: number, isLoading: boolean }` — consistente em Tasks 2 e 3
- `usePullToRefresh` retorna `{ isPulling, pullY, isLoading }` — consistente em Tasks 1 e 3
- `Message.isNew?: boolean` — consistente em Tasks 6
- `handleBack` no PostDetailScreen — substitui `onBack` apenas onde há botão no próprio componente, não afeta props externas

**Nenhuma placeholder ou "TBD" encontrada.**
