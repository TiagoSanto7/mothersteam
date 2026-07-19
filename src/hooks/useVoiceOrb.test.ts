import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useVoiceOrb } from './useVoiceOrb'

const mockEndSession = vi.fn().mockResolvedValue(undefined)
const mockGetOutputVolume = vi.fn(() => 0.5)

const { mockStartSession } = vi.hoisted(() => ({
  mockStartSession: vi.fn(),
}))

vi.mock('@elevenlabs/client', () => ({
  Conversation: { startSession: mockStartSession },
}))

describe('useVoiceOrb', () => {
  let capturedOpts: Parameters<typeof mockStartSession>[0]

  beforeEach(() => {
    vi.clearAllMocks()
    capturedOpts = null as unknown as Parameters<typeof mockStartSession>[0]
    mockStartSession.mockImplementation(async (opts: typeof capturedOpts) => {
      capturedOpts = opts
      setTimeout(() => opts.onStatusChange?.({ status: 'connected' }), 0)
      return { endSession: mockEndSession, getOutputVolume: mockGetOutputVolume }
    })
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 0 })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  it('starts with idle state', () => {
    const { result } = renderHook(() => useVoiceOrb())
    expect(result.current.state).toBe('idle')
    expect(result.current.collectedData).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('transitions connecting → listening on start()', async () => {
    const { result } = renderHook(() => useVoiceOrb())
    await act(async () => { await result.current.start() })
    expect(mockStartSession).toHaveBeenCalledOnce()
    expect(result.current.state).toBe('listening')
  })

  it('sets collectedData and state=done when confirmar_perfil is called', async () => {
    const { result } = renderHook(() => useVoiceOrb())
    await act(async () => { await result.current.start() })

    const fakeData = {
      motherName: 'Ana',
      primaryChild: { name: 'Beto', phase: 'postpartum' as const, ageInDays: 60 },
      otherChildren: [],
    }
    await act(async () => {
      await capturedOpts.clientTools!.confirmar_perfil(fakeData)
    })

    expect(result.current.collectedData).toEqual(fakeData)
    expect(result.current.state).toBe('done')
  })

  it('stop() before tool call resets to idle with null collectedData', async () => {
    const { result } = renderHook(() => useVoiceOrb())
    await act(async () => { await result.current.start() })
    act(() => { result.current.stop() })
    expect(result.current.state).toBe('idle')
    expect(result.current.collectedData).toBeNull()
  })

  it('sets state=error on connection failure', async () => {
    mockStartSession.mockRejectedValueOnce(new Error('Sem microfone'))
    const { result } = renderHook(() => useVoiceOrb())
    await act(async () => { await result.current.start() })
    expect(result.current.state).toBe('error')
    expect(result.current.error).toBe('Sem microfone')
  })
})
