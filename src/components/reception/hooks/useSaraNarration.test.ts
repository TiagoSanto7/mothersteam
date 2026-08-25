import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSaraNarration, WELCOME_CONFIG } from './useSaraNarration'

const endSession = vi.fn(() => Promise.resolve())
const getOutputVolume = vi.fn(() => 0)
let capturedHandlers: {
  onStatusChange?: (e: { status: string }) => void
  onError?: (msg: string) => void
  clientTools?: Record<string, (params: unknown) => Promise<string>>
} = {}

vi.mock('@elevenlabs/client', () => ({
  Conversation: {
    startSession: vi.fn(async (opts) => {
      capturedHandlers = opts
      return { endSession, getOutputVolume }
    }),
  },
}))

beforeEach(() => {
  endSession.mockClear()
  getOutputVolume.mockClear()
  capturedHandlers = {}
})

describe('useSaraNarration', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useSaraNarration())
    expect(result.current.state).toBe('idle')
    expect(result.current.collectedFatos).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('transitions to listening after connect event', async () => {
    const { result } = renderHook(() => useSaraNarration())
    await act(async () => {
      await result.current.startConversation(WELCOME_CONFIG)
    })
    act(() => {
      capturedHandlers.onStatusChange?.({ status: 'connected' })
    })
    await waitFor(() => {
      expect(result.current.state).toBe('listening')
    })
  })

  it('captures data and moves to done when the tool fires', async () => {
    const { result } = renderHook(() => useSaraNarration())
    await act(async () => {
      await result.current.startConversation(WELCOME_CONFIG)
    })
    const payload = { ok: true }
    await act(async () => {
      await capturedHandlers.clientTools?.[WELCOME_CONFIG.toolName](payload)
    })
    expect(result.current.state).toBe('done')
    expect(result.current.collectedFatos).toEqual(payload)
  })

  it('stop() sets state to idle and endSession is called', async () => {
    const { result } = renderHook(() => useSaraNarration())
    await act(async () => {
      await result.current.startConversation(WELCOME_CONFIG)
    })
    act(() => {
      result.current.stop()
    })
    expect(endSession).toHaveBeenCalled()
    expect(result.current.state).toBe('idle')
  })

  it('surfaces error state via onError', async () => {
    const { result } = renderHook(() => useSaraNarration())
    await act(async () => {
      await result.current.startConversation(WELCOME_CONFIG)
    })
    act(() => {
      capturedHandlers.onError?.('boom')
    })
    await waitFor(() => {
      expect(result.current.state).toBe('error')
      expect(result.current.error).toBe('boom')
    })
  })
})
