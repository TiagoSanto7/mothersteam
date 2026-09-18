import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PREFETCH_MARGIN, useIntersection } from './useIntersection'

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void
let observerCallback: ObserverCallback | null = null
let observerOptions: IntersectionObserverInit | undefined
let mockObserve: ReturnType<typeof vi.fn>
let mockDisconnect: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockObserve = vi.fn()
  mockDisconnect = vi.fn()
  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn((cb: ObserverCallback, options?: IntersectionObserverInit) => {
      observerCallback = cb
      observerOptions = options
      return { observe: mockObserve, disconnect: mockDisconnect }
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  observerCallback = null
  observerOptions = undefined
})

function attach(el: Element | null = document.createElement('div')) {
  const hook = renderHook(() => useIntersection())
  act(() => hook.result.current[0](el as HTMLDivElement | null))
  return hook
}

describe('useIntersection', () => {
  it('returns false initially', () => {
    const { result } = attach()
    expect(result.current[1]).toBe(false)
  })

  it('returns true when element intersects and false again when it leaves', () => {
    const { result } = attach()
    act(() => observerCallback!([{ isIntersecting: true } as IntersectionObserverEntry]))
    expect(result.current[1]).toBe(true)
    act(() => observerCallback!([{ isIntersecting: false } as IntersectionObserverEntry]))
    expect(result.current[1]).toBe(false)
  })

  it('observes the element passed to the callback ref', () => {
    const el = document.createElement('div')
    attach(el)
    expect(mockObserve).toHaveBeenCalledWith(el)
  })

  it('observes a sentinel that only mounts after a loading state (regression: feed stopped at page one)', () => {
    const { result } = renderHook(() => useIntersection())
    // First render: loading spinner, no sentinel yet.
    expect(mockObserve).not.toHaveBeenCalled()

    const sentinel = document.createElement('div')
    act(() => result.current[0](sentinel))
    expect(mockObserve).toHaveBeenCalledWith(sentinel)

    act(() => observerCallback!([{ isIntersecting: true } as IntersectionObserverEntry]))
    expect(result.current[1]).toBe(true)
  })

  it('re-attaches when the sentinel element is replaced', () => {
    const { result } = attach()
    const next = document.createElement('div')
    act(() => result.current[0](next))
    expect(mockDisconnect).toHaveBeenCalled()
    expect(mockObserve).toHaveBeenLastCalledWith(next)
  })

  it('disconnects and resets when the element unmounts', () => {
    const { result } = attach()
    act(() => observerCallback!([{ isIntersecting: true } as IntersectionObserverEntry]))
    act(() => result.current[0](null))
    expect(mockDisconnect).toHaveBeenCalled()
    expect(result.current[1]).toBe(false)
  })

  it('passes the observer options (prefetch margin)', () => {
    const hook = renderHook(() => useIntersection(PREFETCH_MARGIN))
    act(() => hook.result.current[0](document.createElement('div')))
    expect(observerOptions).toMatchObject(PREFETCH_MARGIN)
  })

  it('uses the nearest scrolling container as root, so the prefetch margin is not clipped', () => {
    const scroller = document.createElement('div')
    scroller.style.overflowY = 'auto'
    const inner = document.createElement('div')
    const sentinel = document.createElement('div')
    scroller.appendChild(inner)
    inner.appendChild(sentinel)
    document.body.appendChild(scroller)

    attach(sentinel)
    expect(observerOptions?.root).toBe(scroller)
    scroller.remove()
  })

  it('falls back to the viewport when nothing scrolls', () => {
    const sentinel = document.createElement('div')
    document.body.appendChild(sentinel)
    attach(sentinel)
    expect(observerOptions?.root).toBeNull()
    sentinel.remove()
  })
})
