import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useReceptionState } from './useReceptionState'

describe('useReceptionState', () => {
  it('starts on bem-vinda', () => {
    const { result } = renderHook(() => useReceptionState())
    expect(result.current.beat).toBe('bem-vinda')
  })

  it('advances through all beats in order', () => {
    const { result } = renderHook(() => useReceptionState())
    const rest = [
      'sara-aparece',
      'sara-boas-vindas',
      'preparando-tudo',
      'presente',
      'done',
    ] as const
    for (const expected of rest) {
      act(() => result.current.advance())
      expect(result.current.beat).toBe(expected)
    }
  })

  it('does not advance past done', () => {
    const { result } = renderHook(() => useReceptionState())
    for (let i = 0; i < 20; i++) act(() => result.current.advance())
    expect(result.current.beat).toBe('done')
  })
})
