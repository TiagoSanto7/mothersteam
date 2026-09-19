import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
  resolveApiUrl: (p: string) => `https://api.test${p}`,
  resolveMediaUrl: (u: string) => u,
  uploadImage: vi.fn(),
  BASE: 'https://api.test',
  ApiError: class ApiError extends Error {
    constructor(public status: number, public body: unknown) { super(`API ${status}`) }
  },
}))

const mockUser = {
  id: 'u1', name: 'Ana', email: 'ana@test.com', username: null,
  pregnancyStage: 'pregnant' as const, onboardingDone: true,
  motherBirthDate: null, babyBirthDate: null, expectedBirthDate: null,
}

describe('refreshToken persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('stores refreshToken via setAuth and persists to localStorage', async () => {
    const { useAppStore } = await import('./useAppStore')
    useAppStore.getState().setAuth('access-123', mockUser, 'refresh-abc')

    expect(useAppStore.getState().refreshToken).toBe('refresh-abc')

    const stored = JSON.parse(localStorage.getItem('mothers-team-v3') ?? '{}')
    expect(stored.state?.refreshToken).toBe('refresh-abc')
  })

  it('setTokens replaces both tokens and persists the rotated refreshToken', async () => {
    const { useAppStore } = await import('./useAppStore')
    useAppStore.setState({ refreshToken: 'refresh-old', accessToken: 'access-old' } as never)

    useAppStore.getState().setTokens('access-new', 'refresh-new')

    expect(useAppStore.getState().accessToken).toBe('access-new')
    expect(useAppStore.getState().refreshToken).toBe('refresh-new')
    const stored = JSON.parse(localStorage.getItem('mothers-team-v3') ?? '{}')
    expect(stored.state?.refreshToken).toBe('refresh-new')
  })

  it('setTokens keeps the stored refreshToken when the response has none', async () => {
    const { useAppStore } = await import('./useAppStore')
    useAppStore.setState({ refreshToken: 'refresh-abc', accessToken: null } as never)

    useAppStore.getState().setTokens('access-new')

    expect(useAppStore.getState().accessToken).toBe('access-new')
    expect(useAppStore.getState().refreshToken).toBe('refresh-abc')
  })

  it('clears refreshToken on clearAuth', async () => {
    const { useAppStore } = await import('./useAppStore')
    useAppStore.setState({ refreshToken: 'refresh-abc', accessToken: 'access-123', isLoggedIn: true } as never)

    useAppStore.getState().clearAuth()

    expect(useAppStore.getState().refreshToken).toBeNull()
  })
})
