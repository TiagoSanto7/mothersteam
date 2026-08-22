import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MtPillButton } from './MtPillButton'

describe('MtPillButton', () => {
  it('renders label and default primary variant', () => {
    render(<MtPillButton>Entrar</MtPillButton>)
    const btn = screen.getByRole('button', { name: 'Entrar' })
    expect(btn).toBeInTheDocument()
    expect(btn.className).toMatch(/bg-mt-gradient/)
    expect(btn.className).toMatch(/text-white/)
    expect(btn.className).toMatch(/rounded-mt-pill/)
  })

  it('secondary variant uses white bg and rose text/border', () => {
    render(<MtPillButton variant="secondary">Cancelar</MtPillButton>)
    const btn = screen.getByRole('button', { name: 'Cancelar' })
    expect(btn.className).toMatch(/bg-white/)
    expect(btn.className).toMatch(/text-mt-rose/)
  })

  it('apple variant uses charcoal bg and white text', () => {
    render(<MtPillButton variant="apple">Apple</MtPillButton>)
    const btn = screen.getByRole('button', { name: 'Apple' })
    expect(btn.className).toMatch(/bg-mt-charcoal/)
    expect(btn.className).toMatch(/text-white/)
  })

  it('google variant uses white bg with linen border', () => {
    render(<MtPillButton variant="google">Google</MtPillButton>)
    const btn = screen.getByRole('button', { name: 'Google' })
    expect(btn.className).toMatch(/bg-white/)
    expect(btn.className).toMatch(/border-mt-linen/)
  })

  it('fires onClick', () => {
    const onClick = vi.fn()
    render(<MtPillButton onClick={onClick}>x</MtPillButton>)
    fireEvent.click(screen.getByRole('button', { name: 'x' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('supports disabled', () => {
    render(<MtPillButton disabled>x</MtPillButton>)
    expect(screen.getByRole('button', { name: 'x' })).toBeDisabled()
  })
})
