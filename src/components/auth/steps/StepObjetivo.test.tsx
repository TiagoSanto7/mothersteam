import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepObjetivo } from './StepObjetivo'

describe('StepObjetivo', () => {
  it('renders 4 goal + 4 concern options', () => {
    render(<StepObjetivo value={{ goal: null, concern: null }} onChange={vi.fn()} />)
    expect(screen.getAllByRole('radio')).toHaveLength(8)
  })

  it('emits goal change', () => {
    const onChange = vi.fn()
    render(<StepObjetivo value={{ goal: null, concern: null }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: /melhorar o sono/i }))
    expect(onChange).toHaveBeenCalledWith({ goal: 'C', concern: null })
  })

  it('emits concern change', () => {
    const onChange = vi.fn()
    render(<StepObjetivo value={{ goal: 'A', concern: null }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: /amamentação/i }))
    expect(onChange).toHaveBeenCalledWith({ goal: 'A', concern: 'C' })
  })
})
