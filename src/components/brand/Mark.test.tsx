import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Mark } from './Mark'

describe('Mark', () => {
  it('renders mono variant by default', () => {
    render(<Mark />)
    const img = screen.getByRole('img', { name: /mother's team/i })
    expect(img.getAttribute('src')).toMatch(/mark-mt\.svg|mark-mt(?!-gradient)/)
  })

  it('renders gradient variant when specified', () => {
    render(<Mark variant="gradient" />)
    const img = screen.getByRole('img', { name: /mother's team/i })
    expect(img).toHaveAttribute('src', expect.stringContaining('mark-mt-gradient'))
  })

  it('renders pink variant when specified', () => {
    render(<Mark variant="pink" />)
    const img = screen.getByRole('img', { name: /mother's team/i })
    expect(img).toHaveAttribute('src', expect.stringContaining('mark-mt-pink'))
  })

  it('applies given size as inline style', () => {
    render(<Mark size={56} />)
    const img = screen.getByRole('img', { name: /mother's team/i })
    expect(img.style.width).toBe('56px')
    expect(img.style.height).toBe('56px')
  })

  it('accepts custom aria-label', () => {
    render(<Mark aria-label="Ícone do app" />)
    expect(screen.getByRole('img', { name: 'Ícone do app' })).toBeInTheDocument()
  })
})
