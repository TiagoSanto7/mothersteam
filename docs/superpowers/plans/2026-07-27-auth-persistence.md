# Auth Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manter a sessão do usuário viva ao fechar e reabrir o app (Capacitor/Android), sem depender de cookies HttpOnly que não persistem no WebView.

**Architecture:** O servidor já aceita `refreshToken` no body do `/auth/refresh` (variável `bodyToken`). A correção é: enviar `refreshToken` no body das respostas de login/register, armazená-lo no Zustand persist (localStorage), e enviá-lo no body ao fazer refresh — eliminando a dependência do cookie.

**Tech Stack:** Fastify (backend), Zustand + persist (frontend), Vitest + jsdom (testes)

---

### Task 1: Backend — expor refreshToken no body de login e register

**Files:**
- Modify: `server/src/routes/auth.ts`

- [ ] **Step 1: Entender o contrato atual**

Abrir `server/src/routes/auth.ts`. Confirmar que `/login` e `/register` só enviam `{ accessToken, user }` — o `refreshToken` vai apenas no cookie. Confirmar que `/refresh` já aceita `bodyToken`:
```ts
const bodyToken = (request.body as { refreshToken?: string } | null)?.refreshToken
const token = cookieToken ?? bodyToken
```

- [ ] **Step 2: Alterar `/login` para incluir refreshToken no body**

```ts
// server/src/routes/auth.ts — dentro de fastify.post('/login', ...)
const accessToken  = signAccessToken(user.id)
const refreshToken = signRefreshToken(user.id)

const { passwordHash: _, ...safeUser } = user

reply
  .setCookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS) // mantém cookie para web
  .send({ accessToken, refreshToken, user: safeUser })  // +refreshToken no body para APK
```

- [ ] **Step 3: Alterar `/register` para incluir refreshToken no body**

```ts
// server/src/routes/auth.ts — dentro de fastify.post('/register', ...)
const accessToken  = signAccessToken(user.id)
const refreshToken = signRefreshToken(user.id)

reply
  .setCookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS)
  .status(201)
  .send({ accessToken, refreshToken, user })  // +refreshToken no body
```

- [ ] **Step 4: Verificar TypeScript do servidor**

```bash
cd server && npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/auth.ts
git commit -m "feat(auth): include refreshToken in login/register body for Capacitor persistence"
```

---

### Task 2: Frontend — armazenar refreshToken no Zustand e usá-lo no refresh

**Files:**
- Modify: `src/store/useAppStore.ts`
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Escrever o teste que vai falhar**

Criar `src/store/useAppStore.refreshToken.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock de apiFetch para controlar respostas
vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
  resolveApiUrl: (p: string) => `https://api.test${p}`,
  resolveMediaUrl: (u: string) => u,
  uploadImage: vi.fn(),
  BASE: 'https://api.test',
}))

import { apiFetch } from '../lib/api'
const mockFetch = apiFetch as ReturnType<typeof vi.fn>

describe('refreshToken persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('stores refreshToken in localStorage after login', async () => {
    const { useAppStore } = await import('./useAppStore')
    mockFetch.mockResolvedValueOnce({
      accessToken: 'access-123',
      refreshToken: 'refresh-abc',
      user: { id: 'u1', name: 'Ana', email: 'ana@test.com', pregnancyStage: 'pregnant', onboardingDone: true },
    })

    await useAppStore.getState().login('ana@test.com', 'senha123')

    const stored = JSON.parse(localStorage.getItem('mothers-team-store') ?? '{}')
    expect(stored.state?.refreshToken).toBe('refresh-abc')
  })

  it('uses stored refreshToken in body when refreshing', async () => {
    const { useAppStore } = await import('./useAppStore')
    useAppStore.setState({ refreshToken: 'refresh-abc', accessToken: null })

    mockFetch.mockResolvedValueOnce({ accessToken: 'new-access-456' })

    await useAppStore.getState().refreshAccessToken()

    expect(mockFetch).toHaveBeenCalledWith('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: 'refresh-abc' }),
    })
    expect(useAppStore.getState().accessToken).toBe('new-access-456')
  })

  it('clears refreshToken on logout', async () => {
    const { useAppStore } = await import('./useAppStore')
    useAppStore.setState({ refreshToken: 'refresh-abc', accessToken: 'access-123', isLoggedIn: true })

    mockFetch.mockResolvedValueOnce({ ok: true })
    await useAppStore.getState().logout()

    expect(useAppStore.getState().refreshToken).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar o teste para ver falhar**

```bash
npx vitest run src/store/useAppStore.refreshToken.test.ts
```
Expected: FAIL — `refreshToken` não existe no store.

- [ ] **Step 3: Adicionar `refreshToken` ao estado Zustand**

Abrir `src/store/useAppStore.ts`. Localizar a definição de estado e adicionar:

```ts
// No tipo AppState, adicionar:
refreshToken: string | null

// No estado inicial (dentro de create(...)), adicionar:
refreshToken: null,
```

- [ ] **Step 4: Salvar refreshToken no action de login**

No `useAppStore.ts`, dentro do action `login` (que chama `/auth/login`):

```ts
// Onde hoje é: set({ accessToken: data.accessToken, isLoggedIn: true, ... })
// Mudar para:
set({
  accessToken:  data.accessToken,
  refreshToken: data.refreshToken ?? null,
  isLoggedIn:   true,
  // ... demais campos existentes
})
```

Fazer o mesmo para o action de `register` se existir.

- [ ] **Step 5: Adicionar action `refreshAccessToken`**

```ts
refreshAccessToken: async () => {
  const { refreshToken } = get()
  if (!refreshToken) return
  try {
    const data = await apiFetch<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
    set({ accessToken: data.accessToken })
  } catch {
    // token inválido — logout
    get().logout()
  }
},
```

- [ ] **Step 6: Limpar refreshToken no logout**

No action `logout` do `useAppStore.ts`:

```ts
// Adicionar ao set() do logout:
set({ refreshToken: null, accessToken: null, isLoggedIn: false, /* demais campos */ })
```

- [ ] **Step 7: Garantir que `refreshToken` é incluído no persist**

No `useAppStore.ts`, localizar o `partialize` do persist (ou a lista de campos persistidos). Adicionar `refreshToken` à lista:

```ts
partialize: (state) => ({
  // campos já existentes...
  refreshToken: state.refreshToken,
}),
```

- [ ] **Step 8: Rodar o teste para ver passar**

```bash
npx vitest run src/store/useAppStore.refreshToken.test.ts
```
Expected: PASS (3 testes).

- [ ] **Step 9: Commit**

```bash
git add src/store/useAppStore.ts src/store/useAppStore.refreshToken.test.ts
git commit -m "feat(auth): persist refreshToken in Zustand store for Capacitor session survival"
```

---

### Task 3: Frontend — auto-refresh ao iniciar o app

**Files:**
- Modify: `src/lib/api.ts`
- Modify: `src/App.tsx` (ou o componente raiz que inicializa o app)

- [ ] **Step 1: Interceptar 401 em `apiFetch` e tentar refresh automático**

Abrir `src/lib/api.ts`. Localizar a função `apiFetch`. Adicionar lógica de retry após 401:

```ts
// src/lib/api.ts — dentro de apiFetch, após receber resposta
if (res.status === 401) {
  // Evitar loop infinito: não tentar refresh em chamadas de auth
  if (!path.startsWith('/auth/')) {
    const { refreshAccessToken, refreshToken } = (await import('../store/useAppStore')).useAppStore.getState()
    if (refreshToken) {
      await refreshAccessToken()
      const newToken = (await import('../store/useAppStore')).useAppStore.getState().accessToken
      if (newToken) {
        // Repetir a requisição original com o novo token
        const retryRes = await fetch(`${BASE}${path}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${newToken}`,
            ...(options?.headers ?? {}),
          },
          credentials: 'include',
        })
        if (!retryRes.ok) throw new Error(`${retryRes.status}`)
        if (retryRes.status === 204) return undefined as T
        return retryRes.json() as Promise<T>
      }
    }
  }
  throw new Error('401')
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat(auth): auto-retry apiFetch on 401 using stored refreshToken"
```

---

### Task 4: Deploy

- [ ] **Step 1: Build frontend**

```bash
npm run build
```

- [ ] **Step 2: Push e deploy VPS**

```bash
git push origin main
ssh -p 443 root@2.25.137.78 "cd /opt/mothersteam && git pull && docker compose -f deploy/docker-compose.prod.yml build api && docker compose -f deploy/docker-compose.prod.yml up -d api"
scp -P 443 -r dist/. root@2.25.137.78:/var/www/mothersteam/
```

- [ ] **Step 3: Rebuild APK**

```bash
npx cap copy android
cd android && .\gradlew.bat assembleDebug
```
APK em `android/app/build/outputs/apk/debug/app-debug.apk`.

- [ ] **Step 4: Testar**

1. Instalar APK no celular
2. Fazer login
3. Fechar o app completamente
4. Abrir de novo
5. Esperado: já logado, sem pedir login novamente
