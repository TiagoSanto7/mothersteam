# Spec — Admin: Sessão persistente + Import em planilha

**Data:** 2026-08-11
**Status:** Aprovado

---

## 1. Fix de sessão do painel admin

### Problema
`AdminLoginForm` chama `setAuth(token, user)` sem passar `refreshToken`. O token fica `null` no store e nunca é gravado no localStorage. Ao recarregar a página, o restore chama `POST /auth/refresh` sem token e falha → usuário é deslogado.

### Solução
Uma linha em `src/admin/AdminApp.tsx`, na função `handleSubmit` do `AdminLoginForm`:

```ts
// antes
useAppStore.getState().setAuth(data.accessToken, data.user);
// depois
useAppStore.getState().setAuth(data.accessToken, data.user, data.refreshToken);
```

Sem mudanças no store, backend ou tipos — o `setAuth` já aceita `refreshToken` opcional e o store já persiste no localStorage.

---

## 2. Import em planilha de produtos

### Objetivo
Permitir que ADMIN/EDITOR suba uma planilha (CSV ou XLSX) para criar múltiplos produtos de uma vez, sem precisar preencher o formulário individualmente.

### Componentes

#### 2.1 Download de template (frontend only)

- Botão **"↓ Template"** no cabeçalho de `ProductsPage`
- Gera um CSV no browser (sem request) com:
  - Linha 1: cabeçalhos
  - Linha 2: linha de exemplo preenchida
  - Linhas finais: comentário com slugs de categorias disponíveis (buscados de `GET /admin/categories`)
- Dispara download via `URL.createObjectURL` + `<a>` temporário
- Não requer nova lib

**Colunas do template:**

| Coluna | Obrigatório | Tipo | Observação |
|---|---|---|---|
| nome | ✅ | texto | max 200 chars |
| descricao | | texto | max 2000 chars |
| preco | ✅ | número | ex: 189.90 |
| categoria_slug | ✅ | texto | deve existir no banco |
| url_afiliado | | URL | deve começar com http |
| fases | | texto | slugs separados por vírgula |
| estoque | | inteiro | ≥ 0 |
| destaque | | sim/nao | default: nao |

**Fases válidas:** `trimester1`, `trimester2`, `trimester3`, `postpartum_0_30`, `postpartum_31_180`, `postpartum_181_365`

#### 2.2 Upload de planilha (frontend)

- Botão **"↑ Importar"** no cabeçalho de `ProductsPage`
- Abre `<input type="file" accept=".csv,.xlsx">`
- Libs:
  - `papaparse` — parse de CSV
  - `xlsx` (SheetJS) — parse de XLSX, converte para array de objetos
- Após parse: normaliza valores (trim, lowercase em booleans, split de fases)
- Exibe modal de confirmação: "N linhas encontradas. Importar?"
- Envia `POST /admin/products/bulk` com array de produtos
- Exibe resultado (ver §2.4)

#### 2.3 Endpoint bulk (backend)

**Rota:** `POST /admin/products/bulk`
**Auth:** ADMIN ou EDITOR (mesmo middleware existente)

**Request body:**
```json
{
  "products": [
    {
      "nome": "Mochila maternidade",
      "preco": 189.90,
      "categoria_slug": "mochilas",
      ...
    }
  ]
}
```

**Lógica:**
1. Valida array (máx 500 itens)
2. Busca todas as categorias de uma vez (`findMany` por slug) para evitar N queries
3. Para cada produto: valida com Zod, resolve `categoryId` pelo slug
4. Insere os válidos com `createMany`
5. Retorna resultado sem transação global — linhas válidas são salvas mesmo se outras falharem

**Response:**
```json
{
  "created": 17,
  "errors": [
    { "row": 4, "field": "categoria_slug", "message": "\"bebes\" não encontrada" },
    { "row": 9, "field": "preco", "message": "valor inválido" },
    { "row": 12, "field": "nome", "message": "campo obrigatório" }
  ]
}
```

#### 2.4 Modal de resultado

Exibido após o upload completar:

```
✅ 17 produtos importados com sucesso

⚠️ 3 erros:
  Linha 4  — categoria_slug: "bebes" não encontrada
  Linha 9  — preco: valor inválido "R$ 50"
  Linha 12 — nome: campo obrigatório
```

- Se 0 erros: fecha automaticamente após 2s
- Se há erros: botão "Fechar" + botão "Baixar linhas com erro" (CSV das linhas que falharam, para corrigir e reimportar)

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/admin/AdminApp.tsx` | passar `refreshToken` no `setAuth` |
| `src/admin/pages/ProductsPage.tsx` | botões + modal de import/resultado |
| `server/src/routes/admin/products.ts` | novo endpoint `POST /bulk` |
| `package.json` (frontend) | adicionar `papaparse`, `xlsx` |
| `package.json` (server) | sem mudança |

### Fora de escopo
- Atualização de produtos existentes via planilha (apenas criação)
- Upload de imagens via planilha (campo `url_afiliado` existe, imagens não)
- Progresso em tempo real (barra de progresso)
