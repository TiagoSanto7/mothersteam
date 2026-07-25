import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, X, Upload } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, uploadImage } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiAdminProduct, ApiAdminCategory, Phase } from '../../lib/types';

const PHASES: { value: Phase; label: string }[] = [
  { value: 'trimester1', label: '1º Trimestre' },
  { value: 'trimester2', label: '2º Trimestre' },
  { value: 'trimester3', label: '3º Trimestre' },
  { value: 'postpartum_0_30', label: 'Pós-parto 0-30 dias' },
  { value: 'postpartum_31_180', label: 'Pós-parto 1-6 meses' },
  { value: 'postpartum_181_365', label: 'Pós-parto 6-12 meses' },
];

interface FormState {
  name: string;
  description: string;
  price: string;
  affiliateUrl: string;
  categoryId: string;
  stock: string;
  featured: boolean;
  active: boolean;
  phases: Phase[];
  images: string[];
}

const EMPTY: FormState = {
  name: '', description: '', price: '', affiliateUrl: '',
  categoryId: '', stock: '', featured: false, active: true, phases: [], images: [],
};

interface ProductFormPageProps {
  productId: string | null;
  onBack: () => void;
  onSaved: () => void;
}

export function ProductFormPage({ productId, onBack, onSaved }: ProductFormPageProps) {
  const queryClient = useQueryClient();
  const accessToken = useAppStore((s) => s.accessToken);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');

  const isEdit = !!productId;

  const { data: existing } = useQuery({
    queryKey: ['admin-product', productId],
    queryFn: () => apiFetch<ApiAdminProduct>(`/admin/products/${productId}`),
    enabled: !!productId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => apiFetch<ApiAdminCategory[]>('/admin/categories'),
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        description: existing.description,
        price: existing.price,
        affiliateUrl: existing.affiliateUrl ?? '',
        categoryId: existing.categoryId,
        stock: existing.stock !== null ? String(existing.stock) : '',
        featured: existing.featured,
        active: existing.active,
        phases: existing.phases,
        images: existing.images,
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        affiliateUrl: form.affiliateUrl.trim() || null,
        categoryId: form.categoryId,
        stock: form.stock !== '' ? Number(form.stock) : null,
        featured: form.featured,
        active: form.active,
        phases: form.phases,
        images: form.images,
      };
      return isEdit
        ? apiFetch(`/admin/products/${productId}`, { method: 'PUT', body: JSON.stringify(payload) })
        : apiFetch('/admin/products', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      onSaved();
    },
    onError: () => setError('Erro ao salvar produto. Verifique os campos.'),
  });

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const url = await uploadImage(file, accessToken);
      setForm((f) => ({ ...f, images: [...f.images, url] }));
    } catch {
      setError('Erro ao fazer upload da imagem.');
    } finally {
      setUploading(false);
    }
  }

  function togglePhase(phase: Phase) {
    setForm((f) => ({
      ...f,
      phases: f.phases.includes(phase) ? f.phases.filter((p) => p !== phase) : [...f.phases, phase],
    }));
  }

  function removeImage(idx: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  }

  function addImageUrl() {
    if (!newImageUrl.trim()) return;
    setForm((f) => ({ ...f, images: [...f.images, newImageUrl.trim()] }));
    setNewImageUrl('');
  }

  const isValid = form.name.trim() && form.description.trim() && form.price && Number(form.price) > 0 && form.categoryId;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} aria-label="Voltar" className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 text-graphite">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-graphite">{isEdit ? 'Editar produto' : 'Novo produto'}</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-5">
        <div>
          <label className="text-xs font-semibold text-graphite-muted">Nome do produto *</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Vitamina D Gotas"
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-graphite outline-none focus:border-sara-gold"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-graphite-muted">Descrição *</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder="Descreva o produto..."
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-graphite outline-none focus:border-sara-gold resize-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-graphite-muted">Preço (R$) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="0,00"
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-graphite outline-none focus:border-sara-gold"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-graphite-muted">Categoria *</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-graphite outline-none focus:border-sara-gold"
            >
              <option value="">Selecionar...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-graphite-muted">Estoque</label>
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
              placeholder="Ilimitado"
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-graphite outline-none focus:border-sara-gold"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-graphite-muted">Link afiliado (opcional)</label>
          <input
            type="url"
            value={form.affiliateUrl}
            onChange={(e) => setForm((f) => ({ ...f, affiliateUrl: e.target.value }))}
            placeholder="https://..."
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-graphite outline-none focus:border-sara-gold"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-graphite-muted mb-2 block">Fases da gravidez/pós-parto</label>
          <div className="flex flex-wrap gap-2">
            {PHASES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => togglePhase(value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  form.phases.includes(value)
                    ? 'bg-sara-gold text-white'
                    : 'bg-gray-100 text-graphite-muted hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-graphite-muted mb-2 block">Imagens</label>
          {form.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {form.images.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt={`Imagem ${i + 1}`} className="w-20 h-20 rounded-xl object-cover bg-gray-100" />
                  <button
                    onClick={() => removeImage(i)}
                    aria-label="Remover imagem"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-sara-terracotta text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-graphite text-sm font-medium rounded-xl cursor-pointer hover:bg-gray-200 transition-colors">
              <Upload size={14} />
              {uploading ? 'Enviando...' : 'Upload'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }}
              />
            </label>
            <div className="flex flex-1 gap-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Ou cole uma URL de imagem..."
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-graphite outline-none focus:border-sara-gold"
              />
              <button
                onClick={addImageUrl}
                disabled={!newImageUrl.trim()}
                className="px-3 py-2 bg-sara-gold text-white rounded-xl disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
              className="w-4 h-4 accent-sara-gold"
            />
            <span className="text-sm text-graphite font-medium">★ Produto em destaque</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="w-4 h-4 accent-sara-gold"
            />
            <span className="text-sm text-graphite font-medium">Produto ativo</span>
          </label>
        </div>

        {error && <p className="text-xs text-sara-terracotta">{error}</p>}

        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!isValid || saveMutation.isPending}
            className="px-6 py-2.5 bg-sara-gold text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-sara-gold/90 transition-colors"
          >
            {saveMutation.isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar produto'}
          </button>
          <button
            onClick={onBack}
            className="px-6 py-2.5 bg-gray-100 text-graphite text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
