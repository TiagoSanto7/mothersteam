import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, restoreSession } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import type { ApiUser } from '../lib/types';
import { AdminSidebar } from './components/AdminSidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductFormPage } from './pages/ProductFormPage';
import { CategoriesPage } from './pages/CategoriesPage';

export type AdminRoute = 'dashboard' | 'products' | 'products/new' | `products/${string}/edit` | 'categories'

function AdminLoginForm() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<{ accessToken: string; refreshToken: string; user: ApiUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      useAppStore.getState().setAuth(data.accessToken, data.user, data.refreshToken);
    } catch {
      setError('Email ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Painel Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Mothers Team</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5" htmlFor="admin-identifier">
              Email ou usuário
            </label>
            <input
              id="admin-identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="seu@email.com ou seunome"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5" htmlFor="admin-password">
              Senha
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={!identifier || !password || loading}
            className="w-full py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function AdminApp() {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const [restoring, setRestoring] = useState(true);
  const [route, setRoute] = useState<AdminRoute>('dashboard');
  const [editProductId, setEditProductId] = useState<string | null>(null);

  useEffect(() => {
    if (useAppStore.getState().isLoggedIn) {
      setRestoring(false);
      return;
    }
    // Mesmo restore do app (src/lib/api.ts): retry em falha transitória e
    // persistência do refresh token rotacionado (TIA-67). Sem sessão válida,
    // cai no formulário de login.
    (async () => {
      const result = await restoreSession();
      if (result.ok) useAppStore.getState().setAuth(result.accessToken, result.user);
      setRestoring(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: me, isLoading: loadingMe } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => apiFetch<ApiUser>('/auth/me'),
    enabled: isLoggedIn,
  });

  if (restoring || (isLoggedIn && loadingMe)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Carregando...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <AdminLoginForm />;
  }

  if (!me?.role || !['ADMIN', 'EDITOR', 'OFFICIAL'].includes(me.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-900 font-semibold mb-1">Sem permissão</p>
          <p className="text-gray-500 text-sm">Sua conta não tem acesso ao painel admin.</p>
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
