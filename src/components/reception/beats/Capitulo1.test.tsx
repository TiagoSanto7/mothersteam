import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Capitulo1 } from './Capitulo1'

let mockState = {
  state: 'listening' as string,
  amplitude: 0,
  transcript: '',
  collectedFatos: null as unknown,
  error: null as string | null,
  startCapitulo1: vi.fn(() => Promise.resolve()),
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
    transcript: '',
    collectedFatos: null,
    error: null,
    startCapitulo1: vi.fn(() => Promise.resolve()),
    sendTextResponse: vi.fn(),
    stop: vi.fn(),
  }
})

describe('Capitulo1', () => {
  it('renders the canonical pergunta and orb', () => {
    render(<Capitulo1 onComplete={() => {}} />)
    expect(screen.getByText(/esperando o bebê ou ele já chegou/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Sara')).toBeInTheDocument()
  })

  it('sends text response on submit', async () => {
    const user = userEvent.setup()
    render(<Capitulo1 onComplete={() => {}} />)
    const input = screen.getByLabelText(/Digite sua resposta/i)
    await user.type(input, 'estou grávida de 28 semanas')
    await user.click(screen.getByRole('button', { name: /enviar/i }))
    expect(mockState.sendTextResponse).toHaveBeenCalledWith(
      'estou grávida de 28 semanas',
    )
  })

  it('calls onComplete when collectedFatos is set', async () => {
    const onComplete = vi.fn()
    mockState.collectedFatos = {
      motherName: 'Ana',
      phase: 'pregnant',
      week: 28,
      babyName: 'Sofia',
      otherChildren: [],
    }
    render(<Capitulo1 onComplete={onComplete} />)
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith({
        motherName: 'Ana',
        phase: 'pregnant',
        week: 28,
        ageInDays: undefined,
        babyName: 'Sofia',
        otherChildren: [],
      })
    })
  })

  it('shows retry button on error', () => {
    mockState.state = 'error'
    mockState.error = 'boom'
    render(<Capitulo1 onComplete={() => {}} />)
    expect(screen.getByText(/boom/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument()
  })
})
