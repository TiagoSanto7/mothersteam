import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Star, Eye, EyeOff, Search, Download, Upload } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { ApiAdminCategory, ApiAdminProductList } from '../../lib/types';
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

type ParsedRow = Record<string, string>
type BulkError = { row: number; field: string; message: string }
type ImportPhase = 'idle' | 'confirm' | 'loading' | 'result'

const PHASE_LABELS: Record<string, string> = {
  trimester1: '1T',
  trimester2: '2T',
  trimester3: '3T',
  postpartum_0_30: 'PP0-30',
  postpartum_31_180: 'PP1-6m',
  postpartum_181_365: 'PP6-12m',
};

interface ProductsPageProps {
  onNew: () => void;
  onEdit: (id: string) => void;
}

export function ProductsPage({ onNew, onEdit }: ProductsPageProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: '20',
    ...(search ? { q: search } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(activeFilter ? { active: activeFilter } : {}),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, search, categoryId, activeFilter],
    queryFn: () => apiFetch<ApiAdminProductList>(`/admin/products?${queryParams}`),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => apiFetch<ApiAdminCategory[]>('/admin/categories'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiFetch(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify({ active }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      apiFetch(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify({ featured }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const [importPhase, setImportPhase] = useState<ImportPhase>('idle')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [bulkResult, setBulkResult] = useState<{ created: number; errors: BulkError[] } | null>(null)

  const importInputRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const header = 'nome,descricao,preco,categoria_slug,url_afiliado,fases,estoque,destaque'
    const example = 'Mochila maternidade,Mochila com compartimentos térmicos,189.90,mochilas,https://amazon.com.br/example,trimester3,10,nao'
    const phaseComment = '# Fases válidas: trimester1 | trimester2 | trimester3 | postpartum_0_30 | postpartum_31_180 | postpartum_181_365'
    const slugComment = `# Slugs de categorias: ${categories.map(c => c.slug).join(' | ')}`
    const csv = [header, example, phaseComment, slugComment].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_produtos.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    let rows: ParsedRow[] = []

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      rows = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: '' })
    } else {
      const text = await file.text()
      // Skip lines starting with # (template comments)
      const cleaned = text.split('\n').filter(l => !l.trimStart().startsWith('#')).join('\n')
      const result = Papa.parse<ParsedRow>(cleaned, { header: true, skipEmptyLines: true })
      rows = result.data
    }

    if (rows.length === 0) {
      alert('Arquivo vazio ou sem linhas de dados.')
      return
    }

    setParsedRows(rows)
    setImportPhase('confirm')
  }

  async function handleConfirmImport() {
    setImportPhase('loading')
    try {
      const result = await apiFetch<{ created: number; errors: BulkError[] }>(
        '/admin/products/bulk',
        {
          method: 'POST',
          body: JSON.stringify({ products: parsedRows }),
        }
      )
      setBulkResult(result)
      setImportPhase('result')
      if (result.created > 0) {
        queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      }
      if (result.errors.length === 0) {
        setTimeout(() => { setImportPhase('idle'); setBulkResult(null) }, 2000)
      }
    } catch {
      setBulkResult({ created: 0, errors: [{ row: 0, field: '', message: 'Erro de conexão. Tente novamente.' }] })
      setImportPhase('result')
    }
  }

  function downloadErrorRows() {
    if (!bulkResult || parsedRows.length === 0) return
    const errorRowNumbers = new Set(bulkResult.errors.map(e => e.row - 2))
    const errorRows = parsedRows.filter((_, i) => errorRowNumbers.has(i))
    if (errorRows.length === 0) return

    const header = Object.keys(errorRows[0]).join(',')
    const lines = errorRows.map(r =>
      Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    )
    const csv = [header, ...lines].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'erros_import.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-graphite">Produtos</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-graphite text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Download size={15} /> Template
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-graphite text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Upload size={15} /> Importar
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={onNew}
            className="flex items-center gap-2 px-4 py-2 bg-sara-gold text-white text-sm font-semibold rounded-xl hover:bg-sara-gold/90 transition-colors"
          >
            <Plus size={16} /> Novo produto
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 w-64">
          <Search size={14} className="text-graphite-muted" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar produto..."
            className="flex-1 text-sm outline-none text-graphite placeholder:text-graphite-muted"
          />
        </div>
        <select
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-graphite outline-none"
        >
          <option value="">Todas categorias</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <select
          value={activeFilter}
          onChange={(e) => { setActiveFilter(e.target.value as '' | 'true' | 'false'); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-graphite outline-none"
        >
          <option value="">Todos status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <p className="text-graphite-muted text-sm p-8">Carregando...</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-graphite-muted">Produto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-graphite-muted">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-graphite-muted">Preço</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-graphite-muted">Fases</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-graphite-muted">Cliques</th>
                  <th className="px-4 py-3 text-xs font-semibold text-graphite-muted text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data?.items ?? []).map((p) => (
                  <tr key={p.id} className={!p.active ? 'opacity-50' : ''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.images[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-sara-linen flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">📦</span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-graphite">{p.name}</p>
                          {p.featured && <span className="text-[10px] text-sara-gold font-semibold">★ Destaque</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-graphite-muted">{p.category.name}</td>
                    <td className="px-4 py-3 font-semibold text-graphite">R$ {Number(p.price).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {p.phases.map((ph) => (
                          <span key={ph} className="text-[10px] bg-sara-linen text-graphite px-1.5 py-0.5 rounded-full">{PHASE_LABELS[ph] ?? ph}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-graphite-muted">{p._count.clicks}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => toggleFeaturedMutation.mutate({ id: p.id, featured: !p.featured })}
                          aria-label={p.featured ? 'Remover destaque' : 'Destacar'}
                          title={p.featured ? 'Remover destaque' : 'Destacar'}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${p.featured ? 'text-sara-gold bg-sara-gold/10' : 'text-graphite-muted hover:bg-gray-100'}`}
                        >
                          <Star size={14} />
                        </button>
                        <button
                          onClick={() => toggleMutation.mutate({ id: p.id, active: !p.active })}
                          aria-label={p.active ? 'Desativar' : 'Ativar'}
                          title={p.active ? 'Desativar' : 'Ativar'}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-graphite-muted"
                        >
                          {p.active ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button
                          onClick={() => onEdit(p.id)}
                          aria-label="Editar"
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-graphite-muted"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Desativar "${p.name}"?`)) deleteMutation.mutate(p.id); }}
                          aria-label="Desativar produto"
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
            {(data?.items ?? []).length === 0 && (
              <p className="text-center text-graphite-muted text-sm py-8">Nenhum produto encontrado.</p>
            )}
          </>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-graphite-muted">{data.total} produtos</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              ← Anterior
            </button>
            <span className="px-3 py-1.5 text-sm text-graphite-muted">{page} / {data.totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmação */}
      {importPhase === 'confirm' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h2 className="text-base font-semibold text-graphite mb-2">Confirmar import</h2>
            <p className="text-sm text-graphite-muted mb-5">
              {parsedRows.length} {parsedRows.length === 1 ? 'linha encontrada' : 'linhas encontradas'}. Importar agora?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setImportPhase('idle')}
                className="px-4 py-2 text-sm text-graphite border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-4 py-2 text-sm font-semibold text-white bg-sara-gold rounded-xl hover:bg-sara-gold/90"
              >
                Importar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {importPhase === 'loading' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <p className="text-sm text-graphite-muted">Importando produtos...</p>
          </div>
        </div>
      )}

      {/* Modal de resultado */}
      {importPhase === 'result' && bulkResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full max-h-[80vh] flex flex-col">
            <h2 className="text-base font-semibold text-graphite mb-4">Resultado do import</h2>
            <div className="flex-1 overflow-y-auto space-y-3 text-sm">
              {bulkResult.created > 0 && (
                <p className="text-green-700 font-medium">
                  ✅ {bulkResult.created} {bulkResult.created === 1 ? 'produto importado' : 'produtos importados'} com sucesso
                </p>
              )}
              {bulkResult.errors.length > 0 && (
                <div>
                  <p className="text-amber-700 font-medium mb-2">⚠️ {bulkResult.errors.length} {bulkResult.errors.length === 1 ? 'erro' : 'erros'}:</p>
                  <ul className="space-y-1">
                    {bulkResult.errors.map((err, i) => (
                      <li key={i} className="text-graphite-muted">
                        {err.row > 0 ? <span className="font-medium text-graphite">Linha {err.row}</span> : null}
                        {err.field ? <span> — <span className="font-medium">{err.field}</span>:</span> : null}
                        {' '}{err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {bulkResult.created === 0 && bulkResult.errors.length === 0 && (
                <p className="text-graphite-muted">Nenhum produto foi importado.</p>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-gray-100">
              {bulkResult.errors.length > 0 && (
                <button
                  onClick={downloadErrorRows}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-graphite border border-gray-200 rounded-xl hover:bg-gray-50"
                >
                  <Download size={13} /> Baixar linhas com erro
                </button>
              )}
              <button
                onClick={() => { setImportPhase('idle'); setBulkResult(null) }}
                className="px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
