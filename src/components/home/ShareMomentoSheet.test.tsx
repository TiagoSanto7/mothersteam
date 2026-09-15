import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ShareMomentoSheet } from './ShareMomentoSheet'
import { useAppStore } from '../../store/useAppStore'

vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn(async () => []),
}))

beforeEach(() => {
  useAppStore.setState({ pendingShareContent: null, isLoggedIn: true, currentUserId: 'u1' })
})

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  verso: 'Venham a mim, todos os que estão cansados.',
  referencia: 'Mateus 11:28',
  oracao: 'Senhor, eu chego até Ti com esse cansaço.',
  onShareToFeed: vi.fn(),
  onShareToCommunity: vi.fn(),
}

function renderWithQC(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('ShareMomentoSheet', () => {
  it('does not render when open is false', () => {
    renderWithQC(<ShareMomentoSheet {...defaultProps} open={false} />)
    expect(screen.queryByText(/compartilhar versículo/i)).toBeNull()
  })

  it('renders toggle and 3 action buttons when open', () => {
    renderWithQC(<ShareMomentoSheet {...defaultProps} />)
    expect(screen.getByRole('button', { name: /com oração/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /compartilhar com amigos/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /publicar no feed/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /compartilhar em comunidade/i })).toBeTruthy()
  })

  it('"Compartilhar com amigos" opens the friend picker sub-sheet', () => {
    renderWithQC(<ShareMomentoSheet {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /compartilhar com amigos/i }))
    // Sub-sheet renders header "Enviar para"
    expect(screen.getByText(/enviar para/i)).toBeTruthy()
  })

  it('"Publicar no feed" calls onShareToFeed with the text content (includes oração by default)', () => {
    const onShareToFeed = vi.fn()
    renderWithQC(<ShareMomentoSheet {...defaultProps} onShareToFeed={onShareToFeed} />)
    fireEvent.click(screen.getByRole('button', { name: /publicar no feed/i }))
    expect(onShareToFeed).toHaveBeenCalledWith(expect.stringContaining('Mateus 11:28'))
    expect(onShareToFeed).toHaveBeenCalledWith(expect.stringContaining('Senhor, eu chego'))
  })

  it('"Compartilhar em comunidade" opens the community picker sub-sheet', () => {
    renderWithQC(<ShareMomentoSheet {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /compartilhar em comunidade/i }))
    expect(screen.getByText(/escolha a comunidade/i)).toBeTruthy()
  })

  it('toggle "só o versículo" removes oração from the shared text', () => {
    const onShareToFeed = vi.fn()
    renderWithQC(<ShareMomentoSheet {...defaultProps} onShareToFeed={onShareToFeed} />)
    fireEvent.click(screen.getByRole('button', { name: /só o versículo/i }))
    fireEvent.click(screen.getByRole('button', { name: /publicar no feed/i }))
    expect(onShareToFeed).toHaveBeenCalledWith(expect.not.stringContaining('Senhor, eu chego'))
  })
})
