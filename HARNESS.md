# Mothers Team — Harness de Infraestrutura

Documento de referência para migração de conta, onboarding de novo dev,
e planejamento de integrações futuras. Mantenha atualizado.

---

## 1. Infraestrutura de Produção

### VPS (Backend API)

| Item | Valor |
|---|---|
| Provider | Hostinger |
| VPS ID | 1708006 (`srv1708006.hstgr.cloud`) |
| IP público | `2.25.137.78` |
| OS | Debian 13, 2 vCPU, 7.8 GB RAM, 99 GB disk |
| SSH | porta **443** (não 22) — sempre `-p 443` / `-P 443` |
| Domínio da API | `api.santoti.com` (Cloudflare proxy, SSL Flexible) |

```bash
# Acesso SSH
ssh -p 443 root@2.25.137.78
```

### Paths no VPS

| O quê | Caminho |
|---|---|
| Código-fonte (backend) | `/opt/mothersteam/` (branch `main`) |
| Docker Compose | `/opt/mothersteam/deploy/docker-compose.prod.yml` |
| Secrets de produção | `/opt/mothersteam/deploy/.env.production` |
| Frontend estático (nginx) | `/var/www/mothersteam/` (sem hífen — atenção!) |
| Uploads de usuário | volume Docker `mothersteam-uploads` |
| MySQL data | volume Docker `mothersteam-mysql-data` |

### Stack rodando

```
mothersteam-api    → Node 20-slim + tsx (source TypeScript direto, sem compilar)
mothersteam-mysql  → MySQL 8
nginx (host)       → proxy para 127.0.0.1:3001 + serve /var/www/mothersteam/ na :8080
Cloudflare         → SSL termination + DNS para api.santoti.com
```

### Comandos de operação

```bash
# Estado dos containers
cd /opt/mothersteam/deploy
docker compose -f docker-compose.prod.yml ps

# Logs do backend em tempo real
docker compose -f docker-compose.prod.yml logs -f api

# Deploy de nova versão do backend
cd /opt/mothersteam
git checkout main && git pull origin main
cd deploy
docker compose -f docker-compose.prod.yml up -d --build api

# Se o schema do banco mudou (Prisma)
docker compose -f docker-compose.prod.yml exec api npx prisma db push

# Health check
curl http://127.0.0.1:3001/health   # dentro do VPS
curl https://api.santoti.com/health  # público
```

### Deploy do frontend

```bash
# Local — build e upload
npm run build
scp -P 443 -r dist/. root@2.25.137.78:/var/www/mothersteam/
```

> ⚠️ Existe `/var/www/mothers-team/` (com hífen) no VPS — o nginx NÃO serve esse diretório.
> O path correto é `/var/www/mothersteam/` (sem hífen).

---

## 2. ElevenLabs — Serviços de Voz

O app usa **dois serviços** independentes do ElevenLabs, ambos na conta pessoal de Tiago.

### 2a. Sara TTS (Text-to-Speech — voz da Sara)

| Item | Valor |
|---|---|
| Uso | Narração da Sara no onboarding e nas rotinas |
| Endpoint ElevenLabs | `POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}` |
| Voice ID | `7eUAxNOneHxqfyRS77mW` (env: `ELEVENLABS_SARA_VOICE_ID`) |
| Modelo | `eleven_multilingual_v2` |
| Rota backend | `POST /sara/tts` |
| Rate limit backend | 30 req/min por usuário |
| Autenticação | `ELEVENLABS_API_KEY` (no `.env.production` do VPS) |

**Como funciona:**
```
Frontend → POST /sara/tts { text } → Backend → ElevenLabs TTS → stream audio/mpeg → Frontend
```
O backend faz proxy do áudio — o cliente nunca chama ElevenLabs diretamente.

**Onde está no código:**
- Backend: `server/src/routes/sara.ts`
- Frontend: `src/components/reception/hooks/useSaraNarration.ts`

### 2b. MãeIA — Conversational AI (voz interativa)

| Item | Valor |
|---|---|
| Uso | Chat de voz na tela MãeIA |
| Agent ID | `agent_4301kxv5d1q3fsf85z1xb1sz90nt` (env: `ELEVENLABS_AGENT_ID`) |
| Endpoint ElevenLabs | `GET /v1/convai/conversation/get_signed_url?agent_id=...` |
| Rota backend | `POST /mae-ia/token` |
| Rate limit backend | 5 req/min por usuário |
| SDK frontend | `@elevenlabs/client` — `Conversation.startSession({ signedUrl })` |

**Como funciona:**
```
Frontend → POST /mae-ia/token → Backend → ElevenLabs (busca signed URL) → retorna signedUrl
Frontend → Conversation.startSession({ signedUrl }) → WebSocket direto c/ ElevenLabs
```
Após obter o `signedUrl`, a conversa de voz acontece via WebSocket direto do frontend para ElevenLabs.
O backend só fornece o token temporário.

**Onde está no código:**
- Backend: `server/src/routes/mae-ia.ts`
- Frontend: `src/components/maeIA/MaeIAScreen.tsx`

**⚠️ LIMITAÇÃO ATUAL — Chat de texto da MãeIA:**
Quando o usuário digita uma pergunta no chat de texto (sem ativar a voz), o app retorna uma mensagem estática: *"Para obter uma resposta personalizada da MãeIA, conecte-se usando o botão de voz."*
**Não há integração de LLM para o chat de texto ainda.**
Veja seção 5 para o plano de integração com Gemini.

---

## 3. Banco de Dados (MySQL)

| Item | Valor |
|---|---|
| Engine | MySQL 8 (container Docker) |
| Nome do banco | `mothers_team` |
| ORM | Prisma v5 |
| Schema | `server/prisma/schema.prisma` |
| Migrations | Via `npx prisma db push` (não usa migrate, usa push direto) |

**Modelos principais:**
- `User`, `Profile` — usuários e perfis (13 arquétipos de mãe)
- `Product`, `Category` — produtos afiliados
- `OwnProduct` — produtos próprios da loja
- `CartItem`, `Order`, `OrderItem`, `Address` — e-commerce
- `WishlistItem`, `Review`, `ProductClick` — engajamento
- `Post`, `Comment`, `Community` — comunidade social
- `Routine`, `RoutineItem` — rotinas diárias
- `Notification`, `Chat`, `ChatMessage` — notificações e chat

---

## 4. Frontend / Mobile

| Item | Valor |
|---|---|
| Framework | React + Vite + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Estado | Zustand (persist via localStorage) |
| API calls | React Query (TanStack Query v5) |
| Mobile | Capacitor 8 (Android) |
| App ID | `com.santoti.mothersteam` |
| App Name | `Mother's Team` |
| Android scheme | `https` (webview usa `https://localhost`) |

**Variáveis de ambiente de build (`.env.local`):**

| Var | Valor | Descrição |
|---|---|---|
| `VITE_API_URL` | `https://api.santoti.com` | URL base da API em produção |
| `VITE_ELEVENLABS_AGENT_ID` | `agent_4301kxv5d1q3fsf85z1xb1sz90nt` | Agent ID da MãeIA |
| `VITE_MERCADO_PAGO_PUBLIC_KEY` | (ver .env.local) | Chave pública do Mercado Pago |

**Sequência de deploy Android:**
```bash
npm run build                  # build do frontend
npx cap sync android           # copia assets para android/
# Abrir Android Studio → Run (F10) para re-instalar no emulador/device
```

---

## 5. O que temos / O que NÃO temos

### ✅ Temos

- Auth completo (JWT access + refresh, httpOnly cookie web, localStorage Android)
- Perfis (13 arquétipos de mãe) com avatar e onboarding guiado pela Sara
- Comunidade social (posts, comentários, likes, menções, comunidades)
- Chat direto entre usuários
- Notificações push (SSE) + FCM preparado (comentado, aguarda google-services.json)
- Jornada (rotinas diárias)
- Shopping: produtos afiliados + produtos próprios + carrinho + checkout (Mercado Pago PIX/cartão) + pedidos
- MãeIA: chat de voz conversacional (ElevenLabs Conversational AI)
- Sara: narração TTS durante onboarding e rotinas
- Admin panel (CRUD de produtos, categorias, analytics, gestão de pedidos)

### ❌ NÃO temos (planejado)

- **Chat de texto da MãeIA com LLM** — atualmente retorna mensagem estática
- **FCM push notifications** — código pronto, comentado; precisa de `google-services.json` configurado
- **Ícones e splash screen customizados** — usando placeholders do Capacitor
- **iOS** — apenas Android implementado
- **Stripe / outros meios de pagamento** — só Mercado Pago
- **Notificações de rastreio de pedido** (tracking code é campo manual no admin)

---

## 6. Variáveis de Ambiente do VPS

Arquivo: `/opt/mothersteam/deploy/.env.production`

| Variável | O que é | Onde usar |
|---|---|---|
| `DATABASE_URL` | Connection string MySQL | Prisma |
| `JWT_SECRET` | Assina tokens de acesso | `authPlugin` |
| `REFRESH_TOKEN_SECRET` | Assina refresh tokens | `authPlugin` |
| `ELEVENLABS_API_KEY` | Chave da conta ElevenLabs | Sara TTS + MãeIA token |
| `ELEVENLABS_SARA_VOICE_ID` | `7eUAxNOneHxqfyRS77mW` | Sara TTS |
| `ELEVENLABS_AGENT_ID` | `agent_4301kxv5d1q3fsf85z1xb1sz90nt` | MãeIA Conversational |
| `MERCADO_PAGO_ACCESS_TOKEN` | Token privado do Mercado Pago | Checkout |
| `FRONTEND_URL` | Origins CORS permitidas | CORS middleware |
| `PORT` | Porta do servidor (3001) | Fastify listen |

---

## 7. Migração da Sara para Nova Conta ElevenLabs

**Situação atual:** A conta ElevenLabs usada é pessoal de Tiago (tiagoalvessoares17@gmail.com).

**O que precisa ser migrado:**

### 7a. Sara TTS (Voz)

A voz da Sara (`voiceId: 7eUAxNOneHxqfyRS77mW`) precisa ser:
1. Exportada/clonada para a nova conta (se for voz customizada/clonada)
2. **OU** recriada na nova conta com as mesmas configurações

> ⚠️ Se for voz clonada a partir de samples de áudio, os samples precisam ser re-enviados na nova conta.
> Se for voz do catálogo ElevenLabs (voz compartilhada), basta usar o mesmo `voice_id` com a API key nova.

**Passos:**
1. Verificar na conta atual se `7eUAxNOneHxqfyRS77mW` é voz clonada ou do catálogo
2. Na nova conta: clonar/recriar a voz → obter novo `voice_id`
3. Atualizar `ELEVENLABS_SARA_VOICE_ID` no VPS:
   ```bash
   # Editar no VPS
   ssh -p 443 root@2.25.137.78
   nano /opt/mothersteam/deploy/.env.production
   # Atualizar ELEVENLABS_SARA_VOICE_ID=<novo_voice_id>
   cd /opt/mothersteam/deploy
   docker compose -f docker-compose.prod.yml up -d api   # restart sem rebuild
   ```
4. Testar: abrir app → onboarding → verificar que Sara fala

### 7b. MãeIA Agent

O agent `agent_4301kxv5d1q3fsf85z1xb1sz90nt` precisa ser recriado na nova conta.

**Informações necessárias do agent atual (checar no dashboard ElevenLabs):**
- System prompt configurado no agent
- Primeira mensagem (first message)
- Ferramentas (tools) configuradas
- Voz usada pelo agent
- Configurações de latência/interrupção

**Passos:**
1. Acessar https://elevenlabs.io → Conversational AI → Agents → `agent_4301kxv5d1q3fsf85z1xb1sz90nt`
2. Anotar todos os parâmetros (system prompt, first message, tools, voice, settings)
3. Na nova conta: criar agent com os mesmos parâmetros → obter novo `agent_id`
4. Atualizar no VPS: `ELEVENLABS_AGENT_ID=<novo_agent_id>`
5. Atualizar no frontend: `.env.local` → `VITE_ELEVENLABS_AGENT_ID=<novo_agent_id>`
6. Rebuild frontend + cap sync + Run no Android Studio

### 7c. API Key

1. Na nova conta ElevenLabs: gerar nova API key
2. Atualizar `ELEVENLABS_API_KEY` no VPS
3. Restart do container (sem rebuild necessário)

### Checklist de migração (ordem segura)

```
[ ] 1. Criar conta ElevenLabs nova (conta do dono do app)
[ ] 2. Verificar tipo da voz Sara (clonada vs catálogo)
[ ] 3. Criar/clonar voz Sara na nova conta → anotar novo voice_id
[ ] 4. Criar agent MãeIA na nova conta com mesmos parâmetros → anotar novo agent_id
[ ] 5. Gerar API key na nova conta
[ ] 6. SSH VPS → editar .env.production com novos valores
[ ] 7. Restart container (sem rebuild): docker compose up -d api
[ ] 8. Testar Sara TTS: curl -X POST https://api.santoti.com/sara/tts ...
[ ] 9. Atualizar .env.local local: VITE_ELEVENLABS_AGENT_ID=<novo>
[ ] 10. npm run build → scp → npx cap sync android → Run no Android Studio
[ ] 11. Testar MãeIA voz + Sara narração no app
[ ] 12. Só então revogar API key antiga
```

---

## 8. Integração Futura — Gemini no Chat de Texto da MãeIA

**Objetivo:** Quando o usuário digita uma mensagem no chat de texto da MãeIA (sem ativar voz), responder com o Gemini em vez da mensagem estática atual.

### Onde fazer a mudança

**Backend:** Criar rota `POST /mae-ia/chat`

```ts
// server/src/routes/mae-ia.ts — adicionar:
fastify.post('/chat', async (request, reply) => {
  const { message, history } = request.body
  // Chamar Gemini API com system prompt da MãeIA + histórico
  // Retornar { reply: string }
})
```

**Variável de ambiente necessária no VPS:**
```
GOOGLE_AI_API_KEY=<chave do Google AI Studio>
```

**Frontend:** `src/components/maeIA/MaeIAScreen.tsx` → função `sendText`:

```ts
// Substituir o setTimeout com mensagem estática por:
async function sendText(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return
  addMessage('user', trimmed)
  setInput('')
  if (!isConnected) {
    try {
      const { reply } = await apiFetch<{ reply: string }>('/mae-ia/chat', {
        method: 'POST',
        body: JSON.stringify({ message: trimmed, history: messages.slice(-10) }),
      })
      addMessage('assistant', reply)
    } catch {
      addMessage('assistant', 'Não foi possível obter resposta. Verifique sua conexão. 💜')
    }
  }
}
```

### Dependências a instalar (backend)

```bash
cd server
npm install @google/generative-ai
# OU usar a SDK do Vertex AI se preferir GCP autenticado
```

### System prompt sugerido para a MãeIA (Gemini)

```
Você é a MãeIA, assistente especializada em saúde materno-infantil da plataforma Mother's Team.
Responda em português brasileiro, de forma empática, acolhedora e objetiva.
Foque em gestação, pós-parto, amamentação, desenvolvimento do bebê e bem-estar materno.
Sempre incentive consultar um médico ou profissional de saúde para questões específicas.
Limite respostas a 3-4 frases para manter a conversa fluida no chat.
```

### Custos estimados (Gemini Flash)

- `gemini-1.5-flash`: ~$0.075/1M tokens input, ~$0.30/1M tokens output
- Para uso moderado (~1000 msgs/dia de ~100 tokens cada): < $5/mês

---

## 9. Limitações conhecidas

| Limitação | Impacto | Solução planejada |
|---|---|---|
| ElevenLabs em conta pessoal | Risco jurídico/operacional se conta for bloqueada | Migrar para conta do dono (seção 7) |
| MãeIA chat de texto sem LLM | Resposta estática, experiência ruim | Integrar Gemini (seção 8) |
| FCM não configurado | Push notifications não funcionam no Android | Configurar google-services.json |
| SSL Flexible no Cloudflare | HTTP entre CF e VPS (risco menor de segurança) | Migrar para Full (strict) com Origin Certificate |
| Branch do VPS estava divergindo do main | Bug em produção por semanas sem perceber | VPS agora em `main`; deploy via git pull |
| Sem iOS | App só existe no Android | iOS futuro — precisará NSMicrophoneUsageDescription |
| Zustand não persiste isLoggedIn | Cada abertura do app faz session restore | Esperado; refreshToken persiste; funciona bem |

---

## 10. Referências rápidas

| Recurso | Onde acessar |
|---|---|
| Dashboard ElevenLabs | https://elevenlabs.io (conta Tiago) |
| Agents Conversational AI | https://elevenlabs.io → Products → Conversational AI |
| VPS Hostinger | https://hpanel.hostinger.com |
| GitHub repo | https://github.com/TiagoSanto7/mothersteam |
| Google AI Studio (Gemini key) | https://aistudio.google.com |
| Admin do app | http://2.25.137.78/admin (ou https://api.santoti.com/admin) |
| Cloudflare DNS | Dashboard Cloudflare → api.santoti.com |
