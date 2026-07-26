Entendido. Aqui está a spec final consolidada, já com as duas correções.

```markdown
# Spec — Ajustes de Comunidade, Post e Navegação
Data: 07/07/2026
Fonte: teste no app publicado (mothersteam.vercel.app) + leitura do código em github.com/TiagoSanto7/mothersteam (branch main) + referência de UX no Bluesky.

## 1. Composer deve abrir como modal, não como tela cheia

**Problema:** no Bluesky, tocar no input do topo abre um painel sobreposto (header "Cancelar / Rascunhos / Postar", fundo escurecido atrás, sem trocar de tela). No Mother's Team, `ComunidadeScreen.tsx` faz um early return (`if (showCreate) return <CreatePostScreen onBack={...} />`) e `CreatePostScreen.tsx` tem header com seta "Voltar" — ou seja, é navegação de tela cheia, sem overlay, sem dim de fundo, sem animação.

**Fix:**
- Substituir o `if/return` por `AnimatePresence` do Framer Motion.
- Renderizar `CreatePostScreen` como `motion.div` `fixed inset-0 z-50` com backdrop `bg-black/40` atrás.
- Entrada: `initial={{ y: 40, opacity: 0 }}` → `animate={{ y: 0, opacity: 1 }}`; saída simétrica ao cancelar/publicar.
- Manter tudo dentro do frame do mobile shell (390px).

**Arquivos:** `ComunidadeScreen.tsx`, `CreatePostScreen.tsx`

## 2. Categoria no formulário de criar post — ADIADO

Decisão pendente com o cliente. Não entra nesta rodada. Revisitar na próxima release; se aprovado, remover o seletor "Categoria" de `CreatePostScreen.tsx` (linhas 8–13 e 108–124) mantendo os chips de filtro do feed em `ComunidadeScreen.tsx` intactos (são independentes).

## 3. Repostar/Compartilhar só aparecem ao abrir o post

**Problema:** `PostCard` (dentro de `ComunidadeScreen.tsx`, linhas 21–76) só tem "Curtir" e "Ver X respostas". Os botões "Republicar" e "Enviar" só existem em `PostDetailScreen.tsx` (linhas 113–127).

**Fix:**
- Replicar os botões Republicar e Enviar dentro do `PostCard`, chamando as mesmas actions do store (`repost`, e abrindo o sheet "Enviar para").
- Usar `e.stopPropagation()` nesses botões, já que o card inteiro é um `<button onClick={onOpen}>` — sem isso, clicar neles também abriria o post.

**Arquivos:** `ComunidadeScreen.tsx`

## 4. Foto não aparece ao abrir o post

**Problema:** `PostCard` renderiza `post.imageUrl` corretamente (linha 44–50). `PostDetailScreen.tsx` nunca renderiza `currentPost.imageUrl` — falta o `<img>` entre o parágrafo de conteúdo (linha 100) e a barra de ações (linha 102).

**Fix:** adicionar o mesmo bloco de imagem do `PostCard` em `PostDetailScreen.tsx`, logo após `<p>{currentPost.content}</p>`.

**Extra (relacionado, não reportado originalmente):** o botão "Publicar" em `CreatePostScreen.tsx` está com `disabled={!content.trim()}`, impedindo postar só com foto sem texto. Trocar para `disabled={!content.trim() && !imagePreview}`.

**Arquivos:** `PostDetailScreen.tsx`, `CreatePostScreen.tsx`

## 5. Compartilhar no chat manda só texto, sem link pro post

**Problema:** `handleShare` em `PostDetailScreen.tsx` (linha 55) chama `shareToChat(chatId, "📌 autor: \"conteúdo...\"")` — string formatada, sem referência ao `post.id`. O tipo `ChatMessage` (`types/index.ts`, linha 83) só tem `{ id, from, content, time }`.

**Fix:**
- Estender `ChatMessage` com `sharedPost?: { id: string; author: string; excerpt: string; imageUrl?: string }`.
- `shareToChat` passa a aceitar esse objeto opcional além do texto.
- Em `ChatScreen.tsx`, quando a mensagem tiver `sharedPost`, renderizar como card clicável (miniatura + autor + trecho) que abre o `PostDetailScreen` daquele post ao tocar.

**Arquivos:** `types/index.ts`, `useAppStore.ts`, `ChatScreen.tsx`, `PostDetailScreen.tsx`

## 6. Selecionar múltiplos destinatários + comentário ao compartilhar

**Problema:** o sheet "Enviar para" (`PostDetailScreen.tsx`, linhas 189–222) é uma lista simples — tocar num nome já dispara o envio na hora. Sem seleção múltipla, sem campo de comentário. `sharedTo` é `string | null`.

**Fix:**
- Trocar `sharedTo: string | null` por array de IDs selecionados, com checkbox/toggle por item (toque marca/desmarca).
- Adicionar `<textarea>` opcional "Adicionar um comentário..." acima da lista.
- Botão "Enviar" dispara `shareToChat` (com o objeto `sharedPost` do item 5) para cada destinatário selecionado, incluindo o comentário como mensagem de texto extra antes do card do post.

**Arquivos:** `PostDetailScreen.tsx`

## 7. Ícones de chat/notificações precisam estar na aba Home (= Comunidade)

**Confirmação de produto:** a aba "Home" continua sendo a tela de Comunidade (feed). Não vamos reverter esse roteamento.

**Problema:** hoje os ícones de chat e notificações vivem no header do `HomeScreen.tsx`, que está amarrado à aba `rotina` (não à aba Home/Comunidade que o usuário realmente usa). Em `App.tsx`:

```tsx
home:   <ComunidadeScreen />,                    // aba Home real — sem os ícones
rotina: <HomeScreen onOpenChat={...} onOpenNotifications={...} />, // tem os ícones, mas é outra aba
```

**Fix:**
- Mover os dois botões de ícone (mensagens e notificações, mesmo estilo/posição atual: topo direito, círculos `bg-white/70 backdrop-blur-sm`) do header do `HomeScreen.tsx` para o header do `ComunidadeScreen.tsx`, ao lado do título "Comunidade".
- Em `App.tsx`, passar `onOpenChat` e `onOpenNotifications` como props para `<ComunidadeScreen />` na chave `home` (hoje ela não recebe props nenhuma).
- Remover esses dois botões do `HomeScreen.tsx` (a tela de saudação/calendário/rotina continua existindo normalmente na aba `rotina`, só sem os ícones duplicados).

**Arquivos:** `App.tsx`, `ComunidadeScreen.tsx`, `HomeScreen.tsx`

## 8. Avatar ao lado do nome no post

**Problema:** `PostDetailScreen.tsx` já tem avatar circular com a inicial do autor (linha 85). `PostCard` no feed não tem — só mostra o nome em texto puro.

**Fix:** adicionar o mesmo círculo (`w-10 h-10 rounded-full bg-sara-terracotta`, inicial do autor) à esquerda do nome, dentro do `PostCard`.

**Arquivos:** `ComunidadeScreen.tsx`

---

## Resumo de arquivos afetados
`ComunidadeScreen.tsx` (modal, PostCard: avatar + republicar + enviar, header com ícones de chat/notificação), `CreatePostScreen.tsx` (publish habilitado com foto), `PostDetailScreen.tsx` (renderizar imagem, sheet de envio com multi-seleção + comentário), `types/index.ts` (ChatMessage.sharedPost), `useAppStore.ts` (shareToChat aceitar objeto), `ChatScreen.tsx` (card de post compartilhado), `App.tsx` (props de chat/notificação para ComunidadeScreen), `HomeScreen.tsx` (remover ícones duplicados).

## Fora de escopo nesta rodada
Item 2 (categoria no formulário de post) — aguardando decisão do cliente.
```
