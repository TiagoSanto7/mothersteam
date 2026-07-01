# Design Spec — Mothers Team: Fase 2 (Login, Onboarding, Perfil, Ações)

**Data:** 2026-06-30
**Status:** Aprovado

---

## 1. Contexto

O MVP do Mothers Team (Home, Baby, MãeIA, Comunidade, Shopping) está funcional. Esta fase implementa:

1. Tela de Login
2. Onboarding interativo (5 perguntas → Score de Perfil)
3. Avatar de perfil no header → ProfileScreen
4. Botão `+` da Home → AddRoutineModal
5. Botão "Desabafar" → CreatePostScreen

**Stack:** React 18 + TypeScript + Zustand + Tailwind CSS + Vite (sem novas dependências)

---

## 2. Fluxo de Navegação

```
[Abertura do App]
       ↓
  isLoggedIn?  ──No──→  LoginScreen
       ↓ Yes
  onboardingDone? ──No──→  OnboardingScreen
       ↓ Yes
  [App principal: tabs Home / MãeIA / Baby / Comunidade / Shopping]
```

- O fluxo é controlado por flags persistidos no Zustand (`zustand/persist` → localStorage).
- O logout reseta apenas `isLoggedIn`; `onboardingDone` é mantido.
- Um botão "Resetar Onboarding" na ProfileScreen limpa `onboardingDone` e `motherProfile` do localStorage (apenas para uso em homologação).

---

## 3. Arquitetura — Store (useAppStore)

### Novos campos de estado

```ts
isLoggedIn: boolean          // default: false
onboardingDone: boolean      // default: false
motherProfile: MotherProfile | null  // default: null
```

### Novo tipo

```ts
export interface MotherProfile {
  phase: 'q1' | 'q2' | 'q3' | 'q4' | 'q5'          // Pergunta 1
  emotional: 'q1' | 'q2' | 'q3' | 'q4'              // Pergunta 2
  support: 'q1' | 'q2' | 'q3'                        // Pergunta 3
  healthFocus: 'q1' | 'q2' | 'q3' | 'q4'            // Pergunta 4
  mainPain: 'q1' | 'q2' | 'q3' | 'q4'               // Pergunta 5
  profileLabel: string   // Ex: "Mãe Exausta sem Apoio"
  insights: string[]     // 2-3 sugestões geradas pelo score
}
```

### Novas actions

| Action | Descrição |
|---|---|
| `login(email, password): boolean` | Valida contra `import.meta.env.VITE_NAVIGATION_USER` e `VITE_PWD_NAVIGATION_USER`. Retorna `true` se correto, seta `isLoggedIn: true`. |
| `logout()` | Seta `isLoggedIn: false`. |
| `completeOnboarding(answers: OnboardingAnswers)` | Calcula `profileLabel` e `insights`, salva em `motherProfile`, seta `onboardingDone: true`. |
| `resetOnboarding()` | Seta `onboardingDone: false`, `motherProfile: null`. Para uso em homologação. |
| `addRoutineEntry(entry: Omit<RoutineEntry, 'id'>)` | Adiciona nova entrada à rotina com ID gerado. |
| `addCommunityPost(post: Omit<Post, 'id' \| 'likes' \| 'replies' \| 'time'>)` | Adiciona post ao feed da comunidade. |

### Variáveis de ambiente (.env)

Renomear para prefixo `VITE_` (obrigatório no Vite para acesso no cliente):
```
VITE_NAVIGATION_USER=navegador@mothersteam
VITE_PWD_NAVIGATION_USER=admin@mothersteam
```

---

## 4. Telas

### 4.1 LoginScreen

**Arquivo:** `src/components/auth/LoginScreen.tsx`

- Fundo off-white com gradiente leve em lavanda no topo
- Logo/nome "Mother's Team" centralizado
- Campos: E-mail (type="email") e Senha (type="password")
- Botão "Entrar" → chama `login(email, password)`
- Se retornar `false`: exibe mensagem de erro "E-mail ou senha incorretos" em vermelho suave
- Sem link de "esqueci a senha" (não aplicável em homologação)

---

### 4.2 OnboardingScreen

**Arquivo:** `src/components/auth/OnboardingScreen.tsx`

- Progresso: barra visual no topo ("Pergunta 2 de 5")
- Uma pergunta por vez, renderizada dinamicamente
- 4 opções por pergunta em cards clicáveis com estado de seleção (borda lavanda quando selecionado)
- Botão "Continuar" habilitado apenas com uma opção selecionada
- Botão "Voltar" disponível a partir da pergunta 2
- Na pergunta 5: botão "Ver meu perfil" → dispara `completeOnboarding(answers)` → navega para Home

**As 5 Perguntas:**

| # | Pergunta | Opções |
|---|---|---|
| 1 | Fase da maternidade | A) Gestante 1°/2° trim. B) Gestante 3° trim. C) Pós-parto 0-3m D) Pós-parto 4-12m E) Bebê >1 ano |
| 2 | Estado emocional | A) Confiante B) Cansada mas ok C) Ansiosa D) Sobrecarregada |
| 3 | Rede de apoio | A) Sempre tenho ajuda B) Ajuda esporádica C) Praticamente sozinha |
| 4 | Foco de saúde | A) Desenvolvimento do bebê B) Saúde física C) Sono D) Rotina prática |
| 5 | Principal dor | A) Autocuidado B) Choro/cólica/sono do bebê C) Amamentação/alimentação D) Corpo/hormônios/autoestima |

**Lógica de Score (exemplos):**
- Respostas 2D + 3C → perfil "Exausta e Sem Apoio" → insights: micro-pausas, meditação rápida, simplificação de rotina
- Respostas 1B + 2C → perfil "Gestante Ansiosa" → insights: checklist maternidade, respiração, primeiros dias
- Respostas 1C + 4B → perfil "Recuperação Pós-Parto" → insights: exercícios fisioterapêuticos, assoalho pélvico, diástase

---

### 4.3 ProfileScreen

**Arquivo:** `src/components/profile/ProfileScreen.tsx`

Acessada por: toque no avatar circular no header da HomeScreen.

**Layout:**
- Avatar circular grande no topo (placeholder com inicial do nome, ex: "M" para Mariana)
- Nome da mãe em destaque
- E-mail de login (exibido abaixo do nome)
- Badge "Gratuito" ou "Premium"
- Seção "Minha Conta" com itens em lista
- Botão "Resetar Onboarding" (cor diferente — cinza ou laranja com aviso visual "Apenas para testes") → chama `resetOnboarding()`
- Botão "Sair" → chama `logout()`

**Navegação:** A `ProfileScreen` não é uma tab. É renderizada como sobreposição/modal ou como tela controlada por estado local no `App.tsx` (ex: `showProfile: boolean`).

---

### 4.4 InsightCard na Home

**Arquivo:** `src/components/home/InsightCard.tsx`

Posição: entre o header (saudação) e o `WeekCalendar`, condicionado a `motherProfile !== null`.

**Layout:**
- Card em fundo lavanda claro
- Ícone de estrela ou coração
- Título: nome do perfil (ex: "Seu perfil: Gestante Ansiosa")
- 2-3 bullets de insights
- Botão X para dispensar (oculta o card via estado local, sem apagar o perfil)

---

### 4.5 AddRoutineModal

**Arquivo:** `src/components/home/AddRoutineModal.tsx`

Ativado por: botão `+` flutuante na HomeScreen.

**Layout (bottom sheet):**
- Handle visual no topo do sheet
- Campo "O que você precisa fazer?" (texto livre, required)
- Seletor de horário (input type="time", default = hora atual arredondada)
- Seletor de categoria com 3 opções em chips: Tarefa / Consulta / Medicação
- Campo de data (default = selectedDate da store)
- Botão "Adicionar" → chama `addRoutineEntry(...)` → fecha o modal

**Implementação:** Overlay com `backdrop-blur` + slide-up via CSS transition. Sem lib de modal.

---

### 4.6 CreatePostScreen

**Arquivo:** `src/components/comunidade/CreatePostScreen.tsx`

Ativado por: botão "Desabafar 💜" na ComunidadeScreen.

**Layout:**
- Header com botão "← Voltar" e título "Desabafar"
- Textarea grande com placeholder: "O que você está sentindo? Este é um espaço seguro 💜"
- Seletor de categoria (gestação / pós-parto / amamentação / saúde mental) em chips
- Botão "Publicar" → chama `addCommunityPost(...)` → navega de volta para ComunidadeScreen com o novo post no topo do feed

**Navegação:** Controlada por estado local na ComunidadeScreen (`showCreatePost: boolean`).

---

## 5. Mudanças em Arquivos Existentes

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | Adicionar controle de fluxo: `isLoggedIn`, `onboardingDone`, `showProfile`. Renderizar LoginScreen, OnboardingScreen ou app atual. |
| `src/store/useAppStore.ts` | Adicionar novos campos, types e actions descritos na Seção 3. |
| `src/types/index.ts` | Adicionar `MotherProfile` e `OnboardingAnswers`. |
| `src/components/home/HomeScreen.tsx` | Adicionar avatar de perfil no header, `InsightCard` condicional, `AddRoutineModal`. |
| `src/components/comunidade/ComunidadeScreen.tsx` | Mover posts para o store, adicionar `showCreatePost` state, conectar botão "Desabafar". |
| `.env` | Renomear vars para prefixo `VITE_`. |

---

## 6. O Que NÃO Está no Escopo

- Upload real de foto de perfil (apenas placeholder com inicial)
- Autenticação real (JWT, OAuth) — apenas validação local contra `.env`
- Backend/API — tudo local no Zustand
- Notificações push
- Refatoração de código existente fora das áreas de mudança

---

## 7. Critérios de Sucesso

- [ ] Ao abrir o app, LoginScreen é exibida (se não logado)
- [ ] Login com credenciais corretas navega para Onboarding (1ª vez) ou Home (subsequentes)
- [ ] Login com credenciais incorretas exibe erro
- [ ] Onboarding completa as 5 perguntas e gera InsightCard na Home
- [ ] InsightCard aparece apenas uma vez por sessão de onboarding (pode ser dispensado)
- [ ] Avatar no header abre ProfileScreen
- [ ] ProfileScreen exibe nome, e-mail e botão de logout funcional
- [ ] Botão "Resetar Onboarding" na ProfileScreen permite refazer o questionário
- [ ] Botão `+` na Home abre AddRoutineModal e adiciona item à timeline
- [ ] Botão "Desabafar" abre CreatePostScreen e publica no feed
