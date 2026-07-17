import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { QuickRegisterSheet } from './QuickRegisterSheet'
import { useAppStore } from '../../store/useAppStore'

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }))
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }))

function makeWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

beforeEach(() => {
  useAppStore.setState({ isLoggedIn: true, lastFeedSide: 'left' })
  mockApiFetch.mockResolvedValue({})
})

describe('QuickRegisterSheet', () => {
  it('pre-selects Direito when lastFeedSide is left', () => {
    useAppStore.setState({ lastFeedSide: 'left' })
    render(<QuickRegisterSheet open onClose={vi.fn()} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /direito/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /esquerdo/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('pre-selects Esquerdo when lastFeedSide is right', () => {
    useAppStore.setState({ lastFeedSide: 'right' })
    render(<QuickRegisterSheet open onClose={vi.fn()} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /esquerdo/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('switches selection when user taps the other side', () => {
    render(<QuickRegisterSheet open onClose={vi.fn()} />, { wrapper: makeWrapper() })
    // starts with Direito selected (lastFeedSide: left)
    fireEvent.click(screen.getByRole('button', { name: /esquerdo/i }))
    expect(screen.getByRole('button', { name: /esquerdo/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls POST /baby with type feed and the selected detail on submit', async () => {
    useAppStore.setState({ lastFeedSide: 'left' })
    render(<QuickRegisterSheet open onClose={vi.fn()} />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /confirmar mamada/i }))
    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/baby',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"detail":"Direito"'),
        }),
      ),
    )
  })

  it('calls onClose after successful registration', async () => {
    const onClose = vi.fn()
    render(<QuickRegisterSheet open onClose={onClose} />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /confirmar mamada/i }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<QuickRegisterSheet open onClose={onClose} />, { wrapper: makeWrapper() })
    const backdrop = document.querySelector('[data-testid="sheet-backdrop"]') ?? screen.getByRole('dialog').parentElement!
    fireEvent.click(backdrop!)
    expect(onClose).toHaveBeenCalled()
  })
})
