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
  it('does not show any Sara narration — just the verse (TIA-24)', async () => {
    render(<Presente mood="B" onEnter={() => {}} />)
    await act(async () => { vi.advanceTimersByTime(500) })
    expect(screen.queryByText(/queria deixar uma palavra/i)).toBeNull()
  })

  it('shows verse from Mateus for mood B (cansada) after a short fade-in', async () => {
    render(<Presente mood="B" onEnter={() => {}} />)
    expect(screen.queryByText(/Mateus 11:28/i)).toBeNull()
    await act(async () => { vi.advanceTimersByTime(500) })
    expect(screen.getByText(/Mateus 11:28/i)).toBeInTheDocument()
  })

  it('shows verse from Filipenses for mood C (ansiosa) after a short fade-in', async () => {
    render(<Presente mood="C" onEnter={() => {}} />)
    await act(async () => { vi.advanceTimersByTime(500) })
    expect(screen.getByText(/Filipenses 4:6/i)).toBeInTheDocument()
  })

  it('shows Entrar button only after the contemplative pause', async () => {
    render(<Presente mood="A" onEnter={() => {}} />)
    expect(screen.queryByRole('button', { name: /entrar/i })).toBeNull()
    await act(async () => { vi.advanceTimersByTime(3000) })
    expect(screen.queryByRole('button', { name: /entrar/i })).toBeNull()
    await act(async () => { vi.advanceTimersByTime(500) })
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('calls onEnter when button clicked', async () => {
    const onEnter = vi.fn()
    render(<Presente mood="D" onEnter={onEnter} />)
    await act(async () => { vi.advanceTimersByTime(3500) })
    const btn = screen.getByRole('button', { name: /entrar/i })
    fireEvent.click(btn)
    expect(onEnter).toHaveBeenCalledTimes(1)
  })
})
