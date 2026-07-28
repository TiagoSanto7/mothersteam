# Motion Language — Mother's Team

> Discussão interna — 2026-07-27

---

## O princípio fundador

> **Uma animação nunca existe para ser bonita. Ela existe para explicar continuidade.**

Instagram, X, Linear, Arc Browser, Notion Calendar e Apple são os professores certos. Não o Material Design.

Toda animação responde uma de três perguntas:

- **De onde isso veio?**
- **Para onde isso foi?**
- **O que mudou?**

---

## As 3 Regras Fundamentais

### Regra 1 — Tudo nasce de algum lugar

Você toca num post. O post **cresce** — não aparece.  
Você toca num card bíblico. Ele **cresce**. Nunca abre outra tela.  
O usuário sente: *"Foi esse card."*

### Regra 2 — Tudo volta para onde veio

Você fecha. O card **encolhe**. Volta ao lugar de origem. Nunca dissolve.

### Regra 3 — Nada teleporta

Tela branca → outra tela = experiência morta. A continuidade espacial é inegociável.

---

## Os 3 Ritmos do App

Nem todas as telas se movem igual. O app tem três personalidades de movimento:

### 🌸 Calmo — Momento com Deus, Sara, Perfil
- Easing suave (`ease-out` ou `spring` de baixa tensão)
- 300–350 ms
- Mais fade, menos deslocamento
- Convida à contemplação

### ⚡ Funcional — Registrar mamada, sono, rotina
- 180–220 ms
- Foco em eficiência
- Sem efeitos desnecessários
- Resposta imediata

### 💬 Social — Comunidade
- 120–180 ms
- Microinterações frequentes
- Feedback imediato em curtidas e comentários
- Convida à interação

---

## Aplicações Específicas

### Abrir um post
Nunca abre tela nova. O card **expande** e ocupa ~90% da viewport. O fundo desfoca. Fechar = o card encolhe de volta para o feed. Instagram faz isso muito bem.

### Pull to Refresh
Hoje: spinner mecânico.  
Proposta: a Sara aparece discretamente.

```
Você puxa.
O círculo vira uma flor → folha → 🌷
Sara: "Deixa eu ver se apareceu alguma novidade..."
Solta.
Ela some. Carrega. Volta.
```

Só em poucos lugares selecionados — cria personalidade sem poluir.

### Transição entre abas
A barra inferior permanece fixa. O conteúdo desliza lateralmente. O **header muda com fade** — porque o header representa contexto, não conteúdo.

### Pesquisa
Você toca no 🔍.  
A SearchBar **cresce** — empurra o conteúdo para baixo. O teclado sobe junto. Nada troca de tela. (Referência: Instagram Search.)

### Curtir
Nunca spinner. Só ❤️ com pequena expansão. Pronto.

### Comentar
O teclado sobe. A tela **acompanha**. Sem trocar contexto.

### Sara — resposta IA
Texto não aparece instantaneamente nem "digita".  
Aparece **frase por frase**, com 150 ms de pausa entre elas.  
Como alguém pensando. Não como uma máquina imprimindo.

### Momento com Deus
Quase cinematográfico:

```
Você toca.
O restante da interface escurece.
O card cresce. A luz muda. Sem pressa.
Quando termina → tudo volta.
```

É um ritual. Tratar como tal.

### Loading
**Nunca spinner.**

> Spinner diz: *Estou esperando.*  
> Animação diz: *Algo está acontecendo.*

### Scroll
Damping ligeiramente aumentado. Tudo parece mais macio, mais calmo — especialmente nas telas de ritmo 🌸.

---

## Motion Language — 15 Regras

1. Elementos nunca aparecem do nada.
2. Elementos sempre voltam para sua origem.
3. Toda ação tem resposta em até **100 ms**.
4. A navegação preserva contexto espacial.
5. Bottom sheets = ações rápidas e temporárias.
6. Telas inteiras = mudança real de contexto.
7. Modais = foco exclusivo.
8. Pull to refresh sempre comunica personalidade da Sara.
9. Nenhuma animação dura mais que **350 ms** (exceto experiências contemplativas).
10. Elementos importantes **expandem**; elementos secundários **desaparecem**.
11. O usuário nunca perde a referência espacial.
12. Curtidas, saves e reações são instantâneas — otimismo total, rollback silencioso.
13. O ritmo da animação comunica o ritmo da tela (calmo / funcional / social).
14. Nunca use spinner para loading que dura menos de 300 ms.
15. Shared element transitions > slide transitions sempre que houver um elemento de origem claro.

---

## Referências de Implementação (Framer Motion + React)

```ts
// Ritmo Calmo (Sara, Momento com Deus)
const calm = {
  type: 'spring',
  stiffness: 120,
  damping: 20,
  mass: 1,
}

// Ritmo Funcional (Rotina, Registros)
const functional = {
  type: 'tween',
  ease: [0.4, 0, 0.2, 1],
  duration: 0.2,
}

// Ritmo Social (Comunidade)
const social = {
  type: 'spring',
  stiffness: 400,
  damping: 28,
}

// Shared Element (expandir card para detalhe)
const expand = {
  layoutId: 'post-${id}',  // Framer Motion layout animation
  transition: calm,
}
```

---

## Próximos passos sugeridos

1. **Shared element transitions** nos cards de post (Framer Motion `layoutId`)
2. **Tab content slide** com header fade independente
3. **Pull to refresh customizado** com SVG animado da Sara
4. **Curtidas imediatas** — já quase lá, só falta o micro-bounce do ❤️
5. **Sara phrase-by-phrase** — streaming por sentença com pausa de 150 ms
6. **Momento com Deus cinematic** — backdrop blur + scale entry
