import { useAppStore } from '../store/useAppStore'

// Em dev: VITE_API_URL undefined → BASE = '/api', batendo no Vite proxy que
// redireciona pra localhost:3001 (strippa o /api antes).
// Em produção (APK/web deploy): VITE_API_URL = 'https://api.santoti.com' → BASE
// vira essa URL absoluta e o backend responde direto (nginx cuida do reverse
// proxy). Não usa /api porque não tem proxy nesse caminho.
const API_ORIGIN = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
const BASE = API_ORIGIN ?? '/api'

/** Monta a URL absoluta de uma rota do backend (respeita VITE_API_URL). */
export function resolveApiUrl(path: string): string {
  return `${BASE}${path}`
}

/**
 * Resolve URLs de mídia (imagens de post, uploads etc.) — o backend retorna
 * paths relativos tipo `/uploads/xyz.png`. Em dev o Vite proxy resolve; em
 * produção precisamos prefixar com o origin da API.
 */
export function resolveMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (/^(https?|data|blob):/i.test(path)) return path // já absoluta ou inline
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
  const storedRefreshToken = useAppStore.getState().refreshToken
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      ...(storedRefreshToken ? {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      } : {}),
    })
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
    // Only set JSON content-type for non-FormData bodies (FormData needs the
    // browser to set the multipart boundary automatically).
    ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
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

/**
 * Faz POST e consome a resposta como SSE stream.
 * Chama onChunk para cada token recebido, onDone quando termina, onError em falha.
 */
export async function apiStream(
  path: string,
  body: unknown,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = useAppStore.getState().accessToken
  if (token) headers['Authorization'] = `Bearer ${token}`

  async function doFetch(): Promise<Response | null> {
    try {
      return await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
      })
    } catch {
      return null
    }
  }

  let res = await doFetch()
  if (!res) {
    onError('Sem conexão. Verifique sua internet e tente novamente.')
    return
  }

  // 401: mirror the refresh-and-retry logic from apiFetch
  if (res.status === 401) {
    if (!refreshPromise) refreshPromise = doRefresh()
    const newToken = await refreshPromise
    refreshPromise = null
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      res = (await doFetch()) ?? res
    } else {
      useAppStore.getState().clearAuth()
      onError('Sua sessão expirou. Faça login novamente.')
      return
    }
  }

  if (!res.ok || !res.body) {
    onError('Erro ao conectar com a Sara. Tente novamente.')
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      // Accumulate across reads — SSE frames can split across TCP chunks
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') {
          onDone()
          return
        }
        try {
          const parsed = JSON.parse(data) as { text?: string; error?: string }
          if (parsed.error) {
            onError(parsed.error)
            return
          }
          if (parsed.text) onChunk(parsed.text)
        } catch {
          // incomplete frame — will be completed in next read
        }
      }
    }
  } catch {
    // mid-stream network drop
    onError('Erro ao conectar com a Sara. Tente novamente.')
    return
  } finally {
    reader.releaseLock()
  }

  onDone()
}
