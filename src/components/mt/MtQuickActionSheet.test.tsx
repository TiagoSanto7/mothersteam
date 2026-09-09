import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MtQuickActionSheet } from './MtQuickActionSheet'

describe('MtQuickActionSheet', () => {
  const baseProps = {
    open: true,
    onClose: vi.fn(),
    onMaeIA: vi.fn(),
    onNewPost: vi.fn(),
    onAddRoutine: vi.fn(),
    onRegisterBaby: vi.fn(),
  }

  beforeEach(() => vi.clearAllMocks())

  it('does not render when open=false', () => {
    render(<MtQuickActionSheet {...baseProps} open={false} />)
    expect(screen.queryByText(/falar com a sara/i)).not.toBeInTheDocument()
  })

  it('renders 4 action buttons with correct labels', () => {
    render(<MtQuickActionSheet {...baseProps} />)
    expect(screen.getByRole('button', { name: /falar com a sara/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /novo post/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /adicionar rotina/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /registrar bebê/i })).toBeInTheDocument()
  })

  it('Sara click fires onMaeIA and onClose', () => {
    render(<MtQuickActionSheet {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /falar com a sara/i }))
    expect(baseProps.onMaeIA).toHaveBeenCalled()
    expect(baseProps.onClose).toHaveBeenCalled()
  })

  it('backdrop click closes', () => {
    render(<MtQuickActionSheet {...baseProps} />)
    fireEvent.click(screen.getByTestId('mt-sheet-backdrop'))
    expect(baseProps.onClose).toHaveBeenCalled()
  })
})
