import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Wordmark } from './Wordmark'

describe('Wordmark', () => {
  it('renders rose variant by default with brand label', () => {
    render(<Wordmark />)
    const img = screen.getByRole('img', { name: /mother's team/i })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', expect.stringContaining('wordmark-mt-rose'))
  })

  it('renders cream variant when specified', () => {
    render(<Wordmark variant="cream" />)
    const img = screen.getByRole('img', { name: /mother's team/i })
    expect(img).toHaveAttribute('src', expect.stringContaining('wordmark-mt-cream'))
  })

  it('applies size class for lg', () => {
    render(<Wordmark size="lg" />)
    const img = screen.getByRole('img', { name: /mother's team/i })
    expect(img.className).toMatch(/h-24/)
  })

  it('applies size class for sm', () => {
    render(<Wordmark size="sm" />)
    const img = screen.getByRole('img', { name: /mother's team/i })
    expect(img.className).toMatch(/h-8/)
  })

  it('accepts custom className', () => {
    render(<Wordmark className="opacity-50" />)
    const img = screen.getByRole('img', { name: /mother's team/i })
    expect(img.className).toMatch(/opacity-50/)
  })
})
