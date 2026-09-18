# Referência de resposta no chat (TIA-39) — Design

**Status:** aprovado para implementação
**Issue:** [TIA-39](https://linear.app/tiago-santo/issue/TIA-39) — "Ao marcar uma mensagem no chat para responder e respondê-la, não referencia corretamente na mensagem, não é possível saber exatamente qual mensagem foi marcada, qual o conteúdo dela e ao tocar na mensagem marcada não sou levada até a origem."

## Causa raiz

Os três sintomas do relato têm uma causa só: a resposta nunca foi guardada como dado estruturado — ela é **texto colado no conteúdo da mensagem**.

`ChatScreen.tsx:243-244`:
```ts
const content = replyingTo
  ? `↪ ${replyingTo.senderName}: "${replyingTo.excerpt}"\n${text.trim()}`
  : text.trim();
sendMutation.mutate({ content });
```

No banco (`Message` no `schema.prisma`), não existe nenhum campo de referência — só `content: String`. Uma vez enviada, a citação vira parte do texto puro, indistinguível do resto da mensagem, e **a referência ao ID da mensagem original é jogada fora** — nunca chega a sair do componente React. Por isso "tocar na mensagem marcada" não tem como funcionar: não sobra nada pra apontar de volta.

**Boa notícia:** o dado certo já é capturado no cliente. `replyingTo` (`ChatScreen.tsx:137`) já guarda exatamente `{ id, senderName, excerpt }` no momento em que a mãe marca a mensagem pra responder (swipe ou menu). O problema não é captura — é que esse dado é descartado no envio em vez de ser mandado pro servidor.

## Solução

Guardar a referência como campos próprios na mensagem, seguindo o mesmo padrão que já existe pra post compartilhado (`sharedPostId` / `sharedPostAuthor` / `sharedPostExcerpt` — denormalizado, sem relação forte no Prisma, mesma convenção do restante do schema):

```prisma
model Message {
  ...
  replyToId         String?
  replyToSenderName String?
  replyToExcerpt    String?
}
```

Fluxo:

```
Mãe marca mensagem (swipe ou menu) → replyingTo = { id, senderName, excerpt }  (já existe)
        │
        ▼
Envia  →  POST /chats/:id/messages  { content, replyToId, replyToSenderName, replyToExcerpt }
        │
        ▼
Renderiza cada mensagem com replyToId:
  bloco de citação (nome + trecho) acima do balão, tocável
        │
        ▼
Toque no bloco → procura elemento #msg-{replyToId} na lista já carregada → scrollIntoView
```

## Por que denormalizado, e não uma relação de verdade no Prisma

Duas razões, ambas já resolvidas pelo padrão existente do `sharedPost*`:

1. **Consistência com o schema atual** — não existe nenhuma outra relação auto-referenciada em `Message`, e introduzir uma agora exigiria decidir comportamento de `onDelete` (mensagens podem ser apagadas — `DELETE /chats/:id/messages/:messageId` já existe). Denormalizado, isso não é problema: se o original for apagado, a citação continua mostrando nome + trecho (o que a mãe via na hora que respondeu), só o toque-pra-navegar deixa de encontrar o alvo — degrada bem, sem quebrar nada.
2. **Sem join extra pra exibir** — nome e trecho já vêm prontos na própria mensagem, igual ao post compartilhado.

## Limite aceito: mensagem antiga fora da página carregada

O chat carrega só a página mais recente (`ChatScreen.tsx:169-173`, sem paginação nem "carregar mais" implementados hoje — isso é limitação existente, não desta issue). Se a mensagem original não estiver entre as carregadas, o toque na citação não encontra o elemento pra rolar até ele — nesse caso, não faz nada (silencioso). Cobre o caso comum (responder algo recente, que é o padrão de uso) sem expandir escopo pra construir paginação agora.

## Escopo

**Dentro:** persistir a referência estruturada no envio, renderizar bloco de citação (nome + trecho) em vez do texto colado, tocar no bloco rola até a mensagem original quando ela está carregada.

**Fora:** paginação/scroll infinito do histórico do chat (limitação pré-existente, issue separada se for necessário depois); editar ou desfazer resposta depois de enviada.

## Verificação

Testes automatizados cobrem o back (persistência dos campos) e o front (renderização da citação, navegação por ID, mensagem sem correspondente na lista carregada). Teste manual no device: marcar uma mensagem, responder, conferir a citação, tocar nela e confirmar que rola até a original.
