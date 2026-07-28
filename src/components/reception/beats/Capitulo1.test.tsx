import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Capitulo1 } from './Capitulo1'
import { useAppStore } from '../../../store/useAppStore'

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
  // Zera o store pra o Cap1 não pular por já ter dados do cadastro
  useAppStore.setState({
    motherName: '',
    babyName: '',
    phase: { stage: 'pregnant', week: 28 },
  })
})

describe('Capitulo1', () => {
  it('renders the orb and text input when no data from cadastro', () => {
    render(<Capitulo1 onComplete={() => {}} />)
    expect(screen.getByLabelText('Sara')).toBeInTheDocument()
    expect(screen.getByLabelText(/Digite sua resposta/i)).toBeInTheDocument()
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
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument()
  })

  it('auto-completes when cadastro data is already in store', async () => {
    useAppStore.setState({
      motherName: 'Maria',
      babyName: 'Bento',
      phase: { stage: 'pregnant', week: 30 },
    })
    const onComplete = vi.fn()
    render(<Capitulo1 onComplete={onComplete} />)
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          motherName: 'Maria',
          phase: 'pregnant',
          week: 30,
          babyName: 'Bento',
        }),
      )
    })
    expect(mockState.startConversation).not.toHaveBeenCalled()
  })
})
