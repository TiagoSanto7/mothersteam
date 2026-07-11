# Account Creation Flow & Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 2-step account registration screen and fix 5 bugs: notification toggle CSS overflow, settings transparent background from sidebar, camera button no-op, visitor toggle removal, and like state resetting on navigation.

**Architecture:** `RegisterScreen` is a standalone component conditionally rendered by `LoginScreen`. Backend register route extended with `babyName` and full user response. Like persistence uses server-derived `likedByCurrentUser` field to seed PostCard local state, with optimistic cache update on toggle so remounts re-read the correct state.

**Tech Stack:** React 18 + TypeScript + Vite, Zustand 5, React Query v5 (`@tanstack/react-query`), Fastify 4, Prisma (MySQL), Vitest + React Testing Library

---

### Task 1: Backend — Register route (babyName + full user response)

**Files:**
- Modify: `server/src/routes/auth.ts`

- [ ] **Step 1: Update registerSchema to accept babyName**

In `server/src/routes/auth.ts`, the `registerSchema` currently (lines 15–22) is:
```typescript
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  pregnancyStage: z.enum(['pregnant', 'postpartum']),
  pregnancyWeek: z.number().int().min(1).max(42).optional(),
  babyAgeInDays: z.number().int().min(0).optional(),
})
```

Replace with:
```typescript
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  pregnancyStage: z.enum(['pregnant', 'postpartum']),
  pregnancyWeek: z.number().int().min(1).max(42).optional(),
  babyAgeInDays: z.number().int().min(0).optional(),
  babyName: z.string().optional(),
})
```

- [ ] **Step 2: Add babyName to create and return full user from register**

In the `fastify.post('/register', ...)` handler, the `prisma.user.create` call currently returns only `{ id, email, name }`. Replace the entire create call (lines 38–48) with:

```typescript
const user = await fastify.prisma.user.create({
  data: {
    email: body.data.email,
    passwordHash,
    name: body.data.name,
    pregnancyStage: body.data.pregnancyStage,
    pregnancyWeek: body.data.pregnancyWeek,
    babyAgeInDays: body.data.babyAgeInDays,
    babyName: body.data.babyName,
  },
  select: {
    id: true, email: true, name: true, babyName: true,
    pregnancyStage: true, pregnancyWeek: true, babyAgeInDays: true,
    onboardingDone: true, profileKey: true, archetypeKey: true,
  },
})
```

- [ ] **Step 3: Restart server and verify via curl**

Restart the server (kill the old process and run):
```bash
npx tsx src/index.ts
```

From a second terminal (substitute a unique email each run):
```bash
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newtest@test.com","password":"12345678","name":"Teste","pregnancyStage":"pregnant","pregnancyWeek":28,"babyName":"Nino"}' | jq .
```

Expected response shape:
```json
{
  "accessToken": "...",
  "user": {
    "id": "...",
    "email": "newtest@test.com",
    "name": "Teste",
    "babyName": "Nino",
    "pregnancyStage": "pregnant",
    "pregnancyWeek": 28,
    "babyAgeInDays": null,
    "onboardingDone": false,
    "profileKey": null,
    "archetypeKey": null
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/auth.ts
git commit -m "feat: add babyName to register; return full user on register"
```

---

### Task 2: Backend — GET /posts adds likedByCurrentUser

**Files:**
- Modify: `server/src/routes/posts.ts`

- [ ] **Step 1: Update the GET / handler to include likedByCurrentUser**

In `server/src/routes/posts.ts`, replace the `GET /` handler (lines 18–34) with:

```typescript
fastify.get<{ Querystring: { cursor?: string; limit?: string } }>(
  '/',
  async (request, reply) => {
    const limit = Math.min(Number(request.query.limit ?? 20), 50)
    const rows = await fastify.prisma.post.findMany({
      take: limit + 1,
      ...(request.query.cursor ? { cursor: { id: request.query.cursor }, skip: 1 } : {}),
      include: {
        author: { select: { id: true, name: true } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId: request.userId }, select: { userId: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    const hasMore = rows.length > limit
    const items = rows.slice(0, limit).map(({ likes, ...post }) => ({
      ...post,
      likedByCurrentUser: likes.length > 0,
    }))
    reply.send({ items, hasMore })
  }
)
```

- [ ] **Step 2: Verify response includes likedByCurrentUser**

1. Get a token:
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<your-email>","password":"<your-password>"}' | jq -r '.accessToken')
```

2. Fetch posts:
```bash
curl -s http://localhost:3001/api/posts \
  -H "Authorization: Bearer $TOKEN" | jq '.items[0] | {id, likedByCurrentUser}'
```

Expected: `{ "id": "...", "likedByCurrentUser": false }` (or `true` if you've liked that post).

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/posts.ts
git commit -m "feat: add likedByCurrentUser to GET /posts response"
```

---

### Task 3: Frontend types — ApiPost + CommunityPost + helper

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/types/index.ts`
- Modify: `src/lib/helpers.ts`

- [ ] **Step 1: Add likedByCurrentUser to ApiPost**

In `src/lib/types.ts`, add `likedByCurrentUser: boolean` to `ApiPost` after `createdAt`:

```typescript
export interface ApiPost {
  id: string
  content: string
  category: 'gestação' | 'pós-parto' | 'amamentação' | 'saúde mental'
  imageUrl?: string | null
  authorId: string
  author: { id: string; name: string }
  communityId?: string | null
  isRepost: boolean
  repostFromId?: string | null
  _count: { likes: number; comments: number }
  createdAt: string
  likedByCurrentUser: boolean
}
```

- [ ] **Step 2: Add likedByCurrentUser to CommunityPost**

In `src/types/index.ts`, add `likedByCurrentUser?: boolean` to `CommunityPost` after `imageUrl`:

```typescript
export interface CommunityPost {
  id: string;
  category: 'gestação' | 'pós-parto' | 'amamentação' | 'saúde mental';
  author: string;
  badge?: 'experiente' | 'profissional';
  content: string;
  likes: number;
  replies: number;
  time: string;
  isRepost?: boolean;
  repostFrom?: string;
  communityId?: string;
  imageUrl?: string;
  likedByCurrentUser?: boolean;
}
```

- [ ] **Step 3: Update apiPostToCommunityPost**

In `src/lib/helpers.ts`, add `likedByCurrentUser` to the returned object in `apiPostToCommunityPost`:

```typescript
export function apiPostToCommunityPost(post: ApiPost): CommunityPost {
  return {
    id: post.id,
    category: post.category,
    author: post.author.name,
    content: post.content,
    imageUrl: post.imageUrl ?? undefined,
    likes: post._count.likes,
    replies: post._count.comments,
    time: relativeTime(post.createdAt),
    communityId: post.communityId ?? undefined,
    isRepost: post.isRepost,
    likedByCurrentUser: post.likedByCurrentUser,
  }
}
```

- [ ] **Step 4: Update API_POSTS fixture in ComunidadeScreen.test.tsx**

The existing `API_POSTS` in `src/components/comunidade/ComunidadeScreen.test.tsx` will now fail TypeScript because `likedByCurrentUser` is required in `ApiPost`. Add it to both test posts:

In each object in `API_POSTS`, add `likedByCurrentUser: false`:

```typescript
const API_POSTS = [
  {
    id: '1',
    category: 'gestação',
    author: { id: 'u1', name: 'Fernanda S.' },
    content: 'Post de gestação',
    imageUrl: null,
    authorId: 'u1',
    communityId: 'gestacao-primeiro-tri',
    isRepost: false,
    _count: { likes: 24, comments: 8 },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    likedByCurrentUser: false,
  },
  {
    id: '2',
    category: 'amamentação',
    author: { id: 'u2', name: 'Dra. Carla Lima' },
    content: 'Post de amamentação',
    imageUrl: 'data:image/png;base64,fakedata',
    authorId: 'u2',
    communityId: 'amamentacao-apoio',
    isRepost: false,
    _count: { likes: 67, comments: 12 },
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    likedByCurrentUser: false,
  },
];
```

- [ ] **Step 5: Run TypeScript check and tests**

```bash
npx tsc --noEmit
npx vitest run
```
Expected: no TypeScript errors, all 130 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/types/index.ts src/lib/helpers.ts src/components/comunidade/ComunidadeScreen.test.tsx
git commit -m "feat: add likedByCurrentUser to ApiPost, CommunityPost, and helper"
```

---

### Task 4: RegisterScreen component

**Files:**
- Create: `src/components/auth/RegisterScreen.test.tsx`
- Create: `src/components/auth/RegisterScreen.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/auth/RegisterScreen.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RegisterScreen } from './RegisterScreen';
import { useAppStore } from '../../store/useAppStore';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', () => ({
  apiFetch: mockApiFetch,
  ApiError: class extends Error {
    constructor(public status: number, public body: unknown) { super(`API ${status}`); }
  },
}));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  mockApiFetch.mockReset();
  useAppStore.setState({ isLoggedIn: false });
});

describe('RegisterScreen', () => {
  it('renders step 1 fields: Nome, E-mail, Senha', () => {
    wrap(<RegisterScreen onBack={vi.fn()} />);
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
  });

  it('"Continuar" is disabled until all step 1 fields are valid', () => {
    wrap(<RegisterScreen onBack={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /continuar/i });
    expect(btn).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: '12345678' } });
    expect(btn).not.toBeDisabled();
  });

  it('advances to step 2 after valid step 1 + Continuar click', () => {
    wrap(<RegisterScreen onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByText(/dados gestacionais/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/semana da gravidez/i)).toBeInTheDocument();
  });

  it('switching to Pós-parto shows "Dias de vida do bebê" input', () => {
    wrap(<RegisterScreen onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.click(screen.getByRole('button', { name: /pós-parto/i }));
    expect(screen.getByLabelText(/dias de vida/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/semana da gravidez/i)).not.toBeInTheDocument();
  });

  it('calls POST /auth/register and calls setAuth on success', async () => {
    const fakeUser = {
      id: '1', email: 'ana@test.com', name: 'Ana',
      pregnancyStage: 'pregnant', pregnancyWeek: 28,
      babyAgeInDays: null, babyName: null,
      onboardingDone: false, profileKey: null, archetypeKey: null,
    };
    mockApiFetch.mockResolvedValueOnce({ accessToken: 'tok', user: fakeUser });
    wrap(<RegisterScreen onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.change(screen.getByLabelText(/semana da gravidez/i), { target: { value: '28' } });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/auth/register', expect.objectContaining({ method: 'POST' }));
      expect(useAppStore.getState().isLoggedIn).toBe(true);
    });
  });

  it('shows 409 error when email already registered', async () => {
    const ApiErrorClass = (await import('../../lib/api')).ApiError;
    mockApiFetch.mockRejectedValueOnce(new ApiErrorClass(409, {}));
    wrap(<RegisterScreen onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.change(screen.getByLabelText(/semana da gravidez/i), { target: { value: '28' } });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/e-mail já está cadastrado/i);
    });
  });

  it('back button on step 2 returns to step 1', () => {
    wrap(<RegisterScreen onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.click(screen.getByLabelText(/voltar/i));
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
  });

  it('back button on step 1 calls onBack', () => {
    const onBack = vi.fn();
    wrap(<RegisterScreen onBack={onBack} />);
    fireEvent.click(screen.getByLabelText(/voltar/i));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npx vitest run src/components/auth/RegisterScreen.test.tsx
```
Expected: FAIL — module `./RegisterScreen` not found.

- [ ] **Step 3: Implement RegisterScreen**

Create `src/components/auth/RegisterScreen.tsx`:

```typescript
import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { ApiUser } from '../../lib/types';

interface RegisterScreenProps {
  onBack: () => void;
}

export function RegisterScreen({ onBack }: RegisterScreenProps) {
  const setAuth = useAppStore((s) => s.setAuth);
  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [pregnancyStage, setPregnancyStage] = useState<'pregnant' | 'postpartum'>('pregnant');
  const [pregnancyWeek, setPregnancyWeek] = useState('');
  const [babyAgeInDays, setBabyAgeInDays] = useState('');
  const [babyName, setBabyName] = useState('');

  const step1Valid = name.trim().length > 0 && email.includes('@') && password.length >= 8;
  const step2Valid =
    pregnancyStage === 'pregnant'
      ? pregnancyWeek !== '' && Number(pregnancyWeek) >= 1 && Number(pregnancyWeek) <= 42
      : babyAgeInDays !== '' && Number(babyAgeInDays) >= 0;

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: () =>
      apiFetch<{ accessToken: string; user: ApiUser }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          pregnancyStage,
          pregnancyWeek: pregnancyStage === 'pregnant' ? Number(pregnancyWeek) : undefined,
          babyAgeInDays: pregnancyStage === 'postpartum' ? Number(babyAgeInDays) : undefined,
          babyName: babyName.trim() || undefined,
        }),
      }),
    onSuccess: ({ accessToken, user }) => {
      setAuth(accessToken, user);
    },
  });

  const errorMsg =
    isError && error instanceof ApiError && error.status === 409
      ? 'Este e-mail já está cadastrado.'
      : isError
      ? 'Erro de conexão. Tente novamente.'
      : '';

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!step2Valid) return;
    mutate();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sara-cream sm:bg-[#EDE6DC]">
      <div className="w-full min-h-screen sm:w-[390px] sm:min-h-[844px] sm:max-h-[844px] bg-sara-cream flex flex-col px-8 gap-6 sm:rounded-[44px] sm:shadow-2xl overflow-y-auto pt-12 pb-8">

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={step === 2 ? () => setStep(1) : onBack}
            aria-label="Voltar"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen"
          >
            <ChevronLeft size={20} className="text-graphite" />
          </button>
          <h1 className="text-base font-semibold text-graphite">
            {step === 1 ? 'Criar conta' : 'Dados gestacionais'}
          </h1>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 h-1 rounded-full bg-sara-gold" />
          <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-sara-gold' : 'bg-gray-200'}`} />
        </div>

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-graphite-muted" htmlFor="reg-name">Nome</label>
              <input
                id="reg-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-sara-muted focus:outline-none focus:border-sara-gold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-graphite-muted" htmlFor="reg-email">E-mail</label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-sara-muted focus:outline-none focus:border-sara-gold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-graphite-muted" htmlFor="reg-password">Senha</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="mínimo 8 caracteres"
                  className="w-full px-4 py-3 pr-12 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-sara-muted focus:outline-none focus:border-sara-gold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-graphite-muted"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              className="w-full py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
            >
              Continuar →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-medium text-graphite-muted mb-2">Fase gestacional</p>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {(['pregnant', 'postpartum'] as const).map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setPregnancyStage(stage)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      pregnancyStage === stage ? 'bg-white text-graphite shadow-sm' : 'text-graphite-muted'
                    }`}
                  >
                    {stage === 'pregnant' ? 'Grávida' : 'Pós-parto'}
                  </button>
                ))}
              </div>
            </div>

            {pregnancyStage === 'pregnant' ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-graphite-muted" htmlFor="reg-week">Semana da gravidez</label>
                <input
                  id="reg-week"
                  type="number"
                  min={1}
                  max={42}
                  value={pregnancyWeek}
                  onChange={(e) => setPregnancyWeek(e.target.value)}
                  placeholder="ex: 28"
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-sara-muted focus:outline-none focus:border-sara-gold"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-graphite-muted" htmlFor="reg-days">Dias de vida do bebê</label>
                <input
                  id="reg-days"
                  type="number"
                  min={0}
                  value={babyAgeInDays}
                  onChange={(e) => setBabyAgeInDays(e.target.value)}
                  placeholder="ex: 45"
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-sara-muted focus:outline-none focus:border-sara-gold"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-graphite-muted" htmlFor="reg-baby-name">
                Nome do bebê <span className="font-normal text-graphite-muted/60">(opcional)</span>
              </label>
              <input
                id="reg-baby-name"
                type="text"
                value={babyName}
                onChange={(e) => setBabyName(e.target.value)}
                placeholder="pode preencher depois"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-sara-muted focus:outline-none focus:border-sara-gold"
              />
            </div>

            {errorMsg && (
              <p role="alert" className="text-xs text-sara-terracotta text-center">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={!step2Valid || isPending}
              className="w-full py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
            >
              {isPending ? 'Criando conta…' : 'Criar conta'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/auth/RegisterScreen.test.tsx
```
Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/RegisterScreen.tsx src/components/auth/RegisterScreen.test.tsx
git commit -m "feat: add RegisterScreen 2-step account creation form"
```

---

### Task 5: LoginScreen — "Criar conta" button

**Files:**
- Modify: `src/components/auth/LoginScreen.tsx`
- Create: `src/components/auth/LoginScreen.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/auth/LoginScreen.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginScreen } from './LoginScreen';
import { useAppStore } from '../../store/useAppStore';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', () => ({
  apiFetch: mockApiFetch,
  ApiError: class extends Error {
    constructor(public status: number, public body: unknown) { super(`API ${status}`); }
  },
}));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  mockApiFetch.mockReset();
  useAppStore.setState({ isLoggedIn: false });
});

describe('LoginScreen', () => {
  it('renders "Criar conta" button', () => {
    wrap(<LoginScreen />);
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument();
  });

  it('clicking "Criar conta" shows RegisterScreen step 1', () => {
    wrap(<LoginScreen />);
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    expect(screen.getByLabelText(/^nome$/i)).toBeInTheDocument();
  });

  it('RegisterScreen back button returns to LoginScreen', () => {
    wrap(<LoginScreen />);
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));
    fireEvent.click(screen.getByLabelText(/voltar/i));
    expect(screen.getByRole('button', { name: /^entrar$/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npx vitest run src/components/auth/LoginScreen.test.tsx
```
Expected: FAIL — "Criar conta" button not found.

- [ ] **Step 3: Update LoginScreen**

In `src/components/auth/LoginScreen.tsx`:

**a)** Add the RegisterScreen import after the existing imports:
```typescript
import { RegisterScreen } from './RegisterScreen';
```

**b)** Add `showRegister` state inside the component, after the existing state declarations:
```typescript
const [showRegister, setShowRegister] = useState(false);
```

**c)** Add the conditional render at the very start of the component's return block (before the existing `<div>` wrapper):
```typescript
if (showRegister) {
  return <RegisterScreen onBack={() => setShowRegister(false)} />;
}
```

**d)** Add the "Criar conta" button at the end of the `<div className="w-full flex flex-col gap-3">` block, after `{showComingSoon && (...)}`:
```typescript
<button
  type="button"
  onClick={() => setShowRegister(true)}
  className="w-full py-3 rounded-2xl bg-transparent border border-dashed border-sara-linen text-sm font-medium text-graphite-muted active:scale-95 transition-transform"
>
  Criar conta
</button>
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/auth/LoginScreen.test.tsx
```
Expected: all 3 tests pass.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```
Expected: all tests pass (previous 130 + 8 RegisterScreen + 3 LoginScreen = 141 total).

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/LoginScreen.tsx src/components/auth/LoginScreen.test.tsx
git commit -m "feat: add 'Criar conta' button to LoginScreen"
```

---

### Task 6: Bug fix — Notification toggle CSS

**Files:**
- Modify: `src/components/profile/SettingsScreen.tsx`
- Create: `src/components/profile/SettingsScreen.test.tsx`

**Root cause:** The toggle `<button>` has browser default padding (~6px). The `<span>` thumb uses `position: absolute` with no explicit `left`, so its left origin includes the button's default padding. Adding `translate-x-4` (16px) pushes the 20px thumb's right edge to ≈42px, overflowing the 40px container.

- [ ] **Step 1: Write failing test**

Create `src/components/profile/SettingsScreen.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { SettingsScreen } from './SettingsScreen';
import { useAppStore } from '../../store/useAppStore';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

beforeEach(() => {
  useAppStore.setState({ motherName: 'Mariana', email: 'mariana@test.com' });
  mockApiFetch.mockResolvedValue({});
});

describe('SettingsScreen toggles', () => {
  it('toggle thumb has explicit left-0.5 positioning (prevents overflow)', () => {
    render(<SettingsScreen onBack={vi.fn()} onClose={vi.fn()} />);
    const curtidas = screen.getByLabelText('Curtidas e comentários');
    const thumb = curtidas.querySelector('span');
    expect(thumb?.className).toMatch(/left-0\.5/);
  });

  it('toggle button has p-0 to remove browser default padding', () => {
    render(<SettingsScreen onBack={vi.fn()} onClose={vi.fn()} />);
    const curtidas = screen.getByLabelText('Curtidas e comentários');
    expect(curtidas.className).toMatch(/p-0/);
  });

  it('clicking Curtidas toggle changes background color', () => {
    render(<SettingsScreen onBack={vi.fn()} onClose={vi.fn()} />);
    const btn = screen.getByLabelText('Curtidas e comentários');
    expect(btn.className).toMatch(/bg-sara-gold/);
    fireEvent.click(btn);
    expect(btn.className).toMatch(/bg-gray-200/);
  });

  it('clicking Novas publicações toggle changes background color', () => {
    render(<SettingsScreen onBack={vi.fn()} onClose={vi.fn()} />);
    const btn = screen.getByLabelText('Novas publicações');
    expect(btn.className).toMatch(/bg-gray-200/);
    fireEvent.click(btn);
    expect(btn.className).toMatch(/bg-sara-gold/);
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npx vitest run src/components/profile/SettingsScreen.test.tsx
```
Expected: FAIL — `p-0` and `left-0.5` not found; `aria-label` not present on toggles.

- [ ] **Step 3: Fix both toggles in SettingsScreen**

In `src/components/profile/SettingsScreen.tsx`, replace the first notification row (lines 88–95):

```typescript
<div className="flex items-center justify-between px-4 py-3.5">
  <p className="text-sm text-graphite">Curtidas e comentários</p>
  <button
    aria-label="Curtidas e comentários"
    onClick={() => setNotifLikes(!notifLikes)}
    className={`w-10 h-6 rounded-full p-0 transition-colors relative ${notifLikes ? 'bg-sara-gold' : 'bg-gray-200'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifLikes ? 'translate-x-[18px]' : ''}`} />
  </button>
</div>
```

Replace the second notification row (lines 97–104):

```typescript
<div className="flex items-center justify-between px-4 py-3.5">
  <p className="text-sm text-graphite">Novas publicações</p>
  <button
    aria-label="Novas publicações"
    onClick={() => setNotifPosts(!notifPosts)}
    className={`w-10 h-6 rounded-full p-0 transition-colors relative ${notifPosts ? 'bg-sara-gold' : 'bg-gray-200'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifPosts ? 'translate-x-[18px]' : ''}`} />
  </button>
</div>
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/profile/SettingsScreen.test.tsx
```
Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/profile/SettingsScreen.tsx src/components/profile/SettingsScreen.test.tsx
git commit -m "fix: notification toggle — p-0, left-0.5, translate-x-[18px] prevents thumb overflow"
```

---

### Task 7: Bug fix — Settings background from sidebar

**Files:**
- Modify: `src/App.tsx`

**Root cause:** When opened from the SideDrawer, `SettingsScreen` renders inside a `fixed inset-0` overlay with no background (the gradient is `sm:`-only on the overlay, and SettingsScreen itself uses `bg-transparent`). Fix: wrap with the same gradient div used by ProfileScreen.

- [ ] **Step 1: Fix App.tsx settings overlay**

In `src/App.tsx`, find the settings overlay block (lines ~140–147):

```typescript
{showSettings && (
  <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
    <SettingsScreen
      onBack={() => setShowSettings(false)}
      onClose={() => setShowSettings(false)}
    />
  </div>
)}
```

Replace with:

```typescript
{showSettings && (
  <div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
    <div className="w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden flex flex-col">
      <SettingsScreen
        onBack={() => setShowSettings(false)}
        onClose={() => setShowSettings(false)}
      />
    </div>
  </div>
)}
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 3: Manual verification**

Open the app at `http://localhost:5173`. Tap the ☰ drawer icon → tap "Configurações". Verify the settings screen shows the warm gradient background (same as Profile and other screens), not a transparent or white overlay.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "fix: wrap settings overlay with gradient background when opened from sidebar"
```

---

### Task 8: Bug fix — Camera button interaction in ComposerBar

**Files:**
- Modify: `src/components/comunidade/ComposerBar.tsx`
- Modify: `src/components/comunidade/CreatePostScreen.tsx`
- Modify: `src/components/comunidade/ComunidadeScreen.tsx`

**What changes:** The outer `<button>` in ComposerBar becomes a `<div>`. The text area becomes an inner `<button aria-label="Escrever post">`. The camera icon becomes a separate `<button aria-label="Adicionar foto">`. Existing test `calls onOpen when clicked` still works but needs its aria-label query adjusted.

- [ ] **Step 1: Update ComposerBar tests**

Replace the full content of `src/components/comunidade/ComposerBar.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ComposerBar } from './ComposerBar';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  useAppStore.setState({ motherName: 'Mariana' });
});

describe('ComposerBar', () => {
  it('renders avatar initial from motherName', () => {
    render(<ComposerBar onOpen={vi.fn()} />);
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('renders placeholder text', () => {
    render(<ComposerBar onOpen={vi.fn()} />);
    expect(screen.getByText('O que você está sentindo hoje?')).toBeInTheDocument();
  });

  it('clicking text button calls onOpen', () => {
    const onOpen = vi.fn();
    render(<ComposerBar onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Escrever post' }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('camera button calls onOpenWithImage when provided', () => {
    const onOpenWithImage = vi.fn();
    render(<ComposerBar onOpen={vi.fn()} onOpenWithImage={onOpenWithImage} />);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar foto' }));
    expect(onOpenWithImage).toHaveBeenCalledOnce();
  });

  it('camera button falls back to onOpen when onOpenWithImage not provided', () => {
    const onOpen = vi.fn();
    render(<ComposerBar onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar foto' }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('uses first letter of a different motherName as initial', () => {
    useAppStore.setState({ motherName: 'Fernanda' });
    render(<ComposerBar onOpen={vi.fn()} />);
    expect(screen.getByText('F')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to see which tests currently fail**

```bash
npx vitest run src/components/comunidade/ComposerBar.test.tsx
```
Expected: "camera button calls onOpenWithImage" and "camera button falls back" FAIL.

- [ ] **Step 3: Rewrite ComposerBar**

Replace the full content of `src/components/comunidade/ComposerBar.tsx`:

```typescript
import { Camera } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface ComposerBarProps {
  onOpen: () => void;
  onOpenWithImage?: () => void;
}

export function ComposerBar({ onOpen, onOpenWithImage }: ComposerBarProps) {
  const motherName = useAppStore((s) => s.motherName);
  const initial = motherName[0]?.toUpperCase() ?? 'M';

  return (
    <div className="mx-4 mb-3 bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-3 flex items-center gap-3 w-[calc(100%-2rem)]">
      <button
        onClick={onOpen}
        aria-label="Escrever post"
        className="flex items-center gap-3 flex-1 text-left"
      >
        <div className="w-8 h-8 rounded-full bg-sara-terracotta text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
          {initial}
        </div>
        <span className="flex-1 text-graphite-muted text-sm">
          O que você está sentindo hoje?
        </span>
      </button>
      <button
        onClick={onOpenWithImage ?? onOpen}
        aria-label="Adicionar foto"
        className="p-1 flex-shrink-0"
      >
        <Camera size={20} className="text-sara-gold" />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Add autoOpenImage to CreatePostScreen**

In `src/components/comunidade/CreatePostScreen.tsx`:

**a)** Add `useEffect` to the import on line 1:
```typescript
import { useState, useRef, useEffect } from 'react';
```

**b)** Update the props interface:
```typescript
interface CreatePostScreenProps {
  onBack: () => void;
  autoOpenImage?: boolean;
}
```

**c)** Update the function signature:
```typescript
export function CreatePostScreen({ onBack, autoOpenImage }: CreatePostScreenProps) {
```

**d)** Add the useEffect after the `const fileInputRef = useRef...` line:
```typescript
useEffect(() => {
  if (autoOpenImage) {
    fileInputRef.current?.click();
  }
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 5: Wire up ComunidadeScreen**

In `src/components/comunidade/ComunidadeScreen.tsx`:

**a)** Add `showCreateWithImage` state alongside `showCreate` (around line 154):
```typescript
const [showCreate, setShowCreate] = useState(false);
const [showCreateWithImage, setShowCreateWithImage] = useState(false);
```

**b)** Update the `ComposerBar` call (find it in the JSX `topTab === 'para-voce'` block):
```typescript
<ComposerBar
  onOpen={() => setShowCreate(true)}
  onOpenWithImage={() => { setShowCreateWithImage(true); setShowCreate(true); }}
/>
```

**c)** Update the `CreatePostScreen` inside the `AnimatePresence` block:
```typescript
<CreatePostScreen
  onBack={() => { setShowCreate(false); setShowCreateWithImage(false); }}
  autoOpenImage={showCreateWithImage}
/>
```

- [ ] **Step 6: Run all tests**

```bash
npx vitest run src/components/comunidade/ComposerBar.test.tsx
npx vitest run
```
Expected: all ComposerBar tests pass, full suite passes.

- [ ] **Step 7: Commit**

```bash
git add src/components/comunidade/ComposerBar.tsx src/components/comunidade/CreatePostScreen.tsx src/components/comunidade/ComunidadeScreen.tsx
git commit -m "fix: camera button in ComposerBar triggers image picker directly"
```

---

### Task 9: Bug fix — Remove visitor toggle from ProfileScreen

**Files:**
- Modify: `src/components/profile/ProfileScreen.tsx`
- Create: `src/components/profile/ProfileScreen.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/profile/ProfileScreen.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileScreen } from './ProfileScreen';
import { useAppStore } from '../../store/useAppStore';
import type { PaginatedResult, ApiPost } from '../../lib/types';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

const EMPTY_POSTS: PaginatedResult<ApiPost> = { items: [], hasMore: false };

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['posts'], EMPTY_POSTS);
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  useAppStore.setState({
    isLoggedIn: true, motherName: 'Mariana',
    phase: { stage: 'pregnant', week: 28 }, motherProfile: null,
  });
  mockApiFetch.mockResolvedValue(EMPTY_POSTS);
});

describe('ProfileScreen', () => {
  it('does not render visitor toggle buttons', () => {
    wrap(<ProfileScreen onClose={vi.fn()} />);
    expect(screen.queryByText(/como visitante/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/meu perfil/i)).not.toBeInTheDocument();
  });

  it('renders "Editar perfil" button', () => {
    wrap(<ProfileScreen onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /editar perfil/i })).toBeInTheDocument();
  });

  it('does not render Seguir or Mensagem buttons', () => {
    wrap(<ProfileScreen onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /^seguir$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mensagem/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npx vitest run src/components/profile/ProfileScreen.test.tsx
```
Expected: "does not render visitor toggle buttons" FAIL — "Como visitante" is found.

- [ ] **Step 3: Remove visitor toggle from ProfileScreen**

In `src/components/profile/ProfileScreen.tsx`:

**a)** Remove the two state declarations:
```typescript
const [isVisitorView, setIsVisitorView] = useState(false);
const [following, setFollowing] = useState(false);
```

**b)** Remove the entire "Owner / Visitor toggle" block (lines 97–111 in the current file):
```typescript
{/* Owner / Visitor toggle */}
<div className="flex items-center gap-1 mt-3 bg-gray-100 rounded-xl p-1 w-fit">
  <button onClick={() => setIsVisitorView(false)} ...>Meu perfil</button>
  <button onClick={() => setIsVisitorView(true)} ...>Como visitante</button>
</div>
```

**c)** Replace the entire "Actions" block (the conditional that renders either "Editar perfil" or "Seguir/Mensagem") with just the owner action:
```typescript
{/* Actions */}
<div className="flex gap-2 mt-3">
  <button className="flex-1 py-2 rounded-xl bg-sara-linen text-xs font-semibold text-sara-gold active:scale-95 transition-transform">
    Editar perfil
  </button>
</div>
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/profile/ProfileScreen.test.tsx
```
Expected: all 3 tests pass.

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/profile/ProfileScreen.tsx src/components/profile/ProfileScreen.test.tsx
git commit -m "fix: remove visitor/owner toggle from ProfileScreen — always show owner view"
```

---

### Task 10: Bug fix — Like state persistence

**Files:**
- Modify: `src/components/comunidade/ComunidadeScreen.tsx`
- Modify: `src/components/comunidade/ComunidadeScreen.test.tsx`

**Root cause:** `PostCard` uses `useState(false)` for `liked`, which resets when the component unmounts (e.g., when user opens PostDetailScreen and navigates back). Fix: seed `liked` from `post.likedByCurrentUser` (now available from server) and update only `likedByCurrentUser` in the cache on toggle, so the next mount re-reads the correct value.

**Display formula:** Currently the code shows `post.likes + (liked ? 1 : 0)`. Since `post.likes` from the server already counts the current user's like when `likedByCurrentUser=true`, we need to subtract that to avoid double-counting: display as `post.likes - (post.likedByCurrentUser ? 1 : 0) + (liked ? 1 : 0)`.

- [ ] **Step 1: Write failing test**

Add the following test to `src/components/comunidade/ComunidadeScreen.test.tsx`. Add it inside the existing `describe('ComunidadeScreen', ...)` block, at the end:

```typescript
it('PostCard starts as liked when post.likedByCurrentUser is true', async () => {
  const likedPost = {
    id: '3',
    category: 'gestação',
    author: { id: 'u3', name: 'Bia' },
    content: 'Post já curtido',
    imageUrl: null,
    authorId: 'u3',
    communityId: null,
    isRepost: false,
    _count: { likes: 10, comments: 0 },
    createdAt: new Date().toISOString(),
    likedByCurrentUser: true,
  };
  mockApiFetch.mockResolvedValue({ items: [likedPost], hasMore: false });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  qc.setQueryData(['posts'], { items: [likedPost], hasMore: false });
  render(
    <QueryClientProvider client={qc}><ComunidadeScreen /></QueryClientProvider>
  );
  await screen.findAllByTestId('post-card');
  expect(screen.getByRole('button', { name: 'Descurtir' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npx vitest run src/components/comunidade/ComunidadeScreen.test.tsx --reporter=verbose 2>&1 | tail -20
```
Expected: the new "PostCard starts as liked" test FAILS — `getByRole('button', { name: 'Descurtir' })` not found because `liked` starts as `false`.

- [ ] **Step 3: Update PostCard in ComunidadeScreen.tsx**

In `src/components/comunidade/ComunidadeScreen.tsx`, find the `PostCard` function. Make these changes:

**a)** Add `useQueryClient` to the existing React Query import (it's already imported in the parent component scope but PostCard needs its own call):

The `PostCard` function already has:
```typescript
const likeMutation = useMutation({
  mutationFn: (isLiked: boolean) =>
    apiFetch(`/posts/${post.id}/like`, { method: isLiked ? 'POST' : 'DELETE' }),
});
```

Replace the entire PostCard's state + mutation block with:

```typescript
const queryClient = useQueryClient();
const [liked, setLiked] = useState(post.likedByCurrentUser ?? false);
const [reposted, setReposted] = useState(false);

const likeMutation = useMutation({
  mutationFn: (isLiked: boolean) =>
    apiFetch(`/posts/${post.id}/like`, { method: isLiked ? 'POST' : 'DELETE' }),
  onSuccess: (_, isLiked) => {
    queryClient.setQueryData<PaginatedResult<ApiPost>>(['posts'], (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map((p) =>
          p.id === post.id ? { ...p, likedByCurrentUser: isLiked } : p
        ),
      };
    });
  },
});
```

**b)** Update the like count display. Find this line in PostCard's JSX:
```typescript
{post.likes + (liked ? 1 : 0)}
```

Replace with:
```typescript
{post.likes - (post.likedByCurrentUser ? 1 : 0) + (liked ? 1 : 0)}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/comunidade/ComunidadeScreen.test.tsx
```
Expected: all tests pass including the new one.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/comunidade/ComunidadeScreen.tsx src/components/comunidade/ComunidadeScreen.test.tsx
git commit -m "fix: persist like state across navigation using likedByCurrentUser from server"
```
