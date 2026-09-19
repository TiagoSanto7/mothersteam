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

## Servidor de produção e deploy

Produção é a VPS dos donos do produto: **`https://srv1944647.hstgr.cloud`** (é o `VITE_API_URL` do `.env.production`). `api.santoti.com` (e o IP `2.25.137.78` / `srv1708006.hstgr.cloud`) era a VPS pessoal do Tiago no começo do projeto — **não usar**.

O deploy é **automático**: todo push na `main` (inclusive merge de PR) roda `.github/workflows/deploy-vps-donos.yml`, que atualiza o backend (git pull + rebuild do container `api` em `/opt/mothersteam`) e publica o frontend web em `/var/www/mothersteam/`. Host, usuário e chave ficam nos secrets do GitHub. Conferir o resultado na aba **Actions**.

- Merge na `main` = deploy em produção. Mudança de servidor sem migração é segura; migração de banco não é aplicada pelo workflow (passo manual, combinar com o Tiago).
- O deploy publica **só web e servidor**. iOS e Android levam o código web dentro do app: a mudança só chega às usuárias com novo build nas lojas.

## Apps nativos (Capacitor)

Após rebuild do frontend (`npm run build`), rodar `npx cap sync ios` e/ou `npx cap sync android` para copiar os assets para os projetos nativos. Não precisa reabrir o Xcode/Android Studio — o Run seguinte já pega os novos arquivos.

- O build do app usa o `.env.production`, então o app no simulador/aparelho fala com a **produção**. Testar com conta de teste.
- iOS: o projeto adota o ciclo de vida UIScene (`SceneDelegate.swift`), obrigatório para compilar com o SDK do iOS 27 (TIA-70). Não voltar para janela no `AppDelegate`.
- O cookie `refresh_token` não chega ao servidor no app nativo (origem `https://localhost`, `sameSite: 'strict'`); lá a sessão depende do refresh token salvo na store. Toda resposta de `/auth/refresh` deve passar por `setTokens` (TIA-67). Teste de sessão no simulador: entrar → fechar o app → abrir → fechar → abrir.

## Testes

```bash
npm test
```

No Node 26+, o `localStorage` embutido do Node se sobrepõe ao do jsdom; `src/setupTests.ts` recoloca o storage do jsdom, então não precisa de flag. Se aparecer `Cannot read properties of undefined (reading 'clear')` em teste que usa storage, é esse conflito.
