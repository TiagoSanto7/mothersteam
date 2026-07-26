import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { ApiAdminCategory } from '../../lib/types';

interface CategoryFormState {
  name: string;
  slug: string;
  icon: string;
  sortOrder: number;
}

const EMPTY_FORM: CategoryFormState = { name: '', slug: '', icon: '🛍️', sortOrder: 0 };

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => apiFetch<ApiAdminCategory[]>('/admin/categories'),
  });

  const saveMutation = useMutation({
    mutationFn: (data: CategoryFormState) =>
      editId
        ? apiFetch(`/admin/categories/${editId}`, { method: 'PUT', body: JSON.stringify(data) })
        : apiFetch('/admin/categories', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_FORM);
      setError(null);
    },
    onError: () => setError('Erro ao salvar categoria. Verifique o slug.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-categories'] }),
  });

  function startEdit(cat: ApiAdminCategory) {
    setEditId(cat.id);
    setForm({ name: cat.name, slug: cat.slug, icon: cat.icon, sortOrder: cat.sortOrder });
    setShowForm(true);
    setError(null);
  }

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: editId ? f.slug : slugify(name) }));
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-graphite">Categorias</h1>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM); setError(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-sara-gold text-white text-sm font-semibold rounded-xl hover:bg-sara-gold/90 transition-colors"
        >
          <Plus size={16} /> Nova categoria
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <h2 className="text-sm font-semibold text-graphite mb-4">{editId ? 'Editar categoria' : 'Nova categoria'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-graphite-muted">Nome</label>
              <input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-graphite outline-none focus:border-sara-gold"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-graphite-muted">Slug</label>
              <input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-graphite outline-none focus:border-sara-gold"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-graphite-muted">Ícone (emoji)</label>
              <input
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                maxLength={4}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-graphite outline-none focus:border-sara-gold"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-graphite-muted">Ordem</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-graphite outline-none focus:border-sara-gold"
              />
            </div>
          </div>
          {error && <p className="text-xs text-sara-terracotta mt-3">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.name || !form.slug || saveMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-sara-gold text-white text-sm font-semibold rounded-xl disabled:opacity-50"
            >
              <Check size={14} /> {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditId(null); setError(null); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-graphite text-sm font-medium rounded-xl"
            >
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-graphite-muted text-sm">Carregando...</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-graphite-muted">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-graphite-muted">Slug</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-graphite-muted">Produtos</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-graphite-muted">Ordem</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map((cat) => (
                <tr key={cat.id} className={!cat.active ? 'opacity-40' : ''}>
                  <td className="px-4 py-3">
                    <span className="mr-2">{cat.icon}</span>
                    <span className="font-medium text-graphite">{cat.name}</span>
                  </td>
                  <td className="px-4 py-3 text-graphite-muted font-mono text-xs">{cat.slug}</td>
                  <td className="px-4 py-3 text-graphite-muted">{cat._count.products}</td>
                  <td className="px-4 py-3 text-graphite-muted">{cat.sortOrder}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => startEdit(cat)} aria-label="Editar" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-graphite-muted">
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Desativar "${cat.name}"?`)) deleteMutation.mutate(cat.id); }}
                        aria-label="Desativar"
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-sara-terracotta/10 text-sara-terracotta"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {categories.length === 0 && (
            <p className="text-center text-graphite-muted text-sm py-8">Nenhuma categoria cadastrada.</p>
          )}
        </div>
      )}
    </div>
  );
}
