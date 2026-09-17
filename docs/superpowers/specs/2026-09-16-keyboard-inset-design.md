# Teclado cobre os inputs de texto (TIA-5) — Design

**Status:** aprovado para implementação
**Issue:** [TIA-5](https://linear.app/tiago-santo/issue/TIA-5) — escopo ampliado: não é só o input da MãeIA, é **todo input de texto do app**.

## Problema

Ao focar qualquer input de texto no app (MãeIA, chat, comentário de publicação), o teclado sobe e **cobre o campo** — a usuária não vê o que está digitando.

## Causa raiz

O layout está preso a uma altura de viewport que nunca é informada de que o teclado existe. Quatro camadas contribuem, e **nenhuma delas compensa**:

| Camada | Estado atual | Efeito |
|---|---|---|
| `capacitor.config.ts` | `Keyboard.resize: 'none'` (opção exclusiva de iOS) | WebView do iOS nunca é redimensionada — teclado sobrepõe o conteúdo |
| `android/app/src/main/AndroidManifest.xml` | sem `windowSoftInputMode`; `targetSdk 36` | Android 15+ força edge-to-edge e descontinuou `adjustResize` — o sistema também não redimensiona |
| `src/components/layout/MobileShell.tsx:57` | `h-screen` (=`100vh`) + `overflow-hidden` em dois níveis | A coluna mantém a altura da tela cheia independente do teclado |
| `src/` (todo) | zero listeners de teclado, zero `visualViewport`, zero `dvh` | Nada compensa a sobreposição |

As três telas afetadas compartilham o mesmo padrão estrutural, e é por isso que todas quebram igual:

```
<div class="flex flex-col h-full overflow-hidden">   ← altura travada
  <header/>
  <div class="flex-1 overflow-y-auto"> … </div>      ← lista rolável
  <input-bar/>                                        ← último filho → fica sob o teclado
</div>
```

O `overflow-hidden` ainda elimina o fallback nativo do browser de rolar o elemento focado para a vista.

## Descoberta-chave: o dado já existe, ninguém escutava

Verificado no código-fonte do plugin `@capacitor/keyboard` (já instalado no projeto, v8.0.5 — **nenhuma dependência nova é necessária**):

- **iOS** (`ios/Sources/KeyboardPlugin/Keyboard.m`): os observers de `UIKeyboardWillShow/DidShow` são registrados **incondicionalmente** (linhas 191-194) e `notifyListeners:@"keyboardWillShow"` com `keyboardHeight` dispara sempre (linhas 260-263). O `resizeMode` controla apenas se o **nativo** redimensiona a WebView — não afeta os eventos JS.
- **Android** (`android/.../Keyboard.java`): usa `WindowInsetsCompat.Type.ime()` e `WindowInsetsAnimationCompat` (linhas 61-119) — exatamente a API que o edge-to-edge do Android 15+ exige — e emite `keyboardHeight` (`KeyboardPlugin.java:77-79`).

**Portanto a correção funciona nas duas plataformas.** No iOS ela funciona *justamente porque* assume o trabalho que o `resize: 'none'` desligou: o evento continua chegando com a altura correta e nós fazemos o resize via CSS.

## Solução

Uma fonte única de verdade para a altura do teclado, publicada em CSS var + store, consumida pelos containers de altura travada.

```
useKeyboardInset (hook, montado uma vez no App)
   ├─ nativo: Keyboard.addListener('keyboardWillShow' / 'keyboardWillHide')
   └─ web:    window.visualViewport (resize/scroll)
                       │
                       ├─→ CSS var --keyboard-height  → altura dos containers
                       └─→ store.keyboardOpen (bool)  → esconder a BottomTabBar
```

**Por que CSS var + store (e não só um):** a altura precisa chegar no CSS sem re-render (layout), mas esconder a tab bar é renderização condicional em React. Cada canal serve ao que é bom.

### Containers a corrigir

Investigado: são **apenas dois** containers de altura travada em todo o app.

| Arquivo | Linha | Atual | Cobre |
|---|---|---|---|
| `src/components/layout/MobileShell.tsx` | 57 | `h-screen` | MãeIA (aba) e chat (via `ChatListScreen`) |
| `src/App.tsx` | 368 | `h-[96vh]` | overlay de post → input de comentário |

### Tab bar

`BottomTabBar` é irmã do `<main>` na coluna (`MobileShell.tsx:77`). Com o shell encolhendo, ela subiria e ficaria encavalada logo acima do teclado — precisa ser escondida enquanto o teclado está aberto.

Como ela é o **único** elemento do app que usa `env(safe-area-inset-bottom)` (`BottomTabBar.tsx:65-66`), e ela some com o teclado aberto, **não há vão de safe-area a tratar nos inputs**.

## Decisões deliberadas

**Não mexer em `Keyboard.resize: 'none'`.** Foi escolhido a dedo no setup do iOS (2026-09-12/13) depois de horas debugando zoom e safe-area, é opção exclusiva de iOS (não resolveria Android de qualquer forma), e reverter arrisca regredir aquilo. A solução proposta convive com ele.

**Não usar `interactive-widget=resizes-content`** no viewport meta: só tem suporte em Chrome (Android), não no WKWebView do iOS — resolveria metade do problema e deixaria duas soluções diferentes convivendo.

**Não usar `100dvh` sozinho:** `dvh` responde à barra de URL do browser, não ao teclado. Numa WebView com `resize: none` o viewport visual não muda, então `dvh == vh`. Usado como base da conta, mas não resolve nada sozinho.

## Verificação

- Testes automatizados (vitest/jsdom) para o hook e para o consumo da var.
- Device real Android (Motorola já pareado) — as três telas.
- iOS fica para o próximo build de TestFlight, seguindo o padrão adotado nesta sprint.
