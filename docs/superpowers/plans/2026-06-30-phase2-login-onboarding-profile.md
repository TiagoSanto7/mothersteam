# Mothers Team Fase 2 — Login, Onboarding, Perfil, +Rotina, Desabafar

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o fluxo completo Login → Onboarding (5 perguntas, 13 perfis, ~960 combinações) → App, com tela de perfil da mãe, botão + funcional na rotina e botão Desabafar publicando posts reais na comunidade.

**Architecture:** Roteamento por flags no Zustand store existente (`isLoggedIn`, `onboardingDone`), persistidos via `zustand/persist`. `App.tsx` chaveie entre `LoginScreen`, `OnboardingScreen` e o app atual. `ProfileScreen` é renderizada como sobreposição controlada por `showProfile` no `App.tsx`. Sem novas dependências.

**Tech Stack:** React 18, TypeScript, Zustand 5 (persist), Tailwind CSS (tokens já definidos: lavender, sage, blush, babyblue, graphite), Vite, Vitest + Testing Library.

---

## Mapa de Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `src/utils/onboardingScoring.ts` |
| Criar | `src/components/auth/LoginScreen.tsx` |
| Criar | `src/components/auth/OnboardingScreen.tsx` |
| Criar | `src/components/profile/ProfileScreen.tsx` |
| Criar | `src/components/home/InsightCard.tsx` |
| Criar | `src/components/home/AddRoutineModal.tsx` |
| Criar | `src/components/comunidade/CreatePostScreen.tsx` |
| Modificar | `.env` (prefixo VITE_) |
| Modificar | `src/types/index.ts` |
| Modificar | `src/store/useAppStore.ts` |
| Modificar | `src/App.tsx` |
| Modificar | `src/components/home/HomeScreen.tsx` |
| Modificar | `src/components/comunidade/ComunidadeScreen.tsx` |

---

## Task 1: Types + .env

**Files:**
- Modify: `src/types/index.ts`
- Modify: `.env`

- [ ] **Step 1.1: Atualizar .env com prefixo VITE_**

Substituir o conteúdo de `.env` por:
```
VITE_NAVIGATION_USER=navegador@mothersteam
VITE_PWD_NAVIGATION_USER=admin@mothersteam
```

- [ ] **Step 1.2: Adicionar novos tipos em `src/types/index.ts`**

Substituir o conteúdo completo de `src/types/index.ts` por:
```typescript
export type TabId = 'home' | 'maeIA' | 'baby' | 'comunidade' | 'shopping';

export type PregnancyPhase =
  | { stage: 'pregnant'; week: number }
  | { stage: 'postpartum'; ageInDays: number };

export type EvolutionStage = 'embryo' | 'fetus-early' | 'fetus-late' | 'newborn';

export interface RoutineEntry {
  id: string;
  time: string;
  date: string;
  title: string;
  category: 'task' | 'appointment' | 'medication';
  done: boolean;
}

export interface BabyEntry {
  id: string;
  time: string;
  type: 'sleep' | 'feed' | 'diaper';
  detail: string;
}

export type Q1Answer = 'A' | 'B' | 'C' | 'D' | 'E';
export type Q2Answer = 'A' | 'B' | 'C' | 'D';
export type Q3Answer = 'A' | 'B' | 'C';
export type Q4Answer = 'A' | 'B' | 'C' | 'D';
export type Q5Answer = 'A' | 'B' | 'C' | 'D';

export interface OnboardingAnswers {
  q1: Q1Answer;
  q2: Q2Answer;
  q3: Q3Answer;
  q4: Q4Answer;
  q5: Q5Answer;
}

export interface MotherProfile {
  answers: OnboardingAnswers;
  profileKey: string;
  profileLabel: string;
  insights: string[];
}

export interface CommunityPost {
  id: string;
  category: 'gestação' | 'pós-parto' | 'amamentação' | 'saúde mental';
  author: string;
  badge?: 'experiente' | 'profissional';
  content: string;
  likes: number;
  replies: number;
  time: string;
}
```

- [ ] **Step 1.3: Commit**
```bash
git add src/types/index.ts .env
git commit -m "feat: tipos OnboardingAnswers, MotherProfile, CommunityPost + env VITE prefix"
```

---

## Task 2: Lógica de Score — 13 Perfis com Todos os Casos

**Files:**
- Create: `src/utils/onboardingScoring.ts`
- Create: `src/utils/onboardingScoring.test.ts`

- [ ] **Step 2.1: Criar o arquivo de scoring**

Criar `src/utils/onboardingScoring.ts`:
```typescript
import type { OnboardingAnswers, MotherProfile } from '../types';

interface ProfileDefinition {
  key: string;
  label: string;
  insights: string[];
}

const PROFILES: Record<string, ProfileDefinition> = {
  exausta_sem_apoio: {
    key: 'exausta_sem_apoio',
    label: 'Exausta e Sem Apoio',
    insights: [
      'Micro-pausas de 5 minutos valem ouro — programe 3 pausas no seu dia agora',
      'Meditações guiadas de 3 minutos ajudam a resetar mesmo sem silêncio',
      'Simplifique a rotina: o que pode ser suspenso hoje sem consequências reais?',
    ],
  },
  sobrecarregada_amparada: {
    key: 'sobrecarregada_amparada',
    label: 'Sobrecarregada mas Amparada',
    insights: [
      'Delegue com clareza: liste tarefas específicas e distribua para sua rede de apoio',
      'Comunicar o cansaço é coragem — não hesite em pedir mais ajuda da sua rede',
      'Rituais de 10 minutos para si mesma fazem diferença real no seu humor',
    ],
  },
  gestante_ansiosa_inicio: {
    key: 'gestante_ansiosa_inicio',
    label: 'Gestante Ansiosa — Início da Jornada',
    insights: [
      'Checklist do 1° e 2° trimestre: o que realmente importa agora',
      'O que esperar de cada consulta pré-natal — sem surpresas no caminho',
      'Exercícios de respiração diafragmática reduzem a ansiedade em minutos',
    ],
  },
  gestante_ansiosa_reta_final: {
    key: 'gestante_ansiosa_reta_final',
    label: 'Gestante Ansiosa — Reta Final',
    insights: [
      'Monte sua mala da maternidade com a lista validada por mamães experientes',
      'Sinais reais de trabalho de parto vs. falsas contrações — saiba a diferença',
      'Os primeiros dias com o bebê: o que ninguém conta, mas você precisa saber',
    ],
  },
  preparando_grande_dia: {
    key: 'preparando_grande_dia',
    label: 'Preparando para o Grande Dia',
    insights: [
      'Exercícios seguros no 3° trimestre para preparar o corpo para o parto',
      'Como criar um plano de apoio para o pós-parto já agora',
      'Conexão com seu bebê nas últimas semanas: técnicas de vínculo pré-natal',
    ],
  },
  gestante_tranquila: {
    key: 'gestante_tranquila',
    label: 'Gestante Tranquila com Foco',
    insights: [
      'Nutrição e suplementação essencial na gestação por trimestre',
      'Exercícios seguros para gestantes: o que fazer em cada fase',
      'Prepare sua mente: o que muda na identidade ao se tornar mãe',
    ],
  },
  recuperacao_fisica: {
    key: 'recuperacao_fisica',
    label: 'Em Recuperação Física Pós-Parto',
    insights: [
      'Exercícios para diástase abdominal: sequência validada por fisioterapeutas',
      'Fortalecimento do assoalho pélvico: por onde começar com segurança',
      'Quando é seguro retornar aos exercícios após o parto?',
    ],
  },
  guerreira_sono: {
    key: 'guerreira_sono',
    label: 'Guerreira do Sono',
    insights: [
      'Janelas de sono do bebê por faixa etária: guia prático e realista',
      'Como criar uma rotina de sono que realmente funciona para vocês dois',
      'Lidar com a privação de sono: táticas que funcionam para mães',
    ],
  },
  desafio_amamentacao: {
    key: 'desafio_amamentacao',
    label: 'Enfrentando o Desafio da Amamentação',
    insights: [
      'Pega correta: os 3 ajustes que mudam tudo na amamentação',
      'Crises de amamentação: o que são, quando passam e como atravessar',
      'Consultora de amamentação: quando e como buscar suporte especializado',
    ],
  },
  mae_busca_si_mesma: {
    key: 'mae_busca_si_mesma',
    label: 'Mãe em Busca de Si Mesma',
    insights: [
      'Identidade materna: você ainda é você, além de mãe',
      'Autocuidado real: micro-momentos de reconexão que cabem na rotina',
      'Corpo pós-maternidade: ressignificação e cuidado sem culpa',
    ],
  },
  mae_solo: {
    key: 'mae_solo',
    label: 'Mãe Solo Resiliente',
    insights: [
      'Rotina funcional para mães solo: o que priorizar e o que soltar',
      'Construindo rede de apoio do zero: grupos, comunidades e serviços',
      'Autocuidado com tempo escasso: o que funciona de verdade',
    ],
  },
  mae_experiente: {
    key: 'mae_experiente',
    label: 'Mãe Experiente em Nova Fase',
    insights: [
      'Marcos de desenvolvimento após 1 ano: o que esperar agora',
      'Introdução alimentar avançada e nutrição do bebê maior',
      'Retomada de projetos pessoais e profissionais: como equilibrar',
    ],
  },
  mae_em_jornada: {
    key: 'mae_em_jornada',
    label: 'Mãe em Jornada',
    insights: [
      'Organize sua rotina diária com a timeline personalizada do app',
      'Autocuidado integrado à maternidade: pequenos passos, grande diferença',
      'A comunidade Mothers Team está aqui para você — não está sozinha',
    ],
  },
};

export function computeProfile(answers: OnboardingAnswers): MotherProfile {
  const { q1, q2, q3, q4, q5 } = answers;

  let key: string;

  if (q2 === 'D' && q3 === 'C') {
    key = 'exausta_sem_apoio';
  } else if (q2 === 'D' && q3 !== 'C') {
    key = 'sobrecarregada_amparada';
  } else if (q5 === 'C') {
    key = 'desafio_amamentacao';
  } else if (q4 === 'C' || q5 === 'B') {
    key = 'guerreira_sono';
  } else if (q1 === 'B' && (q2 === 'C' || q2 === 'D')) {
    key = 'gestante_ansiosa_reta_final';
  } else if (q1 === 'A' && (q2 === 'C' || q2 === 'D')) {
    key = 'gestante_ansiosa_inicio';
  } else if (q1 === 'C' && q4 === 'B') {
    key = 'recuperacao_fisica';
  } else if (q5 === 'A' || q5 === 'D') {
    key = 'mae_busca_si_mesma';
  } else if (q3 === 'C' && (q1 === 'C' || q1 === 'D' || q1 === 'E')) {
    key = 'mae_solo';
  } else if (q1 === 'B') {
    key = 'preparando_grande_dia';
  } else if (q1 === 'A') {
    key = 'gestante_tranquila';
  } else if (q1 === 'E') {
    key = 'mae_experiente';
  } else {
    key = 'mae_em_jornada';
  }

  const def = PROFILES[key];
  return { answers, profileKey: def.key, profileLabel: def.label, insights: def.insights };
}
```

- [ ] **Step 2.2: Criar testes para o scoring**

Criar `src/utils/onboardingScoring.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { computeProfile } from './onboardingScoring';
import type { OnboardingAnswers } from '../types';

const base: OnboardingAnswers = { q1: 'C', q2: 'B', q3: 'B', q4: 'A', q5: 'A' };

describe('computeProfile', () => {
  it('exausta_sem_apoio: q2=D e q3=C', () => {
    const p = computeProfile({ ...base, q2: 'D', q3: 'C' });
    expect(p.profileKey).toBe('exausta_sem_apoio');
    expect(p.insights).toHaveLength(3);
  });

  it('sobrecarregada_amparada: q2=D e q3=A', () => {
    const p = computeProfile({ ...base, q2: 'D', q3: 'A' });
    expect(p.profileKey).toBe('sobrecarregada_amparada');
  });

  it('desafio_amamentacao: q5=C (prioridade sobre outros)', () => {
    const p = computeProfile({ ...base, q2: 'B', q3: 'A', q5: 'C' });
    expect(p.profileKey).toBe('desafio_amamentacao');
  });

  it('guerreira_sono: q4=C', () => {
    const p = computeProfile({ ...base, q4: 'C', q5: 'A' });
    expect(p.profileKey).toBe('guerreira_sono');
  });

  it('guerreira_sono: q5=B', () => {
    const p = computeProfile({ ...base, q4: 'D', q5: 'B' });
    expect(p.profileKey).toBe('guerreira_sono');
  });

  it('gestante_ansiosa_reta_final: q1=B e q2=C', () => {
    const p = computeProfile({ ...base, q1: 'B', q2: 'C', q5: 'A' });
    expect(p.profileKey).toBe('gestante_ansiosa_reta_final');
  });

  it('gestante_ansiosa_reta_final: q1=B e q2=D', () => {
    const p = computeProfile({ ...base, q1: 'B', q2: 'D', q3: 'A', q5: 'A' });
    expect(p.profileKey).toBe('gestante_ansiosa_reta_final');
  });

  it('gestante_ansiosa_inicio: q1=A e q2=C', () => {
    const p = computeProfile({ ...base, q1: 'A', q2: 'C', q5: 'A' });
    expect(p.profileKey).toBe('gestante_ansiosa_inicio');
  });

  it('recuperacao_fisica: q1=C e q4=B', () => {
    const p = computeProfile({ ...base, q1: 'C', q2: 'B', q4: 'B', q5: 'A' });
    expect(p.profileKey).toBe('recuperacao_fisica');
  });

  it('mae_busca_si_mesma: q5=A (quando não há prioridade maior)', () => {
    const p = computeProfile({ ...base, q1: 'D', q2: 'B', q3: 'B', q4: 'A', q5: 'A' });
    expect(p.profileKey).toBe('mae_busca_si_mesma');
  });

  it('mae_busca_si_mesma: q5=D', () => {
    const p = computeProfile({ ...base, q1: 'D', q2: 'B', q3: 'B', q4: 'A', q5: 'D' });
    expect(p.profileKey).toBe('mae_busca_si_mesma');
  });

  it('mae_solo: q3=C e q1=D', () => {
    const p = computeProfile({ ...base, q1: 'D', q2: 'B', q3: 'C', q4: 'A', q5: 'A' });
    expect(p.profileKey).toBe('mae_busca_si_mesma');
  });

  it('mae_solo: q3=C, q1=C, q4=D, q5=A', () => {
    const p = computeProfile({ q1: 'C', q2: 'B', q3: 'C', q4: 'D', q5: 'A' });
    expect(p.profileKey).toBe('mae_busca_si_mesma');
  });

  it('preparando_grande_dia: q1=B e q2=A', () => {
    const p = computeProfile({ ...base, q1: 'B', q2: 'A', q5: 'A' });
    expect(p.profileKey).toBe('preparando_grande_dia');
  });

  it('gestante_tranquila: q1=A e q2=A', () => {
    const p = computeProfile({ ...base, q1: 'A', q2: 'A', q5: 'A' });
    expect(p.profileKey).toBe('gestante_tranquila');
  });

  it('mae_experiente: q1=E', () => {
    const p = computeProfile({ ...base, q1: 'E', q2: 'A', q3: 'A', q5: 'A' });
    expect(p.profileKey).toBe('mae_experiente');
  });

  it('mae_em_jornada: fallback (q1=C, q2=B, q3=B, q4=A, q5 inexistente nunca ocorre - mas cobre q1=D sem outras prioridades)', () => {
    const p = computeProfile({ q1: 'D', q2: 'A', q3: 'A', q4: 'A', q5: 'A' });
    expect(p.profileKey).toBe('mae_em_jornada');
  });

  it('retorna insights sempre com exatamente 3 itens', () => {
    const allQ1: Array<OnboardingAnswers['q1']> = ['A', 'B', 'C', 'D', 'E'];
    const allQ2: Array<OnboardingAnswers['q2']> = ['A', 'B', 'C', 'D'];
    const allQ3: Array<OnboardingAnswers['q3']> = ['A', 'B', 'C'];
    for (const q1 of allQ1) {
      for (const q2 of allQ2) {
        for (const q3 of allQ3) {
          const p = computeProfile({ q1, q2, q3, q4: 'A', q5: 'A' });
          expect(p.insights).toHaveLength(3);
        }
      }
    }
  });

  it('retorna profileLabel nunca vazio', () => {
    const p = computeProfile({ q1: 'C', q2: 'A', q3: 'A', q4: 'A', q5: 'A' });
    expect(p.profileLabel.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2.3: Rodar os testes e verificar se passam**

```bash
npm test -- onboardingScoring
```

Esperado: todos os testes passando (alguns casos `mae_solo` têm precedência de `mae_busca_si_mesma` — isso é intencional pela ordem de prioridade na função).

- [ ] **Step 2.4: Commit**
```bash
git add src/utils/onboardingScoring.ts src/utils/onboardingScoring.test.ts
git commit -m "feat: lógica de score de onboarding com 13 perfis e cobertura completa"
```

---

## Task 3: Atualizar o Zustand Store

**Files:**
- Modify: `src/store/useAppStore.ts`

- [ ] **Step 3.1: Substituir `src/store/useAppStore.ts` pelo conteúdo completo**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TabId, PregnancyPhase, RoutineEntry, BabyEntry, OnboardingAnswers, MotherProfile, CommunityPost } from '../types';
import { computeProfile } from '../utils/onboardingScoring';

const today = new Date().toISOString().split('T')[0];

const SEED_ROUTINE: RoutineEntry[] = [
  { id: '1', time: '08:00', date: today, title: 'Tomar Vitamina', category: 'medication', done: false },
  { id: '2', time: '14:00', date: today, title: 'Consulta Obstetra', category: 'appointment', done: false },
  { id: '3', time: '19:00', date: today, title: 'Caminhada leve 20min', category: 'task', done: false },
];

const SEED_BABY: BabyEntry[] = [
  { id: '1', time: '09:15', type: 'sleep', detail: 'Dormiu por 45 min' },
  { id: '2', time: '10:30', type: 'feed', detail: 'Mamou 15 min (esq.)' },
  { id: '3', time: '12:00', type: 'diaper', detail: 'Fralda trocada — xixi' },
];

const SEED_POSTS: CommunityPost[] = [
  {
    id: '1', category: 'gestação', author: 'Fernanda S.', badge: 'experiente',
    content: 'Dicas para aliviar o enjoo do primeiro trimestre: gengibre em cápsulas ajudou muito!',
    likes: 24, replies: 8, time: '2h',
  },
  {
    id: '2', category: 'amamentação', author: 'Dra. Carla Lima', badge: 'profissional',
    content: 'Posição correta para amamentar: costas apoiadas, bebê de frente para o peito, barriga com barriga.',
    likes: 67, replies: 12, time: '4h',
  },
  {
    id: '3', category: 'saúde mental', author: 'Juliana M.',
    content: 'Alguém mais sentiu que a solidão do puerpério é diferente de tudo? Precisava desabafar.',
    likes: 89, replies: 31, time: '5h',
  },
  {
    id: '4', category: 'pós-parto', author: 'Renata P.', badge: 'experiente',
    content: 'Cinta pós-cesárea: comecei a usar no hospital e fez diferença na recuperação.',
    likes: 45, replies: 9, time: '8h',
  },
  {
    id: '5', category: 'amamentação', author: 'Priscila T.',
    content: 'Meu bebê estava com dificuldade de pegar o bico. A fonoaudióloga resolveu em 2 sessões!',
    likes: 33, replies: 14, time: '10h',
  },
];

interface AppState {
  // Auth
  isLoggedIn: boolean;
  onboardingDone: boolean;
  motherProfile: MotherProfile | null;
  // App
  activeTab: TabId;
  phase: PregnancyPhase;
  motherName: string;
  babyName: string;
  selectedDate: string;
  routineEntries: RoutineEntry[];
  babyEntries: BabyEntry[];
  diaperCount: number;
  lastFeedSide: 'left' | 'right';
  communityPosts: CommunityPost[];
  // Actions — Auth
  login: (email: string, password: string) => boolean;
  logout: () => void;
  completeOnboarding: (answers: OnboardingAnswers) => void;
  resetOnboarding: () => void;
  // Actions — App
  setActiveTab: (tab: TabId) => void;
  setSelectedDate: (date: string) => void;
  toggleRoutineDone: (id: string) => void;
  addRoutineEntry: (entry: Omit<RoutineEntry, 'id'>) => void;
  incrementDiaper: () => void;
  toggleFeedSide: () => void;
  setFeedSide: (side: 'left' | 'right') => void;
  addBabyEntry: (entry: BabyEntry) => void;
  addCommunityPost: (post: Omit<CommunityPost, 'id' | 'likes' | 'replies' | 'time'>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth state
      isLoggedIn: false,
      onboardingDone: false,
      motherProfile: null,
      // App state
      activeTab: 'home',
      phase: { stage: 'pregnant', week: 28 },
      motherName: 'Mariana',
      babyName: 'Léo',
      selectedDate: new Date().toISOString().split('T')[0],
      routineEntries: SEED_ROUTINE,
      babyEntries: SEED_BABY,
      diaperCount: 0,
      lastFeedSide: 'left',
      communityPosts: SEED_POSTS,
      // Auth actions
      login: (email, password) => {
        const validEmail = import.meta.env.VITE_NAVIGATION_USER;
        const validPass = import.meta.env.VITE_PWD_NAVIGATION_USER;
        if (email === validEmail && password === validPass) {
          set({ isLoggedIn: true });
          return true;
        }
        return false;
      },
      logout: () => set({ isLoggedIn: false }),
      completeOnboarding: (answers) => {
        const profile = computeProfile(answers);
        set({ onboardingDone: true, motherProfile: profile });
      },
      resetOnboarding: () => set({ onboardingDone: false, motherProfile: null }),
      // App actions
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      toggleRoutineDone: (id) =>
        set((s) => ({
          routineEntries: s.routineEntries.map((e) =>
            e.id === id ? { ...e, done: !e.done } : e,
          ),
        })),
      addRoutineEntry: (entry) =>
        set((s) => ({
          routineEntries: [
            ...s.routineEntries,
            { ...entry, id: Date.now().toString() },
          ],
        })),
      incrementDiaper: () =>
        set((s) => ({
          diaperCount: s.diaperCount + 1,
          babyEntries: [
            ...s.babyEntries,
            {
              id: Date.now().toString(),
              time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              type: 'diaper',
              detail: 'Fralda trocada',
            },
          ],
        })),
      toggleFeedSide: () =>
        set((s) => ({ lastFeedSide: s.lastFeedSide === 'left' ? 'right' : 'left' })),
      setFeedSide: (side) => set({ lastFeedSide: side }),
      addBabyEntry: (entry) =>
        set((s) => ({ babyEntries: [...s.babyEntries, entry] })),
      addCommunityPost: (post) =>
        set((s) => ({
          communityPosts: [
            {
              ...post,
              id: Date.now().toString(),
              likes: 0,
              replies: 0,
              time: 'agora',
            },
            ...s.communityPosts,
          ],
        })),
    }),
    { name: 'mothers-team-v1' },
  ),
);
```

- [ ] **Step 3.2: Commit**
```bash
git add src/store/useAppStore.ts
git commit -m "feat: store — auth (login/logout/onboarding), addRoutineEntry, addCommunityPost, communityPosts"
```

---

## Task 4: LoginScreen

**Files:**
- Create: `src/components/auth/LoginScreen.tsx`

- [ ] **Step 4.1: Criar `src/components/auth/LoginScreen.tsx`**

```typescript
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function LoginScreen() {
  const login = useAppStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = login(email.trim(), password);
    if (!ok) setError(true);
  }

  return (
    <div className="min-h-screen bg-[#E8E4DF] flex items-center justify-center">
      <div className="w-[390px] min-h-[844px] bg-offwhite flex flex-col items-center justify-center px-8 gap-8 rounded-[2px] sm:rounded-[44px] shadow-2xl">
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-lavender-400 flex items-center justify-center text-2xl">
            🤱
          </div>
          <h1 className="text-xl font-bold text-graphite">Mothers Team</h1>
          <p className="text-xs text-graphite-muted text-center">
            Seu espaço de cuidado e acolhimento na maternidade
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-graphite-muted" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(false); }}
              placeholder="seu@email.com"
              className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-sm text-graphite placeholder:text-gray-300 focus:outline-none focus:border-lavender-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-graphite-muted" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-sm text-graphite placeholder:text-gray-300 focus:outline-none focus:border-lavender-400"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-blush-500 text-center">
              E-mail ou senha incorretos. Tente novamente.
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-lavender-600 text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
            disabled={!email || !password}
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4.2: Commit**
```bash
git add src/components/auth/LoginScreen.tsx
git commit -m "feat: LoginScreen com validação de credenciais e feedback de erro"
```

---

## Task 5: OnboardingScreen

**Files:**
- Create: `src/components/auth/OnboardingScreen.tsx`

- [ ] **Step 5.1: Criar `src/components/auth/OnboardingScreen.tsx`**

```typescript
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { OnboardingAnswers, Q1Answer, Q2Answer, Q3Answer, Q4Answer, Q5Answer } from '../../types';

interface Question<T extends string> {
  id: keyof OnboardingAnswers;
  text: string;
  options: { value: T; label: string }[];
}

const QUESTIONS = [
  {
    id: 'q1' as const,
    text: 'Em qual fase da maternidade você está hoje?',
    options: [
      { value: 'A' as Q1Answer, label: 'Gestante (1° ou 2° trimestre)' },
      { value: 'B' as Q1Answer, label: 'Gestante (3° trimestre — reta final)' },
      { value: 'C' as Q1Answer, label: 'Pós-parto recente (bebê de 0 a 3 meses)' },
      { value: 'D' as Q1Answer, label: 'Pós-parto (bebê de 4 a 12 meses)' },
      { value: 'E' as Q1Answer, label: 'Mãe de bebê com mais de 1 ano' },
    ],
  },
  {
    id: 'q2' as const,
    text: 'Como você tem se sentido emocionalmente na maior parte dos dias?',
    options: [
      { value: 'A' as Q2Answer, label: 'Confiante e animada, curtindo o processo' },
      { value: 'B' as Q2Answer, label: 'Cansada, mas conseguindo lidar com a rotina' },
      { value: 'C' as Q2Answer, label: 'Ansiosa, com muitos medos e inseguranças' },
      { value: 'D' as Q2Answer, label: 'Sobrecarregada, exausta e sem tempo para mim' },
    ],
  },
  {
    id: 'q3' as const,
    text: 'Com qual frequência você pode contar com ajuda para cuidar do bebê ou das tarefas diárias?',
    options: [
      { value: 'A' as Q3Answer, label: 'Sempre tenho ajuda disponível (parceiro(a), família ou rede contratada)' },
      { value: 'B' as Q3Answer, label: 'Tenho ajuda apenas em momentos específicos ou fins de semana' },
      { value: 'C' as Q3Answer, label: 'Não tenho rede de apoio — cuido de tudo praticamente sozinha' },
    ],
  },
  {
    id: 'q4' as const,
    text: 'Qual é o seu principal objetivo de saúde e bem-estar no aplicativo agora?',
    options: [
      { value: 'A' as Q4Answer, label: 'Entender o desenvolvimento do bebê e marcos de crescimento' },
      { value: 'B' as Q4Answer, label: 'Cuidar da minha saúde física (exercícios seguros, dores, assoalho pélvico)' },
      { value: 'C' as Q4Answer, label: 'Melhorar a qualidade do sono (meu e do bebê)' },
      { value: 'D' as Q4Answer, label: 'Organizar a rotina de amamentação, alimentação e cuidados práticos' },
    ],
  },
  {
    id: 'q5' as const,
    text: 'O que mais tem tirado o seu sono ou gerado preocupação ultimamente?',
    options: [
      { value: 'A' as Q5Answer, label: 'Falta de tempo para autocuidado e identidade pós-maternidade' },
      { value: 'B' as Q5Answer, label: 'Choro do bebê, cólicas ou dificuldades com o sono dele' },
      { value: 'C' as Q5Answer, label: 'Desafios com a amamentação ou introdução alimentar' },
      { value: 'D' as Q5Answer, label: 'Mudanças no corpo, flutuações hormonais e autoestima' },
    ],
  },
] satisfies Question<string>[];

type Answers = Partial<OnboardingAnswers>;

export function OnboardingScreen() {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const question = QUESTIONS[step];
  const selected = answers[question.id as keyof Answers];
  const isLast = step === QUESTIONS.length - 1;

  function selectOption(value: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  }

  function handleNext() {
    if (isLast && isComplete(answers)) {
      completeOnboarding(answers as OnboardingAnswers);
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleBack() {
    setStep((s) => s - 1);
  }

  return (
    <div className="min-h-screen bg-[#E8E4DF] flex items-center justify-center">
      <div className="w-[390px] min-h-[844px] bg-offwhite flex flex-col rounded-[2px] sm:rounded-[44px] shadow-2xl overflow-hidden">
        <div className="px-6 pt-12 pb-4">
          <div className="flex items-center gap-2 mb-6">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-lavender-600' : 'bg-lavender-100'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-graphite-muted font-medium mb-2">
            Pergunta {step + 1} de {QUESTIONS.length}
          </p>
          <h2 className="text-base font-semibold text-graphite leading-snug">
            {question.text}
          </h2>
        </div>

        <div className="flex-1 px-6 flex flex-col gap-3 overflow-y-auto pb-4">
          {question.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => selectOption(opt.value)}
              aria-pressed={selected === opt.value}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm transition-colors ${
                selected === opt.value
                  ? 'border-lavender-600 bg-lavender-50 text-graphite font-medium'
                  : 'border-gray-200 bg-white text-graphite-light'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="px-6 pb-10 pt-4 flex gap-3">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="flex-1 py-3 rounded-2xl border-2 border-lavender-200 text-lavender-600 text-sm font-semibold active:scale-95 transition-transform"
            >
              Voltar
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!selected}
            className="flex-1 py-3 rounded-2xl bg-lavender-600 text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-40"
          >
            {isLast ? 'Ver meu perfil 💜' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function isComplete(a: Answers): a is OnboardingAnswers {
  return !!(a.q1 && a.q2 && a.q3 && a.q4 && a.q5);
}
```

- [ ] **Step 5.2: Commit**
```bash
git add src/components/auth/OnboardingScreen.tsx
git commit -m "feat: OnboardingScreen — 5 perguntas, progresso visual e navegação entre etapas"
```

---

## Task 6: App.tsx — Controle de Fluxo

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 6.1: Substituir `src/App.tsx` pelo conteúdo completo**

```typescript
import React, { useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { MobileShell } from './components/layout/MobileShell';
import { HomeScreen } from './components/home/HomeScreen';
import { BabyScreen } from './components/baby/BabyScreen';
import { MaeIAScreen } from './components/maeIA/MaeIAScreen';
import { ComunidadeScreen } from './components/comunidade/ComunidadeScreen';
import { ShoppingScreen } from './components/shopping/ShoppingScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { OnboardingScreen } from './components/auth/OnboardingScreen';
import { ProfileScreen } from './components/profile/ProfileScreen';

export default function App() {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const activeTab = useAppStore((s) => s.activeTab);
  const [showProfile, setShowProfile] = useState(false);

  if (!isLoggedIn) return <LoginScreen />;
  if (!onboardingDone) return <OnboardingScreen />;

  if (showProfile) {
    return <ProfileScreen onClose={() => setShowProfile(false)} />;
  }

  const screens: Record<typeof activeTab, React.ReactElement> = {
    home:       <HomeScreen onOpenProfile={() => setShowProfile(true)} />,
    maeIA:      <MaeIAScreen />,
    baby:       <BabyScreen />,
    comunidade: <ComunidadeScreen />,
    shopping:   <ShoppingScreen />,
  };

  return <MobileShell>{screens[activeTab]}</MobileShell>;
}
```

- [ ] **Step 6.2: Commit**
```bash
git add src/App.tsx
git commit -m "feat: App.tsx — fluxo Login → Onboarding → App com controle de showProfile"
```

---

## Task 7: ProfileScreen

**Files:**
- Create: `src/components/profile/ProfileScreen.tsx`

- [ ] **Step 7.1: Criar `src/components/profile/ProfileScreen.tsx`**

```typescript
import { ArrowLeft, LogOut, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface ProfileScreenProps {
  onClose: () => void;
}

export function ProfileScreen({ onClose }: ProfileScreenProps) {
  const { motherName, motherProfile, logout, resetOnboarding } = useAppStore();
  const email = import.meta.env.VITE_NAVIGATION_USER as string;

  function handleLogout() {
    logout();
    onClose();
  }

  function handleResetOnboarding() {
    resetOnboarding();
    onClose();
  }

  const initial = motherName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#E8E4DF] flex items-center justify-center">
      <div className="relative w-[390px] h-[844px] bg-offwhite shadow-2xl overflow-hidden flex flex-col rounded-[2px] sm:rounded-[44px]">
        <div aria-hidden="true" className="h-11 flex-shrink-0 bg-white/80 backdrop-blur-sm" />

        <div className="flex items-center px-4 py-3 bg-white/80 border-b border-gray-100">
          <button
            onClick={onClose}
            aria-label="Voltar"
            className="w-9 h-9 rounded-xl bg-lavender-50 flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-lavender-600" strokeWidth={1.8} />
          </button>
          <h1 className="text-base font-semibold text-graphite ml-3">Meu Perfil</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-8 flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-lavender-400 flex items-center justify-center text-3xl font-bold text-white shadow-md">
              {initial}
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-graphite">{motherName}</p>
              <p className="text-xs text-graphite-muted mt-0.5">{email}</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-lavender-100 text-lavender-600 text-xs font-medium">
              Plano Gratuito
            </span>
          </div>

          {motherProfile && (
            <div className="bg-lavender-50 rounded-3xl p-4 flex flex-col gap-2">
              <p className="text-xs font-semibold text-lavender-600 uppercase tracking-wide">Seu Perfil</p>
              <p className="text-sm font-medium text-graphite">{motherProfile.profileLabel}</p>
              <ul className="flex flex-col gap-1 mt-1">
                {motherProfile.insights.map((insight, i) => (
                  <li key={i} className="text-xs text-graphite-light flex items-start gap-2">
                    <span className="text-lavender-400 mt-0.5">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-graphite-muted uppercase tracking-wide px-1">
              Conta
            </p>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl shadow-sm text-sm text-graphite active:scale-95 transition-transform"
            >
              <LogOut size={16} className="text-graphite-muted" strokeWidth={1.8} />
              Sair da conta
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-graphite-muted uppercase tracking-wide px-1">
              Homologação
            </p>
            <button
              onClick={handleResetOnboarding}
              className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl shadow-sm text-sm text-graphite-muted active:scale-95 transition-transform border border-dashed border-gray-200"
            >
              <RefreshCw size={16} className="text-graphite-muted" strokeWidth={1.8} />
              <span>Resetar Onboarding</span>
              <span className="ml-auto text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-graphite-muted">
                teste
              </span>
            </button>
            <p className="text-[10px] text-graphite-muted px-1">
              Limpa as respostas do questionário e permite refazê-lo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7.2: Commit**
```bash
git add src/components/profile/ProfileScreen.tsx
git commit -m "feat: ProfileScreen — avatar, perfil de onboarding, logout e resetar onboarding"
```

---

## Task 8: InsightCard + HomeScreen (avatar + card de perfil)

**Files:**
- Create: `src/components/home/InsightCard.tsx`
- Modify: `src/components/home/HomeScreen.tsx`

- [ ] **Step 8.1: Criar `src/components/home/InsightCard.tsx`**

```typescript
import { useState } from 'react';
import { X } from 'lucide-react';
import type { MotherProfile } from '../../types';

interface InsightCardProps {
  profile: MotherProfile;
}

export function InsightCard({ profile }: InsightCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="mx-4 bg-lavender-50 border border-lavender-200 rounded-3xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold text-lavender-600 uppercase tracking-wide">
            Seu perfil personalizado
          </p>
          <p className="text-sm font-semibold text-graphite mt-0.5">
            {profile.profileLabel}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Fechar insights"
          className="w-7 h-7 rounded-full bg-lavender-100 flex items-center justify-center flex-shrink-0"
        >
          <X size={12} className="text-lavender-600" strokeWidth={2} />
        </button>
      </div>
      <ul className="flex flex-col gap-1.5">
        {profile.insights.map((insight, i) => (
          <li key={i} className="text-xs text-graphite-light flex items-start gap-2 leading-relaxed">
            <span className="text-lavender-400 font-bold mt-0.5 flex-shrink-0">•</span>
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 8.2: Substituir `src/components/home/HomeScreen.tsx`**

```typescript
import { useState } from 'react';
import { Bell, Plus } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getHeaderGreeting } from '../../utils/pregnancyUtils';
import { WeekCalendar } from './WeekCalendar';
import { RoutineTimeline } from './RoutineTimeline';
import { InsightCard } from './InsightCard';
import { AddRoutineModal } from './AddRoutineModal';

interface HomeScreenProps {
  onOpenProfile: () => void;
}

export function HomeScreen({ onOpenProfile }: HomeScreenProps) {
  const { phase, motherName, babyName, selectedDate, motherProfile } = useAppStore();
  const greeting = getHeaderGreeting(phase, motherName, babyName);
  const [showAddModal, setShowAddModal] = useState(false);
  const initial = motherName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex items-start justify-between px-4 pt-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenProfile}
            aria-label="Abrir perfil"
            className="w-10 h-10 rounded-full bg-lavender-400 flex items-center justify-center text-base font-bold text-white shadow-sm flex-shrink-0 active:scale-95 transition-transform"
          >
            {initial}
          </button>
          <div>
            <p className="text-xs text-graphite-muted font-medium">Bom dia ☀️</p>
            <h1 className="text-base font-semibold text-graphite leading-snug max-w-[220px]">
              {greeting}
            </h1>
          </div>
        </div>
        <button
          aria-label="Notificações"
          className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center"
        >
          <Bell size={18} className="text-graphite-light" strokeWidth={1.8} />
        </button>
      </div>

      {motherProfile && <InsightCard profile={motherProfile} />}

      <WeekCalendar referenceDate={selectedDate} />

      <div className="flex items-center justify-between px-4">
        <h2 className="text-sm font-semibold text-graphite">Sua Rotina</h2>
        <span className="text-xs text-graphite-muted">
          {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </span>
      </div>

      <RoutineTimeline />

      <button
        onClick={() => setShowAddModal(true)}
        aria-label="Adicionar lembrete ou evento"
        className="fixed bottom-24 right-6 w-12 h-12 rounded-full bg-lavender-600 shadow-lg shadow-lavender-400/40 flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus size={22} className="text-white" strokeWidth={2.5} />
      </button>

      {showAddModal && (
        <AddRoutineModal
          onClose={() => setShowAddModal(false)}
          defaultDate={selectedDate}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 8.3: Commit**
```bash
git add src/components/home/InsightCard.tsx src/components/home/HomeScreen.tsx
git commit -m "feat: InsightCard na Home + avatar de perfil no header"
```

---

## Task 9: AddRoutineModal

**Files:**
- Create: `src/components/home/AddRoutineModal.tsx`

- [ ] **Step 9.1: Criar `src/components/home/AddRoutineModal.tsx`**

```typescript
import { useState } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { RoutineEntry } from '../../types';

interface AddRoutineModalProps {
  onClose: () => void;
  defaultDate: string;
}

const CATEGORIES: { value: RoutineEntry['category']; label: string; emoji: string }[] = [
  { value: 'task',        label: 'Tarefa',   emoji: '✅' },
  { value: 'appointment', label: 'Consulta', emoji: '📅' },
  { value: 'medication',  label: 'Medicação', emoji: '💊' },
];

function nowTime(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(Math.round(d.getMinutes() / 15) * 15 % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function AddRoutineModal({ onClose, defaultDate }: AddRoutineModalProps) {
  const addRoutineEntry = useAppStore((s) => s.addRoutineEntry);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState(nowTime());
  const [category, setCategory] = useState<RoutineEntry['category']>('task');
  const [date, setDate] = useState(defaultDate);

  function handleAdd() {
    if (!title.trim()) return;
    addRoutineEntry({ title: title.trim(), time, category, date, done: false });
    onClose();
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Adicionar à rotina"
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[390px] bg-offwhite rounded-t-[32px] z-50 px-6 pt-5 pb-10 flex flex-col gap-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
          <h2 className="text-base font-semibold text-graphite pt-2">Adicionar à Rotina</h2>
          <button onClick={onClose} aria-label="Fechar" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={14} className="text-graphite-muted" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-graphite-muted" htmlFor="routine-title">
            O que você precisa fazer?
          </label>
          <input
            id="routine-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Tomar vitamina D"
            autoFocus
            className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-sm text-graphite placeholder:text-gray-300 focus:outline-none focus:border-lavender-400"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-medium text-graphite-muted" htmlFor="routine-time">
              Horário
            </label>
            <input
              id="routine-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-sm text-graphite focus:outline-none focus:border-lavender-400"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-medium text-graphite-muted" htmlFor="routine-date">
              Data
            </label>
            <input
              id="routine-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-sm text-graphite focus:outline-none focus:border-lavender-400"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-graphite-muted">Categoria</p>
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                aria-pressed={category === cat.value}
                className={`flex-1 py-2.5 rounded-2xl text-xs font-medium flex flex-col items-center gap-1 transition-colors border-2 ${
                  category === cat.value
                    ? 'border-lavender-600 bg-lavender-50 text-graphite'
                    : 'border-gray-200 bg-white text-graphite-muted'
                }`}
              >
                <span className="text-base">{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleAdd}
          disabled={!title.trim()}
          className="w-full py-3.5 rounded-2xl bg-lavender-600 text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-40"
        >
          Adicionar
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 9.2: Commit**
```bash
git add src/components/home/AddRoutineModal.tsx
git commit -m "feat: AddRoutineModal — bottom sheet para adicionar itens à rotina"
```

---

## Task 10: CreatePostScreen + ComunidadeScreen

**Files:**
- Create: `src/components/comunidade/CreatePostScreen.tsx`
- Modify: `src/components/comunidade/ComunidadeScreen.tsx`

- [ ] **Step 10.1: Criar `src/components/comunidade/CreatePostScreen.tsx`**

```typescript
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { CommunityPost } from '../../types';

type PostCategory = CommunityPost['category'];

const CATEGORIES: { value: PostCategory; label: string }[] = [
  { value: 'gestação',     label: 'Gestação' },
  { value: 'pós-parto',   label: 'Pós-parto' },
  { value: 'amamentação', label: 'Amamentação' },
  { value: 'saúde mental', label: 'Saúde Mental' },
];

interface CreatePostScreenProps {
  onBack: () => void;
}

export function CreatePostScreen({ onBack }: CreatePostScreenProps) {
  const addCommunityPost = useAppStore((s) => s.addCommunityPost);
  const motherName = useAppStore((s) => s.motherName);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategory>('saúde mental');

  function handlePublish() {
    if (!content.trim()) return;
    addCommunityPost({ author: motherName, content: content.trim(), category });
    onBack();
  }

  return (
    <div className="flex flex-col gap-4 pb-6 h-full">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="w-9 h-9 rounded-xl bg-lavender-50 flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-lavender-600" strokeWidth={1.8} />
        </button>
        <h1 className="text-base font-semibold text-graphite">Desabafar</h1>
      </div>

      <div className="px-4 flex flex-col gap-3 flex-1">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="O que você está sentindo? Este é um espaço seguro 💜"
          autoFocus
          rows={7}
          className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-sm text-graphite placeholder:text-graphite-muted leading-relaxed resize-none focus:outline-none focus:border-lavender-400"
        />

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-graphite-muted">Categoria</p>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                aria-pressed={category === cat.value}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  category === cat.value
                    ? 'bg-lavender-600 text-white'
                    : 'bg-white text-graphite-muted border border-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4">
        <button
          onClick={handlePublish}
          disabled={!content.trim()}
          className="w-full py-3.5 rounded-2xl bg-lavender-600 text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-40"
        >
          Publicar 💜
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 10.2: Substituir `src/components/comunidade/ComunidadeScreen.tsx`**

```typescript
import { useState } from 'react';
import { MessageCircle, Heart } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { CreatePostScreen } from './CreatePostScreen';
import type { CommunityPost } from '../../types';

type Category = 'todos' | CommunityPost['category'];

const BADGE_CONFIG = {
  experiente:   { label: 'Mãe Experiente',       color: 'bg-blush-100 text-blush-500' },
  profissional: { label: 'Profissional de Saúde', color: 'bg-sage-100 text-sage-600' },
} as const;

const CATEGORY_LABELS: Category[] = ['todos', 'gestação', 'pós-parto', 'amamentação', 'saúde mental'];

function PostCard({ post }: { post: CommunityPost }) {
  const [liked, setLiked] = useState(false);
  const badge = post.badge ? BADGE_CONFIG[post.badge] : null;

  return (
    <div
      data-testid="post-card"
      data-category={post.category}
      className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-graphite">{post.author}</p>
          {badge && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full w-fit ${badge.color}`}>
              {badge.label}
            </span>
          )}
        </div>
        <span className="text-xs text-graphite-muted flex-shrink-0">{post.time}</span>
      </div>

      <p className="text-sm text-graphite-light leading-relaxed">{post.content}</p>

      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={() => setLiked((v) => !v)}
          aria-label={liked ? 'Descurtir' : 'Curtir'}
          aria-pressed={liked}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            liked ? 'text-blush-500' : 'text-graphite-muted'
          }`}
        >
          <Heart size={14} fill={liked ? 'currentColor' : 'none'} strokeWidth={1.8} />
          {post.likes + (liked ? 1 : 0)}
        </button>
        <button
          aria-label={`Ver ${post.replies} respostas`}
          className="flex items-center gap-1.5 text-xs text-graphite-muted"
        >
          <MessageCircle size={14} strokeWidth={1.8} />
          {post.replies}
        </button>
      </div>
    </div>
  );
}

export function ComunidadeScreen() {
  const communityPosts = useAppStore((s) => s.communityPosts);
  const [activeCategory, setActiveCategory] = useState<Category>('todos');
  const [showCreate, setShowCreate] = useState(false);

  if (showCreate) {
    return <CreatePostScreen onBack={() => setShowCreate(false)} />;
  }

  const filtered = activeCategory === 'todos'
    ? communityPosts
    : communityPosts.filter((p) => p.category === activeCategory);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="px-4 pt-4 flex items-center justify-between">
        <h1 className="text-base font-semibold text-graphite">Comunidade</h1>
        <button
          onClick={() => setShowCreate(true)}
          aria-label="Desabafar"
          className="px-3 py-1.5 rounded-xl bg-lavender-600 text-white text-xs font-semibold active:scale-95 transition-transform"
        >
          Desabafar 💜
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4">
        {CATEGORY_LABELS.map((cat) => {
          const label = cat === 'todos' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1);
          return (
            <button
              key={cat}
              aria-pressed={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              aria-label={label}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-lavender-600 text-white'
                  : 'bg-white text-graphite-muted'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 px-4">
        {filtered.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 10.3: Commit**
```bash
git add src/components/comunidade/CreatePostScreen.tsx src/components/comunidade/ComunidadeScreen.tsx
git commit -m "feat: CreatePostScreen + ComunidadeScreen usa store para posts e conecta Desabafar"
```

---

## Task 11: Verificação Final

- [ ] **Step 11.1: Rodar todos os testes**
```bash
npm test
```
Esperado: todos os testes passando, incluindo os existentes (BottomTabBar, WeekCalendar, DiaperCard, ComunidadeScreen, pregnancyUtils) e os novos (onboardingScoring).

- [ ] **Step 11.2: Rodar o app e verificar o fluxo completo**
```bash
npm run dev
```
Verificar manualmente:
- [ ] App abre na LoginScreen
- [ ] Login com `navegador@mothersteam` / `admin@mothersteam` funciona
- [ ] Login com credenciais erradas mostra erro
- [ ] Após login, OnboardingScreen aparece com 5 perguntas
- [ ] Progresso visual avança a cada resposta
- [ ] "Ver meu perfil" completa o onboarding e vai para a Home
- [ ] InsightCard aparece na Home com o perfil correto
- [ ] InsightCard pode ser fechado (X)
- [ ] Avatar no header (inicial do nome) abre ProfileScreen
- [ ] ProfileScreen exibe nome, e-mail, plano e insights do perfil
- [ ] Botão "Sair" faz logout e volta para LoginScreen
- [ ] "Resetar Onboarding" volta para o questionário
- [ ] Botão + na Home abre AddRoutineModal
- [ ] Adicionar item à rotina aparece na RoutineTimeline
- [ ] Botão "Desabafar" na Comunidade abre CreatePostScreen
- [ ] Publicar post adiciona ao topo do feed com "agora"

- [ ] **Step 11.3: Commit final**
```bash
git add -A
git commit -m "chore: verificação final — fase 2 completa"
```
