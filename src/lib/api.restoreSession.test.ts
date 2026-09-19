import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

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

describe('restoreSession', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('succeeds on first try when refresh + /auth/me both work', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.toString().includes('/auth/refresh')) return jsonResponse(200, { accessToken: 'access-1', refreshToken: 'refresh-1' })
      if (url.toString().includes('/auth/me')) return jsonResponse(200, mockUser)
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { restoreSession } = await import('./api')
    const result = await restoreSession()

    expect(result).toEqual({ ok: true, accessToken: 'access-1', user: mockUser })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('persists the rotated refresh token returned by /auth/refresh (TIA-67)', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url.toString().includes('/auth/refresh')) return jsonResponse(200, { accessToken: 'access-1', refreshToken: 'refresh-rotated' })
      if (url.toString().includes('/auth/me')) return jsonResponse(200, mockUser)
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { useAppStore } = await import('../store/useAppStore')
    useAppStore.setState({ refreshToken: 'refresh-old' } as never)
    const { restoreSession } = await import('./api')
    await restoreSession()

    const refreshBody = JSON.parse(fetchMock.mock.calls[0][1]!.body as string)
    expect(refreshBody).toEqual({ refreshToken: 'refresh-old' })
    expect(useAppStore.getState().refreshToken).toBe('refresh-rotated')
    const stored = JSON.parse(localStorage.getItem('mothers-team-v3') ?? '{}')
    expect(stored.state?.refreshToken).toBe('refresh-rotated')
  })

  it('gives up immediately on a definitive 401 — no retry', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(401, { error: 'Invalid refresh token' }))
    vi.stubGlobal('fetch', fetchMock)

    const { restoreSession } = await import('./api')
    const result = await restoreSession()

    expect(result).toEqual({ ok: false, reason: 'definitive' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries once after a network error, then succeeds', async () => {
    vi.useFakeTimers()
    let refreshCalls = 0
    const fetchMock = vi.fn(async (url: string) => {
      if (url.toString().includes('/auth/refresh')) {
        refreshCalls++
        if (refreshCalls === 1) throw new TypeError('Failed to fetch')
        return jsonResponse(200, { accessToken: 'access-2' })
      }
      if (url.toString().includes('/auth/me')) return jsonResponse(200, mockUser)
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { restoreSession } = await import('./api')
    const promise = restoreSession()
    await vi.advanceTimersByTimeAsync(2000)
    const result = await promise

    expect(result).toEqual({ ok: true, accessToken: 'access-2', user: mockUser })
    expect(refreshCalls).toBe(2)
  })

  it('retries once after a 5xx, then succeeds', async () => {
    vi.useFakeTimers()
    let refreshCalls = 0
    const fetchMock = vi.fn(async (url: string) => {
      if (url.toString().includes('/auth/refresh')) {
        refreshCalls++
        if (refreshCalls === 1) return jsonResponse(500, { error: 'internal' })
        return jsonResponse(200, { accessToken: 'access-3' })
      }
      if (url.toString().includes('/auth/me')) return jsonResponse(200, mockUser)
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { restoreSession } = await import('./api')
    const promise = restoreSession()
    await vi.advanceTimersByTimeAsync(2000)
    const result = await promise

    expect(result).toEqual({ ok: true, accessToken: 'access-3', user: mockUser })
    expect(refreshCalls).toBe(2)
  })

  it('reports transient failure after exhausting the retry on repeated network errors', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    vi.stubGlobal('fetch', fetchMock)

    const { restoreSession } = await import('./api')
    const promise = restoreSession()
    await vi.advanceTimersByTimeAsync(2000)
    const result = await promise

    expect(result).toEqual({ ok: false, reason: 'transient' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('retries /auth/me once after a transient failure, then succeeds', async () => {
    vi.useFakeTimers()
    let meCalls = 0
    const fetchMock = vi.fn(async (url: string) => {
      if (url.toString().includes('/auth/refresh')) return jsonResponse(200, { accessToken: 'access-5' })
      if (url.toString().includes('/auth/me')) {
        meCalls++
        if (meCalls === 1) throw new TypeError('Failed to fetch')
        return jsonResponse(200, mockUser)
      }
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { restoreSession } = await import('./api')
    const promise = restoreSession()
    await vi.advanceTimersByTimeAsync(2000)
    const result = await promise

    expect(result).toEqual({ ok: true, accessToken: 'access-5', user: mockUser })
    expect(meCalls).toBe(2)
  })

  it('clears the access token but keeps the rotated refresh token when /auth/me fails after exhausting its retry', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(async (url: string) => {
      if (url.toString().includes('/auth/refresh')) return jsonResponse(200, { accessToken: 'access-6', refreshToken: 'refresh-6' })
      if (url.toString().includes('/auth/me')) throw new TypeError('Failed to fetch')
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { restoreSession } = await import('./api')
    const { useAppStore } = await import('../store/useAppStore')
    const promise = restoreSession()
    await vi.advanceTimersByTimeAsync(2000)
    const result = await promise

    expect(result).toEqual({ ok: false, reason: 'transient' })
    expect(useAppStore.getState().accessToken).toBeNull()
    // A rotação já commitou no servidor — o token novo precisa sobreviver pra próxima abertura.
    expect(useAppStore.getState().refreshToken).toBe('refresh-6')
  })

  it('does not fire a second POST /auth/refresh for concurrent restoreSession calls', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.toString().includes('/auth/refresh')) return jsonResponse(200, { accessToken: 'access-4' })
      if (url.toString().includes('/auth/me')) return jsonResponse(200, mockUser)
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { restoreSession } = await import('./api')
    const [r1, r2] = await Promise.all([restoreSession(), restoreSession()])

    const refreshCalls = fetchMock.mock.calls.filter(([url]) => url.toString().includes('/auth/refresh')).length
    expect(refreshCalls).toBe(1)
    expect(r1).toEqual({ ok: true, accessToken: 'access-4', user: mockUser })
    expect(r2).toEqual(r1)
  })
})
