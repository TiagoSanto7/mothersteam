import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SavedVersesScreen } from './SavedVersesScreen'
import { useAppStore } from '../../store/useAppStore'

beforeEach(() => {
  useAppStore.setState({ savedVerses: [] })
})

describe('SavedVersesScreen', () => {
  it('does not render when open is false', () => {
    useAppStore.setState({ savedVerses: ['Mateus 11:28'] })
    render(<SavedVersesScreen open={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows empty state when no verses saved', () => {
    useAppStore.setState({ savedVerses: [] })
    render(<SavedVersesScreen open onClose={vi.fn()} />)
    expect(screen.getByText(/ainda não salvou nenhum versículo/i)).toBeTruthy()
  })

  it('shows verse text for a saved reference', () => {
    useAppStore.setState({ savedVerses: ['Mateus 11:28'] })
    render(<SavedVersesScreen open onClose={vi.fn()} />)
    expect(screen.getByText(/cansados e sobrecarregados/i)).toBeTruthy()
    expect(screen.getByText('Mateus 11:28')).toBeTruthy()
  })

  it('calls unsaveVerse when remove button is tapped', () => {
    useAppStore.setState({ savedVerses: ['Mateus 11:28'] })
    render(<SavedVersesScreen open onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /remover/i }))
    expect(useAppStore.getState().savedVerses).toEqual([])
  })

  it('calls onClose when × button is tapped', () => {
    const onClose = vi.fn()
    useAppStore.setState({ savedVerses: [] })
    render(<SavedVersesScreen open onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
