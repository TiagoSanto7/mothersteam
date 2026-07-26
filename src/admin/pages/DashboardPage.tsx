import { BarChart2, Package, Tag, MousePointerClick } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { ApiAdminDashboard, ApiClickStat } from '../../lib/types';

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-2xl font-bold text-graphite">{value}</p>
        <p className="text-xs text-graphite-muted">{label}</p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiFetch<ApiAdminDashboard>('/admin/dashboard'),
  });

  const { data: clicks } = useQuery({
    queryKey: ['admin-analytics-clicks'],
    queryFn: () => apiFetch<ApiClickStat[]>('/admin/analytics/clicks?days=30'),
  });

  if (isLoading) return <div className="p-8 text-graphite-muted">Carregando...</div>;

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-xl font-bold text-graphite mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total de produtos" value={stats?.totalProducts ?? 0} icon={Package} color="bg-sara-gold/10 text-sara-gold" />
        <StatCard label="Produtos ativos" value={stats?.activeProducts ?? 0} icon={Package} color="bg-green-50 text-green-600" />
        <StatCard label="Categorias" value={stats?.totalCategories ?? 0} icon={Tag} color="bg-sara-terracotta/10 text-sara-terracotta" />
        <StatCard label="Cliques (30 dias)" value={stats?.totalClicks30d ?? 0} icon={MousePointerClick} color="bg-blue-50 text-blue-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-graphite mb-4 flex items-center gap-2">
            <BarChart2 size={16} /> Top produtos (cliques)
          </h2>
          {stats?.topProducts?.length ? (
            <ul className="flex flex-col gap-3">
              {stats.topProducts.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-sara-linen text-graphite-muted text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <p className="text-sm text-graphite flex-1 truncate">{p.name}</p>
                  <span className="text-xs font-semibold text-sara-gold">{p._count.clicks}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-graphite-muted">Nenhum produto ainda.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-graphite mb-4 flex items-center gap-2">
            <MousePointerClick size={16} /> Cliques por produto (30 dias)
          </h2>
          {clicks?.length ? (
            <ul className="flex flex-col gap-3">
              {clicks.slice(0, 5).map((c) => (
                <li key={c.productId} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-graphite truncate">{c.productName}</p>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-sara-gold rounded-full"
                        style={{ width: `${Math.min(100, (c.clicks / (clicks[0]?.clicks || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-graphite-muted flex-shrink-0">{c.clicks}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-graphite-muted">Nenhum clique registrado ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
