# Referência de resposta no chat (TIA-39) — Plano de Implementação

> **Para workers agênticos:** REQUIRED SUB-SKILL: executar inline com TDD, tarefa a tarefa. Passos usam checkbox (`- [ ]`) para acompanhamento.

**Goal:** Ao responder uma mensagem no chat, a citação mostra de quem e o trecho certo, e tocar nela rola até a mensagem original.

**Architecture:** A referência que o cliente já captura (`replyingTo: { id, senderName, excerpt }`) passa a ser enviada como campos próprios da mensagem — mesma convenção do `sharedPost*` já existente — em vez de virar texto colado no conteúdo.

**Tech Stack:** Prisma/MySQL, Fastify + Zod, React + `@tanstack/react-query`, vitest.

**Spec:** `docs/superpowers/specs/2026-09-18-chat-reply-reference-design.md`

---

### Task 1: Schema — campos de referência na mensagem

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/20260918000000_add_message_reply_reference/migration.sql`

- [ ] **Step 1: Adicionar os campos no `model Message`**

```prisma
model Message {
  id                String   @id @default(cuid())
  content           String   @db.Text
  chatId            String
  chat              Chat     @relation(fields: [chatId], references: [id], onDelete: Cascade)
  senderId          String
  sender            User     @relation(fields: [senderId], references: [id], onDelete: Cascade)
  sharedPostId      String?
  sharedPostAuthor  String?
  sharedPostExcerpt String?
  replyToId         String?
  replyToSenderName String?
  replyToExcerpt    String?
  audioUrl          String?
  imageUrl          String?  // npx prisma db push needed
  read              Boolean  @default(false)
  createdAt         DateTime @default(now())
}
```

- [ ] **Step 2: Escrever a migration manualmente**

```sql
-- AlterTable
ALTER TABLE `Message`
  ADD COLUMN `replyToId` VARCHAR(191) NULL,
  ADD COLUMN `replyToSenderName` VARCHAR(191) NULL,
  ADD COLUMN `replyToExcerpt` VARCHAR(191) NULL;
```

- [ ] **Step 3: Gerar o Prisma Client**

Rodar (dentro de `server/`): `npx prisma generate`
Esperado: sem erro, `replyToId`/`replyToSenderName`/`replyToExcerpt` disponíveis no tipo `Message` do client.

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/20260918000000_add_message_reply_reference/
git commit -m "feat(chat): add reply reference fields to Message"
```

---

### Task 2: Backend — persistir e devolver a referência

**Files:**
- Modify: `server/src/routes/chats.ts`
- Create: `server/src/routes/chats.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Seguir o padrão de `buildApp`/mock de Prisma já usado em `server/src/routes/baby.test.ts`.

```ts
import { describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'
import chatsRoutes from './chats'

vi.mock('../sse', () => ({ emitMessage: vi.fn() }))

async function buildApp(mocks: {
  chatParticipant?: ReturnType<typeof vi.fn>
  messageCreate?: ReturnType<typeof vi.fn>
  chatFindUnique?: ReturnType<typeof vi.fn>
}) {
  const app = Fastify()
  app.decorate('prisma', {
    chatParticipant: { findUnique: mocks.chatParticipant ?? vi.fn().mockResolvedValue({ userId: 'user-1', chatId: 'chat-1' }) },
    message: { create: mocks.messageCreate ?? vi.fn() },
    chat: { findUnique: mocks.chatFindUnique ?? vi.fn().mockResolvedValue({ participants: [] }) },
  } as any)
  app.decorateRequest('userId', '')
  app.decorate('authenticate', async (request: any) => { request.userId = 'user-1' })
  await app.register(chatsRoutes, { prefix: '/chats' })
  return app
}

describe('POST /chats/:id/messages — referência de resposta', () => {
  it('persiste replyToId, replyToSenderName e replyToExcerpt', async () => {
    const messageCreate = vi.fn().mockResolvedValue({
      id: 'm2', content: 'oi', chatId: 'chat-1', senderId: 'user-1',
      replyToId: 'm1', replyToSenderName: 'Ana', replyToExcerpt: 'mensagem original',
      sender: { id: 'user-1', name: 'você' },
    })
    const app = await buildApp({ messageCreate })

    const response = await app.inject({
      method: 'POST',
      url: '/chats/chat-1/messages',
      payload: { content: 'oi', replyToId: 'm1', replyToSenderName: 'Ana', replyToExcerpt: 'mensagem original' },
    })

    expect(response.statusCode).toBe(200)
    expect(messageCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        replyToId: 'm1',
        replyToSenderName: 'Ana',
        replyToExcerpt: 'mensagem original',
      }),
    }))
    await app.close()
  })

  it('não quebra quando a mensagem não é resposta a nada', async () => {
    const messageCreate = vi.fn().mockResolvedValue({
      id: 'm1', content: 'oi', chatId: 'chat-1', senderId: 'user-1',
      sender: { id: 'user-1', name: 'você' },
    })
    const app = await buildApp({ messageCreate })

    const response = await app.inject({
      method: 'POST',
      url: '/chats/chat-1/messages',
      payload: { content: 'oi' },
    })

    expect(response.statusCode).toBe(200)
    await app.close()
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Rodar (dentro de `server/`): `npx vitest run src/routes/chats.test.ts`
Esperado: FAIL — o primeiro teste falha porque `data` enviado ao `create` não inclui os campos de reply (rota ainda não os aceita/persiste)

- [ ] **Step 3: Implementar — aceitar e persistir os campos**

Em `sendMessageSchema` (linha ~5):
```ts
const sendMessageSchema = z.object({
  content: z.string().optional().default(''),
  sharedPostId: z.string().optional(),
  sharedPostAuthor: z.string().optional(),
  sharedPostExcerpt: z.string().optional(),
  replyToId: z.string().optional(),
  replyToSenderName: z.string().optional(),
  replyToExcerpt: z.string().optional(),
  audioUrl: z.string().optional(),
  imageUrl: z.string().optional(),
})
```

No `POST /:id/messages` (linha ~99-110), dentro de `data`:
```ts
      data: {
        content: body.data.content ?? '',
        chatId: request.params.id,
        senderId: request.userId,
        sharedPostId: body.data.sharedPostId,
        sharedPostAuthor: body.data.sharedPostAuthor,
        sharedPostExcerpt: body.data.sharedPostExcerpt,
        replyToId: body.data.replyToId,
        replyToSenderName: body.data.replyToSenderName,
        replyToExcerpt: body.data.replyToExcerpt,
        audioUrl: body.data.audioUrl,
        imageUrl: body.data.imageUrl,
      } as Parameters<typeof fastify.prisma.message.create>[0]['data'],
```

(A busca de mensagens em `GET /:id/messages` já devolve o registro inteiro via Prisma — nenhuma mudança necessária ali, os campos novos já vêm junto.)

- [ ] **Step 4: Rodar os testes**

Rodar: `npx vitest run src/routes/chats.test.ts`
Esperado: PASS (2 testes)

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/chats.ts server/src/routes/chats.test.ts
git commit -m "feat(chat): accept and persist reply reference on send"
```

---

### Task 3: Frontend — tipo, envio sem texto colado, e bloco de citação

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/components/chat/ChatScreen.tsx`
- Modify: `src/components/chat/ChatScreen.test.tsx`

- [ ] **Step 1: Adicionar os campos ao tipo (`types.ts`, dentro de `ApiMessage`)**

```ts
export interface ApiMessage {
  id: string
  content: string
  chatId: string
  senderId: string
  sender: { id: string; name: string; archetypeKey?: string | null; avatarUrl?: string | null }
  sharedPostId?: string | null
  sharedPostAuthor?: string | null
  sharedPostExcerpt?: string | null
  replyToId?: string | null
  replyToSenderName?: string | null
  replyToExcerpt?: string | null
  audioUrl?: string | null
  imageUrl?: string | null
  read: boolean
  createdAt: string
}
```

- [ ] **Step 2: Escrever os testes que falham**

Seguir o padrão de `PLAIN_MESSAGES`/`SHARED_MESSAGES`/`makeWrapper` já em `ChatScreen.test.tsx`.

```ts
const REPLY_MESSAGES: ApiMessage[] = [
  {
    id: 'm1', content: 'Oi, tudo bem?', chatId: 'c1', senderId: 'other-1',
    sender: { id: 'other-1', name: 'Ana' }, read: true, createdAt: '2026-09-18T10:00:00.000Z',
  },
  {
    id: 'm2', content: 'Tudo sim!', chatId: 'c1', senderId: 'me',
    sender: { id: 'me', name: 'você' }, read: true, createdAt: '2026-09-18T10:01:00.000Z',
    replyToId: 'm1', replyToSenderName: 'Ana', replyToExcerpt: 'Oi, tudo bem?',
  },
]

it('mostra a citação com nome e trecho, sem colar no texto da mensagem', () => {
  render(<ChatScreen ... />, { wrapper: makeWrapper('c1', REPLY_MESSAGES) })
  expect(screen.getByText('Ana')).toBeInTheDocument()
  expect(screen.getByText('Oi, tudo bem?')).toBeInTheDocument()
  // o corpo da mensagem não deve conter o texto colado antigo
  expect(screen.queryByText(/↪ Ana:/)).not.toBeInTheDocument()
})

it('toca na citação e rola até a mensagem original', () => {
  render(<ChatScreen ... />, { wrapper: makeWrapper('c1', REPLY_MESSAGES) })
  const scrollIntoView = vi.fn()
  const original = document.getElementById('msg-m1')!
  original.scrollIntoView = scrollIntoView

  fireEvent.click(screen.getByRole('button', { name: /ver mensagem original/i }))
  expect(scrollIntoView).toHaveBeenCalled()
})

it('envia replyToId/replyToSenderName/replyToExcerpt em vez de colar texto', async () => {
  // marcar replyingTo (via setReplyingTo já testável indiretamente pelo swipe/menu existente,
  // ou expor um data-testid no botão de responder do menu de mensagem se necessário)
  // enviar e checar o payload de mockApiFetch/mockApiStream conforme padrão do arquivo
})
```

*(Adaptar os três exatamente ao setup de mocks de `apiFetch`/`useMutation` já usado no restante do arquivo — não reinventar o padrão de mock.)*

- [ ] **Step 3: Rodar e confirmar que falham**

Rodar: `npx vitest run src/components/chat/ChatScreen.test.tsx`
Esperado: FAIL nos três novos casos

- [ ] **Step 4: Implementar**

**4a. Parar de colar a citação no texto (`handleSend`, linha ~241-249):**
```ts
function handleSend() {
  if (!text.trim()) return;
  sendMutation.mutate({
    content: text.trim(),
    ...(replyingTo ? {
      replyToId: replyingTo.id,
      replyToSenderName: replyingTo.senderName,
      replyToExcerpt: replyingTo.excerpt,
    } : {}),
  });
  setText('');
  setReplyingTo(null);
}
```

Atualizar a assinatura de `sendMutation` (linha ~184) pra aceitar os três campos novos no payload, igual já faz com `sharedPostId` em outros pontos do arquivo (conferir se essa mutation é compartilhada com envio de foto/áudio/post — se for, só adicionar os campos como opcionais no tipo do payload).

**4b. `id` estável em cada mensagem pra poder rolar até ela (linha ~578):**
```tsx
<div
  key={msg.id}
  id={`msg-${msg.id}`}
  ...
```

**4c. Bloco de citação, renderizado antes do conteúdo da mensagem (dentro do bloco do balão, antes da linha ~607 que decide imagem/áudio/post/texto):**
```tsx
{msg.replyToId && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      document.getElementById(`msg-${msg.replyToId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }}
    aria-label="Ver mensagem original"
    className={`w-full text-left px-3 pt-2 pb-1.5 border-b ${isMe ? 'border-white/25' : 'border-mt-linen'}`}
  >
    <p className={`text-[10px] font-semibold ${isMe ? 'text-white/80' : 'text-mt-rose'}`}>
      {msg.replyToSenderName}
    </p>
    <p className={`text-[11px] truncate ${isMe ? 'text-white/70' : 'text-mt-muted'}`}>
      {msg.replyToExcerpt}
    </p>
  </button>
)}
```

Esse bloco entra **dentro** do container `rounded-2xl` da mensagem (linha ~602), antes do conteúdo condicional (imagem/áudio/post/texto) — assim aparece em cima de qualquer tipo de mensagem que seja resposta a algo, não só texto puro.

- [ ] **Step 5: Rodar os testes**

Rodar: `npx vitest run src/components/chat/ChatScreen.test.tsx`
Esperado: PASS

- [ ] **Step 6: Rodar a suíte completa**

Rodar (raiz do projeto): `npx vitest run`
Esperado: PASS, sem regressão (619+ antes desta task)

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/components/chat/ChatScreen.tsx src/components/chat/ChatScreen.test.tsx
git commit -m "fix(chat): show real reply reference and jump to original message (TIA-39)"
```

---

### Task 4: Migration em produção + verificação (manual, com o Tiago)

- [ ] Confirmar que o deploy automático rodou a migration nova (`npx prisma migrate deploy` já faz parte do pipeline existente — conferir em `deploy/` se é assim; se não for, rodar manualmente via SSH)
- [ ] No app: marcar uma mensagem antiga pra responder, mandar a resposta, conferir que a citação mostra nome + trecho corretos (não texto colado)
- [ ] Tocar na citação e confirmar que rola até a mensagem original
- [ ] Confirmar que mensagens antigas (enviadas antes da mudança, com o texto colado do jeito velho) continuam aparecendo normalmente — são só texto puro agora, sem bloco de citação, o que é esperado
