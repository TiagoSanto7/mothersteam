import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useReceptionState } from './useReceptionState'

describe('useReceptionState', () => {
  it('starts on bem-vinda with empty otherChildren', () => {
    const { result } = renderHook(() => useReceptionState())
    expect(result.current.beat).toBe('bem-vinda')
    expect(result.current.data.otherChildren).toEqual([])
  })

  it('advances through all beats in order', () => {
    const { result } = renderHook(() => useReceptionState())
    const rest = [
      'sara-aparece',
      'capitulo-1',
      'capitulo-2',
      'capitulo-3',
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

  it('applyData merges patches without losing prior data', () => {
    const { result } = renderHook(() => useReceptionState())
    act(() => result.current.applyData({ motherName: 'Ana' }))
    act(() => result.current.applyData({ mood: 'B' }))
    expect(result.current.data.motherName).toBe('Ana')
    expect(result.current.data.mood).toBe('B')
  })

  it('applyData preserves otherChildren initial []', () => {
    const { result } = renderHook(() => useReceptionState())
    act(() => result.current.applyData({ motherName: 'Ana' }))
    expect(result.current.data.otherChildren).toEqual([])
  })
})
