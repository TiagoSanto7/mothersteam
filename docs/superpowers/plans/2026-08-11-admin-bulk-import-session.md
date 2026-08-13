# Admin: Sessão Persistente + Import em Planilha — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir o logout ao recarregar o painel admin e adicionar botões de download de template CSV e upload de planilha para criar produtos em lote.

**Architecture:** Fix de uma linha no `AdminLoginForm` para persistir o `refreshToken`. Import via dois botões no cabeçalho de `ProductsPage`: um gera CSV localmente, outro faz parse de CSV/XLSX com `papaparse`/`xlsx`, mostra modal de confirmação, chama `POST /admin/products/bulk` e exibe resultado por linha.

**Tech Stack:** React + TanStack Query, `papaparse` (CSV parse), `xlsx` / SheetJS (XLSX parse), Zod (backend validation), Prisma `createMany`, TypeScript.

---

## File Map

| Arquivo | Mudança |
|---|---|
| `src/admin/AdminApp.tsx` | Passar `data.refreshToken` como 3º arg de `setAuth` |
| `src/admin/pages/ProductsPage.tsx` | Botões Template + Importar; modais de confirmação e resultado |
| `server/src/routes/admin/products.ts` | Novo handler `POST /bulk` |
| `package.json` (root) | `papaparse`, `xlsx`, `@types/papaparse` |

---

## Task 1: Fix de sessão — passar refreshToken no login do admin

**Files:**
- Modify: `src/admin/AdminApp.tsx:31`

- [ ] **Step 1: Aplicar o fix**

No `AdminApp.tsx`, na função `handleSubmit` do `AdminLoginForm`, a linha 31 está:

```ts
useAppStore.getState().setAuth(data.accessToken, data.user);
```

Troca para:

```ts
useAppStore.getState().setAuth(data.accessToken, data.user, data.refreshToken);
```

Também remove a linha 30 que faz `setAccessToken` redundante (o `setAuth` já faz isso internamente):

```ts
// REMOVER esta linha — setAuth já seta o accessToken
setAccessToken(data.accessToken);
```

O resultado final da função `handleSubmit` deve ser:

```ts
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError('');
  setLoading(true);
  try {
    const data = await apiFetch<{ accessToken: string; refreshToken: string; user: ApiUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    });
    useAppStore.getState().setAuth(data.accessToken, data.user, data.refreshToken);
  } catch {
    setError('Email ou senha incorretos.');
  } finally {
    setLoading(false);
  }
}
```

Também remove o import do `setAccessToken` que deixa de ser usado no componente `AdminLoginForm` (o `AdminApp` ainda usa, então não remova o import no nível do módulo — apenas o `const setAccessToken = useAppStore(...)` dentro de `AdminLoginForm`):

```ts
// REMOVER de dentro de AdminLoginForm:
const setAccessToken = useAppStore((s) => s.setAccessToken);
```

- [ ] **Step 2: Testar manualmente**

1. `npm run dev`
2. Acesse `http://localhost:5173/admin`
3. Faça login
4. Recarregue a página (F5)
5. Esperado: continua logado, não volta para o formulário

- [ ] **Step 3: Commit**

```bash
git add src/admin/AdminApp.tsx
git commit -m "fix(admin): persist refreshToken on login — prevents logout on page reload"
```

---

## Task 2: Instalar dependências de parse de planilha

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar os pacotes**

```bash
npm install papaparse xlsx
npm install --save-dev @types/papaparse
```

`xlsx` já inclui seus próprios tipos — não precisa de `@types/xlsx`.

- [ ] **Step 2: Verificar que o build não quebra**

```bash
npm run build
```

Esperado: sem erros de TypeScript ou Vite.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add papaparse + xlsx for spreadsheet import"
```

---

## Task 3: Backend — endpoint POST /admin/products/bulk

**Files:**
- Modify: `server/src/routes/admin/products.ts`

O endpoint recebe um array de produtos com campos em português (como a planilha), resolve slugs de categoria para IDs, valida cada linha com Zod, insere as válidas com `createMany`, e retorna um relatório com contagem de criados e lista de erros por linha.

- [ ] **Step 1: Adicionar o schema e handler no products.ts**

Ao final do arquivo `server/src/routes/admin/products.ts`, antes do `}` de fechamento da função `adminProductsRoutes`, adicionar:

```ts
  // Bulk import — POST /admin/products/bulk
  const bulkRowSchema = z.object({
    nome: z.string().min(1).max(200),
    descricao: z.string().max(2000).optional().default(''),
    preco: z.number({ invalid_type_error: 'valor inválido' }).positive(),
    categoria_slug: z.string().min(1),
    url_afiliado: z.string().url('deve começar com http').optional().or(z.literal('')).transform(v => v || null),
    fases: z.string().optional().transform(v =>
      v ? v.split(',').map(s => s.trim()).filter(Boolean) : []
    ),
    estoque: z.number().int().min(0).optional().nullable(),
    destaque: z.string().optional().transform(v => v?.toLowerCase() === 'sim'),
  })

  fastify.post('/bulk', async (request, reply) => {
    const body = request.body as { products?: unknown[] }
    if (!Array.isArray(body?.products)) {
      return reply.status(400).send({ error: 'Campo "products" deve ser um array' })
    }
    if (body.products.length > 500) {
      return reply.status(400).send({ error: 'Máximo de 500 produtos por import' })
    }

    // Busca todas as categorias de uma vez para resolver slugs
    const allCategories = await fastify.prisma.category.findMany({
      select: { id: true, slug: true },
    })
    const categoryBySlug = new Map(allCategories.map(c => [c.slug, c.id]))

    const toCreate: {
      name: string; description: string; price: number; affiliateUrl: string | null;
      phases: string[]; stock: number | null; featured: boolean;
      images: string[]; active: boolean; categoryId: string;
    }[] = []

    const errors: { row: number; field: string; message: string }[] = []

    for (let i = 0; i < body.products.length; i++) {
      const row = i + 2 // row 1 = header, row 2 = first data row
      const parsed = bulkRowSchema.safeParse(body.products[i])

      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0]
        errors.push({
          row,
          field: firstIssue.path.join('.') || 'desconhecido',
          message: firstIssue.message,
        })
        continue
      }

      const categoryId = categoryBySlug.get(parsed.data.categoria_slug)
      if (!categoryId) {
        errors.push({ row, field: 'categoria_slug', message: `"${parsed.data.categoria_slug}" não encontrada` })
        continue
      }

      const validPhases = [
        'trimester1', 'trimester2', 'trimester3',
        'postpartum_0_30', 'postpartum_31_180', 'postpartum_181_365',
      ]
      const invalidPhase = parsed.data.fases.find(p => !validPhases.includes(p))
      if (invalidPhase) {
        errors.push({ row, field: 'fases', message: `fase inválida: "${invalidPhase}"` })
        continue
      }

      toCreate.push({
        name: parsed.data.nome,
        description: parsed.data.descricao,
        price: parsed.data.preco,
        affiliateUrl: parsed.data.url_afiliado ?? null,
        phases: parsed.data.fases,
        stock: parsed.data.estoque ?? null,
        featured: parsed.data.destaque,
        images: [],
        active: true,
        categoryId,
      })
    }

    if (toCreate.length > 0) {
      await fastify.prisma.product.createMany({ data: toCreate })
    }

    reply.status(201).send({ created: toCreate.length, errors })
  })
```

- [ ] **Step 2: Reiniciar o servidor de dev e testar com curl**

```bash
# Em um terminal separado, inicie o servidor backend
cd server && npm run dev

# Obtenha um token de admin fazendo login
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tiagoalvessoares17@gmail.com","password":"MothersAdmin2026!"}' | jq .accessToken

# Substitua TOKEN pelo valor retornado acima
curl -s -X POST http://localhost:3000/admin/products/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "products": [
      {"nome":"Teste Bulk","preco":99.90,"categoria_slug":"SLUG_INVALIDO"},
      {"nome":"","preco":99.90,"categoria_slug":"mochilas"}
    ]
  }' | jq .
```

Esperado (adapte conforme slugs reais do seu banco):
```json
{
  "created": 0,
  "errors": [
    { "row": 2, "field": "categoria_slug", "message": "\"SLUG_INVALIDO\" não encontrada" },
    { "row": 3, "field": "nome", "message": "String must contain at least 1 character(s)" }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/admin/products.ts
git commit -m "feat(admin): POST /admin/products/bulk — batch product creation from spreadsheet"
```

---

## Task 4: Frontend — botão de download do template CSV

**Files:**
- Modify: `src/admin/pages/ProductsPage.tsx`

O botão gera um CSV no browser sem nenhum request, com cabeçalhos, uma linha de exemplo e ao final os slugs de categorias disponíveis (usando os dados já buscados pela query existente de `admin-categories`).

- [ ] **Step 1: Adicionar a função `downloadTemplate` e o botão no cabeçalho**

No início do arquivo, adicionar o import do ícone:

```ts
import { Plus, Pencil, Trash2, Star, Eye, EyeOff, Search, Download, Upload } from 'lucide-react';
```

(Substitui a linha existente de import do lucide-react.)

Dentro da função `ProductsPage`, antes do `return`, adicionar:

```ts
  function downloadTemplate() {
    const header = 'nome,descricao,preco,categoria_slug,url_afiliado,fases,estoque,destaque'
    const example = 'Mochila maternidade,Mochila com compartimentos térmicos,189.90,mochilas,https://amazon.com.br/example,trimester3,10,nao'
    const phaseComment = '# Fases válidas: trimester1 | trimester2 | trimester3 | postpartum_0_30 | postpartum_31_180 | postpartum_181_365'
    const slugComment = `# Slugs de categorias: ${categories.map(c => c.slug).join(' | ')}`
    const csv = [header, example, phaseComment, slugComment].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_produtos.csv'
    a.click()
    URL.revokeObjectURL(url)
  }
```

No JSX, no cabeçalho onde está o botão "Novo produto", adicionar os dois novos botões antes dele:

```tsx
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
```

Adicionar o `useRef` no topo do componente (importar `useRef` do React):

```ts
import { useState, useRef } from 'react';
```

E dentro de `ProductsPage`:

```ts
  const importInputRef = useRef<HTMLInputElement>(null);
```

- [ ] **Step 2: Adicionar stub `handleFileChange` (só para compilar — implementado na Task 5)**

```ts
  function handleFileChange(_e: React.ChangeEvent<HTMLInputElement>) {
    // implementado na Task 5
  }
```

- [ ] **Step 3: Verificar que o build compila sem erros**

```bash
npm run build
```

- [ ] **Step 4: Testar o botão Template**

1. `npm run dev`
2. Acesse `http://localhost:5173/admin` e faça login
3. Vá em Produtos
4. Clique em "Template"
5. Esperado: download de `template_produtos.csv` com cabeçalho + linha de exemplo + comentários com slugs reais

- [ ] **Step 5: Commit**

```bash
git add src/admin/pages/ProductsPage.tsx
git commit -m "feat(admin): download template CSV button in ProductsPage"
```

---

## Task 5: Frontend — upload, parse e modal de confirmação + resultado

**Files:**
- Modify: `src/admin/pages/ProductsPage.tsx`

Esta task implementa o restante do fluxo: parse do arquivo, modal de confirmação "N linhas encontradas. Importar?", chamada ao backend e modal de resultado com erros por linha e botão "Baixar linhas com erro".

- [ ] **Step 1: Adicionar tipos e state de import**

No topo do `ProductsPage.tsx`, após os imports existentes:

```ts
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
```

Dentro de `ProductsPage`, adicionar os novos states:

```ts
  // Import state
  type ParsedRow = Record<string, string>;
  type BulkError = { row: number; field: string; message: string };
  type ImportPhase = 'idle' | 'confirm' | 'loading' | 'result';

  const [importPhase, setImportPhase] = useState<ImportPhase>('idle');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [bulkResult, setBulkResult] = useState<{ created: number; errors: BulkError[] } | null>(null);
```

> Nota: `ParsedRow`, `BulkError` e `ImportPhase` podem ser declarados fora do componente no topo do arquivo se TypeScript reclamar de hoisting.

- [ ] **Step 2: Implementar `handleFileChange`**

Substitua o stub da Task 4 pela implementação real:

```ts
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // reset input so the same file can be re-uploaded
    e.target.value = '';

    let rows: ParsedRow[] = [];

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: '' });
    } else {
      // CSV
      const text = await file.text();
      // Skip lines starting with # (template comments)
      const cleaned = text.split('\n').filter(l => !l.trimStart().startsWith('#')).join('\n');
      const result = Papa.parse<ParsedRow>(cleaned, { header: true, skipEmptyLines: true });
      rows = result.data;
    }

    if (rows.length === 0) {
      alert('Arquivo vazio ou sem linhas de dados.');
      return;
    }

    setParsedRows(rows);
    setImportPhase('confirm');
  }
```

- [ ] **Step 3: Implementar `handleConfirmImport`**

```ts
  async function handleConfirmImport() {
    setImportPhase('loading');
    try {
      const result = await apiFetch<{ created: number; errors: BulkError[] }>(
        '/admin/products/bulk',
        {
          method: 'POST',
          body: JSON.stringify({ products: parsedRows }),
        }
      );
      setBulkResult(result);
      setImportPhase('result');
      if (result.created > 0) {
        queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      }
    } catch {
      setBulkResult({ created: 0, errors: [{ row: 0, field: '', message: 'Erro de conexão. Tente novamente.' }] });
      setImportPhase('result');
    }
  }
```

- [ ] **Step 4: Implementar `downloadErrorRows`**

```ts
  function downloadErrorRows() {
    if (!bulkResult || parsedRows.length === 0) return;
    const errorRowNumbers = new Set(bulkResult.errors.map(e => e.row - 2)); // row 2 = index 0
    const errorRows = parsedRows.filter((_, i) => errorRowNumbers.has(i));
    if (errorRows.length === 0) return;

    const header = Object.keys(errorRows[0]).join(',');
    const lines = errorRows.map(r =>
      Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    );
    const csv = [header, ...lines].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'erros_import.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
```

- [ ] **Step 5: Adicionar os modais ao JSX**

No final do `return` de `ProductsPage`, antes do fechamento `</div>` raiz, adicionar:

```tsx
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
                onClick={() => { setImportPhase('idle'); setBulkResult(null); }}
                className="px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 6: Auto-fechar o modal de resultado se 0 erros**

No `handleConfirmImport`, logo após `setImportPhase('result')` no caminho de sucesso, adicionar:

```ts
      if (result.errors.length === 0) {
        setTimeout(() => { setImportPhase('idle'); setBulkResult(null); }, 2000);
      }
```

Ou seja, a parte do `try` fica:

```ts
    try {
      const result = await apiFetch<{ created: number; errors: BulkError[] }>(
        '/admin/products/bulk',
        {
          method: 'POST',
          body: JSON.stringify({ products: parsedRows }),
        }
      );
      setBulkResult(result);
      setImportPhase('result');
      if (result.created > 0) {
        queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      }
      if (result.errors.length === 0) {
        setTimeout(() => { setImportPhase('idle'); setBulkResult(null); }, 2000);
      }
    } catch {
```

- [ ] **Step 7: Verificar build**

```bash
npm run build
```

Sem erros TypeScript.

- [ ] **Step 8: Teste end-to-end**

1. Crie um arquivo `teste.csv` com o conteúdo:
```
nome,descricao,preco,categoria_slug,url_afiliado,fases,estoque,destaque
Produto Teste,Descrição do produto,79.90,mochilas,https://amazon.com.br,trimester1,5,nao
Produto Inválido,,abc,SLUG_ERRADO,,,
```
2. `npm run dev` (frontend + backend)
3. Acesse `/admin` → Produtos
4. Clique "Importar" → selecione o arquivo
5. Modal de confirmação: "2 linhas encontradas. Importar?"
6. Clique "Importar"
7. Modal de resultado:
   - "✅ 1 produto importado com sucesso"
   - "⚠️ 1 erro: Linha 3 — preco: valor inválido" (ou similar)
8. Clique "Baixar linhas com erro" → download de CSV com a linha do Produto Inválido
9. Feche o modal → lista de produtos atualizada com o novo produto

- [ ] **Step 9: Commit**

```bash
git add src/admin/pages/ProductsPage.tsx
git commit -m "feat(admin): bulk import — CSV/XLSX upload, confirm modal, per-row error report"
```

---

## Task 6: Deploy

- [ ] **Step 1: Build do frontend**

```bash
npm run build
```

- [ ] **Step 2: Deploy do frontend**

```bash
scp -P 443 -r dist/. root@2.25.137.78:/var/www/mothersteam/
```

- [ ] **Step 3: Build e deploy do backend**

```bash
scp -P 443 server/src/routes/admin/products.ts root@2.25.137.78:/opt/mothersteam/deploy/server/src/routes/admin/products.ts
```

No VPS (via SSH):

```bash
ssh -p 443 root@2.25.137.78
cd /opt/mothersteam/deploy
docker compose -f docker-compose.prod.yml build api
docker compose -f docker-compose.prod.yml up -d --no-deps api
```

- [ ] **Step 4: Verificar em produção**

1. Acesse `http://2.25.137.78/admin`
2. Faça login → recarregue a página → deve permanecer logado
3. Clique "Template" → baixa CSV
4. Clique "Importar" → sobe um CSV → fluxo funciona

- [ ] **Step 5: Commit final**

```bash
git add .
git commit -m "chore: deploy admin session fix + bulk import to production"
```
