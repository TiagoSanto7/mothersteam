import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Capitulo3 } from './Capitulo3'

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

describe('Capitulo3', () => {
  it('renders orb and text input', () => {
    render(<Capitulo3 onComplete={() => {}} />)
    expect(screen.getByLabelText('Sara')).toBeInTheDocument()
    expect(screen.getByLabelText(/Digite sua resposta/i)).toBeInTheDocument()
  })

  it('sends text response on submit', async () => {
    const user = userEvent.setup()
    render(<Capitulo3 onComplete={() => {}} />)
    await user.type(screen.getByLabelText(/Digite sua resposta/i), 'organizar rotina')
    await user.click(screen.getByRole('button', { name: /enviar/i }))
    expect(mockState.sendTextResponse).toHaveBeenCalledWith('organizar rotina')
  })

  it('calls onComplete with goal and concern when collectedFatos fires', async () => {
    const onComplete = vi.fn()
    mockState.collectedFatos = { goal: 'C', concern: 'B' }
    render(<Capitulo3 onComplete={onComplete} />)
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith({ goal: 'C', concern: 'B' })
    })
  })

  it('shows retry button on error', () => {
    mockState.state = 'error'
    mockState.error = 'boom'
    render(<Capitulo3 onComplete={() => {}} />)
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument()
  })
})
