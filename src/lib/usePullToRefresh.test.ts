import { describe, it, expect, vi, beforeAll } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePullToRefresh } from './usePullToRefresh'

// jsdom doesn't implement Touch/TouchEvent — define minimal stubs
beforeAll(() => {
  if (typeof (globalThis as Record<string, unknown>).Touch === 'undefined') {
    (globalThis as Record<string, unknown>).Touch = class Touch {
      identifier: number; target: EventTarget; clientY: number
      constructor(init: { identifier: number; target: EventTarget; clientY: number }) {
        this.identifier = init.identifier; this.target = init.target; this.clientY = init.clientY
      }
    }
  }
  if (typeof (globalThis as Record<string, unknown>).TouchEvent === 'undefined') {
    (globalThis as Record<string, unknown>).TouchEvent = class TouchEvent extends Event {
      touches: Touch[]; changedTouches: Touch[]
      constructor(type: string, init: { touches?: Touch[]; changedTouches?: Touch[]; bubbles?: boolean } = {}) {
        super(type, { bubbles: init.bubbles })
        this.touches = init.touches ?? []
        this.changedTouches = init.changedTouches ?? []
      }
    }
  }
})

describe('usePullToRefresh', () => {
  it('calls onRefresh when pulled down far enough', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollTop', { value: 0 })
    const ref = { current: el }
    renderHook(() => usePullToRefresh(ref, onRefresh))

    const TouchClass = (globalThis as Record<string, unknown>).Touch as new (i: { identifier: number; target: EventTarget; clientY: number }) => Touch
    const TouchEventClass = (globalThis as Record<string, unknown>).TouchEvent as new (type: string, init: { touches?: Touch[]; changedTouches?: Touch[]; bubbles?: boolean }) => TouchEvent

    await act(async () => {
      el.dispatchEvent(new TouchEventClass('touchstart', { touches: [new TouchClass({ identifier: 1, target: el, clientY: 0 })], bubbles: true }))
      el.dispatchEvent(new TouchEventClass('touchmove', { touches: [new TouchClass({ identifier: 1, target: el, clientY: 90 })], bubbles: true }))
      el.dispatchEvent(new TouchEventClass('touchend', { changedTouches: [], bubbles: true }))
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(onRefresh).toHaveBeenCalledOnce()
  })

  it('does not call onRefresh when pulled less than threshold', async () => {
    const onRefresh = vi.fn()
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollTop', { value: 0 })
    const ref = { current: el }
    renderHook(() => usePullToRefresh(ref, onRefresh))

    const TouchClass = (globalThis as Record<string, unknown>).Touch as new (i: { identifier: number; target: EventTarget; clientY: number }) => Touch
    const TouchEventClass = (globalThis as Record<string, unknown>).TouchEvent as new (type: string, init: { touches?: Touch[]; changedTouches?: Touch[]; bubbles?: boolean }) => TouchEvent

    await act(async () => {
      el.dispatchEvent(new TouchEventClass('touchstart', { touches: [new TouchClass({ identifier: 1, target: el, clientY: 0 })], bubbles: true }))
      el.dispatchEvent(new TouchEventClass('touchmove', { touches: [new TouchClass({ identifier: 1, target: el, clientY: 30 })], bubbles: true }))
      el.dispatchEvent(new TouchEventClass('touchend', { changedTouches: [], bubbles: true }))
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(onRefresh).not.toHaveBeenCalled()
  })
})
