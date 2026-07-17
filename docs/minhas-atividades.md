# Minhas Atividades — Mother's Team

> Coisas que só eu (Tiago) posso fazer — o agente cuida de todo o código.
> Atualizado em: 2026-07-16

---

## 🎙️ ElevenLabs — Voz da Sara (MãeIA + Onboarding)

Você já tem o **Plano Creator**. Faça na ordem:

- [ ] Acesse [elevenlabs.io](https://elevenlabs.io) → **Conversational AI** → **+ New Agent**
- [ ] Configure o agente:
  - **Nome:** Sara
  - **Language:** Portuguese (Brazil)
  - **First message:** "Oi, que alegria ter você aqui! Sou a Sara, e vou estar com você em cada passo da sua maternidade. 💛"
  - **System prompt:** descreva a personalidade da Sara (acolhedora, cristã, empática, nunca julga, sempre encoraja)
- [ ] Em **Voice** → escolha uma voz feminina PT-BR do catálogo (recomendadas: "Valentina" ou "Camila")
- [ ] Copie o **Agent ID** e a **API Key** → cole no arquivo `.env` do servidor:
  ```
  ELEVENLABS_AGENT_ID=seu_agent_id_aqui
  ELEVENLABS_API_KEY=sua_api_key_aqui
  ```
- [ ] Teste a conversa diretamente no painel da ElevenLabs antes de integrar
- [ ] *Futuramente:* gravar 2 min de áudio da atriz da Sara para **Instant Voice Cloning**

---

## 🎬 HeyGen — Vídeos da Sara (Onboarding)

> Só necessário para a Opção D (vídeos pré-gravados). O agente já deixou o player de vídeo pronto no onboarding.

- [ ] Crie conta em [heygen.com](https://heygen.com)
- [ ] Vá em **Photo Avatar** → faça upload da foto oficial da Sara (fundo neutro, boa iluminação)
- [ ] Gere os vídeos dos scripts abaixo (um por vez, ~30s de geração cada):

  **Cena 0 — Intro:**
  > "Olá, mamãe. Seja muito bem-vinda ao Mother's Team. Estou aqui para te acompanhar nessa jornada tão especial. Me conta um pouco sobre você?"

  **Cena 1 — Q1:**
  > "Em qual fase da maternidade você está hoje? Está grávida agora ou já tem seu bebê nos braços?"

  **Cena 2 — Q2:**
  > "Como você tem se sentido emocionalmente nesses últimos dias? Sem julgamentos, pode ser honesta comigo."

  **Cena 3 — Q3:**
  > "Você costuma ter ajuda para cuidar do bebê ou das tarefas do dia a dia? Pode me contar."

  **Cena 4 — Q4:**
  > "E qual é o seu principal objetivo aqui no app? O que você mais precisa agora?"

  **Cena 5 — Q5:**
  > "E o que tem tirado mais o seu sono ultimamente? O que tem gerado mais preocupação?"

  **Cena 6 — Encerramento:**
  > "Obrigada por compartilhar isso comigo. Seu perfil está pronto! Estou muito feliz de ter você aqui. Vamos juntas nessa jornada? 💛"

- [ ] Baixe cada vídeo como `.mp4` e coloque em `public/videos/`:
  - `onboarding-scene-0.mp4` (intro)
  - `onboarding-scene-1.mp4` até `onboarding-scene-5.mp4` (perguntas)
  - `onboarding-scene-6.mp4` (encerramento)

---

## 🎨 Assets Visuais da Sara Animada (para o designer)

> Para a animação CSS da Sara na tela da MãeIA (chat ao vivo).

### O que o designer precisa entregar

A Sara precisa ser separada em **camadas exportadas como PNG com fundo transparente**:

| Arquivo | Descrição |
|---------|-----------|
| `sara-idle.png` | Sara em repouso — expressão neutra e acolhedora, olhos abertos, boca fechada (sorriso leve) |
| `sara-talking-1.png` | Boca levemente aberta (som médio: "a", "e") |
| `sara-talking-2.png` | Boca mais aberta (pico de fala: "o", "ah") |
| `sara-blink.png` | Sara com olhos semicerrados (para animação de piscar) — *opcional mas recomendado* |

**Dimensões recomendadas:** 400×500px mínimo. Formato: PNG com transparência.

**Estilo:** As camadas devem ser compatíveis — o rosto/corpo base é o mesmo, só a boca e os olhos mudam. O designer deve manter o enquadramento idêntico entre os arquivos para que a sobreposição funcione.

### Ferramenta recomendada: Figma

Motivo: o projeto já tem assets de UI em Figma e a exportação por camada é direta.

**Fluxo no Figma:**
1. Abrir a ilustração da Sara
2. Criar 4 variantes de frame (idle, talking-1, talking-2, blink) — mesmo tamanho exato
3. Em cada frame, alterar apenas a camada da boca/olhos
4. Exportar cada frame como PNG com fundo transparente (`Export → PNG 2x, no background`)

**Alternativa (se a Sara for foto, não ilustração):**
- Usar Adobe Photoshop para recortar e criar as variantes de boca
- Ou usar o [D-ID](https://d-id.com) / [HeyGen](https://heygen.com) para gerar os frames — mas nesse caso é mais simples usar o SDK de vídeo da ElevenLabs direto

---

## 📋 Decisões de Conteúdo Pendentes

- [ ] **Versículos:** decidir se quer os 70 versículos temáticos **por aba** (padrão já implementado) ou **todos iguais** em todas as abas. *O agente já implementou a versão temática por aba.*
- [ ] **Tradução:** NVI foi usada (mais adotada no Brasil). Confirmar se é a certa ou se prefere ARC/NVT.
- [ ] **Mensagens de Deus por fase:** revisar e aprovar os textos criados pelo agente (arquivo `src/data/mensagemDeDeus.ts`)
- [ ] **Scripts do HeyGen:** revisar as falas da Sara acima antes de gerar os vídeos
- [ ] **Personalidade da Sara (ElevenLabs):** escrever o system prompt completo do agente — o agente pode ajudar a redigir quando quiser

---

## 🔑 Variáveis de Ambiente

Quando tiver as chaves, adicione ao `server/.env`:
```env
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
HEYGEN_API_KEY=
```

---

## 🗄️ Migration do Banco (IMPORTANTE — rode quando o banco estiver ligado)

Uma única migration resolve **tudo**: novos campos de data + as models de Shopping/Category/Product que foram adicionadas na sessão anterior.

```bash
# dentro da pasta server/
npx prisma migrate dev --name add-birth-dates
```

Isso vai:
1. Criar as tabelas `Category`, `Product`, `ProductClick` no banco
2. Adicionar `role`, `motherBirthDate`, `babyBirthDate`, `expectedBirthDate` na tabela `User`
3. Regenerar o Prisma Client → resolve os erros de TypeScript no servidor

---

## 📝 Lembrete Futuro

- Quando o produto estiver validado com investidores: considerar **Versão 2 do tutorial** (Sara em vídeo por aba via HeyGen — ~$2,50 de geração única). O React Joyride já está planejado para a Versão 1.
- Validar com investidores o **plano de verificação de identidade** (SERPRO Datavalid ou unico.io) antes de implementar.
