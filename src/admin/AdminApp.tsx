import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import type { ApiUser } from '../lib/types';
import { AdminSidebar } from './components/AdminSidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductFormPage } from './pages/ProductFormPage';
import { CategoriesPage } from './pages/CategoriesPage';

export type AdminRoute = 'dashboard' | 'products' | 'products/new' | `products/${string}/edit` | 'categories'

export function AdminApp() {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const [route, setRoute] = useState<AdminRoute>('dashboard');
  const [editProductId, setEditProductId] = useState<string | null>(null);

  const { data: me, isLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => apiFetch<ApiUser>('/auth/me'),
    enabled: isLoggedIn,
  });

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-sara-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-graphite font-semibold mb-2">Acesso restrito</p>
          <p className="text-graphite-muted text-sm">Faça login no app principal primeiro.</p>
          <a href="/" className="mt-4 inline-block text-sara-gold text-sm font-medium hover:underline">
            Ir para o app →
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="min-h-screen bg-sara-cream flex items-center justify-center"><p className="text-graphite-muted">Carregando...</p></div>;
  }

  if (!me?.role || !['ADMIN', 'EDITOR'].includes(me.role)) {
    return (
      <div className="min-h-screen bg-sara-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-graphite font-semibold mb-2">Sem permissão</p>
          <p className="text-graphite-muted text-sm">Você não tem acesso ao painel admin.</p>
          <a href="/" className="mt-4 inline-block text-sara-gold text-sm font-medium hover:underline">
            Voltar ao app →
          </a>
        </div>
      </div>
    );
  }

  function navigate(r: AdminRoute, productId?: string) {
    setRoute(r);
    if (productId) setEditProductId(productId);
    else if (r !== 'products/new' && !r.includes('edit')) setEditProductId(null);
  }

  function renderPage() {
    if (route === 'dashboard') return <DashboardPage />;
    if (route === 'products') return <ProductsPage onNew={() => navigate('products/new')} onEdit={(id) => navigate(`products/${id}/edit`, id)} />;
    if (route === 'products/new') return <ProductFormPage productId={null} onBack={() => navigate('products')} onSaved={() => navigate('products')} />;
    if (route.endsWith('/edit')) return <ProductFormPage productId={editProductId} onBack={() => navigate('products')} onSaved={() => navigate('products')} />;
    if (route === 'categories') return <CategoriesPage />;
    return <DashboardPage />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar activeRoute={route} onNavigate={navigate} role={me.role} />
      <main className="flex-1 overflow-y-auto">
        {renderPage()}
      </main>
    </div>
  );
}
