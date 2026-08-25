import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PreparandoTudo } from './PreparandoTudo'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PreparandoTudo', () => {
  it('renders orb and holding text', () => {
    render(<PreparandoTudo mood="B" onReady={() => {}} />)
    expect(screen.getByText(/instantinho/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Sara')).toBeInTheDocument()
  })

  it('calls onReady after 4 seconds', () => {
    const onReady = vi.fn()
    render(<PreparandoTudo mood="B" onReady={onReady} />)
    expect(onReady).not.toHaveBeenCalled()
    vi.advanceTimersByTime(4000)
    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it('handles null mood without error', () => {
    const onReady = vi.fn()
    render(<PreparandoTudo mood={null} onReady={onReady} />)
    expect(screen.getByText(/instantinho/i)).toBeInTheDocument()
    vi.advanceTimersByTime(4000)
    expect(onReady).toHaveBeenCalledTimes(1)
  })
})
