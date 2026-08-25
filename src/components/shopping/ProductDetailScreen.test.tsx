import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProductDetailScreen } from './ProductDetailScreen'

vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({
    id: 'p1',
    type: 'affiliate',
    name: 'Produto Teste',
    description: 'desc',
    price: '99.90',
    images: [],
    phases: [],
    categoryId: 'c1',
    category: { id: 'c1', name: 'Bebê', slug: 'bebe', icon: '🍼' },
    mercadoLivreUrl: 'https://produto.mercadolivre.com.br/MLB-123',
    reviewsSummary: { average: 0, count: 0, distribution: {} },
    reviews: [],
    inWishlist: false,
    related: [],
  }),
  resolveApiUrl: (path: string) => `https://api.test${path}`,
}))

function renderWith(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('ProductDetailScreen — Comprar no ML CTA', () => {
  it('shows "Comprar no Mercado Livre" button that opens the mercadoLivreUrl via /comprar endpoint', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    renderWith(<ProductDetailScreen productId="p1" productType="affiliate" onBack={vi.fn()} onOpenProduct={vi.fn()} onOpenReviews={vi.fn()} onOpenCart={vi.fn()} />)
    const btn = await screen.findByRole('button', { name: /comprar no mercado livre/i })
    fireEvent.click(btn)
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('/products/p1/comprar'),
      '_blank'
    )
    openSpy.mockRestore()
  })
})
