# Mother's Team — Ciclo PDCA

> Documento vivo. Atualizar após cada entrega.

---

## P — PLAN (Planejar)

### Objetivo do Projeto
MVP de aplicativo web mobile-first para mães — gestão de rotina, rastreador do bebê, assistente de IA, fórum comunitário e vitrine estática.

### Documentos de Referência
| Documento | Localização |
|-----------|------------|
| Briefing completo | `briefing/briefing.md` |
| Ata da reunião 27/06 | `reunioes/27062026.md` |
| Brandbook Baby Team | `BRANDBOOK/0 - BRANDBOOK/BABY_TEAM_2026_BRANDING_BOOK.pdf` |
| Plano de implementação MVP | `docs/superpowers/plans/2026-06-27-mothers-team-mvp.md` |
| Skill de design mobile | `skills/mobile-app-ui-design/SKILL.md` |

### Escopo do MVP
- [ ] Shell mobile-first + navegação (Bottom Tab Bar 5 posições)
- [ ] Home — calendário semanal + timeline de rotina da mãe
- [ ] Botão central evolutivo (embrião → feto → bebê)
- [ ] Tela Baby — rastreadores (amamentação, sono, fraldas) + timeline
- [ ] MãeIA — interface de chat com quick chips
- [ ] Comunidade — feed com filtro por categoria
- [ ] Shopping — vitrine estática "em breve"

### Fora do Escopo MVP (Fase 2)
- Integração com IA real (Claude/GPT)
- Autenticação de usuários
- Gateway de pagamento
- Programa de pontos / convênios
- Entrega de farmácia
- Backend / banco de dados

### Decisões de Arquitetura
| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Framework | React + TypeScript (Vite) | Velocidade de dev, ecossistema, portabilidade futura |
| Estilo | Tailwind CSS v3 | Utility-first, ideal para mobile-first |
| Estado global | Zustand + persist | Simples, sem boilerplate, persiste em localStorage |
| Ícones | Lucide React | Clean, consistente, leve |
| Testes | Vitest + Testing Library | Integrado ao Vite, DX excelente |
| Deploy | Vercel | CI/CD automático, zero config para Vite |

### Paleta de Cores (do Briefing)
```
Primária (lavanda):  #9D8FCC (lavender-400) / #7B6BB8 (lavender-600)
Secundária (sage):   #8FAF8F (sage-400)
Acento blush:        #C49A8A (blush-500)
Acento baby blue:    #9BC4D0 (babyblue-300)
Fundo off-white:     #F8F5F0
Texto grafite:       #2C2C2C
```

---

## D — DO (Executar)

### Status das Entregas

| Tarefa | Status | Data |
|--------|--------|------|
| Task 1 — Setup + Shell + Navegação | ⬜ Pendente | — |
| Task 2 — Home Screen + Calendário | ⬜ Pendente | — |
| Task 3 — Tela Baby + Rastreadores | ⬜ Pendente | — |
| Task 4 — MãeIA + Comunidade + Shopping | ⬜ Pendente | — |
| Deploy Vercel (preview) | ⬜ Pendente | — |

> Legenda: ⬜ Pendente · 🔄 Em progresso · ✅ Concluído · ❌ Bloqueado

---

## C — CHECK (Verificar)

### Critérios de Aceite por Tela

#### Shell + Navegação
- [ ] Shell de 390px centralizado no desktop
- [ ] 5 abas na bottom bar, botão central elevado
- [ ] Botão central muda emoji conforme semana de gestação
- [ ] Transição entre abas sem reload

#### Home
- [ ] Saudação contextualizada (semana gestacional / idade do bebê)
- [ ] Calendário horizontal rolável com dia selecionado em destaque
- [ ] Timeline com tarefas ordenadas por horário
- [ ] Marcar tarefa como feita

#### Baby
- [ ] Card de amamentação com último lado e timer
- [ ] Card de sono com total do dia
- [ ] Card de fraldas com contador incrementável
- [ ] Timeline exclusiva do bebê

#### MãeIA
- [ ] Quick chips com perguntas frequentes
- [ ] Envio de mensagem e resposta estática exibida
- [ ] Layout de chat limpo (estilo WhatsApp)

#### Comunidade
- [ ] Feed com posts
- [ ] Filtro por categoria (Gestação, Pós-parto, Amamentação, Saúde Mental)
- [ ] Selos de "Mãe Experiente" e "Profissional de Saúde"

#### Shopping
- [ ] Grid de produtos estático
- [ ] Banner "Em breve" bem visível
- [ ] Sem botão de checkout

### Checklist de Qualidade (antes de cada commit)
- [ ] `npm run test` — todos os testes passando
- [ ] `npm run build` — sem erros de TypeScript
- [ ] Responsivo em 390px (iPhone SE)
- [ ] Tap targets ≥ 44×44px
- [ ] Contraste de texto ≥ 4.5:1

---

## A — ACT (Agir)

### Log de Feedback

| Data | Origem | Feedback | Ação tomada |
|------|--------|----------|------------|
| 27/06/2026 | Reunião André + Nino | Segurança da informação é diferencial chave | Adicionar seção de privacidade na Fase 2 |
| 27/06/2026 | Reunião André + Nino | Atingir classe média-baixa | Manter UX simples, sem jargões técnicos |
| 27/06/2026 | Reunião André + Nino | Programa de pontos/convênios | Backlog Fase 2 — tela Shopping reservada |

### Entregas Pendentes Não-Técnicas (da Reunião 27/06)
- [ ] Orçamento em 3 escalas (baixa / média / alta) com projeção de custos
- [ ] Documento de Metodologia do App (para André e Nino)
- [ ] Proposta de programa de pontos e convênios (Fase 2)
- [ ] Metodologia de entrega e retirada de farmácia (Fase 2)

---

## Próximos Ciclos PDCA

| Ciclo | Escopo |
|-------|--------|
| PDCA 1 | MVP completo (4 tasks acima) |
| PDCA 2 | Autenticação + perfil da mãe |
| PDCA 3 | Integração IA real (MãeIA) |
| PDCA 4 | Shopping + pagamentos (Baby Team) |
| PDCA 5 | Programa de pontos + convênios |
