# Mothers Team — regras do repositório

## Zustand — selectors devem ser reference-stable

O `useAppStore` usa `useSyncExternalStore` internamente. React 18 exige que o snapshot retornado seja referencialmente estável — se o selector retorna nova referência a cada leitura, React lança **error #185 (Maximum update depth exceeded)** e o app crasha.

**Regra 1 — nunca compute derivados dentro do selector.**

```ts
// ❌ ERRADO — cria novo array em cada render
const verses = useAppStore((s) => [...s.userVerses, ...s.legacyVerses])
const filtered = useAppStore((s) => s.posts.filter((p) => p.liked))
const merged = useAppStore((s) => ({ ...s.a, ...s.b }))

// ✅ CERTO — leitura direta de um slot
const verses = useAppStore((s) => s.userVerses)
```

Se precisar de derivado, compute na hora do **write** (dentro da action do store) e guarde o resultado como campo próprio do state. O read fica trivial.

**Regra 2 — nunca `useAppStore()` sem selector.**

```ts
// ❌ ERRADO — subscribe ao state INTEIRO; qualquer mudança re-renderiza
const { activeTab, setActiveTab } = useAppStore()

// ✅ CERTO — subscribe só ao que o componente usa
const activeTab = useAppStore((s) => s.activeTab)
const setActiveTab = useAppStore((s) => s.setActiveTab)
```

Um componente que subscreve o state inteiro re-renderiza em cascata a cada write do store, amplificando qualquer outro bug de render loop.

**Regra 3 — fallbacks devem ser constantes de módulo, não literais.**

```ts
// ❌ ERRADO — [] literal cria novo array em cada leitura
const items = useAppStore((s) => s.items ?? [])

// ✅ CERTO — const de módulo, mesma referência sempre
const EMPTY_ITEMS: Item[] = []
const items = useAppStore((s) => s.items ?? EMPTY_ITEMS)
```

## Deploy do frontend

Backend em `api.santoti.com` (VPS Hostinger, SSH na porta **443** — sempre `-p 443` / `-P 443`). Frontend estático servido do path `/var/www/mothersteam/` (sem hífen).

```bash
npm run build
scp -P 443 -r dist/. root@2.25.137.78:/var/www/mothersteam/
```

Estrutura completa do VPS documentada em `~/.claude/.../memory/project-vps-deploy-2026-07-23.md`.

## Android (Capacitor)

Após rebuild do frontend, rodar `npx cap sync android` para copiar os assets pro projeto Android. Não precisa reabrir o Android Studio — o Run subsequente já pega os novos arquivos.
