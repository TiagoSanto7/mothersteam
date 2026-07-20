import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PreparandoTudo } from './PreparandoTudo'
import { useAppStore } from '../../../store/useAppStore'
import type { ReceptionData } from '../../../types/reception'

const baseData: ReceptionData = {
  motherName: 'Ana',
  phase: 'pregnant',
  week: 28,
  babyName: 'Sofia',
  otherChildren: [],
  mood: 'B',
  supportNetwork: 'A',
  goal: 'C',
  concern: 'B',
}

beforeEach(() => {
  vi.useFakeTimers()
  useAppStore.setState({
    motherName: '',
    babyName: '',
    onboardingDone: false,
    motherProfile: null,
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PreparandoTudo', () => {
  it('renders orb and preparing text', () => {
    render(<PreparandoTudo data={baseData} onReady={() => {}} />)
    expect(screen.getByText(/preparando tudo/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Sara')).toBeInTheDocument()
  })

  it('applies reception data to store on mount', () => {
    render(<PreparandoTudo data={baseData} onReady={() => {}} />)
    const s = useAppStore.getState()
    expect(s.motherName).toBe('Ana')
    expect(s.onboardingDone).toBe(true)
    expect(s.motherProfile).not.toBeNull()
  })

  it('calls onReady after 4 seconds', () => {
    const onReady = vi.fn()
    render(<PreparandoTudo data={baseData} onReady={onReady} />)
    expect(onReady).not.toHaveBeenCalled()
    vi.advanceTimersByTime(4000)
    expect(onReady).toHaveBeenCalledTimes(1)
  })
})
