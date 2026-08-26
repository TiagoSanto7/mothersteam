# Sara Text Chat (OpenAI Streaming SSE) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o fallback estático do chat de texto da Sara por respostas reais via OpenAI (streaming SSE), injetar contexto da usuária no ElevenLabs para consistência de voz, e renomear "MãeIA" → "Sara" nos labels do frontend.

**Architecture:** Backend expõe `POST /mae-ia/chat` com streaming SSE (OpenAI gpt-4o). Um utilitário `sara-context.ts` centraliza os mapeamentos de labels e a montagem do system prompt. O endpoint `/mae-ia/token` é atualizado para injetar o mesmo contexto da usuária no ElevenLabs via `conversation_config_override`. Frontend usa `fetch` + `ReadableStream` para consumir o stream e atualizar a bolha da Sara token a token.

**Tech Stack:** Fastify (backend SSE), OpenAI SDK (`openai` npm), `reply.raw.write()` para stream, `fetch` + `ReadableStream` no frontend, Vitest + `fastify.inject()` para testes do backend.

---

## Mapa de arquivos

| Arquivo | Ação |
|---------|------|
| `server/src/utils/sara-context.ts` | Criar — label maps + `buildSaraSystemPrompt` + `buildSaraContextBlock` |
| `server/src/routes/mae-ia.ts` | Modificar — adicionar `POST /chat` + atualizar `POST /token` |
| `server/src/routes/mae-ia.test.ts` | Criar — testes do `/chat` e do `/token` atualizado |
| `src/lib/api.ts` | Modificar — adicionar `apiStream` helper |
| `src/components/maeIA/MaeIAScreen.tsx` | Modificar — rename labels + streaming sendText |

---

## Task 1: Instalar OpenAI SDK no servidor

**Files:**
- Modify: `server/package.json` (via npm)

- [ ] **Step 1: Instalar dependência**

```bash
cd server && npm install openai
```

- [ ] **Step 2: Verificar que aparece no package.json**

```bash
grep '"openai"' server/package.json
```

Expected: linha com `"openai": "^4.x.x"` (qualquer versão 4.x).

- [ ] **Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore(server): add openai sdk"
```

---

## Task 2: Criar `server/src/utils/sara-context.ts`

Centraliza os mapeamentos de char → label e a montagem do system prompt. Usado tanto pelo `/chat` quanto pelo `/token`.

**Files:**
- Create: `server/src/utils/sara-context.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// server/src/utils/sara-context.ts

const MOOD_LABELS: Record<string, string> = {
  A: 'Confiante e animada',
  B: 'Cansada mas lidando',
  C: 'Ansiosa, com medos',
  D: 'Sobrecarregada, exausta',
}

const SUPPORT_LABELS: Record<string, string> = {
  A: 'Tem ajuda sempre que precisa',
  B: 'Tem ajuda em momentos específicos',
  C: 'Cuida de quase tudo sozinha',
}

const GOAL_LABELS: Record<string, string> = {
  A: 'Entender o desenvolvimento do bebê',
  B: 'Cuidar da saúde física',
  C: 'Melhorar o sono',
  D: 'Organizar a rotina',
}

const CONCERN_LABELS: Record<string, string> = {
  A: 'Autocuidado e identidade',
  B: 'Choro, cólicas e sono do bebê',
  C: 'Amamentação e alimentação',
  D: 'Corpo, hormônios e autoestima',
}

interface UserContext {
  name: string
  babyName: string | null
  babyAgeInDays: number | null
  pregnancyStage: string
  archetypeKey: string | null
  mood: string | null
  supportNetwork: string | null
  goal: string | null
  concern: string | null
}

export function buildSaraContextBlock(user: UserContext): string {
  const babyInfo = user.babyName
    ? `${user.babyName}, ${user.babyAgeInDays ?? '?'} dias`
    : `não informado`

  return [
    `Contexto da mãe nesta sessão:`,
    `Nome: ${user.name} | Bebê: ${babyInfo}`,
    `Fase: ${user.pregnancyStage} | Arquétipo: ${user.archetypeKey ?? 'não definido'}`,
    `Humor hoje: ${user.mood ? (MOOD_LABELS[user.mood] ?? user.mood) : 'não informado'}`,
    `Rede de apoio: ${user.supportNetwork ? (SUPPORT_LABELS[user.supportNetwork] ?? user.supportNetwork) : 'não informado'}`,
    `Objetivo: ${user.goal ? (GOAL_LABELS[user.goal] ?? user.goal) : 'não informado'}`,
    `Preocupação principal: ${user.concern ? (CONCERN_LABELS[user.concern] ?? user.concern) : 'não informado'}`,
  ].join('\n')
}

const SARA_PERSONA = `Você é Sara, assistente de saúde materno-infantil do Mother's Team.
Seu tom é caloroso, direto e em português brasileiro informal — mas sem gírias forçadas.
Você acolhe o que a mãe sente antes de dar a resposta prática.
Respostas curtas por padrão (3-5 frases). Se pedirem mais detalhe, expanda.
Escreva em texto corrido, como uma conversa — nunca use listas com marcadores.`

const SARA_RULES = `Você nunca diagnostica nem prescreve medicamentos.
Em dúvidas médicas específicas, oriente a consultar pediatra ou obstetra.
Em sinais de crise (depressão pós-parto, pensamentos negativos, automutilação): acolha com cuidado e indique o CVV (188) ou um profissional de saúde mental — sem dramatizar.
Não faça promessas de resultado como "isso vai curar" ou "certamente vai funcionar".`

export function buildSaraSystemPrompt(user: UserContext): string {
  return [SARA_PERSONA, SARA_RULES, buildSaraContextBlock(user)].join('\n\n')
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/utils/sara-context.ts
git commit -m "feat(server): add sara-context util — label maps + system prompt builder"
```

---

## Task 3: Adicionar `POST /mae-ia/chat` (SSE) + testes

**Files:**
- Create: `server/src/routes/mae-ia.test.ts`
- Modify: `server/src/routes/mae-ia.ts`

- [ ] **Step 1: Criar arquivo de teste**

```typescript
// server/src/routes/mae-ia.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { authPlugin } from '../plugins/auth'
import { prismaPlugin } from '../plugins/prisma'
import maeIARoutes from './mae-ia'

// Mock do OpenAI SDK
vi.mock('openai', () => {
  const mockStream = {
    [Symbol.asyncIterator]: async function* () {
      yield { choices: [{ delta: { content: 'Olá' } }] }
      yield { choices: [{ delta: { content: ', tudo bem?' } }] }
      yield { choices: [{ delta: { content: null } }] }
    },
  }
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue(mockStream),
        },
      },
    })),
  }
})

// Mock do prisma plugin
vi.mock('../plugins/prisma', () => ({
  prismaPlugin: async (fastify: any) => {
    fastify.decorate('prisma', {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-1',
          name: 'Ana',
          babyName: 'Theo',
          babyAgeInDays: 30,
          pregnancyStage: 'pos-parto',
          archetypeKey: 'mãe-guerreira',
          mood: 'A',
          supportNetwork: 'B',
          goal: 'C',
          concern: 'B',
        }),
      },
    })
  },
}))

// Mock do auth plugin
vi.mock('../plugins/auth', () => ({
  authPlugin: async (fastify: any) => {
    fastify.decorate('authenticate', async (request: any) => {
      request.userId = 'user-1'
    })
  },
}))

async function buildApp() {
  const app = Fastify()
  await app.register(prismaPlugin)
  await app.register(authPlugin)
  await app.register(maeIARoutes, { prefix: '/mae-ia' })
  return app
}

describe('POST /mae-ia/chat', () => {
  it('retorna SSE com tokens da OpenAI e termina com [DONE]', async () => {
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/mae-ia/chat',
      headers: { Authorization: 'Bearer fake-token' },
      payload: { messages: [{ role: 'user', content: 'Olá' }] },
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/event-stream/)
    expect(res.body).toContain('data: {"text":"Olá"}')
    expect(res.body).toContain('data: {"text":", tudo bem?"}')
    expect(res.body).toContain('data: [DONE]')
  })

  it('retorna 400 se messages estiver ausente', async () => {
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/mae-ia/chat',
      headers: { Authorization: 'Bearer fake-token' },
      payload: {},
    })

    expect(res.statusCode).toBe(400)
  })

  it('ignora chunks com delta.content null', async () => {
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/mae-ia/chat',
      headers: { Authorization: 'Bearer fake-token' },
      payload: { messages: [{ role: 'user', content: 'Oi' }] },
    })

    // Não deve ter data com null como conteúdo
    expect(res.body).not.toContain('"text":null')
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
cd server && npx vitest run src/routes/mae-ia.test.ts
```

Expected: FAIL — `/chat` route not found (404).

- [ ] **Step 3: Implementar `POST /mae-ia/chat` no `mae-ia.ts`**

Substituir o conteúdo completo do arquivo:

```typescript
// server/src/routes/mae-ia.ts
import type { FastifyInstance } from 'fastify'
import OpenAI from 'openai'
import { buildSaraSystemPrompt, buildSaraContextBlock } from '../utils/sara-context'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default async function maeIARoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // ── POST /mae-ia/chat — chat de texto com streaming SSE ──────────────────
  fastify.post<{ Body: { messages?: ChatMessage[] } }>(
    '/chat',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const messages = request.body?.messages
      if (!Array.isArray(messages) || messages.length === 0) {
        return reply.status(400).send({ error: 'messages required' })
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id: request.userId },
        select: {
          name: true,
          babyName: true,
          babyAgeInDays: true,
          pregnancyStage: true,
          archetypeKey: true,
          mood: true,
          supportNetwork: true,
          goal: true,
          concern: true,
        },
      })

      if (!user) {
        return reply.status(404).send({ error: 'Usuária não encontrada' })
      }

      const systemPrompt = buildSaraSystemPrompt(user)

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      })

      try {
        const stream = await openai.chat.completions.create({
          model: 'gpt-4o',
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-20),
          ],
        })

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content
          if (text) {
            reply.raw.write(`data: ${JSON.stringify({ text })}\n\n`)
          }
        }
      } catch (err) {
        fastify.log.error(`OpenAI stream error: ${err}`)
        reply.raw.write(`data: ${JSON.stringify({ error: 'Erro ao conectar com a Sara. Tente novamente.' })}\n\n`)
      }

      reply.raw.write('data: [DONE]\n\n')
      reply.raw.end()
    }
  )

  // ── POST /mae-ia/token — ElevenLabs signed URL (voz) ────────────────────
  //
  // Usa POST /v1/convai/conversations com conversation_config_override para
  // injetar contexto da usuária na mesma chamada que gera o signed_url.
  // Se a chamada falhar, faz fallback para o GET original (sem contexto).
  fastify.post('/token', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
      return reply.status(503).send({ error: 'MãeIA não configurada' })
    }

    const user = await fastify.prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        name: true,
        babyName: true,
        babyAgeInDays: true,
        pregnancyStage: true,
        archetypeKey: true,
        mood: true,
        supportNetwork: true,
        goal: true,
        concern: true,
      },
    })

    const contextBlock = user ? buildSaraContextBlock(user) : null

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    // Tenta criar conversa com context_override (retorna signed_url diretamente)
    if (contextBlock) {
      try {
        const res = await fetch(
          'https://api.elevenlabs.io/v1/convai/conversations',
          {
            method: 'POST',
            headers: {
              'xi-api-key': ELEVENLABS_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              agent_id: ELEVENLABS_AGENT_ID,
              conversation_config_override: {
                agent: { prompt: { prompt: contextBlock } },
              },
            }),
            signal: controller.signal,
          }
        )
        clearTimeout(timeout)
        if (res.ok) {
          const data = (await res.json()) as { signed_url?: string }
          if (data.signed_url) {
            return reply.send({ signedUrl: data.signed_url })
          }
        }
        fastify.log.warn(`ElevenLabs conversations endpoint failed: ${res.status} — falling back to get_signed_url`)
      } catch (err) {
        clearTimeout(timeout)
        fastify.log.warn(`ElevenLabs conversations fetch error: ${err} — falling back to get_signed_url`)
      }
    }

    // Fallback: GET sem context_override (comportamento original)
    const controller2 = new AbortController()
    const timeout2 = setTimeout(() => controller2.abort(), 10_000)

    let res: Response
    try {
      res = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${ELEVENLABS_AGENT_ID}`,
        { headers: { 'xi-api-key': ELEVENLABS_API_KEY }, signal: controller2.signal }
      )
    } catch (err) {
      fastify.log.error(`ElevenLabs fetch error: ${err}`)
      return reply.status(502).send({ error: 'Erro ao iniciar MãeIA' })
    } finally {
      clearTimeout(timeout2)
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      fastify.log.error(`ElevenLabs error: ${res.status} ${body}`)
      return reply.status(502).send({ error: 'Erro ao iniciar MãeIA' })
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      fastify.log.error(`ElevenLabs non-JSON response: ${contentType}`)
      return reply.status(502).send({ error: 'Erro ao iniciar MãeIA' })
    }

    const { signed_url } = (await res.json()) as { signed_url: string }
    reply.send({ signedUrl: signed_url })
  })
}
```

- [ ] **Step 4: Rodar os testes**

```bash
cd server && npx vitest run src/routes/mae-ia.test.ts
```

Expected: 3 testes PASS.

- [ ] **Step 5: Rodar todos os testes do servidor**

```bash
cd server && npm test
```

Expected: todos passando (sem regressões).

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/mae-ia.ts server/src/routes/mae-ia.test.ts
git commit -m "feat(server): POST /mae-ia/chat SSE stream via OpenAI + ElevenLabs context injection"
```

---

## Task 4: Adicionar `apiStream` helper no frontend

**Files:**
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Adicionar `apiStream` ao final de `src/lib/api.ts`**

```typescript
/**
 * Faz POST e consome a resposta como SSE stream.
 * Chama onChunk para cada token recebido, onDone quando termina, onError em falha.
 */
export async function apiStream(
  path: string,
  body: unknown,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
): Promise<void> {
  const token = useAppStore.getState().accessToken
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
    })
  } catch {
    onError('Sem conexão. Verifique sua internet e tente novamente.')
    return
  }

  if (!res.ok || !res.body) {
    onError('Erro ao conectar com a Sara. Tente novamente.')
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const lines = decoder.decode(value, { stream: true }).split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') {
          onDone()
          return
        }
        try {
          const parsed = JSON.parse(data) as { text?: string; error?: string }
          if (parsed.error) {
            onError(parsed.error)
            return
          }
          if (parsed.text) onChunk(parsed.text)
        } catch {
          // chunk de parsing inválido — ignorar
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  onDone()
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat(frontend): add apiStream helper for SSE consumption"
```

---

## Task 5: Renomear "MãeIA" → "Sara" nos labels do frontend + streaming

**Files:**
- Modify: `src/components/maeIA/MaeIAScreen.tsx`

- [ ] **Step 1: Substituir o conteúdo completo de `MaeIAScreen.tsx`**

```typescript
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, ChevronLeft, Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { Conversation } from '@elevenlabs/client';
import { apiFetch, apiStream } from '../../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isNew?: boolean;
  isStreaming?: boolean;
}

type ConvStatus = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

const QUICK_CHIPS = [
  'Dicas para cólica do bebê',
  'Como lidar com o cansaço?',
  'Amamentação: pega correta',
  'Quando voltar à academia?',
];

const STATUS_LABELS: Record<ConvStatus, string> = {
  idle: 'Toque em Conectar para falar com a Sara',
  connecting: 'Conectando...',
  listening: 'Ouvindo você...',
  processing: 'Processando...',
  speaking: 'Sara respondendo...',
  error: 'Erro na conexão',
};

const STATUS_COLORS: Record<ConvStatus, string> = {
  idle: 'text-mt-muted',
  connecting: 'text-mt-rose-dark',
  listening: 'text-green-600',
  processing: 'text-mt-rose',
  speaking: 'text-mt-rose-deep',
  error: 'text-red-500',
};

function AssistantMessage({ text, isNew, isStreaming }: { text: string; isNew?: boolean; isStreaming?: boolean }) {
  if (isStreaming) {
    if (!text) {
      // Pontinhos enquanto aguarda primeiro token
      return (
        <span className="flex gap-1 items-center py-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-mt-muted"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
            />
          ))}
        </span>
      );
    }
    return <span>{text}</span>;
  }

  const sentences = text.split(/[.!?]+\s+/).filter(Boolean);
  if (!isNew || sentences.length <= 1) {
    return <span>{text}</span>;
  }
  return (
    <>
      {sentences.map((sentence, i) => (
        <motion.span
          key={i}
          style={{ display: 'block' }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15, duration: 0.3, ease: 'easeOut' }}
        >
          {sentence}{i < sentences.length - 1 ? '.' : ''}
        </motion.span>
      ))}
    </>
  );
}

interface MaeIAScreenProps {
  onBack?: () => void;
}

export function MaeIAScreen({ onBack }: MaeIAScreenProps = {}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      text: 'Olá! Sou a Sara, sua assistente de saúde materno-infantil. Conecte-se para conversar por voz, ou digite sua pergunta abaixo. 💜',
    },
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ConvStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isSendingText, setIsSendingText] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const convRef = useRef<Conversation | null>(null);
  const messagesRef = useRef<Message[]>(messages);
  const isConnected = status !== 'idle' && status !== 'error' && status !== 'connecting';

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => { convRef.current?.endSession().catch(() => {}); };
  }, []);

  const addMessage = useCallback((role: 'user' | 'assistant', text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role, text, isNew: true },
    ]);
  }, []);

  async function connectVoice() {
    if (convRef.current) return;
    setStatus('connecting');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia unavailable in this WebView');
      }
      const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
      probe.getTracks().forEach((t) => t.stop());
    } catch (permErr) {
      console.error('[Sara] microfone bloqueado:', permErr);
      convRef.current = null;
      setStatus('error');
      addMessage(
        'assistant',
        'Não consegui acessar o microfone. Abra as configurações do sistema, dê permissão de microfone pro Mother\'s Team e tente de novo.',
      );
      setTimeout(() => setStatus('idle'), 5000);
      return;
    }

    try {
      const { signedUrl } = await apiFetch<{ signedUrl: string }>('/mae-ia/token', { method: 'POST' });

      const conv = await Conversation.startSession({
        signedUrl,
        onConnect: () => setStatus('listening'),
        onDisconnect: () => {
          convRef.current = null;
          setStatus('idle');
        },
        onError: (error) => {
          console.error('[Sara] erro de sessão:', error);
          convRef.current = null;
          setStatus('error');
          setTimeout(() => setStatus('idle'), 3000);
        },
        onModeChange: ({ mode }) => {
          if (!convRef.current) return;
          if (mode === 'listening') setStatus('listening');
          else if (mode === 'speaking') setStatus('speaking');
        },
        onMessage: ({ message, source }) => {
          if (source === 'user') addMessage('user', message);
          else if (source === 'ai') addMessage('assistant', message);
        },
      });

      convRef.current = conv;
    } catch (err) {
      console.error('[Sara] falha ao iniciar sessão:', err);
      convRef.current = null;
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      addMessage(
        'assistant',
        'Não foi possível conectar à Sara. Verifique sua conexão e tente novamente.',
      );
    }
  }

  async function disconnectVoice() {
    await convRef.current?.endSession().catch(() => {});
    convRef.current = null;
    setStatus('idle');
  }

  async function toggleMute() {
    if (!convRef.current) return;
    const newMuted = !isMuted;
    convRef.current.setMicMuted(newMuted);
    setIsMuted(newMuted);
  }

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSendingText) return;

    addMessage('user', trimmed);
    setInput('');
    setIsSendingText(true);

    const streamingId = `${Date.now()}-sara`;
    setMessages((prev) => [
      ...prev,
      { id: streamingId, role: 'assistant', text: '', isStreaming: true },
    ]);

    // Histórico: exclui mensagem de boas-vindas (id='0'), limita a 20 mensagens
    const history = [
      ...messagesRef.current
        .filter((m) => m.id !== '0')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.text })),
      { role: 'user' as const, content: trimmed },
    ].slice(-20);

    await apiStream(
      '/mae-ia/chat',
      { messages: history },
      (chunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId ? { ...m, text: m.text + chunk } : m
          )
        );
      },
      () => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId ? { ...m, isStreaming: false, isNew: false } : m
          )
        );
        setIsSendingText(false);
      },
      (errMsg) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId ? { ...m, text: errMsg, isStreaming: false } : m
          )
        );
        setIsSendingText(false);
      }
    );
  }

  const pulsing = status === 'listening' || status === 'speaking';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="relative px-4 pt-4 pb-3 border-b border-mt-linen/60 bg-mt-cream/80 backdrop-blur-sm">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Voltar"
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center z-10"
          >
            <ChevronLeft size={18} className="text-mt-charcoal" />
          </button>
        )}
        <h1 className={`text-base font-semibold font-serif text-mt-charcoal${onBack ? ' pl-10' : ''}`}>Sara</h1>
        <p className={`text-xs mt-0.5 ${STATUS_COLORS[status]}${onBack ? ' pl-10' : ''}`}>
          {STATUS_LABELS[status]}
        </p>
      </div>

      {/* Quick chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 bg-mt-cream flex-shrink-0">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => sendText(chip)}
            aria-label={chip}
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-mt-linen text-mt-rose text-xs font-medium whitespace-nowrap"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3 flex flex-col gap-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-mt-rose text-white rounded-br-sm'
                  : `bg-white text-mt-charcoal shadow-sm rounded-bl-sm ${msg.id === '0' ? 'font-serif' : ''}`
              }`}
            >
              {msg.role === 'assistant' ? (
                <AssistantMessage text={msg.text} isNew={msg.isNew} isStreaming={msg.isStreaming} />
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Voice status pulse */}
      {pulsing && (
        <div className="flex items-center justify-center py-3 flex-shrink-0">
          <div className="relative flex items-center justify-center">
            <motion.span
              aria-hidden="true"
              animate={{ scale: [1, 1.9, 1], opacity: [0.35, 0, 0.35] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeOut' }}
              className={`absolute w-6 h-6 rounded-full ${status === 'listening' ? 'bg-green-500' : 'bg-mt-rose'}`}
            />
            <motion.span
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className={`relative w-4 h-4 rounded-full ${status === 'listening' ? 'bg-green-500' : 'bg-mt-rose'}`}
            />
          </div>
          <span className={`text-xs ml-3 font-medium ${STATUS_COLORS[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 pb-4 pt-2 bg-mt-linen/80 border-t border-mt-linen/60 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={isConnected ? disconnectVoice : connectVoice}
            disabled={status === 'connecting'}
            aria-label={isConnected ? 'Encerrar conversa por voz' : 'Iniciar conversa por voz'}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
              isConnected ? 'bg-red-100 text-red-500' : 'bg-mt-rose text-white'
            } disabled:opacity-50`}
          >
            {isConnected ? <PhoneOff size={16} /> : <Phone size={16} />}
          </button>

          {isConnected && (
            <button
              onClick={toggleMute}
              aria-label={isMuted ? 'Ativar microfone' : 'Silenciar microfone'}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                isMuted ? 'bg-red-100 text-red-500' : 'bg-white text-mt-muted'
              }`}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}

          <div className="flex-1 flex items-center gap-2 bg-white rounded-2xl px-3 py-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendText(input)}
              placeholder="Pergunte à Sara…"
              aria-label="Mensagem para a Sara"
              className="flex-1 bg-transparent text-sm text-mt-charcoal placeholder:text-mt-muted outline-none"
            />
            <motion.button
              onClick={() => sendText(input)}
              disabled={!input.trim() || isSendingText}
              aria-label="Enviar mensagem"
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-7 h-7 rounded-xl bg-mt-rose flex items-center justify-center disabled:opacity-40"
            >
              <Send size={13} className="text-white" strokeWidth={2} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rodar os testes do frontend**

```bash
npm test -- --run
```

Expected: todos os testes passando (MaeIAScreen não tinha testes, então sem regressões).

- [ ] **Step 3: Build de produção para checar erros de tipo**

```bash
npm run build
```

Expected: build sem erros de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/components/maeIA/MaeIAScreen.tsx src/lib/api.ts
git commit -m "feat(frontend): Sara streaming text chat + rename MãeIA→Sara nos labels"
```

---

## Task 6: Deploy

**Files:** nenhum (operação de deploy)

- [ ] **Step 1: Build frontend**

```bash
npm run build
```

- [ ] **Step 2: Copiar dist para VPS**

```bash
scp -P 443 -r dist/. root@2.25.137.78:/var/www/mothersteam/
```

- [ ] **Step 3: Copiar novo código do servidor e reiniciar**

```bash
scp -P 443 -r server/. root@2.25.137.78:/app/server/
ssh root@2.25.137.78 -p 443 "cd /app && docker compose restart api"
```

- [ ] **Step 4: Verificar health**

```bash
ssh root@2.25.137.78 -p 443 "curl -s http://localhost:3001/health"
```

Expected: `{"status":"ok"}`

- [ ] **Step 5: Sync Android**

```bash
npx cap sync android
```

- [ ] **Step 6: Commit de encerramento**

```bash
git add -A
git commit -m "chore: deploy Sara text chat OpenAI streaming"
```
