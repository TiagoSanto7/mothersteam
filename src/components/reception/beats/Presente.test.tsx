import { render, screen, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Presente } from './Presente'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Presente', () => {
  it('shows intro line immediately', () => {
    render(<Presente mood="B" onEnter={() => {}} />)
    expect(screen.getByText(/queria deixar uma palavra/i)).toBeInTheDocument()
  })

  it('shows verse from Mateus for mood B (cansada)', () => {
    render(<Presente mood="B" onEnter={() => {}} />)
    act(() => {
      vi.advanceTimersByTime(2500)
    })
    expect(screen.getByText(/Mateus 11:28/i)).toBeInTheDocument()
  })

  it('shows verse from Filipenses for mood C (ansiosa)', () => {
    render(<Presente mood="C" onEnter={() => {}} />)
    act(() => {
      vi.advanceTimersByTime(2500)
    })
    expect(screen.getByText(/Filipenses 4:6-7/i)).toBeInTheDocument()
  })

  it('shows Entrar button after ~5s', () => {
    render(<Presente mood="A" onEnter={() => {}} />)
    expect(screen.queryByRole('button', { name: /entrar/i })).toBeNull()
    act(() => {
      vi.advanceTimersByTime(5500)
    })
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('calls onEnter when button clicked', () => {
    const onEnter = vi.fn()
    render(<Presente mood="D" onEnter={onEnter} />)
    act(() => {
      vi.advanceTimersByTime(5500)
    })
    const btn = screen.getByRole('button', { name: /entrar/i })
    fireEvent.click(btn)
    expect(onEnter).toHaveBeenCalledTimes(1)
  })
})
