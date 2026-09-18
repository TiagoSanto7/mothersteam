import { describe, it, expect, afterEach, vi } from 'vitest'

describe('resolveStaticUrl (TIA-49)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('returns the relative path as-is when VITE_API_URL is unset (dev/web)', async () => {
    vi.stubEnv('VITE_API_URL', '')
    vi.resetModules()
    const { resolveStaticUrl } = await import('./api')
    expect(resolveStaticUrl('/termos.html')).toBe('/termos.html')
  })

  it('prefixes with the API origin when VITE_API_URL is set, so it resolves to a different origin than the app WebView (native)', async () => {
    vi.stubEnv('VITE_API_URL', 'https://srv1944647.hstgr.cloud/')
    vi.resetModules()
    const { resolveStaticUrl } = await import('./api')
    expect(resolveStaticUrl('/termos.html')).toBe('https://srv1944647.hstgr.cloud/termos.html')
  })
})
