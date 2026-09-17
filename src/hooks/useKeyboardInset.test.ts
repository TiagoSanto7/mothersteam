import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardInset } from './useKeyboardInset'

const addListener = vi.fn()
const isNativePlatform = vi.fn()

vi.mock('@capacitor/keyboard', () => ({
  Keyboard: { addListener: (...a: unknown[]) => addListener(...a) },
}))
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNativePlatform() },
}))

// `setKeyboardOpen` is added to the store in a later task (not this one) — mocked here
// so this hook's tests don't depend on that task's completion.
const setKeyboardOpen = vi.fn()
vi.mock('../store/useAppStore', () => ({
  useAppStore: { getState: () => ({ setKeyboardOpen }) },
}))

function cssVar() {
  return document.documentElement.style.getPropertyValue('--keyboard-height')
}

describe('useKeyboardInset', () => {
  beforeEach(() => {
    addListener.mockReset()
    isNativePlatform.mockReset()
    document.documentElement.style.removeProperty('--keyboard-height')
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('publica a altura do teclado na CSS var quando o plugin nativo avisa', async () => {
    isNativePlatform.mockReturnValue(true)
    const handlers: Record<string, (i: { keyboardHeight: number }) => void> = {}
    addListener.mockImplementation((evt: string, cb: (i: { keyboardHeight: number }) => void) => {
      handlers[evt] = cb
      return Promise.resolve({ remove: vi.fn() })
    })

    renderHook(() => useKeyboardInset())
    handlers['keyboardWillShow']({ keyboardHeight: 320 })

    expect(cssVar()).toBe('320px')
  })

  it('zera a CSS var quando o teclado fecha', async () => {
    isNativePlatform.mockReturnValue(true)
    const handlers: Record<string, (i?: { keyboardHeight: number }) => void> = {}
    addListener.mockImplementation((evt: string, cb: (i?: { keyboardHeight: number }) => void) => {
      handlers[evt] = cb
      return Promise.resolve({ remove: vi.fn() })
    })

    renderHook(() => useKeyboardInset())
    handlers['keyboardWillShow']({ keyboardHeight: 320 })
    handlers['keyboardWillHide']()

    expect(cssVar()).toBe('0px')
  })

  it('remove os listeners do plugin ao desmontar', async () => {
    isNativePlatform.mockReturnValue(true)
    const remove = vi.fn()
    addListener.mockResolvedValue({ remove })

    const { unmount } = renderHook(() => useKeyboardInset())
    await Promise.resolve()
    unmount()
    await Promise.resolve()

    expect(remove).toHaveBeenCalledTimes(2)
  })

  it('na web, usa a sobreposição do visualViewport', () => {
    isNativePlatform.mockReturnValue(false)
    const listeners: Record<string, () => void> = {}
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 500,
        offsetTop: 0,
        addEventListener: (evt: string, cb: () => void) => { listeners[evt] = cb },
        removeEventListener: vi.fn(),
      },
    })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })

    renderHook(() => useKeyboardInset())
    listeners['resize']()

    expect(cssVar()).toBe('300px')
  })

  it('ignora variações pequenas do visualViewport (barra de URL, não teclado)', () => {
    isNativePlatform.mockReturnValue(false)
    const listeners: Record<string, () => void> = {}
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 760,
        offsetTop: 0,
        addEventListener: (evt: string, cb: () => void) => { listeners[evt] = cb },
        removeEventListener: vi.fn(),
      },
    })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })

    renderHook(() => useKeyboardInset())
    listeners['resize']()

    expect(cssVar()).toBe('0px')
  })
})
