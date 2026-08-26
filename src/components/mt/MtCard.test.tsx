import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MtCard } from './MtCard'

describe('MtCard', () => {
  it('renders children with default padding and rounded-mt shadow-mt', () => {
    const { container } = render(<MtCard><span>x</span></MtCard>)
    expect(screen.getByText('x')).toBeInTheDocument()
    const el = container.firstChild as HTMLElement
    expect(el.className).toMatch(/rounded-mt(\s|$)/)
    expect(el.className).toMatch(/shadow-mt(\s|$)/)
    expect(el.className).toMatch(/p-4/)
    expect(el.className).toMatch(/bg-white/)
  })

  it('Compact uses p-3', () => {
    const { container } = render(<MtCard.Compact>x</MtCard.Compact>)
    expect((container.firstChild as HTMLElement).className).toMatch(/p-3/)
  })

  it('Feature uses p-6 and shadow-mt-lg', () => {
    const { container } = render(<MtCard.Feature>x</MtCard.Feature>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toMatch(/p-6/)
    expect(el.className).toMatch(/shadow-mt-lg/)
  })

  it('forwards className', () => {
    const { container } = render(<MtCard className="mb-2">x</MtCard>)
    expect((container.firstChild as HTMLElement).className).toMatch(/mb-2/)
  })
})
