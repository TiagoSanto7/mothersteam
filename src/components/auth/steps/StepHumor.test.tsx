import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepHumor } from './StepHumor'

describe('StepHumor', () => {
  it('renders 4 mood options and 3 support options', () => {
    render(<StepHumor value={{ mood: null, supportNetwork: null }} onChange={vi.fn()} />)
    expect(screen.getAllByRole('radio', { name: /(confiante|cansada|ansiosa|exausta)/i })).toHaveLength(4)
    expect(screen.getAllByRole('radio', { name: /(sempre|momentos|sozinha)/i })).toHaveLength(3)
  })

  it('emits change when a mood is picked', () => {
    const onChange = vi.fn()
    render(<StepHumor value={{ mood: null, supportNetwork: null }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: /ansiosa/i }))
    expect(onChange).toHaveBeenCalledWith({ mood: 'C', supportNetwork: null })
  })

  it('emits change when a support option is picked', () => {
    const onChange = vi.fn()
    render(<StepHumor value={{ mood: 'A', supportNetwork: null }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: /sozinha/i }))
    expect(onChange).toHaveBeenCalledWith({ mood: 'A', supportNetwork: 'C' })
  })
})
