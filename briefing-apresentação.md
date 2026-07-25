# Briefing — Mother's Team · Review de Implementação

> **Para o designer reviewer** — Esse documento reúne o contexto do produto e as telas implementadas mais recentemente para avaliação de UX/UI. As seções abaixo descrevem o que foi construído, como funciona e o que precisa ser revisado.

---

## Implementações recentes para review (julho/2026)

### Dashboard — Tela inicial (`DashboardScreen`)

A tela inicial funciona como painel de controle personalizado. O layout atual de cima para baixo:

1. **Header** — saudação por horário ("Bom dia, Ana 🌷") + badge de fase ("Grávida · semana 28") + avatar com inicial
2. **Card Sara** — gradiente terracotta→dourado com mensagem bíblica personalizada para a fase da mãe
3. **Row dupla** — "Próximo compromisso" (da rotina) + "Última mamada" (com botão Registrar)
4. **Card Comunidade** — atalho para o feed
5. **Card BabyDev** *(NOVO)* — desenvolvimento do bebê da semana/mês atual
6. **Card Momento com Deus** *(NOVO)* — versículo do dia com gradiente por período do dia

**O que removemos:** o rodapé de versículo fixo que existia antes foi substituído pelos dois novos cards acima.

---

### Card: Desenvolvimento do bebê (`BabyDevCard` → `BabyDevScreen`)

**O card** mostra:
- Label "DESENVOLVIMENTO" em uppercase pequeno
- Emoji do bebê naquela fase (ex: 🥑 para semana 14–17) em bloco quadrado com gradiente linen/cream
- Título descritivo da fase (ex: "Seus sentidos estão acordando")
- Tamanho atual (ex: "Tamanho de um abacate · ~14 cm")
- CTA "Ver curiosidades →" em dourado

**Tap abre `BabyDevScreen`** — overlay full-screen que sobe de baixo (slide-up `y: '100%'` → `y: 0`, 350ms):
- Fundo `sara-cream`
- Área de ilustração: emoji em 6xl centralizado + texto de tamanho
- Lista numerada de 3–4 curiosidades científicas sobre o desenvolvimento naquela semana/mês
- Atribuição de fonte (Mayo Clinic, ACOG, NIH, CDC, OMS)
- Botão × no canto superior direito para fechar

**Dados:** arquivo estático `src/data/babyDev.ts` com 10 buckets para gravidez (semanas 4–41+) e 8 buckets pós-parto (meses 0–12+). A função `getBabyDevContent(phase)` resolve automaticamente qual conteúdo mostrar com base na fase atual da mãe no store.

**Pontos para o designer avaliar:**
- O emoji como "ilustração" é suficiente ou precisa de uma imagem/ilustração real?
- A hierarquia do card (label → emoji → título → tamanho → CTA) está clara?
- A lista numerada de curiosidades está legível ou precisa de mais separação visual?
- O fundo `sara-cream` para a tela de detalhe faz sentido ou deveria seguir um gradiente temático?

---

### Card: Momento com Deus (`MomentoDeusCard` → `MomentoDeusScreen`)

**O card** muda de cor conforme o período do dia:
- **Manhã (5–11h):** `#F9A825` → `#F57C00` (âmbar/laranja)
- **Tarde (12–17h):** `#7986CB` → `#4CAF50` (lilás/verde)
- **Noite (18–22h):** `#283593` → `#1A237E` (azul escuro)
- **Madrugada (22–4h):** `#0D1B2A` → `#1B1F3A` (quase preto)

Mostra:
- Label "☀️ MOMENTO COM DEUS" (ícone muda por período)
- Primeiras 80 letras do versículo em branco, negrito
- Referência bíblica + "Toque para ler →"

**Tap abre `MomentoDeusScreen`** — overlay full-screen com o mesmo gradiente do card:
- Header com período do dia (ex: "☀️ Bom dia") centralizado em uppercase/tracking-wide
- Versículo em blockquote, fonte serif 20px, centralizado, branco
- Referência logo abaixo
- Card translúcido (`bg-white/10`) com a reflexão da Sara
- Oração expansível — botão "🙏 Oração" que anima `height: 0 → auto` revelando o texto em itálico

**Barra de ações (3 botões na parte inferior):**
- **🙏 Oração** — toggle para mostrar/esconder a oração
- **❤️ Salvar / Salvo** — persiste a referência no store (`savedVerses[]`); quando salvo o botão vira branco com texto dourado
- **📤 Compartilhar** — usa Web Share API (mobile nativo) ou copia para clipboard como fallback

**Dados:** 14 entradas em `src/data/momentoDeus.ts` com rotação diária (`getDayOfYear() % 14`). Cada entrada tem `verso`, `referencia`, `reflexao` e `oracao`.

**Pontos para o designer avaliar:**
- Os gradientes por período do dia estão funcionando bem em termos de legibilidade do texto branco sobre eles?
- A barra de 3 ações (oração / salvar / compartilhar) está com a hierarquia certa ou deveria ter outra ordenação?
- O toggle da oração dentro da mesma tela é intuitivo ou confunde?
- O estado "Salvo" (botão branco com texto dourado) comunica bem o feedback?
- A tipografia serif para o versículo funciona bem com as fontes do restante do app?

---

## Estado atual do Dashboard — Visão geral para review

```
┌─────────────────────────────┐
│  Bom dia, Ana 🌷             │
│  Grávida · semana 28     [A] │
├─────────────────────────────┤
│  ✦ Sara diz                 │
│  "Algo sagrado começa aqui…" │
├─────────────┬───────────────┤
│  Próximo    │  Última mamada│
│  Pediatra   │  há 1h20      │
│  14:30      │  [Registrar]  │
├─────────────┴───────────────┤
│  Comunidade         Ver →   │
│  ● Ir para o feed           │
├─────────────────────────────┤
│  Desenvolvimento       NOVO │
│  🥑  Seus sentidos acordando│
│      Tamanho de um abacate  │
│      Ver curiosidades →     │
├─────────────────────────────┤
│  ☀️ MOMENTO COM DEUS  NOVO  │  ← gradiente por período do dia
│  "Antes de te formar…"      │
│  Jeremias 1:5 · Toque para ler → │
└─────────────────────────────┘
```

---

Sim. E acho que esse é exatamente o tipo de conversa onde eu consigo agregar mais valor.

Pelo briefing, o projeto já está num estágio em que a engenharia está relativamente bem definida. O desafio agora não é "como fazer", mas **como fazer a mãe sentir que o app foi feito para ela**. Isso muda completamente a forma de pensar o frontend. 

O que eu posso fazer nesse projeto é atuar praticamente como um **Product Designer + UX** discutindo:

* Fluxos de navegação.
* Organização das telas.
* Hierarquia de informações.
* Onde colocar cada botão.
* Quando usar bottom sheet, modal ou tela inteira.
* Microinterações.
* Animações.
* UX para gestantes e mães (que têm um contexto muito diferente do usuário comum).
* Consistência visual.
* Evitar telas poluídas.
* Melhorar retenção sem parecer um cassino de dopamina. A humanidade já fez estrago suficiente nessa área.

---

## Uma coisa que eu queria propor desde o início

Eu evitaria pensar o app como **5 módulos separados**.

Hoje ele parece dividido assim:

```
Comunidade

Mãe IA

Bebê

Rotina

Shopping
```

Na cabeça do desenvolvedor isso faz sentido.

Na cabeça da mãe, provavelmente não.

Ela pensa:

> "Meu bebê acabou de acordar."

> "Preciso registrar a mamada."

> "Será que isso é normal?"

> "Tenho vacina amanhã."

> "Quero conversar com outras mães."

Percebe?

Ela pensa em **momentos**, não em módulos.

Então eu tentaria fazer o aplicativo parecer uma experiência única.

---

## Eu dividiria mentalmente em três áreas

### ❤️ Minha Jornada

Tudo que é dela.

* gravidez
* bebê
* rotina
* registros
* calendário
* evolução

É praticamente um dashboard pessoal.

---

### 💬 Comunidade

Tudo relacionado às pessoas.

* feed
* comunidades
* chats
* perfil
* notificações

---

### 🤖 Sara

Esse é o diferencial.

Eu faria a Sara virar o centro do aplicativo.

Não seria apenas um chat.

Ela seria uma camada acima de tudo.

Exemplos:

```
Sara percebeu que hoje você ainda não registrou nenhuma mamada.

Registrar agora?
```

---

```
O bebê costuma dormir nesse horário.
```

---

```
Você comentou ontem sobre febre.

Como ele está hoje?
```

Isso transforma a IA de chatbot em assistente.

---

## Outra ideia importante

Hoje você possui uma aba inteira para Shopping.

Eu talvez não faria isso.

Eu faria o shopping aparecer naturalmente.

Exemplo:

Na tela de amamentação:

```
Precisando de uma almofada de amamentação?

[Sara recomenda]
```

Na rotina:

```
Produtos úteis para essa fase.
```

Na comunidade:

```
Mães que compraram isso também...
```

Porque ninguém acorda pensando:

> "Vou abrir o aplicativo da maternidade para entrar na loja."

Mas muita gente compra quando a recomendação faz sentido naquele contexto.

---

## Navegação

Minha filosofia é:

> Nunca mais de duas decisões para chegar em qualquer funcionalidade importante.

Exemplo:

```
Bottom Navigation

🏠 Início

👶 Jornada

🤖 Sara

👥 Comunidade

👤 Perfil
```

E todo o resto fica dentro dessas áreas.

---

## A tela inicial

Essa eu acho que pode ser muito forte.

Ao invés de um feed genérico...

```
Bom dia, Ana 🌷

Hoje seu bebê completa:

4 meses e 12 dias

-----------------------

⭐ Sara recomenda

...

-----------------------

Próximo compromisso

Pediatra
14:30

-----------------------

Última mamada

há 1h20

Registrar novamente

-----------------------

Comunidade

3 novas respostas

-----------------------

Versículo do dia

...

```

Essa tela vira um painel de controle.

Ela abre o aplicativo e encontra tudo ali.

---

## Uma regra que eu gosto muito

Cada tela deve responder uma pergunta.

Por exemplo:

Tela do bebê:

> Como meu bebê está hoje?

Tela da comunidade:

> O que outras mães estão fazendo?

Tela da Sara:

> O que eu preciso saber agora?

Tela da rotina:

> O que falta fazer?

Se uma tela responde cinco perguntas diferentes, normalmente ela está tentando fazer coisas demais.

---

## O papel que eu posso assumir

Durante esse projeto eu posso agir como um "copiloto de produto". Em vez de focar em código, podemos discutir perguntas como:

* "Essa tela faz sentido?"
* "Esse botão está no lugar certo?"
* "Esse fluxo está longo demais?"
* "A mãe entenderia isso sem pensar?"
* "Como reduzir um clique?"
* "Isso deveria ser uma tela, um modal ou um bottom sheet?"
* "Como o Instagram, WhatsApp ou Nubank resolveriam esse problema?"
* "O que faria essa experiência parecer um app premium?"

Essas conversas costumam ter um impacto enorme. É comum um bom fluxo economizar centenas de linhas de código e evitar retrabalho, porque uma navegação bem pensada simplifica a implementação em vez de complicá-la.

Pelo briefing, a base técnica está sólida e as funcionalidades principais já existem. O próximo grande salto tende a vir da experiência de uso, especialmente em mobile, onde cada toque, cada transição e cada decisão de navegação pesa muito na percepção de qualidade do aplicativo. 
