import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MtChip } from './MtChip'

describe('MtChip', () => {
  it('renders label with pink-soft bg (default)', () => {
    render(<MtChip>Gestação</MtChip>)
    const el = screen.getByText('Gestação')
    expect(el.className).toMatch(/bg-mt-pink-soft/)
    expect(el.className).toMatch(/text-mt-rose-dark/)
    expect(el.className).toMatch(/rounded-mt-pill/)
  })

  it('active variant uses gradient bg and white text', () => {
    render(<MtChip active>Gestação</MtChip>)
    const el = screen.getByText('Gestação')
    expect(el.className).toMatch(/bg-mt-gradient/)
    expect(el.className).toMatch(/text-white/)
  })

  it('fires onClick when interactive', () => {
    const onClick = vi.fn()
    render(<MtChip onClick={onClick}>x</MtChip>)
    fireEvent.click(screen.getByText('x'))
    expect(onClick).toHaveBeenCalled()
  })
})
