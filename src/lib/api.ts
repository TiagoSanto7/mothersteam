import { useAppStore } from '../store/useAppStore'

const BASE = '/api'

export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API ${status}`)
  }
}

let refreshPromise: Promise<string | null> | null = null

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
    if (!res.ok) return null
    const { accessToken } = (await res.json()) as { accessToken: string }
    useAppStore.getState().setAccessToken(accessToken)
    return accessToken
  } catch {
    return null
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAppStore.getState().accessToken
  const headers: Record<string, string> = {
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' })

  if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
    if (!refreshPromise) refreshPromise = doRefresh()
    const newToken = await refreshPromise
    refreshPromise = null

    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      const retry = await fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' })
      if (!retry.ok) throw new ApiError(retry.status, await retry.json().catch(() => ({})))
      if (retry.status === 204) return undefined as T
      return retry.json() as T
    }

    useAppStore.getState().clearAuth()
    throw new ApiError(401, { message: 'Session expired' })
  }

  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})))
  if (res.status === 204) return undefined as T
  return res.json() as T
}
