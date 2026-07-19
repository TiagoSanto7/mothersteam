import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VoiceOrbOnboarding } from './VoiceOrbOnboarding'
import type { VoiceCollectedProfile } from '../../hooks/useVoiceOrb'

const mockStart = vi.fn()
const mockStop = vi.fn()
let mockState = 'idle'
let mockCollectedData: VoiceCollectedProfile | null = null

vi.mock('../../hooks/useVoiceOrb', () => ({
  useVoiceOrb: () => ({
    state: mockState,
    amplitude: 0,
    transcript: '',
    collectedData: mockCollectedData,
    error: null,
    start: mockStart,
    stop: mockStop,
  }),
}))

describe('VoiceOrbOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState = 'idle'
    mockCollectedData = null
  })

  it('shows intro text and Começar button on idle state', () => {
    render(<VoiceOrbOnboarding onComplete={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(/Sou a Sara/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /começar/i })).toBeTruthy()
  })

  it('calls start() when Começar is clicked', () => {
    render(<VoiceOrbOnboarding onComplete={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /começar/i }))
    expect(mockStart).toHaveBeenCalledOnce()
  })

  it('shows orb and Encerrar button when state is listening', () => {
    mockState = 'listening'
    render(<VoiceOrbOnboarding onComplete={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByLabelText('Sara voice orb')).toBeTruthy()
    expect(screen.getByRole('button', { name: /encerrar/i })).toBeTruthy()
  })

  it('shows VoiceOrbConfirmation when state is done with data', () => {
    mockState = 'done'
    mockCollectedData = {
      motherName: 'Ana',
      primaryChild: { name: null, phase: 'pregnant', week: 28 },
      otherChildren: [],
    }
    render(<VoiceOrbOnboarding onComplete={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(/Sara entendeu/i)).toBeTruthy()
  })

  it('calls onComplete when user confirms collected data', () => {
    mockState = 'done'
    mockCollectedData = {
      motherName: 'Ana',
      primaryChild: { name: null, phase: 'pregnant', week: 28 },
      otherChildren: [],
    }
    const onComplete = vi.fn()
    render(<VoiceOrbOnboarding onComplete={onComplete} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(onComplete).toHaveBeenCalledWith(mockCollectedData)
  })

  it('calls onBack when back button clicked on intro', () => {
    const onBack = vi.fn()
    render(<VoiceOrbOnboarding onComplete={vi.fn()} onBack={onBack} />)
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})
