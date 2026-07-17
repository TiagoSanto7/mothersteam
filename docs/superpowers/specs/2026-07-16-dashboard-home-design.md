# Spec — Dashboard Home (Fase 1)

**Data:** 2026-07-16  
**Status:** Aprovado  
**Escopo:** Substituir o feed de comunidade como tela inicial por um dashboard personalizado. Navegação existente não é alterada nesta fase.

---

## Objetivo

A mãe abre o app e encontra imediatamente: o que a Sara recomenda para ela hoje, o próximo compromisso, quando foi a última mamada e um acesso rápido à comunidade. Em vez de cair num feed genérico, ela encontra o que importa para ela naquele momento.

---

## O que muda

| Antes | Depois |
|-------|--------|
| Tab "home" renderiza `ComunidadeScreen` (feed) | Tab "home" renderiza `DashboardScreen` (novo) |
| Não há tela de boas-vindas personalizada | Header com saudação + fase do bebê |
| Sara só existe no tab MãeIA | Sara aparece na Home com recomendação contextual |
| Registrar mamada = navegar até tab Bebê | Bottom sheet rápido diretamente da Home |

O tab "Comunidade" continua existindo e renderizando `ComunidadeScreen`. A comunidade não some — só deixa de ser a primeira tela.

---

## Componentes a criar

### 1. `DashboardScreen` — `src/components/home/DashboardScreen.tsx`

**Layout aprovado (Opção A — Sara primeiro):**

```
┌─────────────────────────────┐
│ Bom dia, Ana 🌷    [avatar] │  ← header com saudação + avatar
│ Bebê · 4 meses e 12 dias    │  ← fase calculada dinamicamente
├─────────────────────────────┤
│ ✦ Sara diz                  │  ← card gradiente sara-gold→terracotta
│ "Essa semana é ótima para   │
│ introduzir novos sabores..." │
├──────────────┬──────────────┤
│ Próximo      │ Última mamada│  ← row de 2 cards
│ Pediatra     │ há 1h20      │
│ Hoje · 14:30 │ [Registrar]  │
├─────────────────────────────┤
│ Comunidade                  │  ← card com count de posts novos
│ Ir para o feed          Ver →│
├─────────────────────────────┤
│ "Os que esperam no SENHOR…" │  ← versículo do dia (muted, itálico)
│ Is 40:31 · NVI              │
└─────────────────────────────┘
```

**Dados e fontes:**

| Card | Endpoint | Fallback |
|------|----------|---------|
| Saudação + nome | `useAppStore` (motherName) | "Mãe" |
| Fase / idade do bebê | `buildPhase()` de `helpers.ts` | semana/dias do store |
| Sara diz | Estático por fase (arquivo `mensagemDeDeus.ts` já existe) | mensagem default |
| Próximo compromisso | `GET /routine?date=hoje` → primeiro item não feito com horário futuro | "Nenhum compromisso hoje" |
| Última mamada | `GET /baby?limit=5` → último entry com `type === 'feed'` | "Nenhum registro ainda" |
| Comunidade | Link estático para o tab de comunidade — sem query extra | Sempre visível |
| Versículo | `getVersiculoDoDia('home')` já implementado | — |

**Saudação por horário:**
- 5h–11h59 → "Bom dia"
- 12h–17h59 → "Boa tarde"
- 18h–4h59 → "Boa noite"

**Fase exibida:**
- Grávida → "Grávida · semana X"
- Pós-parto → "Bebê · N meses e D dias" (calculado de `babyBirthDate` quando disponível)

---

### 2. `QuickRegisterSheet` — `src/components/home/QuickRegisterSheet.tsx`

Bottom sheet acionado pelo botão "Registrar" no card de última mamada.

**Design aprovado (Opção A — só o essencial):**

```
┌──────────────────────────────┐
│           ▬▬▬▬▬              │ ← handle
│  Registrar mamada            │
│                              │
│  Qual seio?                  │
│  [ ← Esquerdo ] [ Direito → ]│ ← toggle (memória do último lado)
│                              │
│  [ Registrar agora ]         │ ← botão primário
│  Horário: agora · 10:42      │ ← informativo, não editável
└──────────────────────────────┘
```

**Comportamento:**
- Abre como overlay com backdrop escuro, animação slide-up
- Seio pré-selecionado com o oposto do último registrado (`lastFeedSide` do store, alternado)
- Horário = `new Date()` no momento do toque em "Registrar agora"
- Ao confirmar: `POST /baby { type: 'feed', time: 'HH:mm', detail: 'Esquerdo' | 'Direito' }` + invalida query `['baby']` + fecha o sheet
- Não há campo de duração (decidido: mínimo de fricção)

---

## O que NÃO entra nesta fase

- Mudança de navegação (tabs continuam iguais: home, maeIA, baby, rotina, comunidade, shopping)
- Unificação de Baby + Rotina em "Jornada"
- Shopping contextual nos cards
- Sara proativa (sugestões baseadas em histórico real — fica estática por fase por agora)
- Notificações na Home
- Pull-to-refresh

---

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/components/home/DashboardScreen.tsx` | Criar |
| `src/components/home/QuickRegisterSheet.tsx` | Criar |
| `src/App.tsx` | Modificar — trocar `home: <ComunidadeScreen />` por `home: <DashboardScreen />` |

**Máximo 3 arquivos.** Nenhuma mudança de navegação, schema ou backend.

---

## Critérios de validação

- [ ] Mobile (< 768px): cards empilhados, sem overflow horizontal
- [ ] Tablet / Desktop: renderiza dentro do `WebLayout` sem quebrar
- [ ] Saudação correta por horário
- [ ] Fase exibida corretamente (grávida vs pós-parto)
- [ ] Card Sara aparece com texto relevante para a fase
- [ ] Card "Próximo compromisso" mostra o próximo item real ou estado vazio
- [ ] Card "Última mamada" mostra tempo relativo correto ou estado vazio
- [ ] Botão "Registrar" abre o bottom sheet
- [ ] Bottom sheet: toggle de seio funcional com memória do último lado
- [ ] Bottom sheet: "Registrar agora" cria entry via API e fecha o sheet
- [ ] Versículo do dia aparece no rodapé
- [ ] Sem erros TypeScript
