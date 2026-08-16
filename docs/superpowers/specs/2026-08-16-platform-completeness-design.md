# Mothers Team — Platform Completeness (2026-08-16)

8 sub-projetos independentes para fechar lacunas críticas antes de produção real.
Sequência de implementação: F → C → B → D → E → A → G → H

---

## F — Sara com voz (VITE_ELEVENLABS_AGENT_ID)

**Problema:** `useSaraNarration.ts` lê `import.meta.env.VITE_ELEVENLABS_AGENT_ID`, mas o `.env`
local só tem `ELEVENLABS_AGENT_ID` (sem prefixo VITE_). Resultado: `agentId` é `undefined`,
`Conversation.startSession` falha silenciosamente na narração de onboarding.

**Fix:** Adicionar `VITE_ELEVENLABS_AGENT_ID=<placeholder>` ao `.env`, rebuild frontend, redeploy.
Backend e VPS já estão completos.

**Sem testes** — mudança puramente de configuração.

---

## C — Parcelamento com taxa real do Mercado Pago

**Problema:** `CheckoutScreen.tsx` calcula parcelas como `subtotal / n` mostrando "sem juros" para
todas, o que é incorreto para n > 1. O MP cobra juros a partir de 2x dependendo da bandeira.

**Solução:**
- Backend: `GET /orders/installments?paymentMethodId=visa&amount=150.00` (auth required)  
  Proxia `GET /v1/payment_methods/installments` do MP e devolve array de `{ installments, label, installmentAmount, totalAmount, rate }`.
- Frontend: query `['installments', paymentMethodId, total]` ativada quando o número do cartão
  tem ≥ 6 dígitos. Substitui o `<select>` hardcoded pelos dados reais.
- Fallback: se a query falha ou ainda carrega, exibe apenas `1x` (sem juros sempre).

**Testes (TDD):**
- `GET /orders/installments` retorna payer_costs mapeados
- `GET /orders/installments` sem params → 400
- `GET /orders/installments` com resposta vazia do MP → array vazio
- `GET /orders/installments` com erro do MP → 502

---

## B — @menção em comentários

**Problema:** `POST /:id/comments` em `posts.ts` notifica o autor do post sobre o comentário,
mas não faz mention detection no conteúdo do comentário. `POST /` (post creation) já tem a
lógica completa nas linhas 135–160.

**Fix:** Após notificar o autor do post, extrair `@handles` do conteúdo do comentário,
resolver usernames em IDs (excluindo o próprio autor e o dono do post, que já recebeu
notificação de comentário), e criar notificações de `mention` para cada um.

**Testes (TDD):**
- `POST /:id/comments` com `@username` → cria notificação de mention para o usuário mencionado
- @menção do próprio autor → não cria notificação
- @menção do dono do post → não duplica (ele já recebeu notificação de comentário)
- @username inexistente → nenhuma notificação de mention, requisição bem-sucedida

---

## D — Rastreamento de pedido visível ao usuário

**Problema:** `trackingCode` existe no schema e o admin consegue atualizar via
`PATCH /admin/orders/:id`, mas `OrderDetailScreen.tsx` não exibe o campo.

**Fix:** Exibir `trackingCode` na tela de detalhe do pedido quando presente.
Adicionar link para rastreio (prefixo Correios/transportadora detectado por heurística simples).

**Sem testes de unidade** — mudança de UI pura.

---

## E — Gestão de cartões salvos na UI

**Problema:** `GET /payment-methods` e `DELETE /payment-methods/:id` existem mas não há
tela no app onde o usuário possa ver e remover seus cartões.

**Fix:** Seção "Cartões salvos" na `SettingsScreen`, listando cartões com botão de exclusão.
Invalidação de `['payment-methods']` após delete.

**Sem testes de unidade** — lógica de UI que depende de queries React Query já testadas.

---

## A — Email transacional + recuperação de senha (Resend)

**Problema:** Nenhum email sai do sistema. Sem confirmação de pedido, sem reset de senha.
Usuário que esquece a senha fica bloqueado para sempre.

**Solução:**
- Instalar `resend` no servidor.
- Novo plugin `server/src/plugins/email.ts` com função `sendEmail(to, subject, html)`.
- `POST /auth/forgot-password`: gera token de reset (JWT curto, 30min), envia email.
- `POST /auth/reset-password`: valida token, atualiza senha, invalida token.
- Email de confirmação de pedido disparado no webhook do MP (status PAID) e no crédito aprovado.
- Env vars necessárias: `RESEND_API_KEY`, `RESEND_FROM` (ex: `noreply@santoti.com`).

**Testes (TDD):**
- `POST /auth/forgot-password` com email existente → cria token, chama sendEmail
- `POST /auth/forgot-password` com email inexistente → 200 (não vaza existência)
- `POST /auth/reset-password` com token válido → atualiza senha
- `POST /auth/reset-password` com token expirado → 401
- `POST /auth/reset-password` com token já usado → 401
- Webhook PAID → chama sendEmail com detalhes do pedido

---

## G — Push para eventos sociais (likes, follows, @menção)

**Problema:** `sendPush` (FCM) só é chamado em eventos de pedido (PAID, PREPARING, SHIPPED,
DELIVERED). Likes, follows e @menções geram notificações in-app mas não acordam o app.

**Fix:** Após criar cada notificação in-app existente (like, follow, comment, mention),
buscar `fcmToken` do destinatário e chamar `sendPush` se presente.
Mensagens: like → "curtiu sua publicação", follow → "começou a te seguir", mention → "citou você".

**Testes (TDD):**
- Like em post → `sendPush` chamado para o autor
- Follow → `sendPush` chamado para o seguido
- @menção em post → `sendPush` chamado para o mencionado
- Destinatário sem fcmToken → `sendPush` não chamado

---

## H — LGPD (política de privacidade + termos de uso)

**Problema:** Nenhum documento legal. Obrigatório por lei para e-commerce no Brasil
(art. 37 CDC, LGPD Lei 13.709/2018).

**Fix:**
- Páginas estáticas `/privacidade` e `/termos` no frontend (rotas públicas).
- Link no rodapé do onboarding e no `SettingsScreen`.
- Checkbox de aceite na tela de registro (`RegisterScreen`) persistido no backend.
- Campo `termsAcceptedAt DateTime?` no schema Prisma.

**Testes (TDD):**
- Registro sem aceitar termos → 422
- Registro aceitando termos → persiste `termsAcceptedAt`
