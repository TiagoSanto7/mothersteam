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

import { apiFetch } from '../lib/api'
const mockFetch = apiFetch as ReturnType<typeof vi.fn>

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

  it('uses stored refreshToken in body when calling refreshAccessToken', async () => {
    const { useAppStore } = await import('./useAppStore')
    useAppStore.setState({ refreshToken: 'refresh-abc', accessToken: null } as never)

    mockFetch.mockResolvedValueOnce({ accessToken: 'new-access-456' })

    await useAppStore.getState().refreshAccessToken()

    expect(mockFetch).toHaveBeenCalledWith('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: 'refresh-abc' }),
    })
    expect(useAppStore.getState().accessToken).toBe('new-access-456')
  })

  it('clears refreshToken on clearAuth', async () => {
    const { useAppStore } = await import('./useAppStore')
    useAppStore.setState({ refreshToken: 'refresh-abc', accessToken: 'access-123', isLoggedIn: true } as never)

    useAppStore.getState().clearAuth()

    expect(useAppStore.getState().refreshToken).toBeNull()
  })
})
