# Voice Orb Onboarding — Spec

## Contexto

O onboarding atual captura dados da mãe via formulário visual. Esta spec adiciona um segundo caminho opcional: a Sara coleta os mesmos dados via conversa de voz usando ElevenLabs Conversational AI. Ao fim, a usuária revisa e confirma antes de salvar.

O formulário existente não muda. Os dois caminhos são equivalentes em resultado.

---

## Escopo

### O que entra nesta spec
- Split na `OnboardingScreen` (form vs voz)
- Tela `VoiceOrbOnboarding` com orb animado
- Hook `useVoiceOrb` gerenciando conexão ElevenLabs
- Tela de confirmação com campos editáveis
- Configuração do agente Sara via REST API (Task 0)

### O que não entra
- Modificações no fluxo do formulário existente
- Seleção de arquétipos (usa a tela existente, igual ao form)
- Persistência no servidor (usa o mesmo endpoint do onboarding atual)

---

## Dados coletados por Sara

```typescript
interface VoiceCollectedProfile {
  motherName: string
  primaryChild: {
    name: string | null        // null = ainda não tem nome
    phase: 'pregnant' | 'postpartum'
    week?: number              // se pregnant
    ageInDays?: number         // se postpartum
  }
  otherChildren: Array<{
    name: string
    ageDescription: string     // texto livre: "3 anos", "5 anos"
  }>
}
```

---

## Arquitetura

### Fluxo de telas

```
OnboardingScreen
  ├── [Preencher você mesmo] → fluxo existente (inalterado)
  └── [Falar com a Sara]    → VoiceOrbOnboarding
                                  │
                          ┌───────┴────────┐
                          │  3 estados UI  │
                          └───────┬────────┘
                                  │
               ┌──────────────────┼──────────────────┐
               ▼                  ▼                   ▼
            intro            listening            confirmar
         (botão start)     (orb + transcript)   (campos editáveis)
                                  │
                    agente chama confirmar_perfil()
                                  │
                                  ▼
                       VoiceOrbConfirmation
                                  │
                           [Confirmar →]
                                  │
                                  ▼
                      ArquetipoSelection (existente)
                                  │
                                  ▼
                         salva no store/API
```

### Como os dados fluem do ElevenLabs para o app

1. Usuária conversa com Sara via WebSocket (`@11labs/client`)
2. Quando Sara coletou todos os dados, ela chama a tool `confirmar_perfil` configurada no agente
3. O `@11labs/client` emite evento `tool_call` com o JSON dos campos
4. `useVoiceOrb` captura o evento, armazena `collectedData`, encerra a sessão
5. UI transita para estado `confirmar` com `VoiceOrbConfirmation`

---

## Arquivos

### Novos
| Arquivo | Responsabilidade |
|---|---|
| `src/hooks/useVoiceOrb.ts` | Conexão ElevenLabs, estados, amplitude, tool_call |
| `src/hooks/useVoiceOrb.test.ts` | Testes do hook |
| `src/components/onboarding/VoiceOrbOnboarding.tsx` | Tela: intro → listening → confirmação |
| `src/components/onboarding/VoiceOrbOnboarding.test.tsx` | Testes da tela |
| `src/components/onboarding/VoiceOrb.tsx` | Círculo animado puro (sem lógica) |
| `src/components/onboarding/VoiceOrbConfirmation.tsx` | Formulário de revisão dos dados coletados |
| `src/components/onboarding/VoiceOrbConfirmation.test.tsx` | Testes da confirmação |

### Modificados
| Arquivo | O que muda |
|---|---|
| `src/components/auth/OnboardingScreen.tsx` | Adiciona split choice no topo: form vs voz |
| `src/components/auth/OnboardingScreen.test.tsx` | Testes do split |

---

## Especificação dos componentes

### `useVoiceOrb`

```typescript
type VoiceOrbState = 'idle' | 'connecting' | 'listening' | 'done' | 'error'

interface UseVoiceOrbReturn {
  state: VoiceOrbState
  amplitude: number            // 0–1, para animar o orb
  transcript: string           // última fala transcrita (Sara ou usuária)
  collectedData: VoiceCollectedProfile | null
  error: string | null
  start: () => Promise<void>
  stop: () => void
}
```

**Comportamento:**
- `start()` → cria sessão `Conversation` do `@11labs/client`, passa `agentId` de `import.meta.env.VITE_ELEVENLABS_AGENT_ID`
- Escuta evento `tool_call` com nome `confirmar_perfil` → armazena payload em `collectedData`, chama `stop()`
- `stop()` → encerra sessão, estado → `done` se `collectedData` presente, senão `idle`
- Amplitude lida de `onAudioStream` do cliente

### `VoiceOrb`

```typescript
interface VoiceOrbProps {
  amplitude: number   // 0–1
  state: 'idle' | 'connecting' | 'listening'
}
```

**Visual:**
- Círculo 160×160px, gradiente `sara-gold → sara-terracotta`
- `scale` animado via Framer Motion: `1.0 + amplitude * 0.3`
- Estado `idle` / `connecting`: animação de "respiração" suave (loop, 3s)
- Estado `listening`: pulso proporcional ao amplitude

### `VoiceOrbConfirmation`

```typescript
interface VoiceOrbConfirmationProps {
  data: VoiceCollectedProfile
  onConfirm: (data: VoiceCollectedProfile) => void
  onBack: () => void
}
```

**UI:** Campos editáveis inline (nome, fase, semana/idade, nome do bebê). Lista de outros filhos com botão remover. Botão "Confirmar →" chama `onConfirm` com os dados (possivelmente editados pela usuária).

### `VoiceOrbOnboarding`

```typescript
interface VoiceOrbOnboardingProps {
  onComplete: (data: VoiceCollectedProfile) => void
  onBack: () => void
}
```

**Estados internos:**
- `intro` → mostra texto explicativo + botão "Começar"
- `listening` → monta `<VoiceOrb>` + transcrição ao vivo + botão "Encerrar"
- `confirmar` → monta `<VoiceOrbConfirmation>`

### `OnboardingScreen` (modificação)

Adiciona antes do formulário atual um componente de escolha:

```
┌────────────────────┐  ┌────────────────────┐
│  📝 Preencher      │  │  🎙️ Falar com      │
│  você mesmo        │  │  a Sara            │
└────────────────────┘  └────────────────────┘
```

Se "Falar com a Sara" → renderiza `<VoiceOrbOnboarding>` no lugar do form. Se "Preencher você mesmo" → form atual inalterado.

---

## Configuração do agente Sara (Task 0)

Antes de qualquer código, o agente ElevenLabs precisa ser configurado via REST API.

**System prompt do agente:**
```
Você é a Sara, assistente calorosa do app Mothers Team. 
Sua missão agora é conhecer a mãe que está chegando.

Pergunte, de forma natural e empática:
1. O nome dela
2. Se está grávida (e em qual semana) ou se o bebê já nasceu (e há quantos dias/meses)
3. O nome do bebê (ou se ainda não tem nome)
4. Se tem outros filhos, e a idade aproximada de cada um

Quando tiver todas as informações, confirme com ela e chame a função confirmar_perfil.
Seja breve, carinhosa e direta. Máximo 2 perguntas por mensagem.
```

**Tool `confirmar_perfil`:**
```json
{
  "name": "confirmar_perfil",
  "description": "Chamada quando Sara coletou todos os dados da mãe",
  "parameters": {
    "type": "object",
    "properties": {
      "motherName": { "type": "string" },
      "primaryChild": {
        "type": "object",
        "properties": {
          "name": { "type": ["string", "null"] },
          "phase": { "type": "string", "enum": ["pregnant", "postpartum"] },
          "week": { "type": "number" },
          "ageInDays": { "type": "number" }
        },
        "required": ["phase"]
      },
      "otherChildren": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "ageDescription": { "type": "string" }
          }
        }
      }
    },
    "required": ["motherName", "primaryChild", "otherChildren"]
  }
}
```

---

## Variável de ambiente

```
VITE_ELEVENLABS_AGENT_ID=agent_4301kxv5d1q3fsf85z1xb1sz90nt
```

Adicionar ao `.env.local` e ao Vite config (já exposta como `import.meta.env`).

---

## Testes

### `useVoiceOrb.test.ts`
- Estado inicial é `idle`
- `start()` → transita para `connecting` depois `listening`
- Evento `tool_call` com `confirmar_perfil` → `collectedData` preenchido, estado `done`
- `stop()` antes de tool_call → estado `idle`, `collectedData` null
- Erro de conexão → estado `error`, `error` preenchido

### `VoiceOrbConfirmation.test.tsx`
- Renderiza nome da mãe, fase, nome do bebê
- Renderiza lista de outros filhos
- Editar campo nome chama handler corretamente
- Botão "Confirmar" chama `onConfirm` com dados atualizados
- Botão "Voltar" chama `onBack`

### `VoiceOrbOnboarding.test.tsx`
- Estado inicial mostra texto intro e botão "Começar"
- Clicar "Começar" chama `start()` do hook
- Quando estado é `listening`, mostra orb e transcrição
- Quando estado é `done` com dados, mostra confirmação
- Confirmar dados chama `onComplete`

### `OnboardingScreen.test.tsx` (adições)
- Mostra os dois botões de escolha
- Clicar "Falar com a Sara" renderiza `VoiceOrbOnboarding`
- Clicar "Preencher você mesmo" mostra formulário existente

---

## Dependência nova

```bash
npm install @elevenlabs/client
```

O pacote `@elevenlabs/client` (v1.15.1) fornece `Conversation` com WebSocket, transcrição ao vivo e eventos de tool_call.
