import { useAppStore } from '../store/useAppStore'

// Em dev: VITE_API_URL undefined → BASE = '/api', batendo no Vite proxy que
// redireciona pra localhost:3001 (strippa o /api antes).
// Em produção (APK/web deploy): VITE_API_URL = 'https://api.santoti.com' → BASE
// vira essa URL absoluta e o backend responde direto (nginx cuida do reverse
// proxy). Não usa /api porque não tem proxy nesse caminho.
const API_ORIGIN = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
const BASE = API_ORIGIN ?? '/api'

/**
 * Resolve URLs de mídia (imagens de post, uploads etc.) — o backend retorna
 * paths relativos tipo `/uploads/xyz.png`. Em dev o Vite proxy resolve; em
 * produção precisamos prefixar com o origin da API.
 */
export function resolveMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//i.test(path)) return path // já absoluta
  if (!API_ORIGIN) return path // dev: Vite proxy cuida
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}

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

export async function uploadImage(file: File, accessToken: string | null): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const headers: HeadersInit = {}
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const res = await fetch(`${BASE}/uploads`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Upload failed: ${text}`)
  }

  const data = (await res.json()) as { url: string }
  return data.url
}
