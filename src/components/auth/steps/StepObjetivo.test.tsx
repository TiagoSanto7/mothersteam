import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepObjetivo } from './StepObjetivo'

describe('StepObjetivo', () => {
  it('renders 4 goal + 4 concern options (all checkboxes for multi-select)', () => {
    render(<StepObjetivo value={{ goals: [], concerns: [] }} onChange={vi.fn()} />)
    expect(screen.getAllByRole('checkbox')).toHaveLength(8)
  })

  it('emits goals change (adds to array)', () => {
    const onChange = vi.fn()
    render(<StepObjetivo value={{ goals: [], concerns: [] }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /melhorar o sono/i }))
    expect(onChange).toHaveBeenCalledWith({ goals: ['C'], concerns: [] })
  })

  it('emits concerns change (preserves existing goals)', () => {
    const onChange = vi.fn()
    render(<StepObjetivo value={{ goals: ['A'], concerns: [] }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /amamentação/i }))
    expect(onChange).toHaveBeenCalledWith({ goals: ['A'], concerns: ['C'] })
  })

  it('unchecking removes from array', () => {
    const onChange = vi.fn()
    render(<StepObjetivo value={{ goals: ['C', 'D'], concerns: [] }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /melhorar o sono/i }))
    expect(onChange).toHaveBeenCalledWith({ goals: ['D'], concerns: [] })
  })
})
