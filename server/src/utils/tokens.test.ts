import { describe, it, expect, beforeAll } from 'vitest'
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from './tokens'

beforeAll(() => {
  process.env.JWT_SECRET = 'test-access-secret-min-32-characters-here'
  process.env.REFRESH_SECRET = 'test-refresh-secret-min-32-characters-here'
})

describe('signAccessToken / verifyAccessToken', () => {
  it('returns a string', () => {
    expect(typeof signAccessToken('user-1')).toBe('string')
  })

  it('verifies a valid token and returns userId', () => {
    const token = signAccessToken('user-1')
    const payload = verifyAccessToken(token)
    expect(payload.userId).toBe('user-1')
  })

  it('throws on invalid access token', () => {
    expect(() => verifyAccessToken('bad.token.here')).toThrow()
  })

  it('throws when verified with wrong secret (tampered)', () => {
    const token = signRefreshToken('user-1')
    expect(() => verifyAccessToken(token)).toThrow()
  })
})

describe('signRefreshToken / verifyRefreshToken', () => {
  it('returns a string', () => {
    expect(typeof signRefreshToken('user-1')).toBe('string')
  })

  it('verifies a valid refresh token and returns userId', () => {
    const token = signRefreshToken('user-1')
    const payload = verifyRefreshToken(token)
    expect(payload.userId).toBe('user-1')
  })

  it('throws on invalid refresh token', () => {
    expect(() => verifyRefreshToken('bad.token.here')).toThrow()
  })
})
