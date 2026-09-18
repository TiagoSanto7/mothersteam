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

  describe('visualizador de senha', () => {
    it('mostra o botão de revelar apenas em campos de senha', () => {
      const { unmount } = render(<MtInput type="text" placeholder="p" />)
      expect(screen.queryByRole('button', { name: /senha/i })).not.toBeInTheDocument()
      unmount()

      render(<MtInput type="password" placeholder="p" />)
      expect(screen.getByRole('button', { name: /mostrar senha/i })).toBeInTheDocument()
    })

    it('revela e volta a ocultar a senha ao clicar', () => {
      render(<MtInput type="password" placeholder="p" />)
      const input = screen.getByPlaceholderText('p')

      fireEvent.click(screen.getByRole('button', { name: /mostrar senha/i }))
      expect(input).toHaveAttribute('type', 'text')

      fireEvent.click(screen.getByRole('button', { name: /ocultar senha/i }))
      expect(input).toHaveAttribute('type', 'password')
    })

    it('não rouba o foco do campo nem envia o formulário', () => {
      const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
      render(
        <form onSubmit={onSubmit}>
          <MtInput type="password" placeholder="p" />
        </form>,
      )

      const toggle = screen.getByRole('button', { name: /mostrar senha/i })
      expect(toggle).toHaveAttribute('type', 'button')
      expect(toggle).toHaveAttribute('tabIndex', '-1')

      fireEvent.click(toggle)
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('mantém o valor digitado ao alternar a visibilidade', () => {
      const onChange = vi.fn()
      render(<MtInput type="password" value="segredo123" onChange={onChange} placeholder="p" />)
      const input = screen.getByPlaceholderText('p') as HTMLInputElement

      fireEvent.click(screen.getByRole('button', { name: /mostrar senha/i }))
      expect(input.value).toBe('segredo123')
    })
  })
})
