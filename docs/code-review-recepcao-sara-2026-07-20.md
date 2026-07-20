# Code Review — Recepção da Sara (2026-07-20)

Escopo: commits `8628927..HEAD` (Tasks 0..20). Plano em `docs/superpowers/plans/2026-07-19-recepcao-sara.md`, intenção em `docs/experience-blueprint.md`.

Foco: bugs de correção, violações de blueprint, regressões, quebras de fluxo, acessibilidade grosseira. Ignorados: estilo, refactor amplo, perf especulativo.

---

## Findings

```json
[
  {
    "file": "src/components/reception/hooks/useSaraNarration.ts",
    "line": 34,
    "severity": "critical",
    "summary": "Hook nunca implementou `speak(text)` — Sara está muda em 5 dos 7 beats",
    "reproduction": "Plano (Tasks 5, 9, 11, 12, 14) especificou `speak: (text) => Promise<void>` pra narrar SaraAparece/Cap2/Cap3/Presente via TTS REST da ElevenLabs. Hook só expõe `startCapitulo1`. Nenhum beat chama TTS — o usuário vê o texto na tela mas não ouve nada. Contradiz o axioma do blueprint ('Sara conversa como uma pessoa'). Interface visual sozinha reduz Sara a legenda, não a voz."
  },
  {
    "file": "src/store/useAppStore.ts",
    "line": 122,
    "severity": "critical",
    "summary": "`applyReceptionData` sobrescreve `motherName` e `babyName` com dados do agente ElevenLabs, apagando o cadastro",
    "reproduction": "Mãe se cadastra como 'Maria Silva' via RegisterScreen → setAuth grava motherName='Maria Silva'. SaraAparece já a chama pelo nome. No Capitulo1, o agente ElevenLabs chama `confirmar_capitulo_1_fatos({ motherName: 'maria', ... })` (ou omite se ela não repetir o nome, e o schema tem motherName como required → agente inventa). `applyReceptionData` faz `motherName: data.motherName ?? ''` sem checar o valor prévio → nome real é sobrescrito por versão hallucinada ou por string vazia. Mesma coisa com babyName. Fix: `motherName: data.motherName || get().motherName` e idem para babyName."
  },
  {
    "file": "src/components/reception/hooks/useSaraNarration.ts",
    "line": 44,
    "severity": "high",
    "summary": "`stop()` chama `setState` sem checar se componente montou; roda em cleanup do Capitulo1 → warning React de setState em unmounted",
    "reproduction": "Capitulo1.useEffect retorna `() => stop()`. Quando o beat avança, Capitulo1 desmonta e `stop()` roda; ele faz `setState(s => ...)` e `setAmplitude(0)` no hook cujo componente-dono já desmontou. Em StrictMode dev, esse padrão dispara warning e pode indicar leak. Fix: guard `isMountedRef` + short-circuit, ou não chamar setters em stop() (deixar componente cair naturalmente)."
  },
  {
    "file": "src/components/reception/beats/Capitulo1.tsx",
    "line": 30,
    "severity": "high",
    "summary": "StrictMode dispara duas sessões ElevenLabs em paralelo no dev",
    "reproduction": "useEffect com deps [] roda 2× em StrictMode. Primeiro cleanup dispara `stop()` que chama `endSession()` (async, sem await) e limpa `convRef.current = null`. Mas o primeiro `startCapitulo1` ainda está no meio do `await Conversation.startSession` — quando resolve, ele grava a conversation em `convRef.current`, sobrepondo o `null`. Segundo `startCapitulo1` já foi disparado, cria segunda sessão. Duas sessões ficam vivas até a real primeira ser fechada por GC. Consome minutos do plano ElevenLabs em dobro. Fix: usar `AbortController` ou `mounted` ref para descartar sessão obsoleta na resolução."
  },
  {
    "file": "src/components/home/HomeScreen.tsx",
    "line": 27,
    "severity": "high",
    "summary": "Saudação sempre diz 'Bom dia', mesmo às 22h — quebra o teste da amiga",
    "reproduction": "`SARA_FRASES.primeiraHome` retorna string começando com 'Bom dia' independente da hora local. Mãe abre o app às 21h no primeiro dia → 'Bom dia, Maria. Hoje vocês chegaram à 30ª semana...'. Blueprint §3 exige que a Sara não fale como bot. Amiga real diria 'Boa noite'. Fix: passar hora atual e ramificar (Bom dia / Boa tarde / Boa noite) baseado em `new Date().getHours()`."
  },
  {
    "file": "src/components/reception/beats/SaraAparece.tsx",
    "line": 28,
    "severity": "high",
    "summary": "Botão 'Vamos lá' aparece com delay fixo de 1.2s (motion delay), não após Sara terminar de falar",
    "reproduction": "Sem TTS ligado (Finding #1), botão surge após 1.2s. Mas mesmo se `speak()` existisse, o delay é hard-coded. Plano Task 9 pede que 'Após speak resolver, botão aparece com fade-in'. Como está, mãe lê 3 linhas serifadas em 1.2s ou o botão aparece antes dela terminar de ler — quebra a intenção de calma que o beat prega."
  },
  {
    "file": "src/components/reception/hooks/useSaraNarration.ts",
    "line": 93,
    "severity": "medium",
    "summary": "Toggle inútil `pollingRef.current = false` seguido de `= true` no loop poll — código morto que confunde intenção",
    "reproduction": "Dentro de `poll()`: `pollingRef.current = false; requestAnimationFrame(poll); pollingRef.current = true;` — ambos os writes acontecem síncrono, não pausam nada. O guard real é setar `pollingRef.current = false` de fora (em `stop()`). Não é bug funcional, mas leitor achará que há uma máquina de debounce e vai regredir. Remover as duas linhas."
  },
  {
    "file": "src/components/reception/beats/Capitulo1.tsx",
    "line": 108,
    "severity": "medium",
    "summary": "Botão de enviar texto só habilita quando `state === 'listening'` — usuário digitando antes bloqueia com botão morto",
    "reproduction": "Cap1 monta, chama startCapitulo1 (assíncrono). Enquanto `state === 'connecting'`, a mãe digita a resposta ('grávida de 30 semanas'). Aperta enter → `disabled` porque state != listening. Ela reescreve? Perde o texto? Além disso, se sessão dá erro (`state === 'error'`), botão fica morto pra sempre. Fix: aceitar submit e enfileirar, ou tornar o botão claramente 'aguarde' visualmente."
  },
  {
    "file": "src/components/reception/beats/Capitulo1.tsx",
    "line": 115,
    "severity": "medium",
    "summary": "Copy 'Ou toque no orbe e fale com a Sara' é falsa — o orbe não é interativo",
    "reproduction": "O `OrbeVisual` é motion.div sem `onClick`, sem `role='button'`, sem tabIndex. Copy diz pra tocar; tocar não faz nada. Quebra teste da amiga (linguagem que promete o que não entrega). Ou tornar o orbe realmente um mic push-to-talk, ou reescrever a copy pra refletir que a Sara já está ouvindo passivamente."
  },
  {
    "file": "src/components/reception/beats/Presente.tsx",
    "line": 63,
    "severity": "medium",
    "summary": "Botão 'Entrar' fica dentro de container sem `min-height` reservado; layout salta quando aparece",
    "reproduction": "Div `px-6 pb-12` sem altura mínima. Versículo renderiza aos 2.2s; botão renderiza aos 5.2s dentro de container vazio → altura total muda, causando layout shift. Cognitivamente, isso quebra o efeito de 'respiração visual' que o blueprint pede. Fix: reservar `min-h-[64px]` no container do botão."
  },
  {
    "file": "src/components/reception/beats/Presente.tsx",
    "line": 8,
    "severity": "medium",
    "summary": "Presente ignora `motherName` (prop removida em relação ao plano); versículo não pode ser personalizado no futuro",
    "reproduction": "ReceptionFlow passa apenas `mood` e `onEnter`. Plano Task 14 previa `motherName` como prop. Não é bug hoje (versículo não usa nome), mas se um dia quiser 'Uma palavra pra você, Maria.' vai ter que alterar assinatura. Baixo impacto — só flag pra revisão futura."
  },
  {
    "file": "src/data/reception/sara-frases.ts",
    "line": 4,
    "severity": "medium",
    "summary": "Frase canônica de `saraAparece` perdeu o emoji 😊 do blueprint",
    "reproduction": "Blueprint §2 (linha 35) grava: 'Oi, [nome]. 😊 Fico feliz que você esteja aqui.' Implementação: 'Oi, ${motherName}. Fico feliz que você esteja aqui.' — sem emoji. Emoji é decisão editorial do blueprint pra evitar frieza. Idem `primeiraHome` (perdeu 🌷 do blueprint linha 41). Restaurar ou deixar decisão explícita em ADR."
  },
  {
    "file": "src/components/reception/OrbeVisual.tsx",
    "line": 21,
    "severity": "low",
    "summary": "`aria-label='Sara'` em elemento decorativo confunde screen-reader — não é botão, não é imagem informativa",
    "reproduction": "Screen-reader vai anunciar 'Sara' toda vez que foca o orbe. Como é `motion.div` sem role, o AT vai tratá-lo como grupo genérico com label. Melhor `role='img' aria-label='Orbe da Sara, animação'` ou `aria-hidden` se puramente decorativo (o texto ao lado já cumpre a semântica)."
  },
  {
    "file": "src/components/reception/beats/Capitulo2.tsx",
    "line": 66,
    "severity": "low",
    "summary": "`aria-pressed` em `<button>` que não é toggle — troca de pergunta descarta seleção anterior",
    "reproduction": "Cards de mood têm `aria-pressed={mood === opt.value}`, mas ao clicar, o beat imediatamente avança pra pergunta 2 — nunca há ocasião em que dois cards da mesma pergunta convivam mostrando estado 'pressed'. Semanticamente errado (aria-pressed é pra toggle button); leitor de tela vai anunciar 'not pressed' em cada opção sem propósito. Remover, ou usar `role='radio'` + `aria-checked` se a ideia é radio group."
  },
  {
    "file": "src/components/reception/beats/PreparandoTudo.tsx",
    "line": 13,
    "severity": "low",
    "summary": "`useEffect(..., [data, onReady])` re-executa se ReceptionFlow trocar a referência de `data` — dispara `applyReceptionData` duas vezes",
    "reproduction": "Hoje, `data` do useReceptionState só muda quando `applyData` é chamado, e no beat `preparando-tudo` nada mais chama `applyData` — então é seguro. Mas se um refactor futuro re-cria `data` em cada render (por exemplo mudando pra `useMemo` com deps quebradas), o effect vai re-hidratar o store e re-agendar timeout, chamando `onReady` múltiplas vezes → beat avança prematuramente. Guard: rodar apenas uma vez com ref (`hasAppliedRef`) ou usar `useEffect(..., [])` com ESLint-disable + comentário justificando."
  }
]
```

---

## Sumário (não-JSON)

- **2 críticos**: Sara nunca fala (hook sem `speak`) + `applyReceptionData` sobrescreve motherName/babyName com dados do agente.
- **4 altos**: race de StrictMode com duas sessões ElevenLabs, saudação sempre 'Bom dia', setState em unmounted, botão hardcoded antes do speak.
- **6 médios**: copy que mente sobre interatividade do orbe, layout shift no Presente, emoji perdido do blueprint, botão de texto travado em connecting, deriva de props no Presente, código morto no poll.
- **3 baixos**: aria-label decorativo, aria-pressed sem toggle, useEffect com deps frágeis em PreparandoTudo.

Os dois críticos são o core do gap: a implementação entregou o **desenho visual** dos beats mas silenciou a Sara e colocou a hidratação do store em rota de colisão com o cadastro. Antes de qualquer outra iteração, restaurar `speak()` e proteger `motherName`/`babyName` no `applyReceptionData`.
