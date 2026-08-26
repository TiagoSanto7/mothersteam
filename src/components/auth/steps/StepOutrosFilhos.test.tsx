import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepOutrosFilhos } from './StepOutrosFilhos'

describe('StepOutrosFilhos', () => {
  it('renders empty state with "adicionar filho" button', () => {
    render(<StepOutrosFilhos value={[]} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /adicionar filho/i })).toBeInTheDocument()
  })

  it('adds a new child row when button clicked', () => {
    const onChange = vi.fn()
    render(<StepOutrosFilhos value={[]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /adicionar filho/i }))
    expect(onChange).toHaveBeenCalledWith([{ name: '', birthDate: '' }])
  })

  it('removes a child when trash button clicked', () => {
    const onChange = vi.fn()
    render(
      <StepOutrosFilhos
        value={[{ name: 'Pedro', birthDate: '2023-05-14' }]}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /remover pedro/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('emits change on name/date input', () => {
    const onChange = vi.fn()
    render(
      <StepOutrosFilhos
        value={[{ name: '', birthDate: '' }]}
        onChange={onChange}
      />
    )
    fireEvent.change(screen.getByPlaceholderText(/nome/i), { target: { value: 'Ana' } })
    expect(onChange).toHaveBeenCalledWith([{ name: 'Ana', birthDate: '' }])
  })
})
