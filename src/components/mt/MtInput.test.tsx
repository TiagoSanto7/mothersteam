import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MtInput } from './MtInput'

describe('MtInput', () => {
  it('renders input with pill styling', () => {
    render(<MtInput placeholder="E-mail" />)
    const input = screen.getByPlaceholderText('E-mail')
    expect(input.className).toMatch(/rounded-mt-pill/)
    expect(input.className).toMatch(/bg-mt-cream/)
  })

  it('renders label above input when label prop given', () => {
    render(<MtInput label="E-mail" placeholder="digite" />)
    expect(screen.getByText('E-mail')).toBeInTheDocument()
  })

  it('associates label to input via htmlFor', () => {
    render(<MtInput label="Senha" id="pw" />)
    const label = screen.getByText('Senha')
    expect(label).toHaveAttribute('for', 'pw')
  })

  it('forwards value + onChange', () => {
    const onChange = vi.fn()
    render(<MtInput value="abc" onChange={onChange} placeholder="p" />)
    const input = screen.getByPlaceholderText('p') as HTMLInputElement
    expect(input.value).toBe('abc')
    fireEvent.change(input, { target: { value: 'xyz' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('supports type=password', () => {
    render(<MtInput type="password" placeholder="p" />)
    expect(screen.getByPlaceholderText('p')).toHaveAttribute('type', 'password')
  })
})
