# Feed da Comunidade — como o "Para você" e o "Seguindo" funcionam

Data: 2026-09-18. Tickets: [TIA-6](https://linear.app/tiago-santo/issue/TIA-6) (visibilidade e feed cronológico), [TIA-44](https://linear.app/tiago-santo/issue/TIA-44) (modos e ranking).
Base para: [TIA-52](https://linear.app/tiago-santo/issue/TIA-52) (camada de personalização com consentimento).

Este documento descreve o algoritmo **como está no código**. Ao mudar pesos, fontes de sinal ou a paginação, atualize-o junto.

## 1. Resumo

- O feed tem dois modos, escolhidos pela pílula **Para você | Seguindo** na aba Comunidade.
  - **Seguindo:** só a rede da usuária, do mais novo para o mais antigo.
  - **Para você:** posts dos últimos 14 dias ordenados por uma **pontuação de relevância**; depois, os mais antigos em ordem cronológica.
- A pontuação é uma **regra fixa e transparente**, calculada no servidor a cada requisição, igual para todas.
- **Nenhum comportamento é registrado.** O algoritmo usa só dados que já existiam: curtidas, comentários, reposts e data dos posts; quem a usuária segue, as comunidades dela e a fase informada no cadastro.
- Todos os modos respeitam a **política de visibilidade** (comunidades privadas só para membros).

## 2. Onde está no código

| Parte | Arquivo |
|---|---|
| Rota do feed e os três modos | `server/src/routes/posts.ts` → `GET /posts` |
| Pontuação, pesos, ordenação e cursor do "Para você" | `server/src/lib/feedRanking.ts` |
| Quem pode ver qual post; cursor cronológico | `server/src/lib/postVisibility.ts` |
| Índices do feed (migration `20260918150000_add_post_feed_indexes`) | `server/prisma/schema.prisma` → `model Post` |
| Tela, seletor, cache por modo | `src/components/comunidade/ComunidadeScreen.tsx` |
| Testes da pontuação | `server/src/lib/feedRanking.test.ts` |
| Testes de integração (banco real) | `server/src/routes/posts.feedModes.test.ts`, `server/src/routes/posts.feed.test.ts` |

## 3. Visibilidade (vale para todos os modos)

`visiblePostWhere(viewerId)` define os posts que a usuária pode ver. Um post é visível quando:

- é **dela**; ou
- **não pertence a nenhuma comunidade**; ou
- está numa **comunidade pública**; ou
- está numa **comunidade privada da qual ela é membro**.

Reposts copiam a comunidade do post original, então seguem a mesma regra. Perfil, detalhe do post, comunidade, curtir, comentar e repostar usam a mesma função. Quem não pode ver recebe **404**, sem revelar que o post existe.

## 4. Os três modos de `GET /posts`

| Parâmetro | Quem usa | Conteúdo | Ordem |
|---|---|---|---|
| *(sem `mode`)* | apps já instalados (legado) | todos os posts visíveis | cronológica |
| `mode=following` | pílula **Seguindo** | posts dela + de quem ela segue + das comunidades dela | cronológica |
| `mode=foryou` | pílula **Para você** | todos os posts visíveis | relevância (14 dias), depois cronológica |

Em todos os modos, cada item traz `isSuggestion: true` quando o post é de fora da rede dela (não é dela, ela não segue a autora e não é de uma comunidade dela). O app mostra o selo **Sugestão**.

## 5. A pontuação do "Para você"

```
pontuação = (1 + engajamento)^0,8 × afinidade ÷ (idade_em_horas + 2)^1,5
```

**Engajamento** — conversa pesa mais que um toque:

```
engajamento = curtidas + 2 × comentários + 2 × reposts
```

**Afinidade** — começa em 1 e soma bônus:

| Condição | Bônus |
|---|---|
| a autora é alguém que ela segue (não vale para os próprios posts) | +1,0 |
| o post é de uma comunidade da qual ela é membro | +0,6 |
| a categoria do post combina com a fase dela | +0,4 |

Fase → categorias: **gestante** → `gestação`; **depois do parto** → `pós-parto` e `amamentação`.

**Recência** — o divisor `(idade + 2)^1,5` faz os posts afundarem com o tempo, como no ranking do Hacker News. O `+2` evita que um post de segundos atrás ganhe só por ser novo.

**Expoente 0,8 no engajamento** — retornos decrescentes: um post com 100 interações não vale 100× um post com uma.

### Constantes (`RANKING` em `feedRanking.ts`)

| Constante | Valor | Papel |
|---|---|---|
| `WINDOW_DAYS` | 14 | janela de posts ranqueados |
| `MAX_CANDIDATES` | 300 | máximo de posts pontuados por requisição |
| `ENGAGEMENT_EXP` | 0,8 | retornos decrescentes do engajamento |
| `GRAVITY` | 1,5 | força da queda com o tempo |
| `AGE_OFFSET` | 2 | suaviza posts recém-publicados |
| `BONUS_FOLLOWING` | 1,0 | bônus de quem ela segue |
| `BONUS_COMMUNITY` | 0,6 | bônus das comunidades dela |
| `BONUS_PHASE` | 0,4 | bônus da categoria da fase dela |

### Exemplo (usuária no pós-parto)

| Post | Engajamento | Afinidade | Idade | Pontuação |
|---|---|---|---|---|
| A — de quem ela **não** segue, categoria amamentação, 2 curtidas e 5 comentários | 12 | 1,4 | 6 h | **0,4816** |
| D — de uma comunidade dela, 1 curtida | 1 | 1,6 | 3 h | 0,2492 |
| C — de quem ela não segue, sem interação | 0 | 1,0 | 1 h | 0,1925 |
| B — de quem ela segue, sem interação | 0 | 2,0 | 5 h | 0,1080 |

Ordem no "Para você": **A, D, C, B**. O post em alta sobe mesmo sendo de fora da rede; o post de quem ela segue, parado há 5 h, fica atrás.

### Desempate

Pontuações iguais: o **mais novo** primeiro; depois, pelo `id`. A ordem é sempre determinística.

## 6. Paginação

### Cronológica (legado e "Seguindo")

Cursor estável `(createdAt, id)` — `encodeFeedCursor` / `afterFeedCursor`. A próxima página traz posts **estritamente anteriores** ao último visto; posts novos ou apagados não fazem repetir nem pular itens. O formato antigo de cursor (só o `id`), usado por apps instalados, continua aceito.

### Ranqueada ("Para você")

1. A **primeira página congela o momento do ranking** (`asOf`). As páginas seguintes reconsideram os mesmos posts (criados até `asOf`) com a mesma referência de tempo, então a ordem não muda enquanto ela rola.
2. O cursor guarda o **último item visto** — `(asOf, pontuação, createdAt, id)` — e a página seguinte continua **estritamente depois** dele na ordem (keyset). Posts apagados ou criados no meio da rolagem não deslocam a lista.
3. Quando acabam os posts da janela, o cursor passa a ser cronológico (`o~…`) e a rolagem continua pelos posts **mais antigos que a janela**, sem fim abrupto.
4. Se o engajamento de um post mudar entre páginas, ele pode, raramente, aparecer duas vezes; o app descarta a segunda cópia (`dedupeById`).

### Índices

Três índices na tabela `Post` servem todas as consultas acima (verificado com `EXPLAIN`: a ordenação por data vem do próprio índice):

| Índice | Consultas |
|---|---|
| `(createdAt, id)` | feed cronológico e cursor, janela de 14 dias do "Para você", aviso de novos posts |
| `(authorId, createdAt)` | perfil, "Seguindo" (quem ela segue), próprios posts |
| `(communityId, createdAt)` | tela da comunidade, "Seguindo" (comunidades dela) |

Os dois compostos com `authorId`/`communityId` também sustentam as chaves estrangeiras; o MySQL remove os índices simples antigos dessas colunas automaticamente.

## 7. No app

- Um cache por modo (`['posts', 'foryou']` e `['posts', 'following']`): alternar é instantâneo depois da primeira carga.
- A rolagem infinita pré-carrega a próxima página cerca de duas telas antes do fim.
- Publicação otimista e aviso "Novos posts ↑" funcionam nos dois modos (o post publicado entra no topo dos dois).
- "Seguindo" vazio mostra um convite para seguir pessoas ou entrar em comunidades.

## 8. Limitações conhecidas

- **Sem aprendizado:** a pontuação não se adapta ao que a usuária lê, oculta ou ignora.
- **Sem sinal negativo:** não existe "não quero ver isso"; um tema que a incomoda só some se o engajamento cair.
- **Afinidade grossa:** é binária (segue / não segue; membro / não membro). Não distingue quem ela lê sempre de quem ela seguiu uma vez.
- **Fase por categoria:** só as 4 categorias de post; não usa a semana da gestação nem a idade do bebê.
- **Custo:** até 300 posts pontuados em memória por requisição. Adequado ao volume atual; com volume muito maior, considerar pré-cálculo da pontuação.
- **Moderação:** posts removidos, bloqueios e suspensões ainda não existem; quando a TIA-16 criá-los, entram em `visiblePostWhere` e passam a valer em todos os modos.

## 9. Pontos de extensão para a TIA-52

A TIA-52 prevê uma camada de personalização **com consentimento**. Com ela, este algoritmo evolui sem mudar de estrutura:

| Sinal futuro (TIA-52) | Onde entra | Como |
|---|---|---|
| Interesses/temas que ela informou | `phaseCategoriesFor` / novo bônus | categorias ou temas preferidos somam afinidade |
| "Não quero ver isso" | `visiblePostWhere` ou penalidade na pontuação | ocultar a autora/tema, ou reduzir a afinidade |
| Afinidade aprendida (autoras, comunidades, categorias que ela mais lê) | `ViewerContext` + `scorePost` | substituir os bônus binários por pesos contínuos por autora/comunidade/categoria |
| Fase detalhada (semana, idade do bebê) | `phaseCategoriesFor` | mapear para temas por etapa |
| Explicabilidade ("Por que estou vendo isso?") | `rankWithScores` | expor quais bônus contribuíram para a pontuação |

Regras que devem continuar valendo:

- **Sem consentimento, o comportamento é exatamente o atual** (regra fixa, sem sinais novos).
- A **política de visibilidade** sempre decide antes do ranking.
- A pontuação deve continuar **explicável** — cada bônus com nome e peso conhecidos.
- Não otimizar só para tempo de tela; temas sensíveis (luto, depressão pós-parto, perda) não devem ser amplificados automaticamente.
