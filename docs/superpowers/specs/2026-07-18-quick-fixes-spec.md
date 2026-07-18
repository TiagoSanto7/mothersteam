# Spec — Ajustes Rápidos · Grupo A

**Data:** 2026-07-18  
**Escopo:** 5 itens identificados no fix-document como ajustes imediatos — sem novas features, sem redesign estratégico.

---

## 1. Remover InsightCard da aba Rotina

**Arquivo:** `src/components/home/HomeScreen.tsx`

Remover a linha `{motherProfile && <InsightCard profile={motherProfile} />}` do JSX.

O componente `InsightCard.tsx` não precisa ser deletado (pode ser útil no futuro), mas não deve mais aparecer no app.

Nenhuma outra mudança necessária.

---

## 2. Corrigir datas no calendário semanal

**Problema:** `selectedDate` é persistido no localStorage via Zustand. Se o usuário usou o app na semana passada, o calendário abre na semana antiga.

**Fix:** Remover `selectedDate` do objeto `partialize` em `src/store/useAppStore.ts`.

Com isso, `selectedDate` sempre inicializa como `new Date().toISOString().split('T')[0]` (hoje) a cada sessão. A semana atual será sempre exibida ao abrir o app.

O comportamento de seleção de data dentro da sessão permanece intacto — o usuário ainda pode navegar pelos dias da semana normalmente.

---

## 3. Remover versículo da aba Comunidade

**Arquivo:** `src/components/comunidade/ComunidadeScreen.tsx`

- Remover o import `getVersiculoDoDia` da linha 17
- Remover o uso de `<VersiculoDiario />` na linha 153 do JSX
- Remover a função `VersiculoDiario()` (linha 245 em diante)

A lógica de versículo diário permanece em `src/data/versiculos.ts` — outros usos futuros não são afetados.

---

## 4. Versículos salvos — 3 pontos de acesso

Criar uma tela `SavedVersesScreen` acessível por 3 caminhos distintos.

### 4.1 Componente SavedVersesScreen

**Arquivo novo:** `src/components/home/SavedVersesScreen.tsx`

- Overlay full-screen, slide-up (`y: '100%' → y: 0`, 350ms), fundo `sara-cream`
- Header com label "VERSÍCULOS SALVOS" + botão × fechar
- Lista dos `savedVerses[]` do store (array de referências, ex: `"Jeremias 1:5"`)
- Para cada item, buscar o texto completo em `src/data/momentoDeus.ts` (versículos só são salvos pela `MomentoDeusScreen`, portanto todas as referências guardadas existem nessa fonte)
- Cada card mostra: texto do versículo (font-serif), referência em dourado, botão ❤️ para remover (`unsaveVerse(ref)`)
- Estado vazio: ilustração + texto "Você ainda não salvou nenhum versículo."
- Props: `{ open: boolean; onClose: () => void }`

### 4.2 Acesso via MomentoDeusScreen

**Arquivo:** `src/components/home/MomentoDeusScreen.tsx`

Adicionar um 4º botão na barra de ações inferior:
```
[🙏 Oração] [❤️ Salvar] [📤 Compartilhar] [📖 Salvos]
```

O botão "📖 Salvos" abre o `SavedVersesScreen` como overlay sobre o `MomentoDeusScreen`. `SavedVersesScreen` usa `z-[60]` (acima do `z-50` do `MomentoDeusScreen`).

### 4.3 Acesso via ProfileScreen

**Arquivo:** `src/components/profile/ProfileScreen.tsx`

Adicionar uma seção "Versículos salvos" abaixo das publicações da usuária. Apenas quando `savedVerses.length > 0`. Ao tocar na seção, abre `SavedVersesScreen`.

### 4.4 Acesso via SideDrawer

**Arquivo:** `src/components/layout/SideDrawer.tsx`

Adicionar item "📖 Meus versículos" no menu, entre "Meu perfil" e "Configurações". Ao tocar, abre `SavedVersesScreen`. O drawer fecha ao abrir a tela.

O `SideDrawer` precisará receber um novo callback `onOpenSavedVerses: () => void` via props. O `App.tsx` gerencia o estado `showSavedVerses` e passa os callbacks necessários.

---

## 5. Share sheet — Momento com Deus

### 5.1 Novo componente ShareMomentoSheet

**Arquivo novo:** `src/components/home/ShareMomentoSheet.tsx`

Bottom sheet com slide-up animation (`y: '100%' → y: 0`), fundo branco, `rounded-t-2xl`.

**Estrutura:**
```
┌─────────────────────────────────┐
│         ━━━  (drag handle)      │
│  COMPARTILHAR VERSÍCULO         │
│                                  │
│  [Com oração]  [Só o versículo]  │  ← toggle
│                                  │
│  📱 Compartilhar com amigos      │
│     WhatsApp, Instagram…        │
│                                  │
│  ✏️  Publicar no feed            │
│     Cria um post com o versículo │
│                                  │
│  👥 Compartilhar em comunidade   │
│     Escolhe a comunidade         │
└─────────────────────────────────┘
```

**Props:**
```ts
interface ShareMomentoSheetProps {
  open: boolean
  onClose: () => void
  verso: string
  referencia: string
  oracao: string
  onShareToFeed: (content: string) => void
  onShareToCommunity: (content: string) => void
}
```

**Lógica do toggle:** estado interno `incluirOracao: boolean` (default `true`). Monta o texto a compartilhar:
```ts
const textToShare = incluirOracao
  ? `"${verso}" — ${referencia}\n\n${oracao}`
  : `"${verso}" — ${referencia}`
```

**Ação 1 — Compartilhar com amigos:** `navigator.share({ text })` com fallback para `navigator.clipboard.writeText(text)`. Fecha o sheet após executar.

**Ação 2 — Publicar no feed:** chama `onShareToFeed(textToShare)`, fecha o sheet e fecha `MomentoDeusScreen`. O App.tsx abre `CreatePostScreen` com o conteúdo pré-preenchido.

**Ação 3 — Compartilhar em comunidade:** chama `onShareToCommunity(textToShare)`. Mesmo fluxo do Publicar, mas `CreatePostScreen` recebe também `initialCommunityId` depois que o usuário escolhe a comunidade. Implementação simplificada para MVP: abrir `CreatePostScreen` sem comunidade pré-selecionada e com o conteúdo preenchido (o usuário seleciona a comunidade no formulário do post).

### 5.2 Atualização de MomentoDeusScreen

- Remover o botão inline "📤 Compartilhar" da barra de ações
- Substituir por botão "📤 Compartilhar" que abre o `ShareMomentoSheet`
- Adicionar estado `shareOpen: boolean`
- Ao chamar `onShareToFeed` ou `onShareToCommunity`: gravar o conteúdo no store via `setPendingShareContent(text)`, depois fechar o sheet e chamar `onClose()` para fechar a tela

### 5.3 Zustand store — pendingShareContent

Adicionar ao `useAppStore`:
```ts
pendingShareContent: string | null
setPendingShareContent: (content: string | null) => void
```

**Não persistir** (não entra no `partialize`). Inicializa como `null`.

Isso elimina prop drilling: `MomentoDeusScreen` escreve no store diretamente, e `App.tsx` lê o valor e reage.

### 5.4 Fiação no App.tsx

Observar `pendingShareContent` do store. Quando não-nulo, abrir `CreatePostScreen` passando `initialContent={pendingShareContent}`. Ao fechar o `CreatePostScreen`, chamar `setPendingShareContent(null)`.

### 5.5 Atualização de CreatePostScreen

Adicionar prop `initialContent?: string`:
```ts
interface CreatePostScreenProps {
  onBack: () => void
  autoOpenImage?: boolean
  initialCommunityId?: string
  initialContent?: string   // ← novo
}
```

Inicializar o estado de conteúdo com `initialContent ?? ''`.

---

## Arquivos modificados

| Arquivo | Tipo de mudança |
|---|---|
| `src/components/home/HomeScreen.tsx` | Remover InsightCard |
| `src/store/useAppStore.ts` | Remover selectedDate do partialize |
| `src/components/comunidade/ComunidadeScreen.tsx` | Remover VersiculoDiario |
| `src/components/home/SavedVersesScreen.tsx` | **Novo** |
| `src/components/home/MomentoDeusScreen.tsx` | Botão salvos + refatorar compartilhamento |
| `src/components/profile/ProfileScreen.tsx` | Seção versículos salvos |
| `src/components/layout/SideDrawer.tsx` | Item versículos salvos |
| `src/components/home/ShareMomentoSheet.tsx` | **Novo** |
| `src/components/comunidade/CreatePostScreen.tsx` | Prop initialContent |
| `src/store/useAppStore.ts` | Adicionar pendingShareContent + setter |
| `src/App.tsx` | Observar pendingShareContent, abrir CreatePostScreen |

---

## Fora de escopo (Grupo B — próximo ciclo)

- Redesign do Dashboard como narrativa
- Aba Comunidade no tab bar
- Card Sara como hero
- Bloco "Hoje" unificado
- Comunidade como atividade viva
