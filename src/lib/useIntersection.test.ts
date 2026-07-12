import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useIntersection } from './useIntersection'

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void
let observerCallback: ObserverCallback | null = null
let mockObserve: ReturnType<typeof vi.fn>
let mockDisconnect: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockObserve = vi.fn()
  mockDisconnect = vi.fn()
  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn((cb: ObserverCallback) => {
      observerCallback = cb
      return { observe: mockObserve, disconnect: mockDisconnect }
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  observerCallback = null
})

describe('useIntersection', () => {
  it('returns false initially', () => {
    const ref = { current: document.createElement('div') }
    const { result } = renderHook(() => useIntersection(ref))
    expect(result.current).toBe(false)
  })

  it('returns true when element intersects', () => {
    const ref = { current: document.createElement('div') }
    const { result } = renderHook(() => useIntersection(ref))
    act(() => {
      observerCallback!([{ isIntersecting: true } as IntersectionObserverEntry])
    })
    expect(result.current).toBe(true)
  })

  it('returns false again when element leaves viewport', () => {
    const ref = { current: document.createElement('div') }
    const { result } = renderHook(() => useIntersection(ref))
    act(() => {
      observerCallback!([{ isIntersecting: true } as IntersectionObserverEntry])
    })
    act(() => {
      observerCallback!([{ isIntersecting: false } as IntersectionObserverEntry])
    })
    expect(result.current).toBe(false)
  })

  it('calls observer.observe with the element', () => {
    const el = document.createElement('div')
    const ref = { current: el }
    renderHook(() => useIntersection(ref))
    expect(mockObserve).toHaveBeenCalledWith(el)
  })

  it('disconnects observer on unmount', () => {
    const ref = { current: document.createElement('div') }
    const { unmount } = renderHook(() => useIntersection(ref))
    unmount()
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('returns false when ref.current is null', () => {
    const ref = { current: null }
    const { result } = renderHook(() => useIntersection(ref))
    expect(result.current).toBe(false)
    expect(mockObserve).not.toHaveBeenCalled()
  })
})
