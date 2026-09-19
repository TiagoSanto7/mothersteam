# Mother's Team — Stack e Escopo do Projeto

> Documento de referência pra quem trabalha no projeto (equipe interna). Última verificação: 2026-09-18, direto no código (`package.json` de ambos os lados, `schema.prisma`, rotas do servidor).

## O produto

Mother's Team é um app mobile (Android + iOS, mesma base web via Capacitor) pra mães gestantes e no pós-parto. O pilar central é a **Sara** ("MãeIA" no código), uma assistente de IA — por texto e por voz — que acompanha a jornada da mãe com apoio emocional, orientações e personalização por perfil/fase.

## Escopo funcional

**4 abas principais** (`src/types/index.ts` → `TabId`):

- **Hoje** — dashboard: saudação, card da Sara, resumo da rotina do dia, desenvolvimento do bebê por semana/fase.
- **Jornada** — registro de rotina (amamentação, sono, fraldas), planejamento/lembretes, evolução.
- **Comunidade** — feed social: posts, comentários, curtidas, comunidades temáticas, abas "Para você" (ranqueado) e "Seguindo" (cronológico).
- **Perfil** — perfil próprio/de outras mães, configurações, versículos salvos, LGPD.

**Fora das abas, mas centrais:**

- **Sara / MãeIA** — chat de texto (streaming) e chat de voz, acessível pelo botão flutuante central. Camada transversal, não uma aba isolada.
- **Chat entre mães** — mensagens 1:1, com foto, áudio e referência de resposta (reply).
- **Shopping** — catálogo de produtos afiliados (não é checkout próprio — redireciona pro Mercado Livre, com tracking de clique).
- **Painel Admin** (`/admin`) — gestão do catálogo de produtos/categorias do Shopping, acesso por `role` (`ADMIN`/`EDITOR`/`OFFICIAL`) na própria tabela `User`, mesmo login do app.

**Domínio de dados** (`server/prisma/schema.prisma`, 22 models): `User`, `RefreshToken`, `Follow`, `SavedVerse`, `Community`/`CommunityMember`, `Post`/`PostLike`, `Comment`/`CommentLike`, `Chat`/`ChatParticipant`/`Message`, `RoutineEntry`, `BabyEntry`, `Baby`/`OtherChild`, `Notification`, `Category`/`Product`/`ProductClick`, `Review`, `WishlistItem`.

## Stack técnica

### Frontend (web + mobile, mesma base)

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** (design tokens próprios, paleta rosé/creme da marca)
- **Zustand** — estado global (regra do projeto: seletores sempre referencialmente estáveis, ver `CLAUDE.md`)
- **TanStack Query** — cache/estado de servidor
- **Framer Motion** — animações
- **Capacitor 8** — empacota a mesma base web como app nativo Android e iOS (plugins: `@capacitor/keyboard`, `@capacitor/push-notifications`)
- **@elevenlabs/client** — SDK de voz da Sara no cliente

### Backend

- **Fastify 4** + **TypeScript**, rodando via `tsx` direto em produção (sem etapa de build — ver `deploy/Dockerfile` pro motivo)
- **Prisma 5** + **MySQL 8**
- **Zod** — validação de schema nas rotas
- **JWT** (`jsonwebtoken`) — access token (15min) + refresh token (30 dias, com rotação a cada uso) + **bcrypt** pro hash de senha
- **@fastify/multipart** — upload de arquivo (fotos, áudio)
- **sharp** — validação/normalização de imagem no servidor (adicionado na TIA-56: confirma que o upload é uma imagem de verdade, corrige orientação EXIF, limita dimensão)
- **ffmpeg** (via `transcodeAudioToM4a`) — transcodifica áudio de chat gravado no Android (webm) pra M4A, porque webm não toca no WebKit do iOS

### IA

- **Texto (Sara/MãeIA):** Google Gemini, modelo `gemini-3.6-flash` (`@google/genai`), streaming SSE
- **Voz (Sara):** ElevenLabs Conversational AI — voz + reconhecimento, modelo de síntese `eleven_multilingual_v2`

### Integrações de terceiros

- **Resend** — e-mails transacionais
- **Firebase Cloud Messaging** (`firebase-admin`) — push notifications
- **Mercado Livre** — só como link afiliado de saída (`mercadoLivreUrl` no `Product`, redirect com allowlist de domínio); **não há integração de pagamento própria** (Mercado Pago não está no código — se essa integração existir num plano futuro, ainda não foi implementada)

### Testes

- **Vitest** + **Testing Library** nos dois lados (frontend e backend), ~670 testes no frontend e ~80 no backend (parte deles precisa de MySQL local pra rodar)

### Infra / Deploy

- VPS Hostinger (`srv1944647.hstgr.cloud`) — Docker (API) + nginx (reverse proxy + serve o frontend estático) na mesma máquina, mesmo domínio pra API e frontend (path-based routing)
- **Deploy automático via GitHub Actions** a cada push/merge na `main` (build do frontend + `scp` pro servidor + rebuild do container da API) — não precisa mais de SSH manual pro dia a dia
- Migrations de banco em produção via `npx prisma migrate deploy` (histórico real desde 18/09 — nunca usar `prisma db push` em produção, ver `deploy/README.md`)
- Build mobile: `npx cap sync` + build nativo local (Android Studio / Xcode) — não é publicado via CI, é manual

## Organização do repo

Monorepo simples, sem workspace tooling:

- raiz (`src/`) — frontend (React/Vite), compartilhado entre web e os dois apps nativos
- `server/` — backend Fastify, projeto Node independente com seu próprio `package.json`
- `android/`, `ios/` — projetos nativos gerados/gerenciados pelo Capacitor
- `deploy/` — Dockerfile, configs de nginx, docs de deploy
- `docs/` — documentação de produto e arquitetura (este arquivo incluso)

## Fluxo de trabalho

Repositório compartilhado: sempre branch por tarefa + PR, nunca commit direto na `main` (ver `CLAUDE.md` e a issue correspondente no Linear pra cada mudança).
