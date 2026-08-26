import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MtAvatar } from './MtAvatar'

describe('MtAvatar', () => {
  it('renders img with src and alt', () => {
    render(<MtAvatar src="http://x/a.png" alt="Claudia" />)
    const img = screen.getByAltText('Claudia')
    expect(img).toHaveAttribute('src', 'http://x/a.png')
  })

  it('lg size = 80px, md = 56px, sm = 40px', () => {
    const { rerender, container } = render(<MtAvatar src="x" alt="a" size="sm" />)
    expect(container.querySelector('div')?.className).toMatch(/w-10/)
    rerender(<MtAvatar src="x" alt="a" size="md" />)
    expect(container.querySelector('div')?.className).toMatch(/w-14/)
    rerender(<MtAvatar src="x" alt="a" size="lg" />)
    expect(container.querySelector('div')?.className).toMatch(/w-20/)
  })

  it('shows fallback letter when src is empty', () => {
    render(<MtAvatar alt="Bruna" />)
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('has white ring by default', () => {
    const { container } = render(<MtAvatar src="x" alt="a" />)
    expect(container.querySelector('div')?.className).toMatch(/ring-4/)
    expect(container.querySelector('div')?.className).toMatch(/ring-white/)
  })
})
