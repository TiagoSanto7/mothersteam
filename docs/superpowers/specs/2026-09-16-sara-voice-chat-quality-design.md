# Sara — chat de voz: personalidade, qualidade de áudio e tags vazando (2026-09-16)

Ligado ao [TIA-8](https://linear.app/tiago-santo/issue/TIA-8/bug-audio-da-maeia-inaudivel-no-chat-de-voz) (o fix de roteamento pro alto-falante já foi mergeado e validado; isto ataca 3 problemas novos reportados na mesma tela).

Root cause de todos os 3: inspecionado via MCP da ElevenLabs (`agents_get`) o agente real em produção, `agent_7801m0v3npg3efa9hs4qj0fpcg9k`.

---

## 1 — Sara soa formal, sempre tentando encerrar a conversa

**Problema:** o mesmo `agent_id` é usado tanto pro "boas-vindas" do onboarding (`useSaraNarration.ts`) quanto pro chat de voz geral (`MaeIAScreen.tsx` via `/mae-ia/token`). O prompt *base* do agente é o script de boas-vindas — "Máximo 3 turnos... fala de encerramento EXATA... chame finalizar_boas_vindas". Nosso backend sobrescreve o texto do prompt pro chat geral (`buildSaraSystemPrompt`, aberto), e essa sobrescrita é permitida pela config do agente — mas `agent.temperature: 0` está travado na config base e **não é overridable via client** (`overrides.conversation_config_override.agent.prompt.llm: false` cobre `llm`/temperatura). Temperatura 0 = resposta sempre determinística, mais provável → é isso que soa como roteiro, independente do texto do prompt.

**Fix:** criar um agente **novo e separado**, dedicado ao chat geral (duplicar o agente atual como base, preservando voz/guardrails/avaliação, e então ajustar):
- Prompt base = o texto que já geramos em `buildSaraSystemPrompt` (aberto, sem "máximo 3 turnos")
- `temperature` mais alta (ex.: 0.7–0.8, a definir no plano)
- Remover o tool `finalizar_boas_vindas` do agente novo (não faz sentido fora do onboarding)
- Sem limite de turnos artificial

O agente atual (onboarding) fica intocado — continua funcionando como está, que é o comportamento certo pra esse fluxo.

Backend: trocar `ELEVENLABS_AGENT_ID` (env var, usada em `/mae-ia/token`) pro novo agent_id. **Isso é uma env var na VPS, não vai pro git** — precisa editar `deploy/.env.production` na VPS e reiniciar o container `api` (não basta merge/deploy automático).

---

## 2 — Áudio "parece ligação telefônica"

**Problema:** o agente está configurado com `agent_output_audio_format: pcm_16000` (16kHz — qualidade telefonia wideband) e `optimize_streaming_latency: 3` (prioriza latência sobre qualidade, numa escala de 0 a 4).

**Fix:** no agente novo (o mesmo criado no item 1), subir `agent_output_audio_format` pro maior valor que a API aceitar acima de 16kHz (ex. `pcm_24000` — validar contra a API, pode não estar disponível pra todos os planos/modelos) e baixar `optimize_streaming_latency` pra 1. Trade-off: leve aumento de latência em troca de fidelidade — aceitável pra uma tela de chat (não é uma ligação real).

---

## 3 — Tags de emoção (`[Com carinho]`, `[Com empatia]`...) aparecendo no texto exibido

**Problema:** o agente tem `expressive_mode: true`, que faz o LLM escrever tags de direção de voz dentro do próprio texto da resposta (é assim que o modelo `eleven_v3_conversational` dirige entonação). O widget oficial da ElevenLabs filtra isso automaticamente antes de exibir (`strip_audio_tags: true`), mas nossa UI própria (`MaeIAScreen.tsx`) só exibe o `message` cru no `onMessage`.

**Fix:** puramente frontend — filtrar tags no formato `[...]` (ou o padrão exato que a ElevenLabs usa pra essas diretivas) do texto antes de chamar `addMessage('assistant', message)`. Não mexe em nada de config/agente.

---

## Fora de escopo aqui

- Bug de conexão no Android (TIA-8 original, reaberto): "Conectando..." nunca completa, volta pro idle. Investigação em andamento separadamente (hipótese: `connectionType` não especificado no `Conversation.startSession`, SDK pode estar tentando WebRTC com um `signedUrl` pensado pra WebSocket). Não depende de nada deste documento.
- Migração completa pra "Gemini como cérebro + ElevenLabs só como voz": avaliado e descartado por ora — o ElevenLabs Conversational AI já entrega turn-taking/interrupção/latência que seria caro reconstruir, e as causas encontradas aqui são de configuração, não de limitação de plataforma.

## Testes

Mudança é majoritariamente configuração de agente + um filtro de string no frontend — sem lógica de negócio nova. Verificação:
- Teste manual em device real: tom da Sara mais natural/variado, sem tentar encerrar cedo
- Teste manual: áudio perceptivelmente mais nítido
- Teste automatizado (Vitest) pro filtro de tags: `[Com carinho]Oi, tudo bem?` → exibe só `Oi, tudo bem?`
