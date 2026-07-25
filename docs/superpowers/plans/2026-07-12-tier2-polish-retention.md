# Tier 2 — Polish & Retention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o gap entre "app funcional" e "app que dá vontade de continuar usando". T1 entregou o loop social; T2 entrega os fluxos que o usuário espera encontrar em qualquer app social moderno — editar o próprio perfil, upload real de fotos, notificações que levam pra algum lugar, feeds infinitos, e primeiro contato com o produto que ensina o valor social.

**Architecture:** Cinco milestones sequenciais, cada um independente pra ser executável. Continua o padrão de overlay do T1, React Query pro estado servidor, Fastify + Prisma no backend. Novo: `@fastify/multipart` pra upload, `useInfiniteQuery` pra paginação client-side, coluna `targetType/targetId` na notificação, e endpoint de comunidades sugeridas com scoring por perfil.

**Tech Stack:** React 18 + TypeScript + Vite + TanStack Query v5 + Zustand 5 (frontend); Fastify 4 + Prisma + MySQL + @fastify/multipart + @fastify/static (backend); Vitest + React Testing Library (tests).

**Ordem dos milestones:**
1. Editar perfil próprio (base pra M2 avatar)
2. Upload real de imagem (avatar + post)
3. Notificação → destino (fechar loop de engagement)
4. Infinite scroll (retenção em feeds longos)
5. Onboarding social (primeira sessão vale a pena)

---

## Convenções

- **TDD**: cada task começa com teste falhando.
- **Commits atômicos** com prefixo `feat:` / `fix:` / `refactor:` / `test:` / `chore:`.
- **Rodar testes** ao fim de cada task: `npm test -- --run <path>` (frontend) ou `npm --prefix server test` (backend).
- **Gradient wrapper reutilizado**: `bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF]`.
- **Overlay pattern**: `fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center` + inner `w-full h-full sm:w-[390px] sm:h-[844px]`.
- **apiFetch** de `src/lib/api.ts` pra todas chamadas HTTP JSON. Uploads usam `fetch` direto (multipart).
- **Server dev**: `npm --prefix server run dev` na `:3001`. Frontend `:5173` faz proxy via Vite.

---

# Milestone 1 — Editar Perfil Próprio

**Feature:** Botão "Editar perfil" no `ProfileScreen` abre um form onde a mãe pode mudar nome, bio, estágio da gestação (semana ou dias do bebê). Salvamento otimista, feedback visual, invalidação do cache.

**Backend changes:** Estender `PATCH /users/me` pra aceitar `bio`. Já aceita nome/stage/semana.

**Frontend changes:** Criar `EditProfileScreen`. Wire no `ProfileScreen` botão "Editar perfil" que hoje é dummy.

---

## Task 1.1: Backend — estender `PATCH /users/me` com `bio`

**Files:**
- Modify: `server/src/routes/users.ts:4-10` (adicionar `bio` ao schema Zod)

- [ ] **Step 1: Ajustar schema Zod**

Em `server/src/routes/users.ts`, linhas 4-10, substituir:

```typescript
const updateMeSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  babyName: z.string().max(80).optional().nullable(),
  bio: z.string().max(280).optional().nullable(),
  pregnancyStage: z.enum(['pregnant', 'postpartum']).optional(),
  pregnancyWeek: z.number().int().min(1).max(42).optional().nullable(),
  babyAgeInDays: z.number().int().min(0).optional().nullable(),
})
```

- [ ] **Step 2: Ampliar select do retorno pra devolver campos atualizados**

Substituir linhas 48-53:

```typescript
    const user = await fastify.prisma.user.update({
      where: { id: request.userId },
      data: body.data,
      select: {
        id: true, name: true, babyName: true, bio: true,
        pregnancyStage: true, pregnancyWeek: true, babyAgeInDays: true,
      },
    })
    reply.send(user)
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/users.ts
git commit -m "feat(server): PATCH /users/me accepts bio and returns updated profile"
```

---

## Task 1.2: Estender `ApiUser` com `bio` e criar helper `patchUserProfileInCaches`

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/helpers.ts`

- [ ] **Step 1: Adicionar `bio` ao `ApiUser`**

Em `src/lib/types.ts` linha 1-12, substituir a interface `ApiUser`:

```typescript
export interface ApiUser {
  id: string
  email: string
  name: string
  babyName?: string | null
  bio?: string | null
  pregnancyStage: 'pregnant' | 'postpartum'
  pregnancyWeek?: number | null
  babyAgeInDays?: number | null
  onboardingDone: boolean
  profileKey?: string | null
  archetypeKey?: string | null
}
```

- [ ] **Step 2: Adicionar helper de patch de perfil em `src/lib/helpers.ts`**

Após o `patchPostLikeInAllCaches`, adicionar:

```typescript
export function patchUserProfileInCaches(
  queryClient: QueryClient,
  userId: string,
  patch: Partial<{ name: string; bio: string | null }>,
): void {
  queryClient.setQueryData<import('./types').ApiUserProfile>(['user', userId], (old) =>
    old ? { ...old, ...patch } : old,
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/helpers.ts
git commit -m "feat: ApiUser has bio; add patchUserProfileInCaches helper"
```

---

## Task 1.3: Criar `EditProfileScreen`

**Files:**
- Create: `src/components/profile/EditProfileScreen.tsx`
- Create: `src/components/profile/EditProfileScreen.test.tsx`

- [ ] **Step 1: Escrever testes**

Criar `src/components/profile/EditProfileScreen.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditProfileScreen } from './EditProfileScreen';
import { useAppStore } from '../../store/useAppStore';
import * as api from '../../lib/api';

vi.mock('../../lib/api', async () => ({
  ...(await vi.importActual('../../lib/api')),
  apiFetch: vi.fn(),
}));

function renderScreen(onBack = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <EditProfileScreen onBack={onBack} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.setState({
    currentUserId: 'u1',
    motherName: 'Ana',
    isLoggedIn: true,
  });
});

describe('EditProfileScreen', () => {
  it('prefills name from store', () => {
    renderScreen();
    expect(screen.getByLabelText(/Nome/i)).toHaveValue('Ana');
  });

  it('disables Salvar when name is empty', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.clear(screen.getByLabelText(/Nome/i));
    expect(screen.getByRole('button', { name: /Salvar/i })).toBeDisabled();
  });

  it('calls PATCH /users/me on save', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ id: 'u1', name: 'Ana Maria', bio: 'Nova bio' });
    const user = userEvent.setup();
    renderScreen();
    await user.clear(screen.getByLabelText(/Nome/i));
    await user.type(screen.getByLabelText(/Nome/i), 'Ana Maria');
    await user.type(screen.getByLabelText(/Bio/i), 'Nova bio');
    await user.click(screen.getByRole('button', { name: /Salvar/i }));
    expect(api.apiFetch).toHaveBeenCalledWith(
      '/users/me',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('calls onBack after successful save', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ id: 'u1', name: 'Ana Maria', bio: '' });
    const onBack = vi.fn();
    const user = userEvent.setup();
    renderScreen(onBack);
    await user.click(screen.getByRole('button', { name: /Salvar/i }));
    await vi.waitFor(() => expect(onBack).toHaveBeenCalled());
  });

  it('respects 280-char limit on bio', async () => {
    const user = userEvent.setup();
    renderScreen();
    const bioInput = screen.getByLabelText(/Bio/i) as HTMLTextAreaElement;
    expect(bioInput.maxLength).toBe(280);
  });
});
```

- [ ] **Step 2: Rodar teste (deve falhar)**

```bash
npm test -- --run src/components/profile/EditProfileScreen.test.tsx
```

Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `EditProfileScreen`**

Criar `src/components/profile/EditProfileScreen.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { apiFetch } from '../../lib/api';
import { patchUserProfileInCaches } from '../../lib/helpers';
import type { ApiUser } from '../../lib/types';

interface EditProfileScreenProps {
  onBack: () => void;
}

export function EditProfileScreen({ onBack }: EditProfileScreenProps) {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const motherName = useAppStore((s) => s.motherName);
  const queryClient = useQueryClient();

  const [name, setName] = useState(motherName);
  const [bio, setBio] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: (data: { name: string; bio: string }) =>
      apiFetch<ApiUser>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: data.name.trim(), bio: data.bio.trim() }),
      }),
    onSuccess: (updated) => {
      useAppStore.setState({ motherName: updated.name });
      if (currentUserId) {
        patchUserProfileInCaches(queryClient, currentUserId, {
          name: updated.name,
          bio: updated.bio ?? null,
        });
      }
      onBack();
    },
  });

  const valid = name.trim().length > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (valid) mutate({ name, bio });
  }

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-6 pb-3 flex-shrink-0">
        <button onClick={onBack} aria-label="Voltar" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <h1 className="text-base font-semibold text-graphite">Editar perfil</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="edit-name" className="text-xs font-medium text-graphite-muted">Nome</label>
          <input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite focus:outline-none focus:border-sara-gold"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="edit-bio" className="text-xs font-medium text-graphite-muted">Bio</label>
          <textarea
            id="edit-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            rows={4}
            placeholder="Como você se sente hoje na maternidade?"
            className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite resize-none focus:outline-none focus:border-sara-gold"
          />
          <span className="text-[10px] text-graphite-muted self-end">{bio.length}/280</span>
        </div>

        <button
          type="submit"
          disabled={!valid || isPending}
          className="w-full py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50 mt-2"
        >
          {isPending ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Rodar testes**

```bash
npm test -- --run src/components/profile/EditProfileScreen.test.tsx
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/profile/EditProfileScreen.tsx src/components/profile/EditProfileScreen.test.tsx
git commit -m "feat: add EditProfileScreen (name + bio) with cache patch"
```

---

## Task 1.4: Wire "Editar perfil" em `ProfileScreen`

**Files:**
- Modify: `src/components/profile/ProfileScreen.tsx`

- [ ] **Step 1: Adicionar state e overlay**

Import ao topo:

```tsx
import { EditProfileScreen } from './EditProfileScreen';
```

Adicionar state:

```tsx
const [showEdit, setShowEdit] = useState(false);
```

Antes do `showSettings` early-return, adicionar:

```tsx
if (showEdit) {
  return <EditProfileScreen onBack={() => setShowEdit(false)} />;
}
```

- [ ] **Step 2: Wire botão "Editar perfil"**

Localizar o botão atual (procurar `Editar perfil` no arquivo) — hoje ele não tem onClick. Adicionar:

```tsx
<button
  onClick={() => setShowEdit(true)}
  className="flex-1 py-2 rounded-xl bg-sara-linen text-xs font-semibold text-sara-gold active:scale-95 transition-transform"
>
  Editar perfil
</button>
```

- [ ] **Step 3: Rodar suite**

```bash
npm test -- --run
```

Expected: 0 regressões.

- [ ] **Step 4: Commit**

```bash
git add src/components/profile/ProfileScreen.tsx
git commit -m "feat: wire Editar perfil button in ProfileScreen"
```

---

# Milestone 2 — Upload Real de Imagem

**Feature:** Trocar o base64-em-state atual por upload real: usuária escolhe imagem, arquivo vai pro backend, backend armazena e retorna URL. Aplicado ao avatar (M1 estende) e ao post.

**Backend changes:** Instalar `@fastify/multipart` e `@fastify/static`. Criar `POST /uploads` que aceita `multipart/form-data`, valida tipo/tamanho, salva em `server/uploads/<uuid>.<ext>`. Servir `server/uploads/` como static em `/uploads`.

**Frontend changes:** Criar `uploadImage(file)` helper. Refatorar `CreatePostScreen` pra fazer upload antes do POST. Adicionar campo `avatarUrl` no `EditProfileScreen`.

**⚠️ Nota de produção:** Storage local funciona no dev/staging. Pra produção real, trocar `server/uploads/` por S3/R2 presigned URL (task ficará listada em T3 como ship-blocker).

---

## Task 2.1: Backend — instalar `@fastify/multipart` + `@fastify/static`

**Files:**
- Modify: `server/package.json`

- [ ] **Step 1: Instalar dependências**

```bash
cd server && npm install @fastify/multipart @fastify/static
```

- [ ] **Step 2: Verificar `server/package.json`**

Deve mostrar entradas novas em `dependencies`. Rodar `npm install` de novo pra garantir lockfile.

- [ ] **Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore(server): add multipart and static plugins for image uploads"
```

---

## Task 2.2: Backend — criar endpoint `POST /uploads`

**Files:**
- Create: `server/src/routes/uploads.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Criar diretório de uploads**

```bash
mkdir -p server/uploads
echo "*" > server/uploads/.gitignore
```

Isso ignora todos os arquivos do diretório mas mantém o próprio `.gitignore` versionado, então `server/uploads/` existe no clone.

- [ ] **Step 2: Escrever teste**

Criar `server/src/routes/uploads.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import staticPlugin from '@fastify/static'
import path from 'node:path'
import uploadsRoutes from './uploads'

describe('POST /uploads', () => {
  it('accepts an image and returns a URL', async () => {
    const app = Fastify()
    app.decorateRequest('userId', '')
    app.decorate('authenticate', async (req: any) => { req.userId = 'u1' })
    await app.register(multipart)
    await app.register(staticPlugin, {
      root: path.resolve(process.cwd(), 'uploads'),
      prefix: '/uploads/',
      decorateReply: false,
    })
    await app.register(uploadsRoutes)

    const form = new FormData()
    form.append('file', new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }), 'test.png')

    const res = await app.inject({
      method: 'POST',
      url: '/',
      payload: form,
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.url).toMatch(/^\/uploads\/.+\.png$/)
    await app.close()
  })

  it('rejects non-image mimetypes', async () => {
    const app = Fastify()
    app.decorateRequest('userId', '')
    app.decorate('authenticate', async (req: any) => { req.userId = 'u1' })
    await app.register(multipart)
    await app.register(uploadsRoutes)

    const form = new FormData()
    form.append('file', new Blob(['not an image'], { type: 'application/pdf' }), 'doc.pdf')

    const res = await app.inject({ method: 'POST', url: '/', payload: form })
    expect(res.statusCode).toBe(400)
    await app.close()
  })
})
```

- [ ] **Step 3: Rodar teste (deve falhar)**

```bash
cd server && npx vitest run src/routes/uploads.test.ts
```

Expected: FAIL — módulo não existe.

- [ ] **Step 4: Implementar `server/src/routes/uploads.ts`**

```typescript
import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_BYTES = 5 * 1024 * 1024 // 5MB

export default async function uploadsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.post('/', async (request, reply) => {
    const file = await request.file()
    if (!file) return reply.status(400).send({ error: 'No file uploaded' })
    if (!ALLOWED.has(file.mimetype)) {
      return reply.status(400).send({ error: `Unsupported mimetype: ${file.mimetype}` })
    }

    const buffer = await file.toBuffer()
    if (buffer.byteLength > MAX_BYTES) {
      return reply.status(400).send({ error: 'File exceeds 5MB limit' })
    }

    const ext = file.mimetype === 'image/png' ? 'png'
              : file.mimetype === 'image/webp' ? 'webp'
              : 'jpg'
    const filename = `${randomUUID()}.${ext}`
    const target = path.resolve(process.cwd(), 'uploads', filename)
    await writeFile(target, buffer)

    reply.status(201).send({ url: `/uploads/${filename}` })
  })
}
```

- [ ] **Step 5: Registrar em `server/src/index.ts`**

Após imports existentes de routes, adicionar:

```typescript
import multipart from '@fastify/multipart'
import staticPlugin from '@fastify/static'
import uploadsRoutes from './routes/uploads'
import path from 'node:path'
```

Após `await fastify.register(cookie)`, adicionar:

```typescript
await fastify.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } })
await fastify.register(staticPlugin, {
  root: path.resolve(process.cwd(), 'uploads'),
  prefix: '/uploads/',
})
```

Após `await fastify.register(notificationsRoutes, ...)`, adicionar:

```typescript
await fastify.register(uploadsRoutes, { prefix: '/uploads' })
```

- [ ] **Step 6: Rodar teste**

```bash
cd server && npx vitest run src/routes/uploads.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/uploads.ts server/src/routes/uploads.test.ts server/src/index.ts server/uploads/.gitignore
git commit -m "feat(server): POST /uploads with mimetype and size validation"
```

---

## Task 2.3: Frontend — `uploadImage` helper

**Files:**
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Adicionar `uploadImage` em `src/lib/api.ts`**

Após a definição existente de `apiFetch`, adicionar:

```typescript
export async function uploadImage(file: File): Promise<{ url: string }> {
  const { accessToken } = useAppStore.getState() // eslint-disable-line
  // Importe useAppStore no topo do arquivo se ainda não estiver
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/uploads', {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: form,
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}
```

**⚠️ Import necessário no topo de `src/lib/api.ts`:**

```typescript
import { useAppStore } from '../store/useAppStore';
```

Se já existe circular dependency por causa disso (api.ts é importado pelo store), extrair `accessToken` diferente: aceitar como parâmetro opcional ou usar um getter global registrado em runtime. **Verificar antes de editar.**

Se houver circular: mudar a assinatura:

```typescript
export async function uploadImage(file: File, accessToken: string | null): Promise<{ url: string }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/uploads', {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: form,
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}
```

E callers passam o token.

- [ ] **Step 2: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: uploadImage helper posts multipart to /api/uploads"
```

---

## Task 2.4: Refatorar `CreatePostScreen` pra upload real

**Files:**
- Modify: `src/components/comunidade/CreatePostScreen.tsx`

- [ ] **Step 1: Ler estado atual do arquivo**

Antes de editar, ler `src/components/comunidade/CreatePostScreen.tsx` inteiro pra entender como imagem é lidada hoje (base64 em state). Identificar onde a submit function envia o `body: JSON.stringify({ ..., imageUrl: base64string })`.

- [ ] **Step 2: Substituir base64 por upload**

No handler de submit, antes de chamar `apiFetch('/posts', ...)`:

```tsx
let imageUrl: string | undefined = undefined;
if (selectedFile) {
  const { url } = await uploadImage(selectedFile, useAppStore.getState().accessToken);
  imageUrl = url;
}
// ... continua com POST /posts passando imageUrl
```

O `selectedFile: File | null` state substitui o `imageBase64: string | null` state. Preview usa `URL.createObjectURL(selectedFile)`.

Import necessários:

```tsx
import { uploadImage } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
```

- [ ] **Step 3: Ajustar file input pra guardar `File` em vez de ler base64**

```tsx
<input
  type="file"
  accept="image/png,image/jpeg,image/webp"
  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
/>
```

- [ ] **Step 4: Rodar suite (checar regressões)**

```bash
npm test -- --run
```

Se testes de `CreatePostScreen` mockavam `FileReader` ou similar, ajustar mocks pra `File` e `URL.createObjectURL`. Provavelmente precisará stub em `beforeEach`:

```typescript
beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:preview');
});
```

- [ ] **Step 5: Commit**

```bash
git add src/components/comunidade/CreatePostScreen.tsx
git commit -m "refactor: CreatePostScreen uploads real image via /uploads"
```

---

# Milestone 3 — Notificações Com Destino

**Feature:** Toque numa notificação abre a tela relacionada (post curtido, perfil da nova seguidora, comentário no seu post). Notificação marca como lida automaticamente.

**Backend changes:** Adicionar `targetType` (`'post' | 'user' | 'community'`) e `targetId` na `Notification`. Emitir notif com target correto nos endpoints de like, follow, comment. Novo endpoint `POST /notifications/:id/read`.

**Frontend changes:** Estender `ApiNotification`. `NotificationsScreen` recebe callbacks pra navegar. Wire em `App.tsx`.

---

## Task 3.1: Migração — adicionar `targetType` e `targetId` à `Notification`

**Files:**
- Modify: `server/prisma/schema.prisma:167-175`
- Migration: gerada

- [ ] **Step 1: Adicionar campos ao schema**

Substituir bloco `model Notification` em `server/prisma/schema.prisma`:

```prisma
model Notification {
  id          String   @id @default(cuid())
  type        String
  text        String
  targetType  String?
  targetId    String?
  read        Boolean  @default(false)
  recipientId String
  recipient   User     @relation(fields: [recipientId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())

  @@index([recipientId, read])
}
```

- [ ] **Step 2: Aplicar via `db push` (dev)**

```bash
cd server && npx prisma db push
```

- [ ] **Step 3: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat(server): add targetType/targetId to Notification for deep-linking"
```

---

## Task 3.2: Emitir notificações com target correto

**Files:**
- Modify: `server/src/routes/posts.ts` (endpoint like e comment)
- Modify: `server/src/routes/users.ts` (endpoint follow)

- [ ] **Step 1: Ler os handlers atuais**

Antes de editar, `Read` os arquivos e localizar onde `notification.create` já é chamado (ou onde deveria ser). Se nenhum emite notif hoje, adicionar em cada handler.

- [ ] **Step 2: Adicionar emissão no `POST /posts/:id/like`**

Após o `postLike.create`, adicionar (sem `await` pra não bloquear resposta se não for crítico):

```typescript
const post = await fastify.prisma.post.findUnique({ where: { id: request.params.id }, select: { authorId: true } })
if (post && post.authorId !== request.userId) {
  const liker = await fastify.prisma.user.findUnique({ where: { id: request.userId }, select: { name: true } })
  await fastify.prisma.notification.create({
    data: {
      recipientId: post.authorId,
      type: 'like',
      text: `${liker?.name ?? 'Alguém'} curtiu seu post`,
      targetType: 'post',
      targetId: request.params.id,
    },
  })
}
```

- [ ] **Step 3: Análogo em `POST /posts/:id/comments`**

```typescript
if (post.authorId !== request.userId) {
  const commenter = await fastify.prisma.user.findUnique({ where: { id: request.userId }, select: { name: true } })
  await fastify.prisma.notification.create({
    data: {
      recipientId: post.authorId,
      type: 'comment',
      text: `${commenter?.name ?? 'Alguém'} comentou no seu post`,
      targetType: 'post',
      targetId: post.id,
    },
  })
}
```

- [ ] **Step 4: Análogo em `POST /users/:id/follow`**

```typescript
const follower = await fastify.prisma.user.findUnique({ where: { id: request.userId }, select: { name: true } })
await fastify.prisma.notification.create({
  data: {
    recipientId: request.params.id,
    type: 'follow',
    text: `${follower?.name ?? 'Alguém'} começou a te seguir`,
    targetType: 'user',
    targetId: request.userId,
  },
})
```

- [ ] **Step 5: Endpoint `POST /notifications/:id/read`**

Em `server/src/routes/notifications.ts`, após handler `POST /read-all`:

```typescript
fastify.post<{ Params: { id: string } }>('/:id/read', async (request, reply) => {
  await fastify.prisma.notification.updateMany({
    where: { id: request.params.id, recipientId: request.userId },
    data: { read: true },
  })
  reply.send({ ok: true })
})
```

- [ ] **Step 6: Rodar suite server**

```bash
cd server && npm test
```

Expected: 0 regressões.

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/posts.ts server/src/routes/users.ts server/src/routes/notifications.ts
git commit -m "feat(server): emit notifications with target on like/comment/follow"
```

---

## Task 3.3: Frontend — `ApiNotification` com target + `NotificationsScreen` com deep-link

**Files:**
- Modify: `src/lib/types.ts:66-73`
- Modify: `src/components/notifications/NotificationsScreen.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Estender `ApiNotification`**

Em `src/lib/types.ts`, substituir bloco `ApiNotification`:

```typescript
export interface ApiNotification {
  id: string
  type: 'like' | 'follow' | 'comment'
  text: string
  targetType: 'post' | 'user' | 'community' | null
  targetId: string | null
  read: boolean
  recipientId: string
  createdAt: string
}
```

- [ ] **Step 2: Adicionar callbacks a `NotificationsScreen`**

Ler o arquivo primeiro. Depois, ampliar props:

```tsx
interface NotificationsScreenProps {
  onBack: () => void;
  onOpenPost: (postId: string) => void;
  onOpenUser: (userId: string) => void;
  onOpenCommunity: (communityId: string) => void;
}
```

Adicionar mutation pra marcar como lida:

```tsx
const readMutation = useMutation({
  mutationFn: (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'POST' }),
  onSuccess: (_, id) => {
    queryClient.setQueryData<ApiNotification[]>(['notifications'], (old) =>
      old?.map((n) => (n.id === id ? { ...n, read: true } : n)) ?? old
    );
  },
});
```

Substituir o handler de tap em cada notif por:

```tsx
function handleTap(notif: ApiNotification) {
  if (!notif.read) readMutation.mutate(notif.id);
  if (notif.targetType === 'post' && notif.targetId) onOpenPost(notif.targetId);
  else if (notif.targetType === 'user' && notif.targetId) onOpenUser(notif.targetId);
  else if (notif.targetType === 'community' && notif.targetId) onOpenCommunity(notif.targetId);
}
```

Cada item da lista fica `<button onClick={() => handleTap(notif)}>...`.

- [ ] **Step 3: Wire callbacks em `App.tsx`**

O `showNotifications` overlay já existe (leia `src/App.tsx`). Substituir:

```tsx
{showNotifications && (
  <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
    <NotificationsScreen
      onBack={() => setShowNotifications(false)}
      onOpenPost={(id) => {
        setShowNotifications(false);
        // Deep-link a post requer buscar o post primeiro; por hora abrir o author
        // Alternativa: adicionar rota /posts/:id na API e overlay direto
        // Ver Task 3.4
      }}
      onOpenUser={(id) => { setShowNotifications(false); setProfileUserId(id); }}
      onOpenCommunity={(id) => { setShowNotifications(false); setOpenCommunityId(id); }}
    />
  </div>
)}
```

- [ ] **Step 4: Commit parcial**

```bash
git add src/lib/types.ts src/components/notifications/NotificationsScreen.tsx src/App.tsx
git commit -m "feat: notification tap opens target user/community; mark as read"
```

---

## Task 3.4: Deep-link para post (requer buscar post)

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Adicionar state `pendingPostId` e query**

Em `App.tsx`, adicionar:

```tsx
const [pendingPostId, setPendingPostId] = useState<string | null>(null);

const { data: pendingPost } = useQuery({
  queryKey: ['post', pendingPostId],
  queryFn: () => apiFetch<ApiPost>(`/posts/${pendingPostId}`),
  enabled: !!pendingPostId,
});
```

- [ ] **Step 2: Overlay do PostDetail**

Adicionar após os outros overlays:

```tsx
{pendingPost && (
  <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
    <PostDetailScreen
      post={apiPostToCommunityPost(pendingPost)}
      onBack={() => setPendingPostId(null)}
      onOpenProfile={(id) => { setPendingPostId(null); setProfileUserId(id); }}
    />
  </div>
)}
```

Imports: `PostDetailScreen`, `apiPostToCommunityPost`, `ApiPost`.

- [ ] **Step 3: Wire onOpenPost**

Substituir o handler `onOpenPost` no overlay de NotificationsScreen:

```tsx
onOpenPost={(id) => { setShowNotifications(false); setPendingPostId(id); }}
```

- [ ] **Step 4: Rodar suite**

```bash
npm test -- --run
```

Expected: 0 regressões.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: notification tap on post opens PostDetail via pendingPostId"
```

---

# Milestone 4 — Infinite Scroll

**Feature:** Feeds (comunidade principal, perfil da usuária, detalhe de comunidade) carregam mais posts quando o usuário chega perto do final. Backend já paginado com cursor.

**Frontend changes:** Trocar `useQuery` por `useInfiniteQuery`. Criar hook `useIntersection` pra trigger de scroll. Aplicar em 3 telas.

---

## Task 4.1: Hook `useIntersection`

**Files:**
- Create: `src/lib/useIntersection.ts`
- Create: `src/lib/useIntersection.test.ts`

- [ ] **Step 1: Escrever teste**

Criar `src/lib/useIntersection.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useIntersection } from './useIntersection';

describe('useIntersection', () => {
  it('registers observer on ref element', () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    global.IntersectionObserver = vi.fn(() => ({
      observe, disconnect,
      unobserve: vi.fn(), takeRecords: vi.fn(), root: null, rootMargin: '', thresholds: [],
    })) as unknown as typeof IntersectionObserver;

    const onIntersect = vi.fn();
    renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      const div = document.createElement('div');
      Object.assign(ref, { current: div });
      useIntersection(ref, onIntersect);
    });

    expect(observe).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar teste (deve falhar)**

```bash
npm test -- --run src/lib/useIntersection.test.ts
```

- [ ] **Step 3: Implementar**

Criar `src/lib/useIntersection.ts`:

```typescript
import { useEffect, type RefObject } from 'react';

export function useIntersection<T extends Element>(
  ref: RefObject<T>,
  onIntersect: () => void,
  options: IntersectionObserverInit = { rootMargin: '200px' },
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) onIntersect();
    }, options);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, onIntersect, options]);
}
```

- [ ] **Step 4: Rodar teste**

```bash
npm test -- --run src/lib/useIntersection.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/useIntersection.ts src/lib/useIntersection.test.ts
git commit -m "feat: useIntersection hook for scroll-triggered actions"
```

---

## Task 4.2: Trocar `useQuery` por `useInfiniteQuery` no feed principal

**Files:**
- Modify: `src/components/comunidade/ComunidadeScreen.tsx`

- [ ] **Step 1: Substituir hook e sentinel**

Trocar o `useQuery` atual por:

```tsx
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { useIntersection } from '../../lib/useIntersection';

const { data, isLoading, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['posts'],
  queryFn: ({ pageParam }) =>
    apiFetch<PaginatedResult<ApiPost>>(
      pageParam ? `/posts?cursor=${pageParam}` : '/posts'
    ),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last) => (last.hasMore ? last.items.at(-1)?.id : undefined),
  enabled: isLoggedIn,
});

const communityPosts = (data?.pages.flatMap((p) => p.items) ?? []).map(apiPostToCommunityPost);

const sentinelRef = useRef<HTMLDivElement>(null);
useIntersection(sentinelRef, () => { if (hasNextPage) fetchNextPage(); });
```

Adicionar sentinel após o último `<PostCard>` no map:

```tsx
<div ref={sentinelRef} className="h-4" />
```

- [ ] **Step 2: Ajustar caches otimistas em `patchPostLikeInAllCaches`**

`useInfiniteQuery` armazena `{ pages: [...] }` no cache, não `{ items: [...] }` direto. Estender o helper em `src/lib/helpers.ts`:

```typescript
export function patchPostLikeInAllCaches(
  queryClient: QueryClient,
  postId: string,
  isLiked: boolean,
): void {
  queryClient.setQueriesData<any>(
    { predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes('posts') },
    (old) => {
      if (!old) return old;
      // Flat query (e.g. ['user', id, 'posts']): { items, hasMore }
      if ('items' in old) {
        return {
          ...old,
          items: old.items.map((p: ApiPost) => patchLike(p, postId, isLiked)),
        };
      }
      // Infinite query (['posts']): { pages: [{ items, hasMore }] }
      if ('pages' in old) {
        return {
          ...old,
          pages: old.pages.map((page: PaginatedResult<ApiPost>) => ({
            ...page,
            items: page.items.map((p) => patchLike(p, postId, isLiked)),
          })),
        };
      }
      return old;
    },
  );
}

function patchLike(p: ApiPost, postId: string, isLiked: boolean): ApiPost {
  return p.id === postId
    ? { ...p, likedByCurrentUser: isLiked, _count: { ...p._count, likes: p._count.likes + (isLiked ? 1 : -1) } }
    : p;
}
```

- [ ] **Step 3: Rodar suite**

```bash
npm test -- --run
```

Expected: 0 regressões (testes do ComunidadeScreen usam `qc.setQueryData(['posts'], EMPTY_POSTS)` — atualizar test helper pra usar o shape de `useInfiniteQuery`):

Alternativa mais simples nos testes: `qc.setQueryData(['posts'], { pages: [{ items: [], hasMore: false }], pageParams: [undefined] })`.

- [ ] **Step 4: Commit**

```bash
git add src/components/comunidade/ComunidadeScreen.tsx src/lib/helpers.ts src/App.test.tsx src/components/comunidade/ComunidadeScreen.test.tsx
git commit -m "feat: infinite scroll on main feed"
```

---

## Task 4.3: Infinite scroll em `UserProfileScreen` e `CommunityDetailScreen`

**Files:**
- Modify: `src/components/profile/UserProfileScreen.tsx`
- Modify: `src/components/comunidade/CommunityDetailScreen.tsx`

- [ ] **Step 1: Aplicar mesmo padrão em `UserProfileScreen`**

Trocar `useQuery` de posts por `useInfiniteQuery`:

```tsx
const { data: postsData, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['user', userId, 'posts'],
  queryFn: ({ pageParam }) =>
    apiFetch<PaginatedResult<ApiPost>>(
      pageParam ? `/users/${userId}/posts?cursor=${pageParam}` : `/users/${userId}/posts`
    ),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last) => (last.hasMore ? last.items.at(-1)?.id : undefined),
  enabled: !!profile,
});

const posts = (postsData?.pages.flatMap((p) => p.items) ?? []).map(apiPostToCommunityPost);

const sentinelRef = useRef<HTMLDivElement>(null);
useIntersection(sentinelRef, () => { if (hasNextPage) fetchNextPage(); });
```

Adicionar `<div ref={sentinelRef} className="h-4" />` no fim da lista.

- [ ] **Step 2: Mesma coisa em `CommunityDetailScreen`**

Análogo, com `queryKey: ['community', communityId, 'posts']`.

- [ ] **Step 3: Rodar suite**

```bash
npm test -- --run
```

Testes de `UserProfileScreen` usam mocks de `apiFetch` que retornam `{ items: [], hasMore: false }`. `useInfiniteQuery` chama o queryFn com `pageParam: undefined` — os mocks continuam funcionando porque retornam o mesmo shape.

- [ ] **Step 4: Commit**

```bash
git add src/components/profile/UserProfileScreen.tsx src/components/comunidade/CommunityDetailScreen.tsx
git commit -m "feat: infinite scroll on profile and community feeds"
```

---

# Milestone 5 — Onboarding Social

**Feature:** No fim do onboarding atual (após arquétipo), mostrar uma tela "Comunidades que combinam com você" com 3-5 sugestões pré-selecionadas. Usuária confirma → seguidas → primeiro feed já vem populado.

**Backend changes:** `GET /communities/suggested` retorna comunidades ranqueadas por `pregnancyStage` + `archetypeKey`.

**Frontend changes:** Novo `SocialOnboardingScreen`, wire no `OnboardingScreen`, flag `socialOnboardingDone` no store.

---

## Task 5.1: Endpoint `GET /communities/suggested`

**Files:**
- Modify: `server/src/routes/communities.ts`

- [ ] **Step 1: Escrever teste**

Criar/apender em `server/src/routes/communities.test.ts` (se não existe, criar novo com o mesmo shape do search.test):

```typescript
import { describe, it, expect } from 'vitest'
import { PrismaClient } from '@prisma/client'
import Fastify from 'fastify'
import communitiesRoutes from './communities'

const prisma = new PrismaClient()

describe('GET /communities/suggested', () => {
  it('returns up to 5 communities matching stage', async () => {
    const stamp = Date.now()
    const user = await prisma.user.create({
      data: {
        email: `sug${stamp}@t.com`, passwordHash: 'x', name: 'Sugestão',
        pregnancyStage: 'pregnant', archetypeKey: 'sara',
      },
    })
    const c = await prisma.community.create({
      data: { name: `Sug${stamp}`, description: 'x', category: 'gestação', colorKey: 'gold', creatorId: user.id },
    })

    const app = Fastify()
    app.decorate('prisma', prisma)
    app.decorateRequest('userId', '')
    app.decorate('authenticate', async (req: any) => { req.userId = user.id })
    await app.register(communitiesRoutes)

    const res = await app.inject({ method: 'GET', url: '/suggested' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeLessThanOrEqual(5)
    expect(body.some((c: any) => c.category === 'gestação')).toBe(true)

    await prisma.community.delete({ where: { id: c.id } })
    await prisma.user.delete({ where: { id: user.id } })
    await app.close()
  })
})
```

- [ ] **Step 2: Rodar teste (deve falhar)**

```bash
cd server && npx vitest run src/routes/communities.test.ts
```

- [ ] **Step 3: Adicionar handler em `server/src/routes/communities.ts`**

Antes do `fastify.get('/:id', ...)`:

```typescript
fastify.get('/suggested', async (request, reply) => {
  const me = await fastify.prisma.user.findUnique({
    where: { id: request.userId },
    select: { pregnancyStage: true, archetypeKey: true },
  })
  if (!me) return reply.send([])

  const stageCategories =
    me.pregnancyStage === 'pregnant' ? ['gestação']
    : ['pós-parto', 'amamentação']
  const archetypeBonus = me.archetypeKey === 'ana' ? ['saúde mental'] : []
  const priorityCategories = [...stageCategories, ...archetypeBonus]

  const communities = await fastify.prisma.community.findMany({
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  const scored = communities
    .map((c) => ({ ...c, score: priorityCategories.includes(c.category) ? 2 : 0 }))
    .sort((a, b) => b.score - a.score || b._count.members - a._count.members)
    .slice(0, 5)

  reply.send(scored)
})
```

- [ ] **Step 4: Rodar teste**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/communities.ts server/src/routes/communities.test.ts
git commit -m "feat(server): GET /communities/suggested ranks by stage + archetype"
```

---

## Task 5.2: Adicionar flag `socialOnboardingDone` ao store

**Files:**
- Modify: `src/store/useAppStore.ts`

- [ ] **Step 1: Adicionar flag e action**

Interface `AppState`, adicionar:

```typescript
socialOnboardingDone: boolean;
completeSocialOnboarding: () => void;
```

Estado inicial:

```typescript
socialOnboardingDone: false,
```

Action:

```typescript
completeSocialOnboarding: () => set({ socialOnboardingDone: true }),
```

`partialize` — adicionar:

```typescript
socialOnboardingDone: state.socialOnboardingDone,
```

- [ ] **Step 2: Commit**

```bash
git add src/store/useAppStore.ts
git commit -m "feat: track socialOnboardingDone flag"
```

---

## Task 5.3: Criar `SocialOnboardingScreen`

**Files:**
- Create: `src/components/auth/SocialOnboardingScreen.tsx`
- Create: `src/components/auth/SocialOnboardingScreen.test.tsx`

- [ ] **Step 1: Escrever testes**

Criar `src/components/auth/SocialOnboardingScreen.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SocialOnboardingScreen } from './SocialOnboardingScreen';
import * as api from '../../lib/api';

vi.mock('../../lib/api', async () => ({
  ...(await vi.importActual('../../lib/api')),
  apiFetch: vi.fn(),
}));

function renderScreen(onDone = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SocialOnboardingScreen onDone={onDone} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.apiFetch).mockResolvedValue([
    { id: 'c1', name: 'Gestantes', description: 'x', category: 'gestação', colorKey: 'gold', _count: { members: 10 } },
    { id: 'c2', name: 'Mães Recentes', description: 'y', category: 'pós-parto', colorKey: 'warm', _count: { members: 20 } },
  ]);
});

describe('SocialOnboardingScreen', () => {
  it('lists suggested communities', async () => {
    renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Gestantes')).toBeInTheDocument();
      expect(screen.getByText('Mães Recentes')).toBeInTheDocument();
    });
  });

  it('pre-selects all suggestions', async () => {
    renderScreen();
    await waitFor(() => screen.getByText('Gestantes'));
    const buttons = screen.getAllByRole('button', { name: /Selecionada/i });
    expect(buttons.length).toBe(2);
  });

  it('toggles selection on tap', async () => {
    const user = userEvent.setup();
    renderScreen();
    await waitFor(() => screen.getByText('Gestantes'));
    const first = screen.getAllByRole('button', { name: /Selecionada/i })[0];
    await user.click(first);
    expect(screen.getAllByRole('button', { name: /Selecionada/i }).length).toBe(1);
  });

  it('POSTs join for each selected on Continuar', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    renderScreen(onDone);
    await waitFor(() => screen.getByText('Gestantes'));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() => {
      expect(api.apiFetch).toHaveBeenCalledWith('/communities/c1/join', { method: 'POST' });
      expect(api.apiFetch).toHaveBeenCalledWith('/communities/c2/join', { method: 'POST' });
    });
    expect(onDone).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar teste (deve falhar)**

```bash
npm test -- --run src/components/auth/SocialOnboardingScreen.test.tsx
```

- [ ] **Step 3: Implementar**

Criar `src/components/auth/SocialOnboardingScreen.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { ApiCommunity } from '../../lib/types';

interface SocialOnboardingScreenProps {
  onDone: () => void;
}

const COLOR_MAP: Record<string, string> = {
  gold: 'bg-sara-gold', terracotta: 'bg-sara-terracotta',
  warm: 'bg-sara-warm', linen: 'bg-sara-linen', cream: 'bg-sara-cream',
};

export function SocialOnboardingScreen({ onDone }: SocialOnboardingScreenProps) {
  const { data: suggested = [] } = useQuery({
    queryKey: ['communities', 'suggested'],
    queryFn: () => apiFetch<ApiCommunity[]>('/communities/suggested'),
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelected(new Set(suggested.map((c) => c.id)));
  }, [suggested]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleContinue() {
    setSubmitting(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          apiFetch(`/communities/${id}/join`, { method: 'POST' })
        )
      );
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <div className="px-4 pt-8 pb-4 flex-shrink-0">
        <h1 className="text-lg font-bold text-graphite">Comunidades pra você</h1>
        <p className="text-sm text-graphite-muted mt-2 leading-relaxed">
          Escolhemos essas com base no seu momento. Você pode ajustar depois.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2">
        {suggested.map((c) => {
          const isSelected = selected.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              aria-label={isSelected ? 'Selecionada' : `Selecionar ${c.name}`}
              className={`flex items-center gap-3 p-3 rounded-2xl text-left transition-colors ${
                isSelected ? 'bg-white shadow-sm' : 'bg-white/40'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl ${COLOR_MAP[c.colorKey] ?? 'bg-sara-gold'} flex items-center justify-center text-white text-base font-bold flex-shrink-0`}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-graphite">{c.name}</p>
                <p className="text-[11px] text-graphite-muted">{c._count.members} membros</p>
              </div>
              {isSelected && (
                <div className="w-6 h-6 rounded-full bg-sara-gold flex items-center justify-center flex-shrink-0">
                  <Check size={14} className="text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="px-4 py-4 flex-shrink-0">
        <button
          onClick={handleContinue}
          disabled={submitting}
          className="w-full py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
        >
          {submitting ? 'Entrando…' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar teste**

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/SocialOnboardingScreen.tsx src/components/auth/SocialOnboardingScreen.test.tsx
git commit -m "feat: add SocialOnboardingScreen with pre-selected community picks"
```

---

## Task 5.4: Wire `SocialOnboardingScreen` no fluxo do App

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Ler estrutura atual do gating**

Hoje: `if (!isLoggedIn) return <LoginScreen />; if (!onboardingDone) return <OnboardingScreen />;`

Adicionar novo gate:

```tsx
import { SocialOnboardingScreen } from './components/auth/SocialOnboardingScreen';

// ...
const socialOnboardingDone = useAppStore((s) => s.socialOnboardingDone);
const completeSocialOnboarding = useAppStore((s) => s.completeSocialOnboarding);

if (restoring) return null;
if (!isLoggedIn) return <LoginScreen />;
if (!onboardingDone) return <OnboardingScreen />;
if (!socialOnboardingDone) {
  return <SocialOnboardingScreen onDone={completeSocialOnboarding} />;
}
```

- [ ] **Step 2: Rodar suite**

```bash
npm test -- --run
```

Expected: `App.test.tsx` pode precisar de update — nos setups de estado, adicionar `socialOnboardingDone: true` pra não travar no novo gate.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: gate app on socialOnboardingDone after onboarding"
```

---

# Verificação Final

- [ ] **Step 1: Rodar suite completa**

```bash
npm test -- --run
```

Expected: 0 falhas. Contagem esperada: ~195-205 tests (adicionamos ~20 novos).

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 erros novos (pré-existentes documentados podem persistir).

- [ ] **Step 3: Smoke test manual**

```bash
docker-compose up -d
npm --prefix server run dev  # terminal 1
npm run dev                   # terminal 2
```

Fluxos pra validar em `http://localhost:5173`:
- Novo cadastro → OnboardingScreen → SocialOnboardingScreen → aparecem 3-5 sugestões pré-selecionadas → Continuar → feed principal com posts das seguidas
- Meu perfil → Editar perfil → mudar nome/bio → Salvar → volta pra perfil com nome atualizado
- Criar post com imagem real → escolher arquivo → preview → publicar → post aparece com imagem servida de `/uploads/*`
- Alguém curte meu post → Bell mostra `1` → tap na notificação → abre PostDetail direto
- Feed principal com >20 posts → scroll → aparecem mais 20 automaticamente

- [ ] **Step 4: Release marker**

```bash
git commit --allow-empty -m "release: Tier 2 polish & retention complete"
```

---

# Escopo Explícito (Fora do T2)

Deixado pra T3 pra evitar scope creep:
- Report/block user
- Password reset + envio de email
- Delete account (LGPD art. 18)
- Termos + Política de Privacidade
- Rate limit em ações sociais
- Migração de `server/uploads/` local pra S3/R2 (com presigned URLs) — o helper `uploadImage` já usa multipart, dá pra trocar o backend depois sem tocar no frontend

Deixado pra T4 (pós-launch):
- Push notifications (FCM)
- Real-time chat (WebSocket/SSE)
- Comentários aninhados + curtir comentário
- Editar/deletar post próprio
- Feed ranking (não-cronológico)
