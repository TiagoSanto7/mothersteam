import { render, screen, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Presente } from './Presente'

// Faz o SaraSays entregar onSpeechEnd assim que monta, sem depender do hook TTS real.
vi.mock('../SaraSays', () => ({
  SaraSays: ({
    message,
    onSpeechEnd,
  }: {
    message: string
    onSpeechEnd?: () => void
  }) => {
    if (onSpeechEnd) queueMicrotask(onSpeechEnd)
    return <p>{message}</p>
  },
}))

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

  it('shows verse from Mateus for mood B (cansada) after 2s', async () => {
    render(<Presente mood="B" onEnter={() => {}} />)
    await act(async () => { await Promise.resolve() })
    act(() => { vi.advanceTimersByTime(2100) })
    expect(screen.getByText(/Mateus 11:28/i)).toBeInTheDocument()
  })

  it('shows verse from Filipenses for mood C (ansiosa) after 2s', async () => {
    render(<Presente mood="C" onEnter={() => {}} />)
    await act(async () => { await Promise.resolve() })
    act(() => { vi.advanceTimersByTime(2100) })
    expect(screen.getByText(/Filipenses 4:6/i)).toBeInTheDocument()
  })

  it('shows Entrar button 3s after speech ends', async () => {
    render(<Presente mood="A" onEnter={() => {}} />)
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByRole('button', { name: /entrar/i })).toBeNull()
    act(() => { vi.advanceTimersByTime(3100) })
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('calls onEnter when button clicked', async () => {
    const onEnter = vi.fn()
    render(<Presente mood="D" onEnter={onEnter} />)
    await act(async () => { await Promise.resolve() })
    act(() => { vi.advanceTimersByTime(3100) })
    const btn = screen.getByRole('button', { name: /entrar/i })
    fireEvent.click(btn)
    expect(onEnter).toHaveBeenCalledTimes(1)
  })
})
