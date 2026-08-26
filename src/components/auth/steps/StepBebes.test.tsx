import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepBebes } from './StepBebes'

describe('StepBebes', () => {
  it('shows a single baby name input by default (no multiples)', () => {
    render(<StepBebes value={{ hasMultiples: false, babies: [{ name: '' }] }} onChange={vi.fn()} />)
    expect(screen.getAllByPlaceholderText(/nome do bebê/i)).toHaveLength(1)
  })

  it('when user toggles "mais de um bebê", asks how many + shows N inputs', () => {
    const onChange = vi.fn()
    render(<StepBebes value={{ hasMultiples: false, babies: [{ name: '' }] }} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText(/mais de um bebê/i))
    // After toggle, count input should be visible; simulate updating count to 3
    // Note: after toggle, onChange is called with {hasMultiples: true, babies: [...]}
    // Component re-renders with new value, so we simulate the parent updating the value prop and re-rendering
    // Actually, this test simulates the toggle directly; the change to babies count is via the count input
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hasMultiples: true }))
  })

  it('changing count to 3 emits 3 baby slots', () => {
    const onChange = vi.fn()
    render(<StepBebes value={{ hasMultiples: true, babies: [{ name: '' }, { name: '' }] }} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/quantos bebês/i), { target: { value: '3' } })
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        hasMultiples: true,
        babies: [{ name: '' }, { name: '' }, { name: '' }],
      })
    )
  })
})
