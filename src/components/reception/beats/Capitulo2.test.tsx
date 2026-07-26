import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Capitulo2 } from './Capitulo2'

let mockState = {
  state: 'listening' as string,
  amplitude: 0,
  collectedFatos: null as unknown,
  error: null as string | null,
  startConversation: vi.fn(() => Promise.resolve()),
  sendTextResponse: vi.fn(),
  stop: vi.fn(),
}

vi.mock('../hooks/useSaraNarration', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useSaraNarration')>(
    '../hooks/useSaraNarration',
  )
  return {
    ...actual,
    useSaraNarration: () => mockState,
  }
})

beforeEach(() => {
  mockState = {
    state: 'listening',
    amplitude: 0,
    collectedFatos: null,
    error: null,
    startConversation: vi.fn(() => Promise.resolve()),
    sendTextResponse: vi.fn(),
    stop: vi.fn(),
  }
})

describe('Capitulo2', () => {
  it('renders orb and text input', () => {
    render(<Capitulo2 onComplete={() => {}} />)
    expect(screen.getByLabelText('Sara')).toBeInTheDocument()
    expect(screen.getByLabelText(/Digite sua resposta/i)).toBeInTheDocument()
  })

  it('sends text response on submit', async () => {
    const user = userEvent.setup()
    render(<Capitulo2 onComplete={() => {}} />)
    await user.type(screen.getByLabelText(/Digite sua resposta/i), 'cansada')
    await user.click(screen.getByRole('button', { name: /enviar/i }))
    expect(mockState.sendTextResponse).toHaveBeenCalledWith('cansada')
  })

  it('calls onComplete with mood and supportNetwork when collectedFatos fires', async () => {
    const onComplete = vi.fn()
    mockState.collectedFatos = { mood: 'C', supportNetwork: 'B' }
    render(<Capitulo2 onComplete={onComplete} />)
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith({ mood: 'C', supportNetwork: 'B' })
    })
  })

  it('shows retry button on error', () => {
    mockState.state = 'error'
    mockState.error = 'network fail'
    render(<Capitulo2 onComplete={() => {}} />)
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument()
  })
})
