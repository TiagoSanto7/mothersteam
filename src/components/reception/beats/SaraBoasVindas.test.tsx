import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { SaraBoasVindas } from './SaraBoasVindas'

// Mock useSaraNarration — verify hook is called with WELCOME_CONFIG, and simulate collectedFatos to trigger onComplete
const startConversation = vi.fn().mockResolvedValue(undefined)
const stop = vi.fn()
let mockedCollectedFatos: unknown = null

vi.mock('../hooks/useSaraNarration', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useSaraNarration')>('../hooks/useSaraNarration')
  return {
    ...actual,
    useSaraNarration: () => ({
      state: 'listening',
      amplitude: 0,
      collectedFatos: mockedCollectedFatos,
      error: null,
      startConversation,
      sendTextResponse: vi.fn(),
      stop,
    }),
  }
})

describe('SaraBoasVindas', () => {
  it('starts the conversation with WELCOME_CONFIG on mount', async () => {
    startConversation.mockClear()
    mockedCollectedFatos = null
    render(<SaraBoasVindas motherName="Ana" onComplete={vi.fn()} />)
    // wait for effect
    await new Promise((r) => setTimeout(r, 10))
    expect(startConversation).toHaveBeenCalled()
    const arg = startConversation.mock.calls[0][0]
    expect(arg.toolName).toBe('finalizar_boas_vindas')
    expect(arg.firstMessage).toMatch(/como você está se sentindo/i)
  })

  it('calls onComplete when collectedFatos fires', async () => {
    const onComplete = vi.fn()
    mockedCollectedFatos = null
    const { rerender } = render(<SaraBoasVindas motherName="Ana" onComplete={onComplete} />)
    expect(onComplete).not.toHaveBeenCalled()
    // Simulate hook's collectedFatos changing to a truthy value
    mockedCollectedFatos = { done: true }
    rerender(<SaraBoasVindas motherName="Ana" onComplete={onComplete} />)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})
