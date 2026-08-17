import { useState } from 'react';
import { ChevronLeft, Plus, Pencil, ToggleLeft, ToggleRight, ExternalLink, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { ApiAdminProduct, ApiAdminCategory, ApiAdminDashboard, ApiAdminProductList } from '../../lib/types';

interface Props { onBack: () => void }

type AdminView = 'dashboard' | 'products' | 'own-products' | 'categories' | 'product-form' | 'own-product-form';

interface ApiOwnProductAdmin {
  id: string
  name: string
  description: string
  price: string | number
  images: string[]
  stock: number
  sku?: string | null
  featured: boolean
  active: boolean
  categoryId: string
  category: { id: string; name: string; slug: string }
}

interface ApiOwnProductListAdmin {
  items: ApiOwnProductAdmin[]
  total: number
  page: number
  totalPages: number
}

const PHASE_LABELS: Record<string, string> = {
  trimester1: '1º Trimestre',
  trimester2: '2º Trimestre',
  trimester3: '3º Trimestre',
  postpartum_0_30: 'Pós-parto 0-30d',
  postpartum_31_180: 'Pós-parto 31-180d',
  postpartum_181_365: 'Pós-parto 181-365d',
};

function DashboardView({ onNavigate }: { onNavigate: (v: AdminView) => void }) {
  const { data } = useQuery<ApiAdminDashboard>({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => apiFetch('/admin/dashboard'),
  });

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Produtos ativos', value: data?.activeProducts ?? '—' },
          { label: 'Total produtos', value: data?.totalProducts ?? '—' },
          { label: 'Categorias', value: data?.totalCategories ?? '—' },
          { label: 'Cliques 30d', value: data?.totalClicks30d ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl px-4 py-3">
            <p className="text-xl font-bold text-graphite">{value}</p>
            <p className="text-[11px] text-graphite-muted">{label}</p>
          </div>
        ))}
      </div>

      {data?.topProducts && data.topProducts.length > 0 && (
        <div className="bg-white rounded-2xl px-4 py-3">
          <p className="text-[11px] font-semibold text-graphite-muted uppercase tracking-wide mb-2">Top produtos</p>
          {data.topProducts.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
              <p className="text-sm text-graphite truncate max-w-[220px]">{p.name}</p>
              <span className="text-xs font-semibold text-sara-gold">{p._count.clicks} cliques</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={() => onNavigate('own-products')}
          className="w-full py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform"
        >
          Produtos Próprios
        </button>
        <button
          onClick={() => onNavigate('products')}
          className="w-full py-3 rounded-2xl bg-white border border-sara-linen text-sm font-semibold text-graphite active:scale-95 transition-transform"
        >
          Produtos Afiliados
        </button>
        <button
          onClick={() => onNavigate('categories')}
          className="w-full py-3 rounded-2xl bg-white border border-sara-linen text-sm font-semibold text-graphite active:scale-95 transition-transform"
        >
          Gerenciar Categorias
        </button>
      </div>
    </div>
  );
}

// ── Produtos Próprios ──────────────────────────────────────────

function OwnProductsView({ onNew, onEdit }: { onNew: () => void; onEdit: (p: ApiOwnProductAdmin) => void }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data } = useQuery<ApiOwnProductListAdmin>({
    queryKey: ['admin', 'own-products', page],
    queryFn: () => apiFetch(`/admin/own-products?page=${page}&limit=20`),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiFetch(`/admin/own-products/${id}`, { method: 'PUT', body: JSON.stringify({ active }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'own-products'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/own-products/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'own-products'] }),
  });

  const products = data?.items ?? [];

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <button
        onClick={onNew}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl bg-sara-gold text-white text-sm font-semibold"
      >
        <Plus size={16} /> Novo produto próprio
      </button>

      {products.map((p) => (
        <div key={p.id} className="bg-white rounded-2xl px-4 py-3 flex items-start gap-3">
          {p.images[0] && (
            <img src={p.images[0]} alt={p.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-graphite truncate">{p.name}</p>
            <p className="text-xs text-graphite-muted">
              R$ {Number(p.price).toFixed(2)} · {p.category.name}
            </p>
            <p className="text-[10px] text-graphite-muted/70 mt-0.5">
              Estoque: {p.stock}{p.sku ? ` · SKU: ${p.sku}` : ''}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <button onClick={() => toggleMutation.mutate({ id: p.id, active: !p.active })}>
              {p.active
                ? <ToggleRight size={20} className="text-sara-gold" />
                : <ToggleLeft size={20} className="text-gray-300" />}
            </button>
            <button onClick={() => onEdit(p)}>
              <Pencil size={14} className="text-graphite-muted" />
            </button>
            <button
              onClick={() => {
                if (confirm(`Excluir "${p.name}"?`)) deleteMutation.mutate(p.id)
              }}
            >
              <Trash2 size={14} className="text-sara-terracotta" />
            </button>
          </div>
        </div>
      ))}

      {products.length === 0 && (
        <p className="text-center text-sm text-graphite-muted py-8">Nenhum produto próprio cadastrado.</p>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="text-sm text-sara-gold disabled:opacity-30">
            ← Anterior
          </button>
          <span className="text-xs text-graphite-muted">{page} / {data.totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="text-sm text-sara-gold disabled:opacity-30">
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}

function OwnProductForm({ product, onBack }: { product?: ApiOwnProductAdmin; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { data: cats } = useQuery<{ items: ApiAdminCategory[] }>({
    queryKey: ['admin', 'categories'],
    queryFn: () => apiFetch('/admin/categories'),
  });

  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [stock, setStock] = useState(product ? String(product.stock) : '0');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<string[]>(product?.images ?? []);

  function addImage() {
    const url = imageUrl.trim();
    if (url && !images.includes(url)) {
      setImages((prev) => [...prev, url]);
      setImageUrl('');
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock, 10),
        sku: sku || null,
        categoryId,
        featured,
        images,
      };
      if (product) {
        return apiFetch(`/admin/own-products/${product.id}`, { method: 'PUT', body: JSON.stringify(body) });
      }
      return apiFetch('/admin/own-products', { method: 'POST', body: JSON.stringify(body) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'own-products'] });
      onBack();
    },
  });

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-sara-linen text-sm text-graphite bg-white focus:outline-none focus:border-sara-gold';

  return (
    <div className="flex flex-col gap-4 px-4 py-4 overflow-y-auto flex-1">
      <div>
        <p className="text-xs text-graphite-muted mb-1">Nome</p>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do produto" />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <p className="text-xs text-graphite-muted mb-1">Preço (R$)</p>
          <input className={inputClass} type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
        </div>
        <div className="w-28">
          <p className="text-xs text-graphite-muted mb-1">Estoque</p>
          <input className={inputClass} type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
        </div>
      </div>

      <div>
        <p className="text-xs text-graphite-muted mb-1">SKU (opcional)</p>
        <input className={inputClass} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="ex: VIT-D-100ML" />
      </div>

      <div>
        <p className="text-xs text-graphite-muted mb-1">Descrição</p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl border border-sara-linen text-sm text-graphite bg-white resize-none focus:outline-none focus:border-sara-gold"
        />
      </div>

      <div>
        <p className="text-xs text-graphite-muted mb-1">Categoria</p>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
          <option value="">Selecione...</option>
          {(cats?.items ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-xs text-graphite-muted mb-1">Imagens (URLs)</p>
        <div className="flex gap-2 mb-2">
          <input
            className={`${inputClass} flex-1`}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            onKeyDown={(e) => e.key === 'Enter' && addImage()}
          />
          <button onClick={addImage} className="px-3 py-2 rounded-xl bg-sara-gold text-white text-xs font-semibold flex-shrink-0">
            Adicionar
          </button>
        </div>
        {images.map((url, i) => (
          <div key={i} className="flex items-center gap-2 mb-1.5">
            <img src={url} alt="" className="w-8 h-8 rounded-lg object-cover bg-sara-linen flex-shrink-0" />
            <p className="text-xs text-graphite-muted flex-1 truncate">{url}</p>
            <button onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))} className="text-sara-terracotta text-xs flex-shrink-0">
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3">
        <p className="text-sm text-graphite">Destaque</p>
        <button
          onClick={() => setFeatured(!featured)}
          className={`w-10 h-6 rounded-full relative transition-colors ${featured ? 'bg-sara-gold' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${featured ? 'translate-x-[18px]' : ''}`} />
        </button>
      </div>

      <button
        onClick={() => saveMutation.mutate()}
        disabled={!name || !price || !categoryId || saveMutation.isPending}
        className="w-full py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold disabled:opacity-40"
      >
        {saveMutation.isPending ? 'Salvando...' : product ? 'Salvar alterações' : 'Criar produto'}
      </button>
    </div>
  );
}

// ── Produtos Afiliados ─────────────────────────────────────────

function ProductsView({ onNewProduct, onEditProduct }: { onNewProduct: () => void; onEditProduct: (p: ApiAdminProduct) => void }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data } = useQuery<ApiAdminProductList>({
    queryKey: ['admin', 'products', page],
    queryFn: () => apiFetch(`/admin/products?page=${page}&limit=20`),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiFetch(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  });

  const products = data?.items ?? [];

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <button
        onClick={onNewProduct}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl bg-sara-gold text-white text-sm font-semibold"
      >
        <Plus size={16} /> Novo produto afiliado
      </button>

      {products.map((p) => (
        <div key={p.id} className="bg-white rounded-2xl px-4 py-3 flex items-start gap-3">
          {p.images[0] && (
            <img src={p.images[0]} alt={p.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-graphite truncate">{p.name}</p>
            <p className="text-xs text-graphite-muted">R$ {Number(p.price).toFixed(2)} · {p.category.name}</p>
            <p className="text-[10px] text-graphite-muted/70 mt-0.5">
              {p.phases.map((ph) => PHASE_LABELS[ph]).join(', ')}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <button onClick={() => toggleMutation.mutate({ id: p.id, active: !p.active })}>
              {p.active
                ? <ToggleRight size={20} className="text-sara-gold" />
                : <ToggleLeft size={20} className="text-gray-300" />}
            </button>
            <button onClick={() => onEditProduct(p)}>
              <Pencil size={14} className="text-graphite-muted" />
            </button>
            {p.affiliateUrl && (
              <a href={p.affiliateUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} className="text-graphite-muted" />
              </a>
            )}
          </div>
        </div>
      ))}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="text-sm text-sara-gold disabled:opacity-30">
            ← Anterior
          </button>
          <span className="text-xs text-graphite-muted">{page} / {data.totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="text-sm text-sara-gold disabled:opacity-30">
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}

function CategoriesView() {
  const { data } = useQuery<{ items: ApiAdminCategory[] }>({
    queryKey: ['admin', 'categories'],
    queryFn: () => apiFetch('/admin/categories'),
  });

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      {(data?.items ?? []).map((cat) => (
        <div key={cat.id} className="bg-white rounded-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">{cat.icon}</span>
            <div>
              <p className="text-sm font-semibold text-graphite">{cat.name}</p>
              <p className="text-xs text-graphite-muted">{cat._count.products} produtos</p>
            </div>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cat.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-graphite-muted'}`}>
            {cat.active ? 'Ativa' : 'Inativa'}
          </span>
        </div>
      ))}
    </div>
  );
}

function ProductForm({ product, onBack }: { product?: ApiAdminProduct; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { data: cats } = useQuery<{ items: ApiAdminCategory[] }>({
    queryKey: ['admin', 'categories'],
    queryFn: () => apiFetch('/admin/categories'),
  });

  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [affiliateUrl, setAffiliateUrl] = useState(product?.affiliateUrl ?? '');
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [selectedPhases, setSelectedPhases] = useState<string[]>(product?.phases ?? []);

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        name, description,
        price: parseFloat(price),
        affiliateUrl: affiliateUrl || null,
        categoryId,
        featured,
        phases: selectedPhases,
      };
      if (product) {
        return apiFetch(`/admin/products/${product.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      }
      return apiFetch('/admin/products', { method: 'POST', body: JSON.stringify(body) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      onBack();
    },
  });

  function togglePhase(ph: string) {
    setSelectedPhases((prev) => prev.includes(ph) ? prev.filter((p) => p !== ph) : [...prev, ph]);
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-sara-linen text-sm text-graphite bg-white focus:outline-none focus:border-sara-gold';

  return (
    <div className="flex flex-col gap-4 px-4 py-4 overflow-y-auto flex-1">
      {[
        { label: 'Nome', value: name, set: setName, placeholder: 'Nome do produto' },
        { label: 'Preço (R$)', value: price, set: setPrice, placeholder: '0.00', type: 'number' },
        { label: 'URL afiliado', value: affiliateUrl, set: setAffiliateUrl, placeholder: 'https://...' },
      ].map(({ label, value, set, placeholder, type }) => (
        <div key={label}>
          <p className="text-xs text-graphite-muted mb-1">{label}</p>
          <input
            type={type ?? 'text'}
            value={value}
            onChange={(e) => set(e.target.value)}
            placeholder={placeholder}
            className={inputClass}
          />
        </div>
      ))}

      <div>
        <p className="text-xs text-graphite-muted mb-1">Descrição</p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl border border-sara-linen text-sm text-graphite bg-white resize-none focus:outline-none focus:border-sara-gold"
        />
      </div>

      <div>
        <p className="text-xs text-graphite-muted mb-1">Categoria</p>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
          <option value="">Selecione...</option>
          {(cats?.items ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-xs text-graphite-muted mb-2">Fases</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PHASE_LABELS).map(([ph, label]) => (
            <button
              key={ph}
              type="button"
              onClick={() => togglePhase(ph)}
              className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                selectedPhases.includes(ph)
                  ? 'bg-sara-gold text-white border-sara-gold'
                  : 'bg-white text-graphite-muted border-sara-linen'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3">
        <p className="text-sm text-graphite">Destaque</p>
        <button
          onClick={() => setFeatured(!featured)}
          className={`w-10 h-6 rounded-full relative transition-colors ${featured ? 'bg-sara-gold' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${featured ? 'translate-x-[18px]' : ''}`} />
        </button>
      </div>

      <button
        onClick={() => saveMutation.mutate()}
        disabled={!name || !price || !categoryId || saveMutation.isPending}
        className="w-full py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold disabled:opacity-40"
      >
        {saveMutation.isPending ? 'Salvando...' : product ? 'Salvar alterações' : 'Criar produto'}
      </button>
    </div>
  );
}

// ── AdminPanel ─────────────────────────────────────────────────

export function AdminPanel({ onBack }: Props) {
  const [view, setView] = useState<AdminView>('dashboard');
  const [editingProduct, setEditingProduct] = useState<ApiAdminProduct | undefined>();
  const [editingOwnProduct, setEditingOwnProduct] = useState<ApiOwnProductAdmin | undefined>();

  const titles: Record<AdminView, string> = {
    dashboard: 'Admin · Loja',
    products: 'Produtos Afiliados',
    'own-products': 'Produtos Próprios',
    categories: 'Categorias',
    'product-form': editingProduct ? 'Editar produto' : 'Novo produto afiliado',
    'own-product-form': editingOwnProduct ? 'Editar produto próprio' : 'Novo produto próprio',
  };

  function handleBack() {
    if (view === 'product-form') { setView('products'); setEditingProduct(undefined); return; }
    if (view === 'own-product-form') { setView('own-products'); setEditingOwnProduct(undefined); return; }
    if (view !== 'dashboard') { setView('dashboard'); return; }
    onBack();
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF]">
      <div className="flex items-center gap-3 px-4 pt-6 pb-3 border-b border-sara-linen/60 flex-shrink-0">
        <button onClick={handleBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <h1 className="text-base font-semibold text-graphite">{titles[view]}</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {view === 'dashboard' && <DashboardView onNavigate={setView} />}
        {view === 'own-products' && (
          <OwnProductsView
            onNew={() => { setEditingOwnProduct(undefined); setView('own-product-form'); }}
            onEdit={(p) => { setEditingOwnProduct(p); setView('own-product-form'); }}
          />
        )}
        {view === 'own-product-form' && (
          <OwnProductForm
            product={editingOwnProduct}
            onBack={() => { setView('own-products'); setEditingOwnProduct(undefined); }}
          />
        )}
        {view === 'products' && (
          <ProductsView
            onNewProduct={() => { setEditingProduct(undefined); setView('product-form'); }}
            onEditProduct={(p) => { setEditingProduct(p); setView('product-form'); }}
          />
        )}
        {view === 'categories' && <CategoriesView />}
        {view === 'product-form' && (
          <ProductForm
            product={editingProduct}
            onBack={() => { setView('products'); setEditingProduct(undefined); }}
          />
        )}
      </div>
    </div>
  );
}
