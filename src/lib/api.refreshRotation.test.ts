import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Regressão da TIA-67: o servidor rotaciona o refresh token a cada POST /auth/refresh
// (apaga o antigo, devolve um novo). Se o cliente não salvar o novo, a SEGUNDA
// renovação reenvia um token apagado e a sessão cai. Estes testes simulam esse
// servidor e exercitam duas renovações seguidas pelos dois caminhos do cliente.

const mockUser = {
  id: 'u1', name: 'Ana', email: 'ana@test.com', username: null,
  pregnancyStage: 'pregnant' as const, onboardingDone: true,
  motherBirthDate: null, babyBirthDate: null, expectedBirthDate: null,
}

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

/** Servidor fake com rotação: só o refresh token mais recente vale, e só o access token mais recente autentica. */
function createRotatingServer(initialRefreshToken: string) {
  let generation = 0
  let validRefreshToken = initialRefreshToken
  let validAccessToken: string | null = null
  const refreshTokensReceived: string[] = []

  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const path = url.toString()
    if (path.endsWith('/auth/refresh')) {
      const sent = init.body ? (JSON.parse(init.body as string) as { refreshToken?: string }).refreshToken : undefined
      refreshTokensReceived.push(sent ?? '(none)')
      if (sent !== validRefreshToken) return jsonResponse(401, { error: 'Invalid refresh token' })
      generation++
      validRefreshToken = `refresh-${generation}`
      validAccessToken = `access-${generation}`
      return jsonResponse(200, { accessToken: validAccessToken, refreshToken: validRefreshToken })
    }
    const auth = (init.headers as Record<string, string> | undefined)?.Authorization
    if (auth !== `Bearer ${validAccessToken}`) return jsonResponse(401, { error: 'Unauthorized' })
    if (path.endsWith('/auth/me')) return jsonResponse(200, mockUser)
    if (path.endsWith('/data')) return jsonResponse(200, { ok: true })
    throw new Error(`unexpected fetch: ${path}`)
  })

  return {
    fetchMock,
    refreshTokensReceived,
    /** Simula o access token expirando (15 min no servidor real). */
    expireAccessToken: () => { validAccessToken = null },
    get validRefreshToken() { return validRefreshToken },
  }
}

describe('refresh token rotation (TIA-67)', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('restores the session on two consecutive app launches', async () => {
    const server = createRotatingServer('refresh-login')
    vi.stubGlobal('fetch', server.fetchMock)
    const { useAppStore } = await import('../store/useAppStore')
    const { restoreSession } = await import('./api')
    useAppStore.setState({ refreshToken: 'refresh-login' } as never)

    const first = await restoreSession()
    expect(first.ok).toBe(true)

    // Reabrir o app: o access token só vive em memória, o refresh token vem do storage.
    useAppStore.setState({ accessToken: null } as never)
    const second = await restoreSession()

    expect(second.ok).toBe(true)
    expect(server.refreshTokensReceived).toEqual(['refresh-login', 'refresh-1'])
    expect(useAppStore.getState().refreshToken).toBe(server.validRefreshToken)
  })

  it('keeps the session through two access-token expirations while the app is open', async () => {
    const server = createRotatingServer('refresh-login')
    vi.stubGlobal('fetch', server.fetchMock)
    const { useAppStore } = await import('../store/useAppStore')
    const { restoreSession, apiFetch } = await import('./api')
    useAppStore.setState({ refreshToken: 'refresh-login' } as never)

    const restored = await restoreSession()
    if (!restored.ok) throw new Error('restore should succeed')
    useAppStore.getState().setAuth(restored.accessToken, restored.user)

    server.expireAccessToken()
    await expect(apiFetch('/data')).resolves.toEqual({ ok: true })

    server.expireAccessToken()
    await expect(apiFetch('/data')).resolves.toEqual({ ok: true })

    expect(useAppStore.getState().isLoggedIn).toBe(true)
    expect(server.refreshTokensReceived).toEqual(['refresh-login', 'refresh-1', 'refresh-2'])
    expect(useAppStore.getState().refreshToken).toBe(server.validRefreshToken)
  })

  it('logout sends the current refresh token, not the one from login', async () => {
    const server = createRotatingServer('refresh-login')
    vi.stubGlobal('fetch', server.fetchMock)
    const { useAppStore } = await import('../store/useAppStore')
    const { restoreSession } = await import('./api')
    useAppStore.setState({ refreshToken: 'refresh-login' } as never)

    const restored = await restoreSession()
    if (!restored.ok) throw new Error('restore should succeed')
    useAppStore.getState().setAuth(restored.accessToken, restored.user)

    server.fetchMock.mockClear()
    server.fetchMock.mockImplementationOnce(async () => jsonResponse(200, { ok: true }))
    useAppStore.getState().logout()

    const [url, init] = server.fetchMock.mock.calls[0]
    expect(url.toString()).toContain('/auth/logout')
    expect(JSON.parse(init!.body as string)).toEqual({ refreshToken: 'refresh-1' })
  })
})
