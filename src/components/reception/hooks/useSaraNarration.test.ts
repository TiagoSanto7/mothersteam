import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSaraNarration, receptionDataFromCapitulo1 } from './useSaraNarration'

const endSession = vi.fn(() => Promise.resolve())
const getOutputVolume = vi.fn(() => 0)
let capturedHandlers: {
  onStatusChange?: (e: { status: string }) => void
  onMessage?: (e: { message: string; source: string }) => void
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
      await result.current.startCapitulo1()
    })
    act(() => {
      capturedHandlers.onStatusChange?.({ status: 'connected' })
    })
    await waitFor(() => {
      expect(result.current.state).toBe('listening')
    })
  })

  it('captures data and moves to done when confirmar_capitulo_1_fatos fires', async () => {
    const { result } = renderHook(() => useSaraNarration())
    await act(async () => {
      await result.current.startCapitulo1()
    })
    const payload = {
      motherName: 'Ana',
      phase: 'pregnant' as const,
      week: 28,
      babyName: 'Sofia',
      otherChildren: [],
    }
    await act(async () => {
      await capturedHandlers.clientTools?.confirmar_capitulo_1_fatos(payload)
    })
    expect(result.current.state).toBe('done')
    expect(result.current.collectedFatos).toEqual(payload)
  })

  it('stop() sets state to idle and endSession is called', async () => {
    const { result } = renderHook(() => useSaraNarration())
    await act(async () => {
      await result.current.startCapitulo1()
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
      await result.current.startCapitulo1()
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

describe('receptionDataFromCapitulo1', () => {
  it('maps pregnant fatos to ReceptionData shape', () => {
    const out = receptionDataFromCapitulo1({
      motherName: 'Ana',
      phase: 'pregnant',
      week: 28,
      babyName: 'Sofia',
      otherChildren: [],
    })
    expect(out).toEqual({
      motherName: 'Ana',
      phase: 'pregnant',
      week: 28,
      ageInDays: undefined,
      babyName: 'Sofia',
      otherChildren: [],
    })
  })

  it('defaults otherChildren to empty array when missing', () => {
    const out = receptionDataFromCapitulo1({
      motherName: 'Ana',
      phase: 'postpartum',
      ageInDays: 45,
    })
    expect(out.otherChildren).toEqual([])
    expect(out.babyName).toBeNull()
  })
})
