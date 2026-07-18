import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MomentoDeusScreen } from './MomentoDeusScreen'
import { useAppStore } from '../../store/useAppStore'

beforeEach(() => {
  useAppStore.setState({ savedVerses: [] })
})

describe('MomentoDeusScreen — salvos button', () => {
  it('renders the "Salvos" button in the action bar', () => {
    render(<MomentoDeusScreen open onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /ver versículos salvos/i })).toBeTruthy()
  })

  it('opens SavedVersesScreen when "Salvos" button is tapped', () => {
    render(<MomentoDeusScreen open onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /ver versículos salvos/i }))
    expect(screen.getByRole('dialog', { name: /versículos salvos/i })).toBeTruthy()
  })
})
