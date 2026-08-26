import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MtScreen } from './MtScreen'

describe('MtScreen', () => {
  it('renders children', () => {
    render(<MtScreen><span>ola</span></MtScreen>)
    expect(screen.getByText('ola')).toBeInTheDocument()
  })

  it('uses gradient background by default', () => {
    const { container } = render(<MtScreen>x</MtScreen>)
    expect(container.firstChild).toHaveClass('bg-mt-gradient')
  })

  it('applies pastel variant', () => {
    const { container } = render(<MtScreen variant="pastel">x</MtScreen>)
    expect(container.firstChild).toHaveClass('bg-mt-gradient-pastel')
  })

  it('applies solid variant', () => {
    const { container } = render(<MtScreen variant="solid">x</MtScreen>)
    expect(container.firstChild).toHaveClass('bg-mt-cream')
    expect(container.firstChild).not.toHaveClass('bg-mt-gradient')
  })

  it('is full height', () => {
    const { container } = render(<MtScreen>x</MtScreen>)
    expect(container.firstChild).toHaveClass('min-h-screen')
  })
})
