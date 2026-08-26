# Sara — Chat de Texto com OpenAI (Streaming SSE)

**Data:** 2026-08-26  
**Status:** Aprovado  
**Escopo:** Chat de texto da Sara com streaming real via OpenAI, injeção de contexto da usuária no ElevenLabs, renomear "MãeIA" → "Sara" no frontend

---

## Contexto

A tela MaeIAScreen hoje tem dois canais:
- **Voz**: ElevenLabs Convai (funcional)
- **Texto**: resposta estática ("conecte-se por voz") — substituir por IA real

O plano original era usar Gemini, mas a conta Google não liberou API key ainda. Usaremos OpenAI (`OPENAI_API_KEY` já no `.env`) com modelo equivalente. Quando Gemini estiver disponível, a troca é de uma linha.

---

## Arquitetura

Dois canais independentes, mesmo gateway autenticado:

```
Texto:  [input] → POST /mae-ia/chat (SSE) → OpenAI gpt-4o → tokens → bolha animada
Voz:    [telefone] → POST /mae-ia/token → ElevenLabs (+ context_override) → Convai
```

Nomes internos (rotas, variáveis, testes) permanecem `mae-ia`. "Sara" é label de UI exclusivamente.

---

## Backend

### Dependência nova
```
openai  (npm install openai)
```
Usar `OPENAI_API_KEY` do `.env` (já existe).

### Endpoint novo: `POST /mae-ia/chat`

**Auth:** `fastify.authenticate` (igual ao `/token`)  
**Rate limit:** 20 req/min por usuária  
**Body:**
```ts
{ messages: { role: 'user' | 'assistant'; content: string }[] }
```
Histórico da sessão enviado pelo frontend — não persistido no banco.

**Response:** `text/event-stream`
```
data: {"text":"Olá"}\n\n
data: {"text":", eu"}\n\n
data: [DONE]\n\n
data: {"error":"mensagem"}\n\n   ← em caso de falha
```

**Fluxo interno:**
1. Autentica e extrai `userId`
2. Busca usuária no banco: `name`, `babyName`, `babyAgeInDays`, `pregnancyStage`, `archetypeKey`, `mood`, `goal`, `concern`
3. Monta system prompt (ver seção abaixo)
4. Chama `openai.chat.completions.create({ model: 'gpt-4o', stream: true, messages: [system, ...body.messages] })`
5. Para cada chunk: `reply.raw.write('data: ' + JSON.stringify({ text: delta }) + '\n\n')`
6. Finaliza com `reply.raw.write('data: [DONE]\n\n')` e `reply.raw.end()`
7. Em erro: envia `data: {"error":"..."}` e fecha

Headers da response:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no   ← necessário para nginx não bufferizar o stream
```

### Modificação: `POST /mae-ia/token` (ElevenLabs)

Buscar usuária no banco (mesmos campos do chat) e adicionar `conversation_config_override` ao request ElevenLabs:

```ts
body: JSON.stringify({
  conversation_config_override: {
    agent: {
      prompt: {
        prompt: buildSaraContextBlock(user)  // só o bloco de contexto, não a persona base (que já está no painel ElevenLabs)
      }
    }
  }
})
```

---

## System Prompt

Três blocos concatenados no backend a cada request de chat:

### Bloco 1 — Persona (estático)
```
Você é Sara, assistente de saúde materno-infantil do Mother's Team.
Tom: caloroso, direto, português brasileiro informal mas sem gírias forçadas.
Acolhe antes de informar — valida o que a mãe sente antes de dar a resposta prática.
Respostas curtas por padrão (3-5 frases). Se pedirem mais detalhe, expanda.
Nunca use listas com bullet points — escreva em texto corrido, como uma conversa.
```

### Bloco 2 — Regras (estático)
```
Nunca diagnostica nem prescreve.
Em dúvidas médicas específicas, orienta a consultar pediatra ou obstetra.
Em sinais de crise (depressão pós-parto, pensamentos negativos, automutilação):
acolhe com cuidado e indica o CVV (188) ou profissional de saúde mental — sem dramatizar.
Não faz promessas de resultado ("isso vai curar", "certamente vai funcionar").
```

### Bloco 3 — Contexto da usuária (dinâmico)
```
Contexto da mãe nesta sessão:
Nome: {name} | Bebê: {babyName ?? 'não informado'}, {babyAgeInDays ?? '?'} dias
Fase: {pregnancyStage} | Arquétipo: {archetypeKey ?? 'não definido'}
Humor hoje: {moodLabel} | Objetivo: {goalLabel} | Preocupação: {concernLabel}
```

Labels de `mood`/`goal`/`concern` são mapeados de char → texto legível no backend (ex: `'A'` → `'Ansiedade'`). Os mapeamentos seguem os mesmos valores do cadastro de 5 passos.

O Bloco 3 também é o que vai no `conversation_config_override` do ElevenLabs (voz recebe o mesmo contexto).

---

## Frontend

### Renomear MãeIA → Sara (UI only)

Arquivos a atualizar em `MaeIAScreen.tsx`:
- Cabeçalho `<h1>`: `MãeIA` → `Sara`
- Mensagem inicial (id `'0'`): substituir "Sou a MãeIA" → "Sou a Sara"
- Status label `idle`: `'Toque em Conectar para falar com a MãeIA'` → `'Toque em Conectar para falar com a Sara'`
- `QUICK_CHIPS`: manter conteúdo, não há "MãeIA" nos chips

Demais referências internas (funções, tipos, imports) permanecem `maeIA`/`MaeIA`.

### Streaming no `sendText`

Substituir o bloco `if (!isConnected)` com setTimeout estático por chamada real:

1. Adiciona bolha do usuário normalmente
2. Cria bolha da Sara vazia com `isStreaming: true` no estado
3. Chama `fetch('/api/mae-ia/chat', { method: 'POST', body: JSON.stringify({ messages: history }) })`
4. Lê `response.body` via `ReadableStream` + `TextDecoder`
5. Para cada linha `data: {...}`: extrai `text` e faz append à bolha atual
6. Ao receber `[DONE]`: marca `isStreaming: false`
7. Em erro de rede ou `data: {"error":...}`: exibe mensagem de fallback

### Indicador "digitando"

Enquanto `isStreaming === true` e a bolha ainda está vazia (nenhum token chegou), exibir três pontinhos animados dentro da bolha da Sara. Quando o primeiro token chega, os pontinhos somem e o texto começa a aparecer.

### Histórico de sessão

`messages` (já existente como `useState<Message[]>`) serve de histórico enviado ao backend. Formatar antes de enviar: `{ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.text }`. A mensagem inicial (id `'0'`) não entra no histórico enviado à API — é só UI de boas-vindas.

Limite de contexto: enviar no máximo as últimas **20 mensagens** para não explodir tokens.

---

## Testes

- `MaeIAScreen.test.tsx`: mock do `fetch` retornando stream SSE; verificar que bolha aparece e tokens são appendados
- `mae-ia.ts` (backend): teste unitário do endpoint `/chat` com mock do OpenAI SDK; verificar headers SSE, rate limit, e que user context é buscado do banco
- Rate limit do `/token` já testado — verificar que `/chat` tem rate limit independente

---

## O que não está no escopo

- Persistência do histórico no banco (wave futura)
- RAG / base de conhecimento customizada (wave futura)
- Troca para Gemini quando API key estiver disponível (1 linha: `model` + provider)
- Atualizar system prompt base no painel ElevenLabs (manual, fora do código)
