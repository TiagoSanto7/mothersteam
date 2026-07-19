import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OnboardingScreen } from './OnboardingScreen'
import { useAppStore } from '../../store/useAppStore'

// Mock apiFetch to avoid network calls in closing screen
const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }))
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }))

// Mock VoiceOrbOnboarding to isolate OnboardingScreen tests
vi.mock('../onboarding/VoiceOrbOnboarding', () => ({
  VoiceOrbOnboarding: ({ onBack }: { onBack: () => void }) => (
    <div>
      <span>VoiceOrbOnboarding</span>
      <button onClick={onBack}>Voltar</button>
    </div>
  ),
}))

beforeEach(() => {
  mockApiFetch.mockResolvedValue({})
  useAppStore.setState({
    isLoggedIn: true,
    motherName: 'Ana',
    phase: { stage: 'pregnant', week: 28 },
    babyName: '',
    onboardingDone: false,
  })
})

describe('OnboardingScreen — intro split choice', () => {
  it('shows Pular button on intro step', () => {
    render(<OnboardingScreen />)
    expect(screen.getByRole('button', { name: /pular/i })).toBeTruthy()
  })

  it('shows choice screen after intro skip', () => {
    render(<OnboardingScreen />)
    fireEvent.click(screen.getByRole('button', { name: /pular/i }))
    expect(screen.getByRole('button', { name: /preencher você mesmo/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /falar com a sara/i })).toBeTruthy()
  })

  it('shows Q1 question when Preencher você mesmo is chosen', () => {
    render(<OnboardingScreen />)
    fireEvent.click(screen.getByRole('button', { name: /pular/i }))
    fireEvent.click(screen.getByRole('button', { name: /preencher você mesmo/i }))
    expect(screen.getByText(/fase da maternidade/i)).toBeTruthy()
  })

  it('renders VoiceOrbOnboarding when Falar com a Sara is chosen', () => {
    render(<OnboardingScreen />)
    fireEvent.click(screen.getByRole('button', { name: /pular/i }))
    fireEvent.click(screen.getByRole('button', { name: /falar com a sara/i }))
    expect(screen.getByText('VoiceOrbOnboarding')).toBeTruthy()
  })

  it('returns to choice screen when VoiceOrbOnboarding onBack is called', () => {
    render(<OnboardingScreen />)
    fireEvent.click(screen.getByRole('button', { name: /pular/i }))
    fireEvent.click(screen.getByRole('button', { name: /falar com a sara/i }))
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(screen.getByRole('button', { name: /preencher você mesmo/i })).toBeTruthy()
  })
})
