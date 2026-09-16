# Sara — Chat de Voz: Qualidade, Personalidade e Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir 3 problemas do chat de voz da Sara (TIA-8): tom formal/scriptado, áudio de baixa qualidade, e tags de direção de voz (`[Com carinho]` etc.) vazando no texto exibido.

**Architecture:** Um agente ElevenLabs **novo e dedicado** ao chat geral (duplicado do atual, que fica intocado pro onboarding), com prompt aberto, temperatura mais alta, sem o tool de encerramento do onboarding, e áudio de saída em qualidade maior. Backend aponta pro novo `agent_id` via env var na VPS. Frontend ganha um filtro puro de string pra esconder as tags de direção de voz antes de exibir.

**Tech Stack:** React/TypeScript (frontend), Vitest, MCP da ElevenLabs (`agents_duplicate`, `agents_update`, `agents_get`), SSH manual na VPS pra env var.

Spec: `docs/superpowers/specs/2026-09-16-sara-voice-chat-quality-design.md`

---

### Task 1: Filtrar tags de direção de voz no texto exibido

**Files:**
- Create: `src/components/maeIA/stripAudioTags.ts`
- Test: `src/components/maeIA/stripAudioTags.test.ts`
- Modify: `src/components/maeIA/MaeIAScreen.tsx:196-199`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/maeIA/stripAudioTags.test.ts
import { describe, it, expect } from 'vitest';
import { stripAudioTags } from './stripAudioTags';

describe('stripAudioTags', () => {
  it('removes a tag at the start of the text', () => {
    expect(stripAudioTags('[Com carinho]Oi, tudo bem?')).toBe('Oi, tudo bem?');
  });

  it('removes a tag in the middle without leaving double spaces', () => {
    expect(stripAudioTags('Oi [Com empatia] tudo bem?')).toBe('Oi tudo bem?');
  });

  it('removes multiple tags', () => {
    expect(stripAudioTags('[Com carinho] [Com confiança] Vamos lá!')).toBe('Vamos lá!');
  });

  it('leaves text without tags unchanged', () => {
    expect(stripAudioTags('Sem tags aqui.')).toBe('Sem tags aqui.');
  });

  it('trims leftover whitespace at the edges', () => {
    expect(stripAudioTags('[Com paciência]   Vai com calma.   ')).toBe('Vai com calma.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- stripAudioTags --run`
Expected: FAIL — `Cannot find module './stripAudioTags'` (o arquivo ainda não existe)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/components/maeIA/stripAudioTags.ts

// A ElevenLabs (modelo eleven_v3_conversational, expressive_mode) embute tags de
// direção de voz tipo "[Com carinho]" no texto da resposta pra guiar a entonação do TTS.
// O widget oficial deles filtra isso antes de exibir; nossa UI própria precisa fazer o mesmo.
export function stripAudioTags(text: string): string {
  return text
    .replace(/\[[^\]]*\]\s*/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- stripAudioTags --run`
Expected: PASS — 5 passed

- [ ] **Step 5: Wire into MaeIAScreen.tsx**

Read current state first — `src/components/maeIA/MaeIAScreen.tsx:196-199` today is:

```ts
        onMessage: ({ message, source }) => {
          if (source === 'user') addMessage('user', message);
          else if (source === 'ai') addMessage('assistant', message);
        },
```

Change to:

```ts
        onMessage: ({ message, source }) => {
          if (source === 'user') addMessage('user', message);
          else if (source === 'ai') addMessage('assistant', stripAudioTags(message));
        },
```

Add the import near the top of the file (after the `apiFetch, apiStream` import, `src/components/maeIA/MaeIAScreen.tsx:5`):

```ts
import { stripAudioTags } from './stripAudioTags';
```

- [ ] **Step 6: Run the full test suite to confirm no regressions**

Run: `npm run test -- --run`
Expected: all tests pass (baseline was 561 passed before this change; expect 566 now — 561 + 5 new)

- [ ] **Step 7: Commit**

```bash
git add src/components/maeIA/stripAudioTags.ts src/components/maeIA/stripAudioTags.test.ts src/components/maeIA/MaeIAScreen.tsx
git commit -m "fix(sara-voice): strip ElevenLabs audio-direction tags from displayed transcript

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Duplicar o agente ElevenLabs pra criar um agente dedicado ao chat geral

Sem código — chamadas de ferramenta MCP (`mcp__<elevenlabs-uuid>__agents_*`) contra a API real da ElevenLabs. Execute na ordem, conferindo a saída de cada uma antes de seguir.

- [ ] **Step 1: Duplicar o agente atual**

Chamar `agents_duplicate` com:
- `agent_id`: `agent_7801m0v3npg3efa9hs4qj0fpcg9k`
- `body.name`: `"Sara — Chat Geral"`
- `context`: `"Criar agente dedicado ao chat de voz geral, separado do onboarding, pra poder ajustar temperatura/prompt/tools sem afetar o fluxo de boas-vindas"`

Expected: resposta com um novo `agent_id` (anotar esse valor — vamos chamá-lo de `NOVO_AGENT_ID` no resto deste plano).

- [ ] **Step 2: Confirmar que a duplicata herdou a config esperada**

Chamar `agents_get` com `agent_id: NOVO_AGENT_ID`, `context: "Confirmar config herdada antes de ajustar"`.

Expected: mesma estrutura vista no agente original (voice_id `7eUAxNOneHxqfyRS77mW`, `tts.model_id: eleven_v3_conversational`, `agent.temperature: 0`, `agent.prompt.tool_ids: ["tool_1001m0vasfksfrxb30nzw5m9s0tv"]` — vamos mudar esses dois últimos no próximo task).

- [ ] **Step 3: Commit não se aplica** (mudança é só na ElevenLabs, não no repo) — seguir direto pro Task 3.

---

### Task 3: Ajustar prompt, temperatura e tools do agente novo

**Depende de:** Task 2 (precisa do `NOVO_AGENT_ID`).

- [ ] **Step 1: Atualizar prompt base e first_message via campos de topo**

Chamar `agents_update` com:
- `agent_id`: `NOVO_AGENT_ID`
- `prompt`:
```
Você é Sara, assistente de saúde materno-infantil do Mother's Team.
Seu tom é caloroso, direto e em português brasileiro informal — mas sem gírias forçadas.
Você acolhe o que a mãe sente antes de dar a resposta prática.
Respostas curtas por padrão (3-5 frases). Se pedirem mais detalhe, expanda.
Escreva em texto corrido, como uma conversa — nunca use listas com marcadores.

Você nunca diagnostica nem prescreve medicamentos.
Em dúvidas médicas específicas, oriente a consultar pediatra ou obstetra.
Em sinais de crise (depressão pós-parto, pensamentos negativos, automutilação): acolha com cuidado e indique o CVV (188) ou um profissional de saúde mental — sem dramatizar.
Não faça promessas de resultado como "isso vai curar" ou "certamente vai funcionar".
```
  (isso é `SARA_PERSONA + SARA_RULES` de `server/src/utils/sara-context.ts:58-67`, sem o bloco de contexto por usuária — esse continua vindo dinamicamente via `override` do `/mae-ia/token`, sem mudança nenhuma ali)
- `first_message`: `"Oi, tô aqui. Sobre o que você quer conversar hoje?"` (mesmo fallback já usado em `server/src/routes/mae-ia.ts:146`)
- `context`: `"Substituir o prompt de onboarding pelo prompt de chat geral aberto, e ajustar a mensagem inicial padrão"`

Expected: resposta 200 confirmando a atualização.

- [ ] **Step 2: Ajustar temperatura e remover o tool de encerramento do onboarding**

Chamar `agents_update` com:
- `agent_id`: `NOVO_AGENT_ID`
- `body`: `{"conversation_config": {"agent": {"prompt": {"temperature": 0.7, "tool_ids": []}}}}`
- `context`: `"Subir temperatura pra tirar o tom robótico/determinístico e remover o tool finalizar_boas_vindas, que só faz sentido no onboarding"`

Se a API rejeitar esse formato de `body`, chamar `agents_get` de novo pra conferir o shape exato aceito e ajustar — a estrutura deve espelhar o que `agents_get` retornou no Task 2 Step 2 (chave `conversation_config.agent.prompt.temperature` e `conversation_config.agent.prompt.tool_ids`).

Expected: resposta 200 confirmando a atualização.

- [ ] **Step 3: Verificar**

Chamar `agents_get` com `agent_id: NOVO_AGENT_ID`, `context: "Confirmar prompt/temperatura/tools atualizados"`.

Expected:
- `agent.prompt.prompt` contém o texto novo (sem "Máximo 3 turnos")
- `agent.prompt.temperature` = `0.7`
- `agent.prompt.tool_ids` = `[]`
- `agent.first_message` = `"Oi, tô aqui. Sobre o que você quer conversar hoje?"`

---

### Task 4: Subir a qualidade de áudio do agente novo

**Depende de:** Task 2.

- [ ] **Step 1: Atualizar formato de saída e latência**

Chamar `agents_update` com:
- `agent_id`: `NOVO_AGENT_ID`
- `body`: `{"conversation_config": {"tts": {"agent_output_audio_format": "pcm_24000", "optimize_streaming_latency": 1}}}`
- `context`: `"Aumentar qualidade do áudio de saída (16kHz -> 24kHz) e reduzir otimização agressiva de latência que sacrifica fidelidade"`

Se `pcm_24000` for rejeitado pela API (plano/modelo pode não suportar), tentar `pcm_22050` como fallback, e se esse também falhar, manter `pcm_16000` e anotar no Linear que a conta não suporta upgrade de taxa de amostragem.

- [ ] **Step 2: Verificar**

Chamar `agents_get` com `agent_id: NOVO_AGENT_ID`, `context: "Confirmar qualidade de áudio atualizada"`.

Expected: `tts.agent_output_audio_format` != `pcm_16000` (idealmente `pcm_24000`), `tts.optimize_streaming_latency` = `1`.

---

### Task 5: Apontar o backend pro agente novo (VPS)

**Depende de:** Tasks 2, 3, 4 completos e verificados.

**Files:** nenhum arquivo do repo — `ELEVENLABS_AGENT_ID` vive só em `deploy/.env.production` na VPS, não está no git.

- [ ] **Step 1: Confirmar o valor atual na VPS**

SSH na VPS dos donos (179.198.97.83, usuário root, senha em `VPS_PWD` no `.env` local) e rodar:

```bash
grep ELEVENLABS_AGENT_ID /opt/mothersteam/deploy/.env.production
```

Expected: mostra o `agent_id` antigo (`agent_7801m0v3npg3efa9hs4qj0fpcg9k`).

- [ ] **Step 2: Trocar pro novo agent_id**

```bash
sed -i "s/^ELEVENLABS_AGENT_ID=.*/ELEVENLABS_AGENT_ID=<NOVO_AGENT_ID>/" /opt/mothersteam/deploy/.env.production
grep ELEVENLABS_AGENT_ID /opt/mothersteam/deploy/.env.production
```

Expected: mostra o `NOVO_AGENT_ID` anotado no Task 2.

- [ ] **Step 3: Reiniciar o container da API pra pegar a nova env var**

```bash
cd /opt/mothersteam/deploy && docker compose -f docker-compose.prod.yml up -d api
docker ps --filter name=mothersteam-api --format '{{.Names}}\t{{.Status}}'
```

Expected: `mothersteam-api` com status `Up ... (healthy)` e uptime baixo (acabou de reiniciar).

- [ ] **Step 4: Smoke test do endpoint**

```bash
curl -s -o /dev/null -w 'HTTP %{http_code}\n' https://srv1944647.hstgr.cloud/health
```

Expected: `HTTP 200`

---

### Task 6: Verificação manual em device real

Sem código — checklist de teste manual (áudio/personalidade não são verificáveis por teste automatizado).

- [ ] **Step 1:** Abrir o chat de voz da Sara num device real (Android ou iOS, já testado com o fix do TIA-8), tocar em Conectar, conversar por pelo menos 4-5 turnos.

- [ ] **Step 2:** Confirmar que:
  - O texto exibido no chat não mostra mais tags tipo `[Com carinho]`
  - A Sara não tenta encerrar a conversa cedo nem repete uma "fala de encerramento" fixa
  - O áudio soa perceptivelmente mais nítido que antes (não mais "ligação telefônica")

- [ ] **Step 3:** Se tudo confirmado, comentar no [TIA-8](https://linear.app/tiago-santo/issue/TIA-8/bug-audio-da-maeia-inaudivel-no-chat-de-voz) com o resultado e o `NOVO_AGENT_ID` usado.

---

## Self-Review Notes

- **Spec coverage:** item 1 (formal/scriptado) → Tasks 2+3; item 2 (áudio) → Task 4; item 3 (tags) → Task 1. Env var na VPS → Task 5 (spec pediu isso explicitamente, dono confirmou que eu executo). Fora de escopo (Android connection bug, migração Gemini) não tem task aqui, como esperado.
- **Placeholders:** nenhum "TBD" — valores exatos escolhidos (temperatura 0.7, pcm_24000 com fallback definido, prompt completo copiado).
- **Dependências entre tasks:** Task 3 e 4 dependem do `NOVO_AGENT_ID` do Task 2; Task 5 depende de 2+3+4 estarem verificados antes de trocar produção.
