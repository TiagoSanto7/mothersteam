import { useState } from 'react';
import { ShoppingBag, ExternalLink, Star } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { ApiAdminProduct, ApiAdminCategory } from '../../lib/types';

interface ProductListResult {
  items: ApiAdminProduct[];
  hasMore: boolean;
  nextCursor?: string;
}

export function ShoppingScreen() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ['shopping-categories'],
    queryFn: () => apiFetch<ApiAdminCategory[]>('/products/categories'),
    staleTime: 5 * 60_000,
  });

  const params = new URLSearchParams({ limit: '20', ...(selectedCategory ? { categoryId: selectedCategory } : {}) });

  const { data, isLoading } = useQuery({
    queryKey: ['shopping-products', selectedCategory],
    queryFn: () => apiFetch<ProductListResult>(`/products?${params}`),
    staleTime: 60_000,
  });

  const clickMutation = useMutation({
    mutationFn: (productId: string) => apiFetch(`/products/${productId}/click`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping-products'] }),
  });

  const products = data?.items ?? [];
  const featured = products.filter((p) => p.featured);
  const rest = products.filter((p) => !p.featured);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pb-6">
        <div className="px-4 pt-4">
          <h1 className="text-base font-semibold text-graphite">Baby Team Store</h1>
        </div>
        <div className="grid grid-cols-2 gap-3 px-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl p-4 shadow-sm h-40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Fallback to static if no products in DB yet
  if (products.length === 0 && !isLoading) {
    return <StaticShoppingFallback />;
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="px-4 pt-4">
        <h1 className="text-base font-semibold text-graphite">Baby Team Store</h1>
        <p className="text-xs text-graphite-muted">Produtos selecionados para você e seu bebê</p>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setSelectedCategory('')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === '' ? 'bg-sara-gold text-white' : 'bg-white text-graphite-muted border border-sara-linen'
            }`}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(selectedCategory === c.id ? '' : c.id)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === c.id ? 'bg-sara-gold text-white' : 'bg-white text-graphite-muted border border-sara-linen'
              }`}
            >
              <span>{c.icon}</span> {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Featured products */}
      {featured.length > 0 && (
        <div className="px-4">
          <p className="text-[11px] font-semibold text-graphite-muted uppercase tracking-wide mb-2 flex items-center gap-1">
            <Star size={11} className="text-sara-gold" /> Em destaque
          </p>
          <div className="flex flex-col gap-3">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} onClick={() => clickMutation.mutate(p.id)} featured />
            ))}
          </div>
        </div>
      )}

      {/* Regular products grid */}
      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-3 px-4">
          {rest.map((p) => (
            <ProductCard key={p.id} product={p} onClick={() => clickMutation.mutate(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product: p, onClick, featured = false }: { product: ApiAdminProduct; onClick: () => void; featured?: boolean }) {
  function handleBuy() {
    onClick();
    if (p.affiliateUrl) window.open(p.affiliateUrl, '_blank', 'noopener,noreferrer');
  }

  if (featured) {
    return (
      <div className="bg-white rounded-3xl p-4 shadow-sm flex gap-3">
        {p.images[0] ? (
          <img src={p.images[0]} alt={p.name} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 bg-sara-linen" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-sara-linen flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={28} className="text-graphite-muted" />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <p className="text-xs text-graphite-muted">{p.category.name}</p>
          <p className="text-sm font-semibold text-graphite leading-tight">{p.name}</p>
          <p className="text-sm font-bold text-sara-gold">R$ {Number(p.price).toFixed(2)}</p>
          <button
            onClick={handleBuy}
            className="mt-auto flex items-center justify-center gap-1 w-full py-1.5 rounded-xl bg-sara-gold text-white text-xs font-semibold active:scale-95 transition-transform"
          >
            Ver produto <ExternalLink size={10} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-2">
      {p.images[0] ? (
        <img src={p.images[0]} alt={p.name} className="w-full h-28 rounded-2xl object-cover bg-sara-linen" />
      ) : (
        <div className="w-full h-28 rounded-2xl bg-sara-linen flex items-center justify-center">
          <ShoppingBag size={28} className="text-graphite-muted" />
        </div>
      )}
      <div>
        <p className="text-xs text-graphite-muted">{p.category.name}</p>
        <p className="text-sm font-medium text-graphite leading-tight">{p.name}</p>
      </div>
      <p className="text-sm font-bold text-sara-gold">R$ {Number(p.price).toFixed(2)}</p>
      <button
        onClick={handleBuy}
        className="w-full py-2 rounded-xl bg-sara-gold text-white text-xs font-semibold active:scale-95 transition-transform flex items-center justify-center gap-1"
      >
        Ver produto <ExternalLink size={10} />
      </button>
    </div>
  );
}

function StaticShoppingFallback() {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="px-4 pt-4">
        <h1 className="text-base font-semibold text-graphite">Baby Team Store</h1>
        <p className="text-xs text-graphite-muted">Produtos selecionados para você e seu bebê</p>
      </div>
      <div className="mx-4 rounded-3xl bg-gradient-to-br from-sara-terracotta to-sara-gold p-5 text-white">
        <p className="text-xs font-medium opacity-80 mb-1">Em breve</p>
        <p className="text-base font-bold leading-snug">Seus produtos Baby Team a um clique</p>
        <p className="text-xs opacity-75 mt-1">A loja está sendo preparada — volte em breve!</p>
      </div>
    </div>
  );
}
