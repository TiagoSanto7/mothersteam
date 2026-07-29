# Motion Upgrade — Design Spec
> 2026-07-28

## Contexto

O app já tem Framer Motion v12 instalado. Este spec cobre 6 melhorias de animação e navegação definidas a partir do documento `docs/motion-language-2026-07-27.md`. Todas as decisões de abordagem foram validadas com o usuário.

---

## 1. Abertura de Post — Slide de Tela Completa

**Componente afetado:** ponto de renderização do `PostDetailScreen` no `App.tsx` (e qualquer outro lugar que condiciona a exibição do PostDetailScreen).

**Comportamento:**
- `PostDetailScreen` é envolvido em `<AnimatePresence>` + `<motion.div>`
- Entrada: `x: '100%' → 0` (slide da direita)
- Saída: `x: '100%'` (volta pela direita, acionada pelo botão Voltar)
- Durante a transição, a tela anterior fica visível por baixo

**Parâmetros de animação:**
- `transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] }` (ritmo funcional)
- Sem fade — movimento puro

**Arquitetura:** Não altera a estrutura do `PostDetailScreen`. Só adiciona o wrapper animado no ponto de renderização condicional.

---

## 2. Transição Entre Abas — Slide Direcional + Bolinhas

**Componentes afetados:** `MobileShell.tsx`, `AppHeader.tsx`, `BottomTabBar.tsx`

**Slide de conteúdo:**
- `AnimatePresence mode="popLayout"` com `key={activeTab}` em volta do `<main>`
- Direção determinada pelo índice da aba: nova aba com índice maior → slide da direita; índice menor → slide da esquerda
- Entrada: `x: ±40px → 0`, `opacity: 0.6 → 1`
- Saída: `x: ∓20px`, `opacity: 0`
- `transition`: spring `{ stiffness: 400, damping: 28 }` (ritmo social, 220ms aprox.)

**Header fade independente:**
- O título da aba no `AppHeader` troca com `AnimatePresence` usando `key={activeTab}`
- Apenas o texto: `opacity: 0 → 1`, duração 150ms, sem mover o header
- O header em si permanece fixo — só o conteúdo textual anima

**Bolinhas de paginação:**
- 4 pontos adicionados no `AppHeader`, ao lado do título (ou centrados abaixo)
- Aba ativa: `background: #C9A96E`, `scale: 1.3`
- Abas inativas: `background: #D9C4AF`, `scale: 1`
- Troca com spring rápido (stiffness 500, damping 30)

**Ordem das abas** (para cálculo de direção): `['hoje', 'jornada', 'comunidade', 'perfil']`

---

## 3. Pull-to-Refresh com SVG Flor

**Componente novo:** `SaraPullIndicator`

**Props:**
```ts
interface SaraPullIndicatorProps {
  pullY: number    // 0–80 (vem do usePullToRefresh)
  isLoading: boolean
}
```

**Comportamento visual:**
- SVG de flor com 6 pétalas e miolo central
- Cada pétala tem threshold de aparecimento: pétala N aparece quando `pullY >= (N/6) * 80`
- `scale` de cada pétala: `0 → 1` conforme `pullY` cresce além do seu threshold
- Ao soltar (`isLoading: true`): todas as pétalas spring para `scale: 1` + rotação 360° contínua suave (pulse)
- Frase `"Deixa eu ver se apareceu alguma novidade..."` aparece com fade quando `pullY > 40`
- Ao terminar (`isLoading: false → true → false`): flor encolhe com `scale: 0` + `opacity: 0`

**Cores:** pétalas em `#E8A090` (terracota suave), miolo em `#C9A96E` (dourado Sara)

**Integração:** substituir o spinner atual nas 4 telas que usam `usePullToRefresh`: `NotificationsScreen`, `ComunidadeScreen`, `ChatListScreen`, `ProfileScreen`. O `pullY` já é exposto pelo hook em todas elas.

---

## 4. ❤️ Micro-Bounce no Curtir

**Componentes afetados:** `PostCard.tsx` (cards no feed) e `PostDetailScreen.tsx`

**Comportamento:**
- O botão Heart vira `motion.button`
- Ao `liked` mudar para `true`: keyframes `scale: [1, 1.4, 0.9, 1.15, 1]` em 400ms
- Ao `liked` mudar para `false`: keyframes `scale: [1, 0.85, 1]` em 200ms
- Partícula "+1": `motion.span` absoluto acima do ícone, `opacity: [0, 1, 0]`, `y: [0, -20]`, duração 600ms, aparece só ao curtir (não ao descurtir)

**Implementação:** usar `useAnimation` ou `animate` diretamente via `whileTap` + `variants` em Framer Motion.

---

## 5. Sara Frase a Frase (MaeIA)

**Componente afetado:** `MaeIAScreen.tsx` — renderização de mensagens `role: 'assistant'`

**Comportamento:**
- Mensagens do assistente são divididas em sentenças: split por `/[.!?]+\s/`
- Cada sentença é um `motion.span` com `display: block`
- `initial: { opacity: 0, y: 4 }`, `animate: { opacity: 1, y: 0 }`
- `transition`: `{ delay: index * 0.15, duration: 0.3, ease: 'easeOut' }`
- Aplica **apenas** a mensagens novas (adicionadas durante a sessão atual), não ao histórico já carregado
- Mensagens `role: 'user'` não animam por sentença — aparecem normalmente com fade simples

**Como distinguir mensagem nova:** flag `isNew: boolean` adicionada ao tipo `Message` local, setada como `true` quando a mensagem é adicionada via `setMessages` e `false` para as mensagens iniciais.

---

## 6. Momento com Deus — Backdrop Blur

**Componentes afetados:** `App.tsx`, `MomentoDeusScreen.tsx`

**Overlay de blur (App.tsx):**
- `div` fixo `inset-0 z-40` com `backdrop-filter: blur(12px)` + `background: rgba(245,237,224,0.3)`
- Controlado por estado `momentoOpen: boolean` no App
- `AnimatePresence` com `opacity: 0 → 1`, duração 300ms, `ease: 'easeOut'`
- Fica entre o conteúdo do app e o `MomentoDeusScreen` (z-index: 40 vs 50)

**Entrada do MomentoDeusScreen:**
- Mudar de `y: '100%' → 0` para `scale: 0.92 → 1` + `opacity: 0 → 1`
- `transition`: spring calmo `{ stiffness: 120, damping: 20, mass: 1 }` (~350ms)
- A tela permanece centralizada (já é `fixed inset-0`)

**Saída:**
- Overlay blur: `opacity: 1 → 0`
- Card: `scale: 1 → 0.92` + `opacity: 1 → 0`
- Ambos saem simultaneamente

---

## Arquivos que vão mudar

| Arquivo | O que muda |
|---|---|
| `src/App.tsx` | Wrapper animado para PostDetailScreen; overlay de blur para MomentoDeusCard |
| `src/components/layout/MobileShell.tsx` | AnimatePresence no `<main>` com slide direcional |
| `src/components/layout/AppHeader.tsx` | Fade no título + bolinhas de paginação |
| `src/components/home/MomentoDeusScreen.tsx` | Entrada scale+opacity em vez de slide Y |
| `src/components/maeIA/MaeIAScreen.tsx` | Frase a frase nas mensagens do assistente |
| `src/components/shared/SaraPullIndicator.tsx` | Componente novo — SVG flor animado |
| `src/components/notifications/NotificationsScreen.tsx` | Usar SaraPullIndicator |
| `src/components/comunidade/ComunidadeScreen.tsx` | Usar SaraPullIndicator |
| `src/components/chat/ChatListScreen.tsx` | Usar SaraPullIndicator |
| `src/components/profile/ProfileScreen.tsx` | Usar SaraPullIndicator |
| `src/components/post/PostDetailScreen.tsx` | motion.button no Heart + partícula +1 |
| `src/components/comunidade/PostCard.tsx` | motion.button no Heart + partícula +1 |

---

## O que NÃO está no escopo

- Shared element transitions com `layoutId` nos cards de post (decidido usar slide de tela em vez disso)
- Animações nas telas de Jornada, Sara (voz), ou Shopping
- Skeleton loaders ou animações de loading além do pull-to-refresh
