import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MomentoDeusCard } from './MomentoDeusCard'
import { useAppStore } from '../../store/useAppStore'

beforeEach(() => {
  useAppStore.setState({ isLoggedIn: true })
})

describe('MomentoDeusCard — convite', () => {
  it('renders "Separe um minuto." headline', () => {
    render(<MomentoDeusCard onClick={vi.fn()} />)
    expect(screen.getByText('Separe um minuto.')).toBeTruthy()
  })

  it('renders "Tem uma palavra para você." subtitle', () => {
    render(<MomentoDeusCard onClick={vi.fn()} />)
    expect(screen.getByText('Tem uma palavra para você.')).toBeTruthy()
  })

  it('renders "Entrar nesse momento →" CTA', () => {
    render(<MomentoDeusCard onClick={vi.fn()} />)
    expect(screen.getByText('Entrar nesse momento →')).toBeTruthy()
  })

  it('calls onClick when tapped', () => {
    const onClick = vi.fn()
    render(<MomentoDeusCard onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: /abrir momento com deus/i }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
