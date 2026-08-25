# Cadastro Completo + Sara Emocional — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expandir o cadastro inicial (RegisterScreen) para capturar gêmeos, filhos anteriores e sinais de perfil (humor/apoio/objetivo/preocupação) que hoje a Sara pergunta por voz, e reduzir a Sara a uma única boas-vindas emocional pós-cadastro.

**Architecture:** Mover 100% da captura de dados cadastrais para formulário (mais confiável que voz por causa de latência+erro STT). Backend ganha tabelas `Baby` e `OtherChild` (1:N com User) + campos `mood/supportNetwork/goal/concern` no User. Store passa a expor `babies[]` e `otherChildren[]`; campos legados (`babyName`, `phase`) viram derivados do primeiro item. Sara vira um único beat com uma pergunta emocional livre + fala de intro da plataforma, sem tools de captura. Agente ElevenLabs (`agent_7801m0v3npg3efa9hs4qj0fpcg9k`, conta Baby Team) é atualizado via API — prompt novo, `tool_ids` esvaziado.

**Tech Stack:** React 18 + Zustand (frontend), Fastify + Prisma + MySQL (backend), ElevenLabs Convai API (agente), Vitest (testes). Deploy via `scp` (frontend) + `docker compose up -d` (backend).

---

## Ordem de execução e fases atomicamente shippable

Cada fase abaixo termina num estado que o app funciona (build passa, testes passam, prod aceita deploy). Se o dono pausar entre fases, nada quebra.

- **Fase 1 — Backend**: adiciona colunas/tabelas + estende endpoint `/auth/register` mantendo backwards-compat (campos novos são opcionais). Ship: nada muda pro usuário; API pronta.
- **Fase 2 — Store + types (frontend)**: adiciona `babies[]`/`otherChildren[]`/`mood`/etc. no store, migração v2→v3. Legados (`babyName`, `phase`) viram derivados. Ship: RegisterScreen antigo continua funcionando (só usa slots velhos).
- **Fase 3 — RegisterScreen stepper 5 passos**: nova UI que captura tudo. Ship: usuário novo passa por form completo, Sara caps 2/3 recebem dados já preenchidos (não pergunta de novo).
- **Fase 4 — Sara emocional**: deleta `Capitulo1/2/3.tsx`, cria `SaraBoasVindas.tsx`, atualiza agente ElevenLabs. Ship: fluxo enxuto Register → Sara welcome → Social → App.
- **Fase 5 — Deploy prod**: migration MySQL + docker restart + frontend build + scp + smoke test.

---

## File Structure

**Backend (server/):**
- Modify: `server/prisma/schema.prisma` — adiciona `Baby`, `OtherChild`, campos em `User`
- Create: `server/prisma/migrations/YYYYMMDD_add_babies_and_children/migration.sql` — gerado por `prisma migrate dev`
- Modify: `server/src/routes/auth.ts` — estende `registerSchema` + salva relações
- Modify: `server/src/lib/profile.ts` (novo se não existir) — extrai `computeProfile` server-side; se já existir em `../../src/utils/onboardingScoring.ts` compartilhado, importar de lá
- Create: `server/src/routes/auth.test.ts` (se não existir) — teste de register com babies + otherChildren

**Frontend types (src/types/):**
- Modify: `src/types/index.ts` — adiciona `Baby`, `OtherChild`, mantém `PregnancyPhase` (deprecated), adiciona `EMPTY_BABIES/CHILDREN` constants
- Modify: `src/types/reception.ts` — simplifica `ReceptionData` (só mantém o campo `moodResponse?: string` livre pro Sara), ou deleta se `ReceptionFlow` deixar de precisar

**Frontend store (src/store/):**
- Modify: `src/store/useAppStore.ts` — adiciona `babies`, `otherChildren`, `mood`, `supportNetwork`, `goal`, `concern`; migração `v2 → v3`; `setAuth` lê novos campos do ApiUser
- Modify: `src/store/useAppStore.reception.test.ts` — atualiza tests p/ novos slots
- Create: `src/store/useAppStore.babies.test.ts` — testa migração v2→v3 e derivação

**Frontend auth (src/components/auth/):**
- Modify: `src/components/auth/RegisterScreen.tsx` — vira stepper de 5 passos
- Modify: `src/components/auth/RegisterScreen.test.tsx` — cobre novos passos
- Create: `src/components/auth/steps/StepBebes.tsx` — passo bebês (com gêmeos)
- Create: `src/components/auth/steps/StepOutrosFilhos.tsx` — passo outros filhos
- Create: `src/components/auth/steps/StepHumor.tsx` — passo humor+apoio
- Create: `src/components/auth/steps/StepObjetivo.tsx` — passo objetivo+preocupação

**Frontend reception (src/components/reception/):**
- Delete: `src/components/reception/beats/Capitulo1.tsx` + `.test.tsx`
- Delete: `src/components/reception/beats/Capitulo2.tsx` + `.test.tsx`
- Delete: `src/components/reception/beats/Capitulo3.tsx` + `.test.tsx`
- Delete: `src/components/reception/hooks/useSaraNarration.ts` + `.test.ts` (só era usado pelos caps)
- Create: `src/components/reception/beats/SaraBoasVindas.tsx` + `.test.tsx`
- Modify: `src/components/reception/ReceptionFlow.tsx` — remove imports dos caps, roteia p/ SaraBoasVindas
- Modify: `src/components/reception/hooks/useReceptionState.ts` — beats reduzidos
- Modify: `src/types/reception.ts` — `ReceptionBeat` tipo reduzido

**ElevenLabs (via script):**
- Create: `.migrate-tmp/update-sara-agent.mjs` — script one-shot que edita o agente novo (novo prompt, `tool_ids: []`)

**Deploy:**
- Modify: `deploy/.env.production` no VPS (nenhuma env nova — só migration)

---

## Fase 1 — Backend

### Task 1.1: Adicionar modelos Prisma `Baby` e `OtherChild` + campos User

**Files:**
- Modify: `server/prisma/schema.prisma:10-63` (bloco `model User`)
- Modify: `server/prisma/schema.prisma` (adicionar 2 novos models no final)

- [ ] **Step 1: Editar schema**

Adicionar no `model User` (depois da linha `expectedBirthDate DateTime?`):

```prisma
  hasMultiples      Boolean @default(false)
  mood              String? @db.Char(1)
  supportNetwork    String? @db.Char(1)
  goal              String? @db.Char(1)
  concern           String? @db.Char(1)
```

E no relations block (perto de `refreshTokens  RefreshToken[]`):

```prisma
  babies         Baby[]
  otherChildren  OtherChild[]
```

Adicionar dois novos models no final do arquivo (antes ou depois de `Address` tanto faz):

```prisma
model Baby {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name          String?   @db.VarChar(80)
  birthDate     DateTime?
  weekAtEntry   Int?
  createdAt     DateTime  @default(now())

  @@index([userId])
}

model OtherChild {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String   @db.VarChar(80)
  birthDate DateTime
  createdAt DateTime @default(now())

  @@index([userId])
}
```

- [ ] **Step 2: Gerar migration**

Run: `cd server && npx prisma migrate dev --name add_babies_and_children`

Expected: cria diretório `server/prisma/migrations/<timestamp>_add_babies_and_children/migration.sql`, rodadas contra dev DB, `prisma generate` executa e client atualizado.

- [ ] **Step 3: Verificar migration SQL gerada**

Read: `server/prisma/migrations/<timestamp>_add_babies_and_children/migration.sql`

Expected: contém `CREATE TABLE Baby`, `CREATE TABLE OtherChild`, `ALTER TABLE User ADD COLUMN hasMultiples/mood/supportNetwork/goal/concern`.

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat(db): add Baby/OtherChild tables + user mood/support/goal/concern"
```

---

### Task 1.2: Estender registerSchema + endpoint /auth/register

**Files:**
- Modify: `server/src/routes/auth.ts:20-33` (registerSchema)
- Modify: `server/src/routes/auth.ts:63-100` (handler POST /register)

- [ ] **Step 1: Escrever teste que falha**

**Files:**
- Test: `server/src/routes/auth.test.ts` (se já existe, adicionar `describe`; se não, criar arquivo com boilerplate Fastify + prisma test setup)

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { buildTestApp, resetDb } from '../test-utils' // supõe helpers já existentes; se não, criar

describe('POST /auth/register — new fields', () => {
  beforeEach(async () => { await resetDb() })

  it('accepts babies[], otherChildren[], mood/support/goal/concern and persists them', async () => {
    const app = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'ana@test.com',
        password: 'password123',
        name: 'Ana',
        pregnancyStage: 'postpartum',
        acceptedTerms: true,
        hasMultiples: true,
        babies: [
          { name: 'Sofia', birthDate: '2026-08-01' },
          { name: 'Alice', birthDate: '2026-08-01' },
        ],
        otherChildren: [
          { name: 'Pedro', birthDate: '2023-05-14' },
        ],
        mood: 'B',
        supportNetwork: 'A',
        goal: 'C',
        concern: 'B',
      },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.user.babies).toHaveLength(2)
    expect(body.user.babies[0].name).toBe('Sofia')
    expect(body.user.otherChildren).toHaveLength(1)
    expect(body.user.otherChildren[0].name).toBe('Pedro')
    expect(body.user.mood).toBe('B')
    expect(body.user.hasMultiples).toBe(true)
    expect(body.user.profileKey).toBeTruthy() // profile computed server-side now
  })

  it('remains backwards-compatible when new fields are absent', async () => {
    const app = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'julia@test.com',
        password: 'password123',
        name: 'Julia',
        pregnancyStage: 'pregnant',
        pregnancyWeek: 20,
        acceptedTerms: true,
      },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().user.babies).toEqual([])
    expect(res.json().user.mood).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Run: `cd server && npm test -- auth.test.ts`

Expected: FAIL — schema rejeita `babies`, `otherChildren`, `mood`, etc.

- [ ] **Step 3: Estender registerSchema**

Substituir bloco `const registerSchema = z.object({...})` (linhas 20-33) por:

```ts
const babyInputSchema = z.object({
  name: z.string().max(80).optional(),
  birthDate: z.string().optional(),
  weekAtEntry: z.number().int().min(1).max(42).optional(),
})

const otherChildInputSchema = z.object({
  name: z.string().min(1).max(80),
  birthDate: z.string(), // required — user needs exact DOB
})

const answerLetter = z.enum(['A', 'B', 'C', 'D'])

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional(),
  pregnancyStage: z.enum(['pregnant', 'postpartum']),
  pregnancyWeek: z.number().int().min(1).max(42).optional(),
  babyAgeInDays: z.number().int().min(0).optional(),
  babyName: z.string().optional(),
  motherBirthDate: z.string().optional(),
  babyBirthDate: z.string().optional(),
  expectedBirthDate: z.string().optional(),
  acceptedTerms: z.boolean().optional(),
  // NEW:
  hasMultiples: z.boolean().optional(),
  babies: z.array(babyInputSchema).max(6).optional(),
  otherChildren: z.array(otherChildInputSchema).max(10).optional(),
  mood: answerLetter.optional(),
  supportNetwork: z.enum(['A', 'B', 'C']).optional(),
  goal: answerLetter.optional(),
  concern: answerLetter.optional(),
})
```

- [ ] **Step 4: Atualizar handler para persistir novas relações + calcular profile**

No handler `/register`, dentro do `prisma.user.create({ data: { ... } })`, adicionar após `termsAcceptedAt`:

```ts
        hasMultiples: body.data.hasMultiples ?? false,
        mood: body.data.mood ?? null,
        supportNetwork: body.data.supportNetwork ?? null,
        goal: body.data.goal ?? null,
        concern: body.data.concern ?? null,
        babies: body.data.babies?.length
          ? { create: body.data.babies.map((b) => ({
              name: b.name ?? null,
              birthDate: parseDate(b.birthDate),
              weekAtEntry: b.weekAtEntry ?? null,
            })) }
          : undefined,
        otherChildren: body.data.otherChildren?.length
          ? { create: body.data.otherChildren.map((c) => ({
              name: c.name,
              birthDate: parseDate(c.birthDate)!,
            })) }
          : undefined,
```

E logo depois do `create`, calcular profile server-side se todos os sinais estiverem presentes:

```ts
    // Compute mother profile server-side when all 4 signals present
    if (body.data.mood && body.data.supportNetwork && body.data.goal && body.data.concern) {
      const { computeProfileFromLetters } = await import('../lib/profile.js')
      const profile = computeProfileFromLetters({
        stage: body.data.pregnancyStage,
        week: body.data.pregnancyWeek,
        ageInDays: body.data.babyAgeInDays,
        mood: body.data.mood,
        supportNetwork: body.data.supportNetwork,
        goal: body.data.goal,
        concern: body.data.concern,
      })
      await fastify.prisma.user.update({
        where: { id: user.id },
        data: {
          onboardingAnswers: profile.answers as any,
          profileKey: profile.profileKey,
          archetypeKey: profile.archetypeKey,
        },
      })
    }
```

- [ ] **Step 5: Criar server/src/lib/profile.ts**

**Files:**
- Create: `server/src/lib/profile.ts`

Duplica-se o mapeamento de `computeProfile` de `src/utils/onboardingScoring.ts` (função pura, sem deps de browser) na server. Mantém-se apenas o que interessa server-side: `profileKey` + `archetypeKey`. `label`, `insights`, `phrases`, etc. ficam só no frontend.

```ts
// Server-side mirror of src/utils/onboardingScoring.ts.
// Keep the mapping rules in sync when either file changes.

type Q1 = 'A' | 'B' | 'C' | 'D' | 'E'
type Letter = 'A' | 'B' | 'C' | 'D'
type Q3 = 'A' | 'B' | 'C'

type ArchetypeKey = 'maria' | 'ana' | 'ester' | 'debora' | 'rute'

const PROFILE_TO_ARCHETYPE: Record<string, ArchetypeKey> = {
  exausta_sem_apoio: 'maria',
  sobrecarregada_amparada: 'maria',
  gestante_ansiosa_inicio: 'debora',
  gestante_ansiosa_reta_final: 'debora',
  preparando_grande_dia: 'debora',
  gestante_tranquila: 'ester',
  recuperacao_fisica: 'rute',
  guerreira_sono: 'ana',
  desafio_amamentacao: 'ana',
  mae_busca_si_mesma: 'rute',
  mae_solo: 'ana',
  mae_experiente: 'ester',
  mae_em_jornada: 'ester',
}

export interface ProfileInput {
  stage: 'pregnant' | 'postpartum'
  week?: number
  ageInDays?: number
  mood: Letter
  supportNetwork: Q3
  goal: Letter
  concern: Letter
}

function derivarQ1(input: ProfileInput): Q1 {
  if (input.stage === 'pregnant') return (input.week ?? 28) < 28 ? 'A' : 'B'
  const days = input.ageInDays ?? 0
  if (days <= 90) return 'C'
  if (days <= 365) return 'D'
  return 'E'
}

function pickProfileKey(q1: Q1, q2: Letter, q3: Q3, q4: Letter, q5: Letter): string {
  if (q2 === 'D' && q3 === 'C') return 'exausta_sem_apoio'
  if (q2 === 'D' && q3 !== 'C') return 'sobrecarregada_amparada'
  if (q5 === 'C') return 'desafio_amamentacao'
  if (q4 === 'C' || q5 === 'B') return 'guerreira_sono'
  if (q1 === 'B' && (q2 === 'C' || q2 === 'D')) return 'gestante_ansiosa_reta_final'
  if (q1 === 'A' && (q2 === 'C' || q2 === 'D')) return 'gestante_ansiosa_inicio'
  if (q1 === 'C' && q4 === 'B') return 'recuperacao_fisica'
  if (q1 === 'B') return 'preparando_grande_dia'
  if (q1 === 'A') return 'gestante_tranquila'
  if (q1 === 'E') return 'mae_experiente'
  if (q3 === 'C' && (q1 === 'C' || q1 === 'D')) return 'mae_solo'
  if (q5 === 'A' || q5 === 'D') return 'mae_busca_si_mesma'
  return 'mae_em_jornada'
}

export function computeProfileFromLetters(input: ProfileInput) {
  const q1 = derivarQ1(input)
  const answers = { q1, q2: input.mood, q3: input.supportNetwork, q4: input.goal, q5: input.concern }
  const profileKey = pickProfileKey(q1, input.mood, input.supportNetwork, input.goal, input.concern)
  return { answers, profileKey, archetypeKey: PROFILE_TO_ARCHETYPE[profileKey] }
}
```

Adicionar teste em `server/src/lib/profile.test.ts` que confirma paridade com o frontend para alguns casos representativos:

```ts
import { describe, it, expect } from 'vitest'
import { computeProfileFromLetters } from './profile'

describe('computeProfileFromLetters — parity with frontend rules', () => {
  it('D + C = exausta_sem_apoio (maria)', () => {
    const p = computeProfileFromLetters({ stage: 'postpartum', ageInDays: 60, mood: 'D', supportNetwork: 'C', goal: 'A', concern: 'A' })
    expect(p.profileKey).toBe('exausta_sem_apoio')
    expect(p.archetypeKey).toBe('maria')
  })

  it('C concern = desafio_amamentacao (ana)', () => {
    const p = computeProfileFromLetters({ stage: 'postpartum', ageInDays: 45, mood: 'B', supportNetwork: 'A', goal: 'A', concern: 'C' })
    expect(p.profileKey).toBe('desafio_amamentacao')
    expect(p.archetypeKey).toBe('ana')
  })

  it('pregnant week 20 + A mood = gestante_tranquila (ester) via q1=A', () => {
    const p = computeProfileFromLetters({ stage: 'pregnant', week: 20, mood: 'A', supportNetwork: 'A', goal: 'A', concern: 'A' })
    expect(p.profileKey).toBe('gestante_tranquila')
    expect(p.archetypeKey).toBe('ester')
  })

  it('postpartum >365 days = mae_experiente (ester) via q1=E', () => {
    const p = computeProfileFromLetters({ stage: 'postpartum', ageInDays: 400, mood: 'A', supportNetwork: 'A', goal: 'A', concern: 'A' })
    expect(p.profileKey).toBe('mae_experiente')
    expect(p.archetypeKey).toBe('ester')
  })
})
```

- [ ] **Step 6: Estender USER_SELECT e resposta**

Modify `server/src/routes/auth.ts:40-48` (USER_SELECT constant):

```ts
const USER_SELECT = {
  id: true, email: true, name: true, username: true, babyName: true,
  pregnancyStage: true, pregnancyWeek: true, babyAgeInDays: true,
  onboardingDone: true, profileKey: true, archetypeKey: true,
  motherBirthDate: true, babyBirthDate: true, expectedBirthDate: true,
  avatarUrl: true, bio: true, versesPublic: true,
  hasMultiples: true, mood: true, supportNetwork: true, goal: true, concern: true,
  babies: { select: { id: true, name: true, birthDate: true, weekAtEntry: true } },
  otherChildren: { select: { id: true, name: true, birthDate: true } },
}
```

- [ ] **Step 7: Rodar teste para confirmar que passa**

Run: `cd server && npm test -- auth.test.ts`

Expected: PASS ambos os casos.

- [ ] **Step 8: Rodar suíte inteira do backend**

Run: `cd server && npm test`

Expected: PASS todos os testes existentes (nenhuma regressão).

- [ ] **Step 9: Commit**

```bash
git add server/src/routes/auth.ts server/src/lib/profile.ts server/src/routes/auth.test.ts
git commit -m "feat(auth): register accepts babies/otherChildren/mood/support/goal/concern"
```

---

### Task 1.3: Atualizar `/users/me` endpoint para incluir novas relações

**Files:**
- Modify: `server/src/routes/users.ts` (localizar handler `GET /me`) — usar o mesmo `USER_SELECT` (ou equivalente) que inclui `babies` e `otherChildren`

- [ ] **Step 1: Escrever teste de regressão**

**Files:**
- Test: `server/src/routes/users.test.ts` (adicionar ao existente ou criar)

```ts
it('GET /users/me returns babies and otherChildren', async () => {
  const app = await buildTestApp()
  // register user with babies+otherChildren (reuse registration helper)
  const { token } = await registerTestUser({
    babies: [{ name: 'Sofia' }],
    otherChildren: [{ name: 'Pedro', birthDate: '2023-05-14' }],
  })
  const res = await app.inject({
    method: 'GET',
    url: '/users/me',
    headers: { authorization: `Bearer ${token}` },
  })
  expect(res.statusCode).toBe(200)
  expect(res.json().babies).toHaveLength(1)
  expect(res.json().otherChildren).toHaveLength(1)
})
```

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `cd server && npm test -- users.test.ts`

Expected: FAIL — resposta não inclui `babies`/`otherChildren`.

- [ ] **Step 3: Estender select do handler**

Localizar o `select` do GET `/me` em `server/src/routes/users.ts` e adicionar:

```ts
  hasMultiples: true, mood: true, supportNetwork: true, goal: true, concern: true,
  babies: { select: { id: true, name: true, birthDate: true, weekAtEntry: true } },
  otherChildren: { select: { id: true, name: true, birthDate: true } },
```

- [ ] **Step 4: Rodar teste**

Run: `cd server && npm test -- users.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/users.ts server/src/routes/users.test.ts
git commit -m "feat(users): expose babies/otherChildren/profile signals on GET /users/me"
```

---

### Task 1.4: Atualizar `src/lib/types.ts` (frontend) para incluir novos campos no `ApiUser`

**Files:**
- Modify: `src/lib/types.ts` — encontrar `interface ApiUser` e adicionar campos

- [ ] **Step 1: Editar tipo ApiUser**

Adicionar dentro de `ApiUser`:

```ts
  hasMultiples?: boolean
  mood?: 'A' | 'B' | 'C' | 'D' | null
  supportNetwork?: 'A' | 'B' | 'C' | null
  goal?: 'A' | 'B' | 'C' | 'D' | null
  concern?: 'A' | 'B' | 'C' | 'D' | null
  babies?: Array<{ id: string; name: string | null; birthDate: string | null; weekAtEntry: number | null }>
  otherChildren?: Array<{ id: string; name: string; birthDate: string }>
```

- [ ] **Step 2: Rodar type-check**

Run: `npm run typecheck` (ou `tsc --noEmit` se não houver script)

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "types(api): add babies/otherChildren/profile signals to ApiUser"
```

---

## Fase 2 — Store + tipos frontend

### Task 2.1: Adicionar tipos `Baby` e `OtherChild` no frontend

**Files:**
- Modify: `src/types/index.ts` — adicionar tipos após `PregnancyPhase`

- [ ] **Step 1: Editar types**

Depois do bloco `PregnancyPhase` (linha 5), adicionar:

```ts
export interface Baby {
  id?: string
  name?: string | null
  birthDate?: string | null   // ISO YYYY-MM-DD
  weekAtEntry?: number | null // semana da gestação no momento do cadastro (only if birthDate null)
}

export interface OtherChild {
  id?: string
  name: string
  birthDate: string  // ISO YYYY-MM-DD, required
}
```

- [ ] **Step 2: Rodar typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "types: add Baby and OtherChild"
```

---

### Task 2.2: Adicionar slots no store + migração v2→v3

**Files:**
- Modify: `src/store/useAppStore.ts`

- [ ] **Step 1: Escrever teste da migração**

**Files:**
- Create: `src/store/useAppStore.babies.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { migrateAppState } from './useAppStore'

describe('migrateAppState v2 → v3', () => {
  it('creates empty babies[] and otherChildren[] on v2 state', () => {
    const v2 = {
      activeTab: 'hoje',
      motherName: 'Ana',
      babyName: 'Sofia',
      phase: { stage: 'pregnant' as const, week: 28 },
      versesByUser: {},
    }
    const result = migrateAppState(v2, 2)
    expect(result.babies).toEqual([])
    expect(result.otherChildren).toEqual([])
    expect(result.mood).toBeNull()
  })

  it('preserves existing v3 state on v3 → v3', () => {
    const v3 = {
      babies: [{ name: 'Sofia' }],
      otherChildren: [{ name: 'Pedro', birthDate: '2023-05-14' }],
      mood: 'B' as const,
    }
    const result = migrateAppState(v3, 3)
    expect(result.babies).toEqual([{ name: 'Sofia' }])
    expect(result.mood).toBe('B')
  })
})
```

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `npx vitest run src/store/useAppStore.babies.test.ts`

Expected: FAIL.

- [ ] **Step 3: Estender AppState interface**

Localizar `interface AppState` em `src/store/useAppStore.ts:17-82` e adicionar (dentro do bloco `// Profile — persisted`):

```ts
  babies: Baby[];
  otherChildren: OtherChild[];
  hasMultiples: boolean;
  mood: 'A' | 'B' | 'C' | 'D' | null;
  supportNetwork: 'A' | 'B' | 'C' | null;
  goal: 'A' | 'B' | 'C' | 'D' | null;
  concern: 'A' | 'B' | 'C' | 'D' | null;
```

Adicionar action:

```ts
  applyRegistration: (user: ApiUser) => void;
```

E importar tipos no topo:

```ts
import type { TabId, PregnancyPhase, OnboardingAnswers, MotherProfile, Q1Answer, Baby, OtherChild } from '../types';
```

- [ ] **Step 4: Adicionar defaults no create()**

Dentro do bloco `create()...({ ... })` inicial (linha ~135), depois de `phase: { stage: 'pregnant', week: 28 }`, adicionar:

```ts
      babies: EMPTY_BABIES,
      otherChildren: EMPTY_CHILDREN,
      hasMultiples: false,
      mood: null,
      supportNetwork: null,
      goal: null,
      concern: null,
```

E no topo do arquivo, junto de `EMPTY_VERSES`:

```ts
const EMPTY_BABIES: Baby[] = []
const EMPTY_CHILDREN: OtherChild[] = []
```

- [ ] **Step 5: Adicionar migração v2 → v3 em `migrateAppState`**

Depois do `if (fromVersion === 1) { ... }` block, adicionar:

```ts
  if (fromVersion === 2) {
    return {
      ...state,
      babies: [],
      otherChildren: [],
      hasMultiples: false,
      mood: null,
      supportNetwork: null,
      goal: null,
      concern: null,
    };
  }
```

- [ ] **Step 6: Bumpar version + partialize novos campos**

Localizar `persist(..., { name: 'mothers-team-v3', ..., version: 2, ... })` no final. Trocar:

```ts
      version: 3,
```

E no `partialize`, adicionar:

```ts
        babies: state.babies,
        otherChildren: state.otherChildren,
        hasMultiples: state.hasMultiples,
        mood: state.mood,
        supportNetwork: state.supportNetwork,
        goal: state.goal,
        concern: state.concern,
```

- [ ] **Step 7: Estender `setAuth` para ler novos campos do user**

Dentro do action `setAuth`, dentro do `set((s) => { ... return { ...; onboardingDone: user.onboardingDone; ... }; })`, adicionar antes do `versesByUser`:

```ts
            babies: user.babies ?? EMPTY_BABIES,
            otherChildren: user.otherChildren ?? EMPTY_CHILDREN,
            hasMultiples: user.hasMultiples ?? false,
            mood: user.mood ?? null,
            supportNetwork: user.supportNetwork ?? null,
            goal: user.goal ?? null,
            concern: user.concern ?? null,
```

- [ ] **Step 8: Rodar teste da migração**

Run: `npx vitest run src/store/useAppStore.babies.test.ts`

Expected: PASS.

- [ ] **Step 9: Rodar suíte inteira do store**

Run: `npx vitest run src/store/`

Expected: PASS (nenhuma regressão em `useAppStore.reception.test.ts`, `useAppStore.migration.test.ts`).

- [ ] **Step 10: Commit**

```bash
git add src/store/useAppStore.ts src/store/useAppStore.babies.test.ts src/types/index.ts
git commit -m "feat(store): babies[]/otherChildren[]/mood/support/goal/concern + v2→v3 migration"
```

---

## Fase 3 — RegisterScreen stepper 5 passos

### Task 3.1: Criar `StepBebes` (passo bebês + gêmeos)

**Files:**
- Create: `src/components/auth/steps/StepBebes.tsx`
- Create: `src/components/auth/steps/StepBebes.test.tsx`

- [ ] **Step 1: Escrever teste**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepBebes } from './StepBebes'

describe('StepBebes', () => {
  it('shows a single baby name input by default (no multiples)', () => {
    render(<StepBebes value={{ hasMultiples: false, babies: [{ name: '' }] }} onChange={vi.fn()} />)
    expect(screen.getAllByPlaceholderText(/nome do bebê/i)).toHaveLength(1)
  })

  it('when user toggles "gêmeos", asks how many + shows N inputs', () => {
    const onChange = vi.fn()
    render(<StepBebes value={{ hasMultiples: false, babies: [{ name: '' }] }} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText(/mais de um bebê/i))
    // simulate updating count to 3
    fireEvent.change(screen.getByLabelText(/quantos bebês/i), { target: { value: '3' } })
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        hasMultiples: true,
        babies: [{ name: '' }, { name: '' }, { name: '' }],
      })
    )
  })
})
```

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `npx vitest run src/components/auth/steps/StepBebes.test.tsx`

Expected: FAIL — arquivo não existe.

- [ ] **Step 3: Implementar componente**

```tsx
import { useCallback } from 'react'
import type { Baby } from '../../../types'

export interface StepBebesValue {
  hasMultiples: boolean
  babies: Baby[]
}

interface Props {
  value: StepBebesValue
  onChange: (v: StepBebesValue) => void
}

export function StepBebes({ value, onChange }: Props) {
  const setHasMultiples = useCallback((checked: boolean) => {
    onChange({
      hasMultiples: checked,
      babies: checked ? value.babies : [value.babies[0] ?? { name: '' }],
    })
  }, [value.babies, onChange])

  const setCount = useCallback((n: number) => {
    const count = Math.max(2, Math.min(6, n))
    const babies: Baby[] = Array.from({ length: count }, (_, i) => value.babies[i] ?? { name: '' })
    onChange({ hasMultiples: true, babies })
  }, [value.babies, onChange])

  const setName = useCallback((idx: number, name: string) => {
    const babies = value.babies.map((b, i) => (i === idx ? { ...b, name } : b))
    onChange({ ...value, babies })
  }, [value, onChange])

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm text-mt-charcoal">
        <input
          type="checkbox"
          checked={value.hasMultiples}
          onChange={(e) => setHasMultiples(e.target.checked)}
          aria-label="mais de um bebê (gêmeos, trigêmeos)"
        />
        <span>Mais de um bebê (gêmeos, trigêmeos)?</span>
      </label>

      {value.hasMultiples && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-mt-muted" htmlFor="baby-count">
            Quantos bebês?
          </label>
          <input
            id="baby-count"
            type="number"
            min={2}
            max={6}
            value={value.babies.length}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-24 px-4 py-3 rounded-2xl bg-white border border-mt-linen text-sm"
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {value.babies.map((b, i) => (
          <input
            key={i}
            type="text"
            value={b.name ?? ''}
            onChange={(e) => setName(i, e.target.value)}
            placeholder={value.babies.length > 1 ? `Nome do bebê ${i + 1} (opcional)` : 'Nome do bebê (opcional)'}
            className="w-full px-4 py-3 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal placeholder:text-mt-muted focus:outline-none focus:border-mt-rose"
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar teste**

Run: `npx vitest run src/components/auth/steps/StepBebes.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/steps/StepBebes.tsx src/components/auth/steps/StepBebes.test.tsx
git commit -m "feat(register): StepBebes with multiples support"
```

---

### Task 3.2: Criar `StepOutrosFilhos`

**Files:**
- Create: `src/components/auth/steps/StepOutrosFilhos.tsx`
- Create: `src/components/auth/steps/StepOutrosFilhos.test.tsx`

- [ ] **Step 1: Escrever teste**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepOutrosFilhos } from './StepOutrosFilhos'

describe('StepOutrosFilhos', () => {
  it('renders empty state with "adicionar filho" button', () => {
    render(<StepOutrosFilhos value={[]} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /adicionar filho/i })).toBeInTheDocument()
  })

  it('adds a new child row when button clicked', () => {
    const onChange = vi.fn()
    render(<StepOutrosFilhos value={[]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /adicionar filho/i }))
    expect(onChange).toHaveBeenCalledWith([{ name: '', birthDate: '' }])
  })

  it('removes a child when trash button clicked', () => {
    const onChange = vi.fn()
    render(
      <StepOutrosFilhos
        value={[{ name: 'Pedro', birthDate: '2023-05-14' }]}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /remover pedro/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
```

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `npx vitest run src/components/auth/steps/StepOutrosFilhos.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implementar componente**

```tsx
import { useCallback } from 'react'
import { Trash2, Plus } from 'lucide-react'
import type { OtherChild } from '../../../types'

interface Props {
  value: OtherChild[]
  onChange: (v: OtherChild[]) => void
}

const today = new Date().toISOString().split('T')[0]

export function StepOutrosFilhos({ value, onChange }: Props) {
  const add = useCallback(() => {
    onChange([...value, { name: '', birthDate: '' }])
  }, [value, onChange])

  const remove = useCallback((idx: number) => {
    onChange(value.filter((_, i) => i !== idx))
  }, [value, onChange])

  const update = useCallback((idx: number, patch: Partial<OtherChild>) => {
    onChange(value.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  }, [value, onChange])

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-mt-muted">
        Se quiser, adicione outros filhos que você já tem. Isso é opcional — pode pular.
      </p>

      {value.map((child, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            type="text"
            value={child.name}
            onChange={(e) => update(i, { name: e.target.value })}
            placeholder="Nome"
            className="flex-1 px-4 py-3 rounded-2xl bg-white border border-mt-linen text-sm"
          />
          <input
            type="date"
            max={today}
            value={child.birthDate}
            onChange={(e) => update(i, { birthDate: e.target.value })}
            aria-label={`Data de nascimento de ${child.name || 'filho ' + (i + 1)}`}
            className="px-3 py-3 rounded-2xl bg-white border border-mt-linen text-sm"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label={`remover ${child.name || 'filho ' + (i + 1)}`}
            className="p-2 text-mt-rose-dark"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-mt-linen text-mt-muted text-sm font-medium flex items-center justify-center gap-1 hover:border-mt-rose hover:text-mt-rose transition-colors"
      >
        <Plus size={14} /> Adicionar filho
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Rodar teste**

Run: `npx vitest run src/components/auth/steps/StepOutrosFilhos.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/steps/StepOutrosFilhos.tsx src/components/auth/steps/StepOutrosFilhos.test.tsx
git commit -m "feat(register): StepOutrosFilhos with add/remove"
```

---

### Task 3.3: Criar `StepHumor` (mood + supportNetwork)

**Files:**
- Create: `src/components/auth/steps/StepHumor.tsx`
- Create: `src/components/auth/steps/StepHumor.test.tsx`

- [ ] **Step 1: Escrever teste**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepHumor } from './StepHumor'

describe('StepHumor', () => {
  it('renders 4 mood options and 3 support options', () => {
    render(<StepHumor value={{ mood: null, supportNetwork: null }} onChange={vi.fn()} />)
    expect(screen.getAllByRole('radio', { name: /(confiante|cansada|ansiosa|exausta)/i })).toHaveLength(4)
    expect(screen.getAllByRole('radio', { name: /(sempre|momentos|sozinha)/i })).toHaveLength(3)
  })

  it('emits change when a mood is picked', () => {
    const onChange = vi.fn()
    render(<StepHumor value={{ mood: null, supportNetwork: null }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: /ansiosa/i }))
    expect(onChange).toHaveBeenCalledWith({ mood: 'C', supportNetwork: null })
  })
})
```

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `npx vitest run src/components/auth/steps/StepHumor.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implementar componente**

```tsx
import type { Q2Answer, Q3Answer } from '../../../types'

export interface StepHumorValue {
  mood: Q2Answer | null
  supportNetwork: Q3Answer | null
}

interface Props {
  value: StepHumorValue
  onChange: (v: StepHumorValue) => void
}

const MOODS: Array<{ key: Q2Answer; label: string }> = [
  { key: 'A', label: 'Confiante e animada' },
  { key: 'B', label: 'Cansada mas lidando' },
  { key: 'C', label: 'Ansiosa, com medos' },
  { key: 'D', label: 'Sobrecarregada, exausta' },
]

const SUPPORT: Array<{ key: Q3Answer; label: string }> = [
  { key: 'A', label: 'Sempre tenho ajuda quando preciso' },
  { key: 'B', label: 'Ajuda em momentos específicos' },
  { key: 'C', label: 'Cuido de quase tudo sozinha' },
]

export function StepHumor({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-mt-charcoal mb-2">
          Como você tem se sentido nos últimos dias?
        </legend>
        {MOODS.map((m) => (
          <label key={m.key} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-mt-linen cursor-pointer hover:border-mt-rose transition-colors">
            <input
              type="radio"
              name="mood"
              value={m.key}
              checked={value.mood === m.key}
              onChange={() => onChange({ ...value, mood: m.key })}
              aria-label={m.label}
              className="accent-mt-rose"
            />
            <span className="text-sm text-mt-charcoal">{m.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-mt-charcoal mb-2">
          Como está sua rede de apoio?
        </legend>
        {SUPPORT.map((s) => (
          <label key={s.key} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-mt-linen cursor-pointer hover:border-mt-rose transition-colors">
            <input
              type="radio"
              name="support"
              value={s.key}
              checked={value.supportNetwork === s.key}
              onChange={() => onChange({ ...value, supportNetwork: s.key })}
              aria-label={s.label}
              className="accent-mt-rose"
            />
            <span className="text-sm text-mt-charcoal">{s.label}</span>
          </label>
        ))}
      </fieldset>
    </div>
  )
}
```

- [ ] **Step 4: Rodar teste**

Run: `npx vitest run src/components/auth/steps/StepHumor.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/steps/StepHumor.tsx src/components/auth/steps/StepHumor.test.tsx
git commit -m "feat(register): StepHumor with mood + supportNetwork"
```

---

### Task 3.4: Criar `StepObjetivo` (goal + concern)

**Files:**
- Create: `src/components/auth/steps/StepObjetivo.tsx`
- Create: `src/components/auth/steps/StepObjetivo.test.tsx`

- [ ] **Step 1: Escrever teste**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepObjetivo } from './StepObjetivo'

describe('StepObjetivo', () => {
  it('renders 4 goal + 4 concern options', () => {
    render(<StepObjetivo value={{ goal: null, concern: null }} onChange={vi.fn()} />)
    expect(screen.getAllByRole('radio')).toHaveLength(8)
  })

  it('emits goal change', () => {
    const onChange = vi.fn()
    render(<StepObjetivo value={{ goal: null, concern: null }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: /sono/i }))
    expect(onChange).toHaveBeenCalledWith({ goal: 'C', concern: null })
  })
})
```

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `npx vitest run src/components/auth/steps/StepObjetivo.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implementar componente**

Análogo ao `StepHumor`, com estas listas:

```tsx
import type { Q4Answer, Q5Answer } from '../../../types'

export interface StepObjetivoValue {
  goal: Q4Answer | null
  concern: Q5Answer | null
}

interface Props {
  value: StepObjetivoValue
  onChange: (v: StepObjetivoValue) => void
}

const GOALS: Array<{ key: Q4Answer; label: string }> = [
  { key: 'A', label: 'Entender o desenvolvimento do bebê' },
  { key: 'B', label: 'Cuidar da saúde física' },
  { key: 'C', label: 'Melhorar o sono' },
  { key: 'D', label: 'Organizar a rotina' },
]

const CONCERNS: Array<{ key: Q5Answer; label: string }> = [
  { key: 'A', label: 'Autocuidado / identidade' },
  { key: 'B', label: 'Choro, cólicas, sono do bebê' },
  { key: 'C', label: 'Amamentação / alimentação' },
  { key: 'D', label: 'Corpo, hormônios, autoestima' },
]

export function StepObjetivo({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-mt-charcoal mb-2">
          Qual seu principal objetivo por aqui?
        </legend>
        {GOALS.map((g) => (
          <label key={g.key} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-mt-linen cursor-pointer hover:border-mt-rose transition-colors">
            <input
              type="radio"
              name="goal"
              value={g.key}
              checked={value.goal === g.key}
              onChange={() => onChange({ ...value, goal: g.key })}
              aria-label={g.label}
              className="accent-mt-rose"
            />
            <span className="text-sm text-mt-charcoal">{g.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-mt-charcoal mb-2">
          Qual sua maior preocupação hoje?
        </legend>
        {CONCERNS.map((c) => (
          <label key={c.key} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-mt-linen cursor-pointer hover:border-mt-rose transition-colors">
            <input
              type="radio"
              name="concern"
              value={c.key}
              checked={value.concern === c.key}
              onChange={() => onChange({ ...value, concern: c.key })}
              aria-label={c.label}
              className="accent-mt-rose"
            />
            <span className="text-sm text-mt-charcoal">{c.label}</span>
          </label>
        ))}
      </fieldset>
    </div>
  )
}
```

- [ ] **Step 4: Rodar teste**

Run: `npx vitest run src/components/auth/steps/StepObjetivo.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/steps/StepObjetivo.tsx src/components/auth/steps/StepObjetivo.test.tsx
git commit -m "feat(register): StepObjetivo with goal + concern"
```

---

### Task 3.5: Refatorar `RegisterScreen` para 5 passos

**Files:**
- Modify: `src/components/auth/RegisterScreen.tsx` — passar de `step: 1 | 2` para `step: 1 | 2 | 3 | 4 | 5`
- Modify: `src/components/auth/RegisterScreen.test.tsx`

- [ ] **Step 1: Atualizar teste de fluxo**

Editar `RegisterScreen.test.tsx` — adicionar cobertura pros novos passos. Substituir teste principal por (ou adicionar):

```tsx
it('takes 5 steps and sends full payload', async () => {
  const { user } = renderWithProviders(<RegisterScreen onBack={vi.fn()} />)
  // Step 1
  await user.type(screen.getByLabelText(/^nome$/i), 'Ana')
  await user.type(screen.getByLabelText(/e-mail/i), 'ana@test.com')
  await user.type(screen.getByLabelText(/^senha$/i), 'password123')
  await user.click(screen.getByRole('button', { name: /continuar/i }))
  // Step 2 — bebês
  await user.click(screen.getByRole('button', { name: /grávida/i }))
  await user.type(screen.getByLabelText(/data prevista/i), '2027-01-01')
  await user.click(screen.getByRole('button', { name: /continuar/i }))
  // Step 3 — outros filhos (skip)
  await user.click(screen.getByRole('button', { name: /continuar/i }))
  // Step 4 — humor
  await user.click(screen.getByRole('radio', { name: /confiante/i }))
  await user.click(screen.getByRole('radio', { name: /sempre/i }))
  await user.click(screen.getByRole('button', { name: /continuar/i }))
  // Step 5 — objetivo + termos
  await user.click(screen.getByRole('radio', { name: /desenvolvimento/i }))
  await user.click(screen.getByRole('radio', { name: /autocuidado/i }))
  await user.click(screen.getByLabelText(/aceito os termos/i))
  await user.click(screen.getByRole('button', { name: /criar conta/i }))
  // assert mutation called with the full payload including babies, mood, etc.
})
```

**Note:** `renderWithProviders` e `user` do `@testing-library/user-event` já existem no projeto — se não, checar padrão em outros `*.test.tsx`.

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `npx vitest run src/components/auth/RegisterScreen.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Refatorar RegisterScreen**

Reescrever `src/components/auth/RegisterScreen.tsx` mantendo o step 1 igual, o step 2 igual (renomear pra `StepDadosGestacionais` inline ou manter inline), e adicionar 3, 4, 5.

Adicionar imports:

```tsx
import { StepBebes, type StepBebesValue } from './steps/StepBebes'
import { StepOutrosFilhos } from './steps/StepOutrosFilhos'
import { StepHumor, type StepHumorValue } from './steps/StepHumor'
import { StepObjetivo, type StepObjetivoValue } from './steps/StepObjetivo'
import type { OtherChild } from '../../types'
```

Trocar `useState<1 | 2>(1)` por `useState<1 | 2 | 3 | 4 | 5>(1)`.

Adicionar states:

```tsx
const [bebesState, setBebesState] = useState<StepBebesValue>({
  hasMultiples: false,
  babies: [{ name: babyName || '' }],
})
const [outrosFilhos, setOutrosFilhos] = useState<OtherChild[]>([])
const [humorState, setHumorState] = useState<StepHumorValue>({ mood: null, supportNetwork: null })
const [objetivoState, setObjetivoState] = useState<StepObjetivoValue>({ goal: null, concern: null })
```

Adicionar validators:

```tsx
const step3Valid = outrosFilhos.every((c) => c.name.trim() && c.birthDate) // vazio também é válido
const step4Valid = humorState.mood !== null && humorState.supportNetwork !== null
const step5Valid = objetivoState.goal !== null && objetivoState.concern !== null && acceptedTerms
```

Estender `mutate` payload:

```tsx
body: JSON.stringify({
  name: name.trim(),
  username: username.trim() || undefined,
  email: email.trim(),
  password,
  pregnancyStage,
  pregnancyWeek: pregnancyStage === 'pregnant' && !expectedBirthDate ? Number(pregnancyWeek) || undefined : undefined,
  babyAgeInDays: pregnancyStage === 'postpartum' && !babyBirthDate ? Number(babyAgeInDays) || undefined : undefined,
  babyName: bebesState.babies[0]?.name?.trim() || undefined,  // primeiro bebê pra legado
  expectedBirthDate: pregnancyStage === 'pregnant' && expectedBirthDate ? expectedBirthDate : undefined,
  babyBirthDate: pregnancyStage === 'postpartum' && babyBirthDate ? babyBirthDate : undefined,
  motherBirthDate: motherBirthDate || undefined,
  acceptedTerms: true,
  // NEW:
  hasMultiples: bebesState.hasMultiples,
  babies: bebesState.babies
    .map((b) => ({ name: b.name?.trim() || undefined }))
    .filter((b) => b.name || bebesState.hasMultiples), // sempre envia se gêmeos
  otherChildren: outrosFilhos
    .filter((c) => c.name.trim() && c.birthDate)
    .map((c) => ({ name: c.name.trim(), birthDate: c.birthDate })),
  mood: humorState.mood ?? undefined,
  supportNetwork: humorState.supportNetwork ?? undefined,
  goal: objetivoState.goal ?? undefined,
  concern: objetivoState.concern ?? undefined,
}),
```

Renderizar switch de step:

```tsx
{step === 1 ? (
  /* ... step 1 igual ao atual ... */
) : step === 2 ? (
  <>
    {/* step 2 atual: fase gestacional, semana/dias, data prevista/nascimento */}
    <StepBebes value={bebesState} onChange={setBebesState} />
    <button type="button" onClick={() => setStep(3)} disabled={/* step2 valid + bebes válidos */}>Continuar →</button>
  </>
) : step === 3 ? (
  <>
    <h2 className="text-base font-semibold">Tem outros filhos?</h2>
    <StepOutrosFilhos value={outrosFilhos} onChange={setOutrosFilhos} />
    <button type="button" onClick={() => setStep(4)} disabled={!step3Valid}>Continuar →</button>
    <button type="button" onClick={() => setStep(4)} className="text-mt-muted text-xs underline">Pular</button>
  </>
) : step === 4 ? (
  <>
    <StepHumor value={humorState} onChange={setHumorState} />
    <button type="button" onClick={() => setStep(5)} disabled={!step4Valid}>Continuar →</button>
  </>
) : (
  <form onSubmit={handleSubmit}>
    <StepObjetivo value={objetivoState} onChange={setObjetivoState} />
    {/* checkbox termos + botão submit — copiar do step 2 atual */}
  </form>
)}
```

Trocar barra de progresso de 2 para 5 divs.

- [ ] **Step 4: Rodar teste do RegisterScreen**

Run: `npx vitest run src/components/auth/RegisterScreen.test.tsx`

Expected: PASS.

- [ ] **Step 5: Rodar suíte inteira**

Run: `npm test`

Expected: PASS (nenhuma regressão).

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/RegisterScreen.tsx src/components/auth/RegisterScreen.test.tsx
git commit -m "feat(register): 5-step stepper with babies/otherChildren/mood/goal"
```

---

## Fase 4 — Sara emocional

### Task 4.1: Criar novo beat `SaraBoasVindas`

**Files:**
- Create: `src/components/reception/beats/SaraBoasVindas.tsx`
- Create: `src/components/reception/beats/SaraBoasVindas.test.tsx`

- [ ] **Step 1: Escrever teste**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SaraBoasVindas } from './SaraBoasVindas'

vi.mock('../hooks/useSaraTTS', () => ({
  useSaraTTS: () => ({ playScript: vi.fn().mockResolvedValue(undefined), stop: vi.fn(), state: 'idle' }),
}))

describe('SaraBoasVindas', () => {
  it('renders welcome message + "continuar" button after script ends', async () => {
    render(<SaraBoasVindas motherName="Ana" onComplete={vi.fn()} />)
    // Script runs immediately in mock, button is enabled
    expect(await screen.findByRole('button', { name: /continuar/i })).toBeEnabled()
  })

  it('calls onComplete when continue clicked', async () => {
    const onComplete = vi.fn()
    render(<SaraBoasVindas motherName="Ana" onComplete={onComplete} />)
    fireEvent.click(await screen.findByRole('button', { name: /continuar/i }))
    expect(onComplete).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `npx vitest run src/components/reception/beats/SaraBoasVindas.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implementar SaraBoasVindas**

Nota: em vez de usar Convai (agente conversacional), o beat usa apenas TTS pré-scriptado — mais simples e sem latência de resposta. Se `useSaraTTS` ainda não existir com esse formato, criar ou reutilizar `server/src/routes/sara.ts` que já expõe TTS.

```tsx
import { useEffect, useState } from 'react'
import { OrbeVisual } from '../OrbeVisual'
import { ProgressBar } from '../ProgressBar'
import { useSaraTTS } from '../hooks/useSaraTTS'

interface Props {
  motherName: string
  onComplete: () => void
}

export function SaraBoasVindas({ motherName, onComplete }: Props) {
  const { playScript, state, amplitude } = useSaraTTS()
  const [scriptDone, setScriptDone] = useState(false)

  useEffect(() => {
    const firstName = motherName?.split(' ')[0] || ''
    const line1 = firstName
      ? `Oi ${firstName}. Prazer ter você aqui.`
      : `Oi. Prazer ter você aqui.`
    const line2 = 'Aqui no Mother\'s Team você sempre será bem-vinda. Se precisar de mim, eu sempre estarei por perto.'
    void playScript([line1, line2]).finally(() => setScriptDone(true))
  }, [motherName, playScript])

  return (
    <div className="min-h-screen flex flex-col bg-mt-cream">
      <div className="px-6 pt-8">
        <ProgressBar percent={80} />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <OrbeVisual amplitude={amplitude} state={state === 'playing' ? 'speaking' : 'idle'} size="md" />
      </div>
      <div className="px-6 pb-10">
        <button
          type="button"
          onClick={onComplete}
          disabled={!scriptDone}
          className="w-full py-3 rounded-2xl bg-mt-rose text-white text-sm font-semibold disabled:opacity-40"
        >
          Continuar →
        </button>
      </div>
    </div>
  )
}
```

**Verificação necessária antes de implementar:** ler `src/components/reception/hooks/useSaraTTS.ts` para confirmar que expõe `playScript(lines: string[])`, `state`, `amplitude`. Se a interface for outra, adaptar o wire ou estender o hook (adicionar `playScript` como wrapper de N chamadas sequenciais).

- [ ] **Step 4: Rodar teste**

Run: `npx vitest run src/components/reception/beats/SaraBoasVindas.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/reception/beats/SaraBoasVindas.tsx src/components/reception/beats/SaraBoasVindas.test.tsx
git commit -m "feat(reception): SaraBoasVindas single welcome beat"
```

---

### Task 4.2: Substituir caps 1/2/3 no ReceptionFlow + tipo + hook

**Files:**
- Modify: `src/types/reception.ts`
- Modify: `src/components/reception/hooks/useReceptionState.ts`
- Modify: `src/components/reception/ReceptionFlow.tsx`
- Delete: `src/components/reception/beats/Capitulo1.tsx` + `.test.tsx`
- Delete: `src/components/reception/beats/Capitulo2.tsx` + `.test.tsx`
- Delete: `src/components/reception/beats/Capitulo3.tsx` + `.test.tsx`
- Delete: `src/components/reception/hooks/useSaraNarration.ts` + `.test.ts`

- [ ] **Step 1: Atualizar tipo ReceptionBeat**

Editar `src/types/reception.ts`, substituir `ReceptionBeat` por:

```ts
export type ReceptionBeat =
  | 'bem-vinda'
  | 'sara-aparece'
  | 'sara-boas-vindas'
  | 'preparando-tudo'
  | 'presente'
  | 'done'
```

Deletar tipos `MoodAnswer`, `SupportAnswer`, `GoalAnswer`, `ConcernAnswer`, `ReceptionOtherChild`, `ReceptionData` (todos migraram para o form / store principal).

- [ ] **Step 2: Atualizar hook useReceptionState**

Ler `src/components/reception/hooks/useReceptionState.ts` primeiro. Remover:
- transições `capitulo-1` / `capitulo-2` / `capitulo-3`
- state `data: ReceptionData` (se existir)
- action `applyData`

Adicionar transição `sara-aparece` → `sara-boas-vindas` → `preparando-tudo`.

- [ ] **Step 3: Atualizar ReceptionFlow**

Substituir `src/components/reception/ReceptionFlow.tsx` por:

```tsx
import { useAppStore } from '../../store/useAppStore'
import { useReceptionState } from './hooks/useReceptionState'
import { BemVinda } from './beats/BemVinda'
import { SaraAparece } from './beats/SaraAparece'
import { SaraBoasVindas } from './beats/SaraBoasVindas'
import { PreparandoTudo } from './beats/PreparandoTudo'
import { Presente } from './beats/Presente'

export function ReceptionFlow() {
  const { beat, advance } = useReceptionState()
  const motherName = useAppStore((s) => s.motherName)
  const mood = useAppStore((s) => s.mood)

  switch (beat) {
    case 'bem-vinda':
      return <BemVinda onContinue={advance} />
    case 'sara-aparece':
      return <SaraAparece motherName={motherName} onContinue={advance} />
    case 'sara-boas-vindas':
      return <SaraBoasVindas motherName={motherName} onComplete={advance} />
    case 'preparando-tudo':
      return <PreparandoTudo data={{ mood: mood ?? undefined }} onReady={advance} />
    case 'presente':
      return <Presente mood={mood ?? undefined} onEnter={advance} />
    case 'done':
      return null
  }
}
```

**Verificar:** `PreparandoTudo` e `Presente` esperavam `ReceptionData` — checar assinatura e ajustar (props devem passar apenas o `mood` que ainda usam).

- [ ] **Step 4: Deletar arquivos obsoletos**

```bash
rm src/components/reception/beats/Capitulo1.tsx
rm src/components/reception/beats/Capitulo1.test.tsx
rm src/components/reception/beats/Capitulo2.tsx
rm src/components/reception/beats/Capitulo2.test.tsx
rm src/components/reception/beats/Capitulo3.tsx
rm src/components/reception/beats/Capitulo3.test.tsx
rm src/components/reception/hooks/useSaraNarration.ts
rm src/components/reception/hooks/useSaraNarration.test.ts
```

- [ ] **Step 5: Atualizar store — remover `applyReceptionData`**

Modify: `src/store/useAppStore.ts` — remover action `applyReceptionData` (linhas ~219-238), `derivarQ1` (linhas 10-15), interface entry `applyReceptionData` da `AppState`. `completeReception` mantém.

Também remover `import type { ReceptionData } from '../types/reception'`.

- [ ] **Step 6: Rodar type-check**

Run: `npm run typecheck`

Expected: PASS. Se falhar, corrigir imports órfãos.

- [ ] **Step 7: Rodar suíte inteira**

Run: `npm test`

Expected: PASS. Testes deletados foram removidos junto com os arquivos.

- [ ] **Step 8: Commit**

```bash
git add -A src/components/reception src/types/reception.ts src/store/useAppStore.ts
git commit -m "refactor(reception): replace Capitulo 1/2/3 with single SaraBoasVindas beat"
```

---

### Task 4.3: Atualizar agente ElevenLabs via API — novo prompt sem tools

**Files:**
- Create: `.migrate-tmp/update-sara-agent.mjs`

- [ ] **Step 1: Escrever script**

```js
// One-shot: update Sara agent to emocional-only (no tools, minimal prompt).
// Usage: node .migrate-tmp/update-sara-agent.mjs
const NEW_KEY = 'sk_95a55723fcb97382480608307c7c5de02d1cc89eaebaa35c'
const AGENT_ID = 'agent_7801m0v3npg3efa9hs4qj0fpcg9k'

const NEW_PROMPT = `Você é a Sara. Está falando com uma mãe que acabou de completar o cadastro no Mother's Team.

Seu papel é único: recebê-la de forma calorosa, perguntar como ela está se sentindo hoje, escutar a resposta com empatia, reagir brevemente, e reforçar que você estará por perto.

Regras absolutas:
- NÃO pergunte dados cadastrais: nada de fase gestacional, semana, nome do bebê, filhos, humor por categoria, objetivos ou preocupações. Tudo isso a mãe já preencheu no cadastro.
- NÃO tente coletar informações. Nenhuma tool call é necessária.
- Máximo 3 turnos: (1) boas-vindas + pergunta emocional, (2) reação empática, (3) fala final de encerramento.
- Sempre encerre a conversa você mesma na terceira fala — use o tool end_call.

Como você fala:
- Como uma amiga que ela acabou de conhecer. Frases curtas, tom acolhedor.
- Português do Brasil, sempre com acentuação correta.
- Use expressões como "que bom te conhecer", "conta pra mim", "a gente".

Fluxo de fala:
1. "Oi. Prazer te conhecer. Como você está se sentindo hoje?"
2. [Ela responde. Reaja com uma frase curta que reconhece o que ela sentiu.]
3. "Aqui no Mother's Team você sempre será bem-vinda. E se precisar de mim, eu sempre estarei por perto." [end_call]`

async function main() {
  const r = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: 'PATCH',
    headers: { 'xi-api-key': NEW_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation_config: {
        agent: {
          first_message: 'Oi. Prazer te conhecer. Como você está se sentindo hoje?',
          prompt: {
            prompt: NEW_PROMPT,
            tool_ids: [],
            tools: [], // remove custom tools; keep built-in end_call via built_in_tools untouched
          },
        },
      },
    }),
  })
  const t = await r.text()
  console.log('PATCH:', r.status, t.slice(0, 300))

  // Verify
  const g = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    headers: { 'xi-api-key': NEW_KEY },
  })
  const j = await g.json()
  console.log('\nAfter update:')
  console.log('  first_message:', j.conversation_config.agent.first_message)
  console.log('  tool_ids:', j.conversation_config.agent.prompt.tool_ids)
  console.log('  prompt (first 200):', j.conversation_config.agent.prompt.prompt.slice(0, 200))
}

main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Rodar script**

Run: `node .migrate-tmp/update-sara-agent.mjs`

Expected output:
- `PATCH: 200 {...}`
- `first_message: Oi. Prazer te conhecer. Como você está se sentindo hoje?`
- `tool_ids: []`
- prompt começa com "Você é a Sara..."

- [ ] **Step 3: (Opcional) deletar 3 tools órfãos na conta Baby Team**

Não obrigatório — só higiene. Se quiser limpar:

```bash
curl -X DELETE "https://api.elevenlabs.io/v1/convai/tools/tool_1301m0v3nnbse6vtvzq4cg0rh7cv" -H "xi-api-key: sk_95a5..."
curl -X DELETE "https://api.elevenlabs.io/v1/convai/tools/tool_8501m0v3nnybeyktvcn4635ch1hg" -H "xi-api-key: sk_95a5..."
curl -X DELETE "https://api.elevenlabs.io/v1/convai/tools/tool_8001m0v3np9sfe3a3vhg4e71wrv5" -H "xi-api-key: sk_95a5..."
```

- [ ] **Step 4: Commit** (não commitar o script — está gitignored)

Nada a commitar aqui — mudança é remota.

---

## Fase 5 — Deploy produção

### Task 5.1: Deploy backend (migration + docker restart)

- [ ] **Step 1: Push migration para prod DB**

Executar no VPS:

```bash
ssh -p 443 root@2.25.137.78 'cd /opt/mothersteam && git pull && cd server && DATABASE_URL="$(grep ^DATABASE_URL /opt/mothersteam/deploy/.env.production | cut -d= -f2- | tr -d "\"")" npx prisma migrate deploy'
```

Expected: `Applying migration ... add_babies_and_children` sem erro.

- [ ] **Step 2: Rebuild + restart container**

```bash
ssh -p 443 root@2.25.137.78 'cd /opt/mothersteam/deploy && docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build --no-deps api && sleep 10 && docker ps --filter name=mothersteam-api --format "{{.Names}} | {{.Status}}"'
```

Expected: container recreated e healthy em <20s.

- [ ] **Step 3: Smoke test do register**

```bash
curl -sS -X POST "https://api.santoti.com/auth/register" -H "Content-Type: application/json" -d '{
  "email":"smoketest+deploy@example.com",
  "password":"testpass123",
  "name":"Smoke",
  "pregnancyStage":"pregnant",
  "pregnancyWeek":20,
  "acceptedTerms":true,
  "hasMultiples":false,
  "babies":[{"name":"Bebê Teste"}],
  "otherChildren":[],
  "mood":"A","supportNetwork":"A","goal":"A","concern":"A"
}' -w "\nHTTP %{http_code}\n"
```

Expected: HTTP 200, JSON body inclui `user.babies[0].name === 'Bebê Teste'`, `user.mood === 'A'`, `user.profileKey` presente.

Após o teste, apagar o user smoketest via SQL:

```bash
ssh -p 443 root@2.25.137.78 'docker exec mothersteam-api sh -c "mysql -h db -u \$DATABASE_USER -p\$DATABASE_PASSWORD mothers_team -e \"DELETE FROM User WHERE email=\\\"smoketest+deploy@example.com\\\";\""'
```

(Se comando não bater com setup — usar admin dashboard ou psql, o importante é limpar.)

---

### Task 5.2: Deploy frontend

- [ ] **Step 1: Build**

```bash
npm run build
```

Expected: `dist/` gerado sem erros.

- [ ] **Step 2: scp para VPS**

```bash
scp -P 443 -r dist/. root@2.25.137.78:/var/www/mothersteam/
```

- [ ] **Step 3: Cap sync Android**

```bash
npx cap sync android
```

- [ ] **Step 4: Smoke test manual (browser)**

- Abrir `https://mothers-team.com` (ou domínio prod do frontend).
- Fazer signup completo em conta nova de teste. Passar pelos 5 passos.
- Verificar que Sara aparece com nova fala emocional (nada de "grávida ou pós-parto?").
- Confirmar chegada ao Home.
- Deletar user de teste depois.

- [ ] **Step 5: Commit** (deploy notes ou nada — nenhum código muda aqui)

```bash
git add docs/superpowers/plans/2026-08-24-cadastro-completo-e-sara-emocional.md
git commit -m "docs(plan): cadastro completo + sara emocional plan"
```

Push:

```bash
git push origin feat/onda-1-visual-fundacao
```

---

## Cross-cutting concerns

**Retrocompatibilidade de usuários antigos:**  
Usuários que já se cadastraram no formato antigo (só `pregnancyStage` + `pregnancyWeek/babyAgeInDays` + `babyName` opcional) NÃO passam pelo novo form. O backend continua aceitando esses cadastros (todos os campos novos são opcionais). O store/frontend renderiza `babies[]` derivado: se vazio, monta um único item a partir de `babyName`+`phase` como fallback.

**Retrocompatibilidade do `babyName` em outros lugares do app:**  
Verificar que `babyName` continua sendo escrito no cadastro (primeiro bebê do array). Nenhum outro código muda porque `babyName` continua no store como derivado do primeiro bebê.

**RegisterScreen barra de progresso:**  
Trocar de 2 divs de largura 1/2 para 5 divs de largura 1/5. Cor `bg-mt-rose` para completos, `bg-gray-200` para pendentes.

**Não usar Zustand selector com literal:**  
Já contemplado — CLAUDE.md manda usar `EMPTY_BABIES`/`EMPTY_CHILDREN` constantes de módulo (feito no Task 2.2 Step 4).

**Testes de outros lugares do app:**  
Após todas as fases, rodar `npm test` inteiro no root e em `server/`. Nada além de arquivos deletados deve regredir.

---

## Self-Review

**1. Spec coverage:**
- ✅ Cadastro completo (gêmeos, outros filhos) — Tasks 3.1, 3.2, 3.5
- ✅ Data de nascimento exata para outros filhos — Task 3.2 (`birthDate: string` required)
- ✅ Sara vira só welcome emocional — Tasks 4.1, 4.2, 4.3
- ✅ Cadastro antes da Sara — Tasks 3.5 (Register) + 4.2 (Sara agora é beat após register)
- ✅ Mood/support/goal/concern migrados para form — Tasks 3.3, 3.4
- ✅ Backend persiste tudo — Tasks 1.1, 1.2
- ✅ Deploy VPS — Task 5.1, 5.2

**2. Placeholder scan:**
- Task 1.2 Step 5 (`pickArchetype`): reconhecido como stub que precisa ser substituído lendo `src/utils/onboardingScoring.ts` primeiro. Documentado com IMPORTANT box.
- Task 4.1 Step 3: usa `useSaraTTS` supondo interface `playScript` — documentado com "Verificação necessária antes de implementar".
- Task 4.2 Step 3: `PreparandoTudo` / `Presente` — documentado "checar assinatura e ajustar".
- Sem TBD, TODO, "add appropriate error handling", "handle edge cases".

**3. Type consistency:**
- `Baby` / `OtherChild` — mesma shape em `src/types/index.ts` (Task 2.1) e em `ApiUser` (Task 1.4).
- `StepBebesValue` / `StepHumorValue` / `StepObjetivoValue` — exportados dos steps, importados no RegisterScreen (Task 3.5).
- Letters `Q2Answer` / `Q3Answer` / `Q4Answer` / `Q5Answer` — reusados dos tipos existentes (`src/types/index.ts` linhas 27-30).
- `ReceptionBeat` reduzido em `src/types/reception.ts` (Task 4.2) — nenhum outro arquivo usa os beats deletados (verificado via imports).

Nenhum gap encontrado.

---

**Plan complete and saved to `docs/superpowers/plans/2026-08-24-cadastro-completo-e-sara-emocional.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
