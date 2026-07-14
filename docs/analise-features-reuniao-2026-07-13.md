# Análise de Features — Reunião 2026-07-13

> Documento de leitura para avaliação. Não é um plano de implementação — é a pesquisa e análise de cada ponto levantado na reunião para orientar decisões de produto antes de começar a construir.
>
> Gerado em: 2026-07-13 | Autor: Claude Sonnet 4.6

---

## Índice

1. [Onboarding em Conversa Natural com Sara (com escolha de modo)](#1-onboarding-em-conversa-natural-com-sara)
2. [Mensagem de Deus — Primeira Interação](#2-mensagem-de-deus--primeira-interação)
3. [Versículos Bíblicos em Cada Aba (70 mensagens)](#3-versículos-bíblicos-em-cada-aba)
4. [Perguntas Dinâmicas por Fase do Bebê](#4-perguntas-dinâmicas-por-fase-do-bebê)
5. [Segurança Contra Perfis Falsos](#5-segurança-contra-perfis-falsos)
6. [Tutorial Interno Guiado com Sara](#6-tutorial-interno-guiado-com-sara)
7. [Sugestões de Shopping Ativáveis](#7-sugestões-de-shopping-ativáveis)
8. [Idade da Mãe e Mães Adolescentes](#8-idade-da-mãe-e-mães-adolescentes)
9. [Roadmap e Priorização](#9-roadmap-e-priorização)
10. [Custos Estimados](#10-custos-estimados)

---

## 1. Onboarding em Conversa Natural com Sara

### O que é

Antes de responder as perguntas de cadastro, a usuária escolhe **como quer preencher**:

- **Modo Conversa** → Sara conduz o onboarding como uma conversa de voz, fazendo as perguntas naturalmente ("Oi, que bom ter você aqui! Pode me dizer qual semana de gestação você está?")
- **Modo Formulário** → o fluxo de 2 etapas que já temos hoje

Essa escolha deve aparecer logo após o cadastro básico (nome, e-mail, senha) e antes das perguntas gestacionais.

### Por que isso importa

O formulário atual é eficiente mas frio. A conversa com a Sara cria conexão emocional desde o primeiro momento — o produto já se sentindo "vivo" antes de o onboarding terminar. Para o público-alvo (mães em período emocional sensível), esse diferencial importa.

---

### Opções Técnicas

#### Opção A — Só Voz, Sem Vídeo (mais simples, mais rápido)

**Como funciona:**
A Sara é representada pela sua imagem estática (que já existe). A usuária toca em um botão de microfone, fala a resposta, e a Sara responde em voz e texto.

**Stack técnica:**
- **ElevenLabs Conversational AI** — pipeline completo: STT (fala da usuária → texto) + LLM (Claude ou GPT processa a resposta) + TTS (texto → voz da Sara em português brasileiro)
- Latência de resposta: ~75ms (sub-second)
- SDK oficial para React disponível
- Voz da Sara: pode ser criada por **Instant Voice Cloning** (1-2 min de áudio gravado da atriz da Sara) ou escolhida entre as vozes prontas em PT-BR da ElevenLabs

**Vantagem:** desenvolvimento em 1-2 semanas, custo por minuto de conversa baixo.  
**Desvantagem:** experiência mais simples — Sara é uma foto parada.

---

#### Opção B — Voz + Avatar Animado por CSS/Lottie (recomendada)

**Como funciona:**
A Sara tem dois estados visuais: parada (idle, pequena animação de respiração) e falando (boca animada, expressão viva). Enquanto o áudio do ElevenLabs toca, a animação de "falando" ativa. Quando para, volta para idle.

**Stack técnica:**
- ElevenLabs para o pipeline de voz (igual à Opção A)
- A imagem base da Sara é separada em camadas (Figma → PNG): rosto, boca fechada, boca aberta, expressão
- Animação controlada por CSS keyframes + `onTimeUpdate` do elemento de áudio
- Alternativa: exportar uma animação Lottie do designer (30-60 frames) com estados da Sara

**Vantagem:** experiência muito mais rica visualmente, Sara parece "viva", sem custo adicional de API.  
**Desvantagem:** exige trabalho de design (separar as camadas da Sara, criar estados de animação) — entre 1-3 dias de design + 1-2 dias de desenvolvimento da animação.

---

#### Opção C — Vídeo Real com HeyGen (para momentos pré-definidos, não para chat)

**Como funciona:**
HeyGen tem uma API de **Photo Avatar** — você envia a foto da Sara + um texto/áudio, e eles devolvem um vídeo MP4 da Sara falando, com lipsync sincronizado. Runway tem feature equivalente chamada "Add Dialogue".

**Stack técnica:**
- HeyGen Photo Avatar API: $0,05 por segundo de vídeo gerado
- Um onboarding de 5 perguntas com respostas de ~5 segundos cada = ~25 segundos de vídeo = ~$1,25 por geração
- Os vídeos são gerados **uma vez** e armazenados no servidor — não em tempo real
- Funciona para onboarding com respostas pré-roteirizadas, não para conversa livre

**Vantagem:** qualidade máxima, a Sara parece absolutamente real falando.  
**Desvantagem:** não é interativo — a Sara só pode falar textos pré-definidos. Se a resposta da usuária fugir do roteiro, o sistema não consegue gerar uma resposta nova em tempo real (latência de geração de vídeo é de 30-60 segundos). **Não serve para conversa livre.**

---

#### Opção D — Híbrido: Opção C para onboarding + Opção B para chat

O onboarding tem um roteiro fixo (sempre as mesmas perguntas), então vídeos pré-gerados funcionam perfeitamente aqui. Para chat livre na MãeIA, usa a Opção B (animação). Essa é a abordagem mais premium visualmente mas também a mais trabalhosa de manter (cada mudança no roteiro do onboarding exige regenerar os vídeos).

---

### Runway vs HeyGen — Comparativo Direto

| Critério | Runway | HeyGen |
|----------|--------|--------|
| Qualidade de lipsync | Muito alta | Alta |
| Preço API | Crédito por segundo (similar) | $0,05/s de vídeo |
| Latência de geração | ~30-60s | ~20-40s |
| API documentada para produção | Sim | Sim, mais madura |
| Suporte a PT-BR | Sim | Sim |
| Uso recomendado | Conteúdo criativo, vídeos longos | Avatares corporativos, onboarding |
| **Veredicto para este caso** | Funciona, mas HeyGen é mais direto | ✅ Melhor escolha para Photo Avatar |

**Conclusão sobre Runway:** O Runway é excelente para geração de vídeo criativo e cinematográfico. Para o caso específico de "foto da Sara falando", o HeyGen é mais direto, mais barato por segundo e mais fácil de integrar. Runway seria mais útil se quisessem gerar **cenas animadas** da Sara em ambientes diferentes (ex: Sara em uma sala de maternidade, Sara em um jardim) — cenários que o HeyGen não faz tão bem.

---

### Recomendação Final para o Onboarding de Voz

**Curto prazo (mais rápido de entregar):** Opção A ou B  
→ ElevenLabs para voz + imagem animada da Sara  
→ Conversa livre e responsiva, sem custo de vídeo  

**Médio prazo (experiência premium):** Opção D  
→ Vídeos HeyGen pré-gerados para as perguntas fixas do onboarding  
→ ElevenLabs + animação para o chat livre da MãeIA  

**O que NÃO fazer:** tentar usar Runway/HeyGen para geração em tempo real de respostas — a latência de geração de vídeo (30-60s) quebra completamente a experiência de conversa.

---

### Fluxo da Tela de Escolha (antes das perguntas gestacionais)

```
┌──────────────────────────────────┐
│  Como você prefere nos contar    │
│  sobre a sua gestação?           │
│                                  │
│  ┌────────────────────────────┐  │
│  │  🎙️ Conversar com a Sara   │  │  ← abre modo voz
│  │  Ela te guia naturalmente  │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │  📋 Preencher formulário   │  │  ← fluxo atual
│  │  Rápido e direto           │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

Importante: a escolha deve ser salva. Se a usuária saiu no meio da conversa e voltou, ela não precisa repetir o que já respondeu.

---

### Voz da Sara — Clonagem

Para que a Sara tenha uma voz consistente em todo o app:

- **Instant Voice Cloning (ElevenLabs):** requer 1-2 minutos de áudio gravado da atriz/voz da Sara. Disponível a partir do plano Starter ($11/mês). Boa fidelidade.
- **Professional Voice Cloning:** requer 30+ minutos de áudio. Exige plano Creator ($44/mês). Qualidade muito superior — captura nuances emocionais, sotaque, timbre. Recomendado se a Sara será a voz oficial do produto.
- **Voz pronta PT-BR:** ElevenLabs tem várias vozes femininas em português brasileiro pré-prontas. Opção temporária para protótipo antes de gravar a voz oficial.

---

## 2. Mensagem de Deus — Primeira Interação

### O que é

Logo após concluir o onboarding (seja por conversa ou formulário), a usuária vê uma tela especial — não funcional, não de navegação, apenas emocional. Uma mensagem espiritual de boas-vindas à maternidade.

### Variantes por perfil

| Perfil | Tom da mensagem |
|--------|----------------|
| Gestante (1º trimestre) | Encorajamento, o início de algo sagrado |
| Gestante (2º trimestre) | Força, o bebê cresce, você também |
| Gestante (3º trimestre) | Coragem para o parto, não estás só |
| Pós-parto (0-3 meses) | Cansaço é sagrado, você está dando vida |
| Pós-parto (3-12 meses) | Você já é uma mãe experiente sem perceber |
| Mãe adolescente | Mensagem de acolhimento específica, sem julgamento |

### Formato sugerido

- Tela cheia com a cor/gradiente do app
- Versículo ou texto espiritual (pode não ser bíblico para alcançar diferentes religiões) centralizado
- Imagem sutil da Sara ao lado
- Botão discreto "Entrar no app" ou auto-avança após 5 segundos
- Animação de entrada suave (fade in)

### Decisão de produto necessária

1. O texto é **sempre bíblico** ou pode ser espiritual mais amplo (para alcançar mães que não são cristãs)?
2. A mensagem de Deus muda no aniversário do bebê, no dia do parto previsto, ou é só no primeiro onboarding?

### Esforço técnico

Baixíssimo. É uma tela estática com conteúdo condicional por perfil. Não requer backend. Uma manhã de desenvolvimento + aprovação do copy.

---

## 3. Versículos Bíblicos em Cada Aba

### O que é

Cada aba do app exibe um versículo diferente por dia (ou por visita). Total: 70 versículos — suficiente para ~2 meses sem repetição.

### Decisões de produto necessárias

**Tradução bíblica:** qual usar?
| Tradução | Perfil | Observação |
|----------|--------|-----------|
| NVI (Nova Versão Internacional) | Evangélico contemporâneo | Mais popular em igrejas jovens |
| ARC (Almeida Revista e Corrigida) | Evangélico tradicional/batista | Linguagem mais clássica |
| NVT (Nova Versão Transformadora) | Acessível, linguagem simples | Melhor para público amplo |
| Bíblia Sagrada CNBB | Católico | Se o público incluir católicas |

**Rotatividade:** versículo muda por dia (mesma versão para todas as usuárias no mesmo dia) ou é aleatório por usuária?

**Por aba ou global?** Uma opção é ter versículos temáticos por aba:
- Home → versículos sobre força e rotina
- Baby → versículos sobre filhos e família
- MãeIA → versículos sobre sabedoria
- Comunidade → versículos sobre comunidade/amor ao próximo
- Shopping → versículos sobre provisão/bênçãos

### Implementação

Um arquivo `src/data/versiculos.ts` com array de 70 objetos `{ id, text, reference, tab? }`. Exibição por dia via `new Date().getDay() + getWeekNumber()` como índice. Sem backend, sem API. **Meia tarde de desenvolvimento** depois que o conteúdo for definido.

---

## 4. Perguntas Dinâmicas por Fase do Bebê

### O que é

As quick chips (perguntas sugeridas) na MãeIA e os cards de conteúdo no app mudam conforme a fase da usuária, calculada automaticamente a partir do perfil.

### Mapa de fases sugerido

| Fase | Critério | Temas principais |
|------|----------|-----------------|
| Gestação T1 | semanas 1-13 | Náuseas, vitaminas, pré-natal |
| Gestação T2 | semanas 14-27 | Chutes, ultrassom, enxoval |
| Gestação T3 | semanas 28-42 | Parto, mala maternidade, licença maternidade |
| Pós-parto newborn | 0-30 dias | Amamentação, pega, sono, choro |
| Pós-parto 4ª trimestre | 1-3 meses | Cólica, vacinas, sono em blocos |
| Bebê 3-6 meses | | Sorriso social, primeiras risadas, tummy time |
| Bebê 6-12 meses | | Introdução alimentar, engatinhar, primeiras palavras |
| Criança 1-2 anos | | Andador, birra, linguagem |
| Criança 2+ anos | | Desfralde, escola, sibling |

### Dados que já temos

O perfil já tem `pregnancyStage` + `pregnancyWeek` + `babyAgeInDays`. A fase é calculável sem nenhuma pergunta adicional. Só precisamos criar a tabela de conteúdo e a lógica de seleção.

### Considerações

- `babyAgeInDays` no cadastro vai ficando desatualizado. Idealmente calculamos a idade em tempo real a partir de uma **data de nascimento do bebê** (ver Feature 8 — Idade da Mãe).
- Sugestão: migrar de `babyAgeInDays` (estático) para `babyBirthDate` (dinâmico). A idade é calculada ao abrir o app.

### Esforço

Médio. A estrutura de dados é simples, mas o conteúdo (perguntas e temas por fase) precisa de curadoria. Desenvolvimento: 1-2 dias. Curadoria de conteúdo: separado.

---

## 5. Segurança Contra Perfis Falsos

### O problema

O app reúne mães em situação de vulnerabilidade (gestantes, pós-parto). Homens se passando de mães, oportunistas e perfis falsos são um risco real para a comunidade.

### Opções de verificação

#### Opção A — SERPRO Datavalid (verificação governamental brasileira)

**Como funciona:** A usuária informa o CPF + tira uma selfie. O SERPRO compara a selfie com a foto na base do governo (CNH, Título de Eleitor, Passaporte). Retorna um score de similaridade.

**Vantagens:**
- Base de dados governamental — a mais confiável do Brasil
- Suporta liveness detection (detecta que é uma pessoa real, não uma foto de foto)
- Valida CPF + biometria em uma única chamada
- Preço mais acessível que soluções privadas

**Desvantagens:**
- Funciona apenas para brasileiras com CPF (exclui estrangeiras)
- Não verifica se a pessoa é mulher/mãe — só que existe e que o rosto bate com o CPF
- Exige contratação via portal SERPRO (processo burocrático)
- Adolescentes de 10-15 anos: nem todas têm CPF

---

#### Opção B — unico.io (líder de mercado privado no Brasil)

**Como funciona:** SDK mobile (funciona em app web via WebView ou React Native) que faz:
1. Liveness detection — câmera verifica que é uma pessoa viva presente
2. Comparação facial com documento fotografado
3. OCR do documento (RG, CNH, Passaporte)
4. Verificação cruzada com bases externas

**Vantagens:**
- Produto mais polido e melhor UX que o SERPRO
- Detecta deepfakes e photos-of-photos
- Funciona sem CPF (aceita RG físico)
- SDK web disponível — integra no app atual sem precisar de app nativo

**Desvantagens:**
- Preço por consulta (não público — exige proposta comercial)
- Geralmente mais caro que o SERPRO
- Exige contrato

---

#### Opção C — Verificação Leve (sem biometria)

Alternativa menos invasiva para MVP:
1. **Verificação de e-mail** (já temos)
2. **Declaração de gênero** com checkbox de aceite dos termos
3. **Moderação humana reativa** — usuários podem denunciar perfis suspeitos e moderadores revisam
4. **Badge "Verificada"** para quem completou verificação documental (opcional, não obrigatória para usar o app)

**Vantagem:** zero custo adicional, zero atrito no cadastro.  
**Desvantagem:** não previne proativamente — só reage a problemas após ocorrerem.

---

### Decisão de Produto Crítica

Verificação de identidade **obrigatória** vs **opcional com badge**:

| Abordagem | Conversão no cadastro | Segurança | Custo |
|-----------|----------------------|-----------|-------|
| Obrigatória para todos | Queda significativa (~20-40%) | Alta | Alto (toda usuária paga verificação) |
| Obrigatória para DMs | Queda pequena (só quem quer DM) | Média-alta | Médio |
| Opcional com badge | Sem queda | Baixa proativa | Baixo (só quem escolhe verifica) |
| Moderação reativa | Sem queda | Baixa | Baixo |

**Recomendação:** Lançar com Opção C (moderação reativa + denúncias) para não criar atrito no MVP. Adicionar verificação opcional com badge "Mãe Verificada" na fase seguinte. Tornar obrigatória para funcionalidades específicas (ex: grupos fechados, DMs com menores) em uma terceira fase.

### Nota LGPD sobre Dados Biométricos

Dados biométricos são **dados sensíveis** pela LGPD. Exigem:
- Consentimento explícito destacado (não pode estar no meio dos termos gerais)
- Política de privacidade específica para biometria
- Prazo de retenção definido
- Impossibilidade de compartilhamento sem consentimento adicional

---

## 6. Tutorial Interno Guiado com Sara

### O que é

Na primeira sessão após o onboarding, a Sara guia a usuária pelas abas do app — o equivalente a um "tour de primeiro uso" que explica o que cada seção faz.

### Duas versões possíveis

#### Versão 1 — Spotlight Tour (bibliotecas prontas)

Um overlay semitransparente com um "spotlight" (buraco iluminado) sobre o elemento da UI que está sendo explicado. Balão de texto ao lado com Sara falando. Botão "próximo" para avançar.

**Bibliotecas:**
- **React Joyride** (recomendada) — 340K downloads/semana, MIT, suporte a React 18/19, bem documentada, beacon animado que aparece nos elementos. Pronta em 20 minutos.
- **Shepherd.js** — mais customizável visualmente, mas wrapper React não é compatível com React 19 (usa shepherd.js direto).
- **Driver.js** — mais leve (10KB vs 34KB do Joyride), boa para projetos que valorizam bundle size.

**Sara no tutorial:** foto + balão de fala de texto. Simples e funcional.

#### Versão 2 — Vídeos da Sara por Aba (premium)

Cada "parada" do tutorial exibe um vídeo curto da Sara explicando aquela aba — gerado via HeyGen Photo Avatar. 5 abas × ~5 segundos = 25 segundos de vídeo total = ~$1,25 de custo de geração única.

Os vídeos são gerados uma vez e armazenados no servidor. Quando o roteiro mudar, gera novos vídeos.

**Sara no tutorial:** vídeo da Sara falando, muito mais imersivo.

### Ponto de Integração

O tutorial se integra com a Feature 1 (Onboarding com Sara). Se a usuária já fez o onboarding por voz com a Sara, a Sara pode dizer ao final: "Agora deixa eu te mostrar o app!" — transição natural.

### Esforço

- Versão 1 (React Joyride): 1-2 dias de desenvolvimento
- Versão 2 (HeyGen): + 1 dia para gravar roteiros + geração dos vídeos (~$2 de custo)

---

## 7. Sugestões de Shopping Ativáveis

### O que é

Cards de produto na aba Shopping com sugestões contextualizadas por fase da gestação/bebê. O usuário pode ativar ou desativar essas sugestões nas configurações.

### Modos de curadoria

#### Modo 1 — Lista manual curada

Um JSON de produtos por fase, administrado pela equipe. Cada produto tem: nome, descrição, link, imagem, fase relevante.

- Zero custo de API
- Controle total sobre o que aparece
- Pode incluir links de afiliado (Amazon, Mercado Livre) para monetização
- Atualização manual

#### Modo 2 — API do Mercado Livre ou Amazon

Busca automática de produtos por categoria e fase.
- Mercado Livre tem API pública com busca por categoria
- Amazon tem Programa de Afiliados com API de produtos
- Produtos sempre atualizados
- Mais complexo de implementar, risco de produtos ruins aparecerem

#### Modo 3 — Parceiros pagantes

Marcas pagam para aparecer nas sugestões contextualizadas. Modelo de receita.
- Mais custoso para desenvolver (painel admin, gestão de campanhas)
- Maior potencial de receita

### Toggle nas configurações

Já existe `SettingsScreen`. Adicionar:
```
[toggle] Sugestões de produtos personalizadas
         Receba dicas de produtos para a sua fase
```

Quando desativado: aba Shopping volta para vitrine estática "em breve".

### Esforço

- Modo 1 (lista manual): 1-2 dias
- Toggle de configuração: meio dia

---

## 8. Idade da Mãe e Mães Adolescentes

### Os dados

O Brasil tem **274.400 nascimentos de mães adolescentes por ano** (2024). Isso é 11,4% de todos os nascimentos. Um em cada 23 adolescentes torna-se mãe anualmente. O Brasil é o 2º no ranking mundial de gravidez na adolescência.

**Esse não é um nicho — é uma parte significativa do público-alvo.**

### O que muda no produto

#### Campo de data de nascimento da mãe

Substituir o campo indireto atual por perguntas mais contextualizadas:
- Pedir **data de nascimento da mãe** (calculamos a idade) — nunca perguntar diretamente "quantos anos você tem?"
- Calcular idade ao abrir o app (não estática no cadastro)

#### Segmentação por faixa etária

| Faixa | Considerações |
|-------|--------------|
| 10-15 anos | Linguagem mais simples, foco em rede de apoio, aviso sobre LGPD (ver abaixo), sem conteúdo financeiro |
| 16-17 anos | Linguagem acessível, foco em apoio emocional e escolar |
| 18-24 anos | Tom jovem-adulto, balanceia cuidado do bebê com vida pessoal |
| 25-35 anos | Tom padrão do app |
| 35+ anos | Conteúdo específico sobre gravidez tardia, riscos, exames |

#### Conteúdo específico para mães adolescentes

- Seção "Você não está sozinha" com recursos de apoio
- Quick chips na MãeIA sobre direitos da mãe adolescente (licença maternidade estudantil, guarda, pensão)
- Linguagem sem julgamento — o app deve ser um lugar seguro

#### Migração de babyAgeInDays para babyBirthDate

Hoje o perfil tem `babyAgeInDays` — um número estático que fica desatualizado. Proposta:
- Substituir por `babyBirthDate` (data de nascimento do bebê) e `expectedBirthDate` (data prevista do parto)
- Calcular idade do bebê em tempo real
- Isso também melhora as Features 3 (versículos temáticos) e 4 (perguntas dinâmicas)

---

### LGPD e Menores de Idade

Este é um ponto legal importante ao perguntar a idade da mãe:

| Situação | O que a LGPD exige |
|----------|-------------------|
| Mãe com 12-15 anos | Área legal disputada — por segurança, exigir consentimento do responsável |
| Mãe com 16-17 anos | Consentimento conjunto da adolescente + responsável |
| Mãe com 18+ anos | Consentimento padrão da própria usuária |
| Qualquer menor | Dados biométricos proibidos sem consentimento específico dos pais |
| Dados do bebê | São dados de criança — exigem consentimento parental (a mãe, neste caso) |

**Implicação prática:** Se detectar que a usuária tem menos de 16 anos, o app deve exibir um fluxo adicional pedindo e-mail/confirmação de um responsável legal. Isso é obrigação legal, não opcional.

**Sugestão de implementação:** Não bloquear o cadastro imediatamente — coletar a data de nascimento, e se menor de 16, exibir tela de "precisamos da autorização de um responsável" antes de ativar a conta.

---

## 9. Roadmap e Priorização

### Avaliação de impacto vs esforço

| Feature | Impacto no produto | Esforço técnico | Dependência externa | Prioridade sugerida |
|---------|-------------------|-----------------|--------------------|--------------------|
| Versículos bíblicos | Médio | Baixíssimo | Nenhuma | ✅ Próximo sprint |
| Mensagem de Deus | Alto (emocional) | Baixo | Nenhuma | ✅ Próximo sprint |
| Idade da mãe + adolescentes | Alto (alcance) | Médio | Nenhuma | ✅ Próximo sprint |
| Perguntas dinâmicas | Médio (retenção) | Médio | Nenhuma | 🔜 Sprint seguinte |
| Tutorial com Sara (Joyride) | Alto (ativação) | Baixo | React Joyride (free) | 🔜 Sprint seguinte |
| Shopping toggle | Médio | Baixo | Nenhuma | 🔜 Sprint seguinte |
| Onboarding em voz (ElevenLabs) | Muito alto (diferencial) | Alto | ElevenLabs ($) | ⏳ Sprint 3 |
| Tutorial com Sara (HeyGen) | Alto (premium) | Médio | HeyGen ($) | ⏳ Sprint 3 |
| Segurança/verificação | Alto (confiança) | Muito alto | SERPRO ou unico.io | ⏳ Fase posterior |

### Proposta de 3 sprints

**Sprint 1 — Conteúdo e Alcance** (1 semana)
- Versículos bíblicos nas abas
- Mensagem de Deus no onboarding
- Campo de data de nascimento da mãe + suporte a adolescentes (LGPD)
- Migrar `babyAgeInDays` → `babyBirthDate`

**Sprint 2 — Engajamento e UX** (1 semana)
- Perguntas dinâmicas por fase
- Tutorial com Sara (React Joyride)
- Shopping toggle nas configurações
- Tela de escolha "Conversa ou Formulário" (sem a voz ainda — só a bifurcação)

**Sprint 3 — IA de Voz** (2-3 semanas)
- Integração ElevenLabs (conta, clonagem de voz da Sara, SDK)
- Onboarding por voz com Sara
- Avatar animado da Sara (CSS/Lottie)
- Testes de qualidade da voz em PT-BR

**Fase posterior — Segurança** (1 mês+)
- Definir fornecedor (SERPRO vs unico.io)
- Contratos e onboarding técnico
- Implementação do fluxo de verificação
- Badge "Mãe Verificada" no perfil

---

## 10. Custos Estimados

### Custos de desenvolvimento (esforço de código)

Já descritos em cada feature. Features de conteúdo (Sprints 1 e 2) têm custo de desenvolvimento baixo. A voz (Sprint 3) é o item de maior esforço.

### Custos de API/Serviço mensais (recorrentes)

| Serviço | Uso estimado | Custo estimado |
|---------|-------------|----------------|
| ElevenLabs (voz do onboarding) | 200 usuárias × 3 min de onboarding = 600 min/mês | ~$48/mês (plano Creator, 275 min inclusos + excedente a $0,08/min) |
| ElevenLabs (MãeIA por voz, se ativado) | Variável por engajamento | $0,08/min de conversa |
| HeyGen (vídeos pré-gerados) | Custo único de geração, não recorrente | ~$2-5 por conjunto de vídeos |
| SERPRO Datavalid | Por consulta | A contratar — tipicamente centavos por consulta |
| unico.io | Por verificação | A cotar com a empresa |

### Custos de geração de vídeo HeyGen (pontual)

| Conteúdo | Duração estimada | Custo pontual |
|----------|-----------------|---------------|
| Tutorial (5 abas × 10s) | 50 segundos | ~$2,50 |
| Onboarding (5 perguntas × 8s) | 40 segundos | ~$2,00 |
| Mensagem de Deus (6 perfis × 10s) | 60 segundos | ~$3,00 |
| **Total inicial** | ~2,5 minutos | **~$7,50** |

Esses vídeos são gerados uma vez e armazenados. Só se regeneram se o roteiro mudar.

---

## Decisões Pendentes (para alinhar antes de começar)

Antes de iniciar a implementação, estas questões precisam de resposta:

1. **Versículos:** qual tradução bíblica? (NVI, ARC, NVT, CNBB ou combinação)
2. **Versículos:** temáticos por aba ou todos os versículos em todas as abas?
3. **Mensagem de Deus:** só cristã/bíblica ou também aberta a outras religiões/espiritualidades?
4. **Voz da Sara:** existe atriz/dubladora com voz definida? Já tem gravação? Ou usamos voz do banco da ElevenLabs por enquanto?
5. **Onboarding em voz:** confirmar que o objetivo é a mãe **falar** por microfone (STT), não apenas ouvir a Sara?
6. **Verificação de identidade:** a equipe está disposta a aceitar o atrito no cadastro em troca de mais segurança? Ou melhor começar com badge opcional?
7. **Mães adolescentes:** o app aceita usuárias a partir de que idade mínima?
8. **Shopping:** parceiros já mapeados? Ou começa com lista curada interna?

---

*Documento gerado automaticamente após pesquisa em fontes públicas. Preços e disponibilidades de APIs são estimativas baseadas em dados públicos de julho de 2026 e devem ser confirmados diretamente com os fornecedores.*
