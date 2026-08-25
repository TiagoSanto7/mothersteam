import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ShoppingScreen } from './ShoppingScreen'

vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
  resolveApiUrl: (p: string) => p,
}))

function renderWith(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

const defaultProps = {
  onOpenProduct: vi.fn(),
  onOpenCart: vi.fn(),
  onOpenOrder: vi.fn(),
}

describe('ShoppingScreen — pivot to ML-only', () => {
  it('has only Produtos and Favoritos tabs — no Pedidos', () => {
    renderWith(<ShoppingScreen {...defaultProps} />)
    const produtosMatch = screen.queryAllByText(/produtos/i)
    const favoritosMatch = screen.queryAllByText(/favoritos/i)
    const pedidosMatch = screen.queryAllByText(/pedidos/i)
    expect(produtosMatch.length).toBeGreaterThan(0)
    expect(favoritosMatch.length).toBeGreaterThan(0)
    expect(pedidosMatch.length).toBe(0)
  })

  it('does not render a cart button or badge', () => {
    renderWith(<ShoppingScreen {...defaultProps} />)
    expect(screen.queryByRole('button', { name: /carrinho|cart/i })).not.toBeInTheDocument()
  })
})
