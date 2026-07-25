# Baby Dev Card + Momento com Deus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new cards to DashboardScreen — BabyDevCard (realistic development info per week/month) and MomentoDeusCard (biblical verse + reflection) — each opening a full-screen overlay, replacing the existing verse footer.

**Architecture:** Static TS data files + framer-motion full-screen overlays rendered inside DashboardScreen with AnimatePresence. Zustand store gains `savedVerses` for the "save" action. No new routes or tabs.

**Tech Stack:** React 18, TypeScript, Framer Motion 11, Zustand 5, Tailwind (custom tokens: sara-gold, sara-terracotta, sara-cream, sara-linen, graphite, graphite-muted)

---

### Task 1: Data Files — babyDev.ts + momentoDeus.ts

**Files:**
- Create: `src/data/babyDev.ts`
- Create: `src/data/momentoDeus.ts`

No tests for pure data files — content is verified visually. Commit after creation.

#### babyDev.ts

```ts
export interface BabyDevContent {
  title: string
  size: string            // ex: "do tamanho de um limão"
  emoji: string           // placeholder for future illustration
  curiosities: string[]   // 2-3 items from scientific sources
  source: string          // attribution
}

// Keyed by week bucket label — use getBabyDevContent(phase) to resolve
const PREGNANCY: Record<string, BabyDevContent> = {
  '4-6': {
    title: 'Semanas 4–6: O coração começa a bater',
    size: 'menor que um grão de arroz',
    emoji: '🌱',
    curiosities: [
      'O coração já pulsa cerca de 110 vezes por minuto nessa fase.',
      'O tubo neural — precursor do cérebro e medula espinal — está se formando.',
      'Os brotos dos membros superiores já aparecem por volta da 6ª semana.',
    ],
    source: 'Mayo Clinic · MedlinePlus',
  },
  '7-9': {
    title: 'Semanas 7–9: Feições em formação',
    size: 'do tamanho de uma uva',
    emoji: '🫐',
    curiosities: [
      'Os olhos estão visíveis como pontos escuros e as narinas começam a se formar.',
      'Os dedos das mãos começam a se separar — ainda unidos por uma membrana fina.',
      'Movimentos espontâneos já ocorrem, mas a mãe ainda não os sente.',
    ],
    source: 'ACOG · MedlinePlus',
  },
  '10-13': {
    title: 'Semanas 10–13: Fim do 1° trimestre',
    size: 'do tamanho de um limão',
    emoji: '🍋',
    curiosities: [
      'Todos os órgãos vitais estão formados — agora é fase de crescimento.',
      'As unhas começam a aparecer nas pontas dos dedos.',
      'O bebê já consegue engolir o líquido amniótico.',
    ],
    source: 'Mayo Clinic · NIH',
  },
  '14-17': {
    title: 'Semanas 14–17: Movimentos ativos',
    size: 'do tamanho de uma maçã',
    emoji: '🍎',
    curiosities: [
      'O bebê já faz expressões faciais — sorrisos e caretas involuntárias.',
      'As impressões digitais únicas estão se formando.',
      'O sistema nervoso está amadurecendo rapidamente.',
    ],
    source: 'ACOG · MedlinePlus',
  },
  '18-22': {
    title: 'Semanas 18–22: Chute e virada',
    size: 'do tamanho de uma banana',
    emoji: '🍌',
    curiosities: [
      'A maioria das mães sente os primeiros movimentos nessa janela.',
      'O vernix caseosa — camada protetora branca — cobre a pele do bebê.',
      'O sono do bebê já tem ciclos de REM, semelhantes aos de recém-nascidos.',
    ],
    source: 'Mayo Clinic · NIH',
  },
  '23-27': {
    title: 'Semanas 23–27: Pulmões em desenvolvimento',
    size: 'do tamanho de um pimentão',
    emoji: '🫑',
    curiosities: [
      'Os pulmões produzem surfactante, substância que evita o colapso dos alvéolos.',
      'O bebê consegue ouvir a voz da mãe e reagir a sons externos.',
      'A gordura subcutânea começa a se acumular, suavizando a aparência da pele.',
    ],
    source: 'ACOG · MedlinePlus',
  },
  '28-31': {
    title: 'Semanas 28–31: Olhos abertos',
    size: 'do tamanho de um coco',
    emoji: '🥥',
    curiosities: [
      'Os olhos já abrem e fecham — o bebê consegue perceber luz através da barriga.',
      'O cérebro cresce rapidamente, com os sulcos característicos se aprofundando.',
      'O bebê pratica a respiração com o líquido amniótico, preparando os pulmões.',
    ],
    source: 'Mayo Clinic · NIH',
  },
  '32-36': {
    title: 'Semanas 32–36: Preparação para o mundo',
    size: 'do tamanho de um melão',
    emoji: '🍈',
    curiosities: [
      'O bebê ocupa quase todo o útero e os movimentos ficam mais perceptíveis.',
      'O sistema imune recebe anticorpos maternos pela placenta.',
      'A maioria dos bebês assume a posição de cabeça para baixo nessa fase.',
    ],
    source: 'ACOG · Mayo Clinic',
  },
  '37-40': {
    title: 'Semanas 37–40: Pronto para nascer',
    size: 'do tamanho de uma melancia',
    emoji: '🍉',
    curiosities: [
      'O bebê a termo pesa em média 3,3 kg e mede ~50 cm.',
      'Os pulmões estão maduros e prontos para a primeira respiração.',
      'O bebê reconhece a voz da mãe — estudos mostram reação preferencial a ela.',
    ],
    source: 'Mayo Clinic · NIH · ACOG',
  },
  '41+': {
    title: 'Semana 41+: Na hora certa',
    size: 'do tamanho de uma melancia madura',
    emoji: '🌸',
    curiosities: [
      'Gestações de 41–42 semanas são consideradas pós-termo — monitoramento é importante.',
      'O bebê pode apresentar descamação da pele, pois o vernix foi reabsorvido.',
      'A OMS considera o parto entre 37 e 42 semanas como a termo completo.',
    ],
    source: 'ACOG · OMS',
  },
}

const POSTPARTUM: Record<string, BabyDevContent> = {
  '0': {
    title: 'Recém-nascido: O primeiro encontro',
    size: 'em média 3,3 kg · ~50 cm',
    emoji: '🌷',
    curiosities: [
      'Recém-nascidos reconhecem o cheiro da mãe desde as primeiras horas de vida.',
      'A visão ainda é borrada — o bebê enxerga melhor a ~25 cm, distância do rosto durante a amamentação.',
      'O reflexo de sucção está presente desde o nascimento e é vital para a amamentação.',
    ],
    source: 'Mayo Clinic · MedlinePlus',
  },
  '1': {
    title: '1 mês: Sorriso social chegando',
    size: 'em média 4,3 kg · ~55 cm',
    emoji: '☀️',
    curiosities: [
      'Por volta de 6 semanas surge o primeiro sorriso social — resposta real ao rosto da mãe.',
      'O bebê já segue objetos em movimento com os olhos.',
      'Choro é a única linguagem, mas a mãe começa a diferenciar os tipos.',
    ],
    source: 'CDC · MedlinePlus',
  },
  '2': {
    title: '2 meses: Vocalizando',
    size: 'em média 5,6 kg · ~58 cm',
    emoji: '🗣️',
    curiosities: [
      'O bebê começa a emitir sons além do choro — os primeiros "oohs" e "aahs".',
      'Consegue sustentar a cabeça brevemente quando colocado de bruços.',
      'O ciclo sono-vigília começa a se organizar gradualmente.',
    ],
    source: 'CDC · AAP',
  },
  '3': {
    title: '3 meses: Descobrindo as mãos',
    size: 'em média 6,4 kg · ~61 cm',
    emoji: '🤲',
    curiosities: [
      'O bebê descobre as próprias mãos e passa tempo fascinado olhando para elas.',
      'Gargalhadas surgem — o riso social é um marco emocionante.',
      'Os cólicos tendem a diminuir significativamente nessa fase.',
    ],
    source: 'CDC · Mayo Clinic',
  },
  '4-5': {
    title: '4–5 meses: Rolando e explorando',
    size: 'em média 7 kg · ~64 cm',
    emoji: '🔄',
    curiosities: [
      'A maioria dos bebês aprende a rolar de bruços para a barriga nessa fase.',
      'O interesse por objetos coloridos e texturas aumenta muito.',
      'O bebê começa a levar objetos à boca como forma de exploração sensorial.',
    ],
    source: 'CDC · AAP',
  },
  '6-8': {
    title: '6–8 meses: Sentando e mastigando',
    size: 'em média 8 kg · ~68 cm',
    emoji: '🥄',
    curiosities: [
      'A introdução alimentar complementar pode começar a partir dos 6 meses.',
      'O bebê começa a sentar sem apoio — um marco importante do desenvolvimento motor.',
      'Aparece a angústia de separação: o bebê sente falta da mãe quando ela sai.',
    ],
    source: 'OMS · CDC · AAP',
  },
  '9-11': {
    title: '9–11 meses: Engatinhando',
    size: 'em média 9 kg · ~72 cm',
    emoji: '🐾',
    curiosities: [
      'A maioria engatinha — mas alguns bebês pulam essa fase e vão direto para andar.',
      'A pinça fina (pegar objetos pequenos entre polegar e indicador) está se desenvolvendo.',
      'O bebê entende palavras simples como "não" e o próprio nome.',
    ],
    source: 'CDC · Mayo Clinic',
  },
  '12+': {
    title: '12+ meses: Primeiros passos',
    size: 'em média 10 kg · ~76 cm',
    emoji: '👣',
    curiosities: [
      'A maioria das crianças dá os primeiros passos entre 9 e 12 meses.',
      'O vocabulário começa a crescer — primeiras palavras com significado real.',
      'A amamentação pode continuar pelo tempo que mãe e bebê desejarem, segundo a OMS.',
    ],
    source: 'OMS · CDC · AAP',
  },
}

function getPregnancyBucket(week: number): string {
  if (week <= 6) return '4-6'
  if (week <= 9) return '7-9'
  if (week <= 13) return '10-13'
  if (week <= 17) return '14-17'
  if (week <= 22) return '18-22'
  if (week <= 27) return '23-27'
  if (week <= 31) return '28-31'
  if (week <= 36) return '32-36'
  if (week <= 40) return '37-40'
  return '41+'
}

function getPostpartumBucket(ageInDays: number): string {
  const months = ageInDays / 30
  if (months < 1) return '0'
  if (months < 2) return '1'
  if (months < 3) return '2'
  if (months < 4) return '3'
  if (months < 6) return '4-5'
  if (months < 9) return '6-8'
  if (months < 12) return '9-11'
  return '12+'
}

import type { PregnancyPhase } from '../types'

export function getBabyDevContent(phase: PregnancyPhase): BabyDevContent {
  if (phase.stage === 'pregnant') {
    return PREGNANCY[getPregnancyBucket(phase.week)]
  }
  return POSTPARTUM[getPostpartumBucket(phase.ageInDays)]
}
```

#### momentoDeus.ts

Create `src/data/momentoDeus.ts` with 14 entries (rotated by `getDayOfYear() % 14`):

```ts
export interface MomentoDeusEntry {
  verso: string
  referencia: string
  reflexao: string   // Sara's voice — warm, maternal
  oracao: string     // short prayer (2-3 sentences)
}

const MOMENTOS: MomentoDeusEntry[] = [
  {
    verso: 'Venham a mim, todos os que estão cansados e sobrecarregados, e eu lhes darei descanso.',
    referencia: 'Mateus 11:28',
    reflexao: 'Maternidade cansa de um jeito que ninguém te contou antes. Mas esse convite existe para você — agora, nesse momento. Você não precisa chegar inteira até Deus. Você pode chegar exatamente como está.',
    oracao: 'Senhor, eu chego até Ti com esse cansaço real. Recebe o meu coração como ele está hoje — sem força de fingir que está tudo bem. Me dá o descanso que só Tu podes dar.',
  },
  {
    verso: 'Deus é o nosso refúgio e força, socorro bem-provado nas tribulações.',
    referencia: 'Salmos 46:1',
    reflexao: 'Há dias em que a maternidade pesa mais do que você esperava. Não é fraqueza sentir isso — é honestidade. E é exatamente nesses dias que esse versículo não é poesia: é uma promessa real de alguém que não abandona.',
    oracao: 'Tu és meu refúgio quando eu não sei mais como segurar tudo. Entra nesse caos comigo, Senhor, e sê a força que me falta.',
  },
  {
    verso: 'Lancem sobre ele toda a sua ansiedade, porque ele cuida de vocês.',
    referencia: '1 Pedro 5:7',
    reflexao: 'Você não foi feita para carregar tudo sozinha. Cada preocupação com seu bebê, cada dúvida às 3 da manhã, cada medo que não verbaliza — pode colocar tudo nas mãos de Deus. Ele cuida de você enquanto você cuida do seu filho.',
    oracao: 'Aqui está a minha ansiedade, Senhor — a que não consigo nomear e a que me tira o sono. Cuida de mim como só Tu sabes.',
  },
  {
    verso: 'As misericórdias do SENHOR jamais cessam; as suas compaixões nunca chegam ao fim. São renovadas cada manhã.',
    referencia: 'Lamentações 3:22-23',
    reflexao: 'Cada amanhecer é uma página em branco — não importa como foi ontem. Deus não guarda rancor dos seus erros de mãe. Cada manhã, a compaixão dele é nova. Igual a ele, você pode começar de novo.',
    oracao: 'Obrigada por não desistir de mim nos dias em que eu tropecei. Recebo essa manhã como graça nova — me ajuda a começar bem.',
  },
  {
    verso: 'Os que esperam no SENHOR renovam as suas forças. Voam alto como águias.',
    referencia: 'Isaías 40:31',
    reflexao: 'Esperar não é passividade. Esperar em Deus é confiar que ele está trabalhando mesmo quando você não vê. Esse período de maternidade intensa vai passar — e você vai olhar para trás e ver como foi sustentada.',
    oracao: 'Nos momentos em que não tenho forças para mais nada, que eu saiba esperar em Ti. Renova o que em mim está exausto.',
  },
  {
    verso: 'Não tenha medo, pois estou com você; não se apavore, pois sou o seu Deus.',
    referencia: 'Isaías 41:10',
    reflexao: 'O medo faz parte da maternidade — medo de errar, de não ser suficiente, de que algo ruim aconteça. Deus não ignora esses medos. Ele entra neles e diz: Eu estou aqui.',
    oracao: 'Entra nos meus medos, Senhor. Não quero que eles me paralisem. Sê maior do que cada um deles.',
  },
  {
    verso: 'Pois eu sei os planos que tenho para vocês — planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um futuro.',
    referencia: 'Jeremias 29:11',
    reflexao: 'Quando a maternidade não parece com o que você imaginou, é difícil crer que existe um plano bom. Mas esse versículo é uma âncora: Deus não improvisou sua vida. Ele tem um propósito bonito — para você e para seu filho.',
    oracao: 'Quando eu não enxergo o caminho, lembra-me de que Tu o conheces. Confio no Teu plano mesmo quando o meu não faz sentido.',
  },
  {
    verso: 'O SENHOR está perto dos que têm o coração quebrantado e salva os que estão com o espírito abatido.',
    referencia: 'Salmos 34:18',
    reflexao: 'Não existe coração partido demais para Deus se aproximar. Ele não espera que você esteja bem para vir até você — ele vem exatamente quando você está no chão.',
    oracao: 'Aqui está meu coração — com as rachaduras e tudo. Sê perto de mim hoje, Senhor.',
  },
  {
    verso: 'Tu formaste o meu ser interior; tu me teceste no ventre de minha mãe. Sou uma criação espantosa e maravilhosa.',
    referencia: 'Salmos 139:13-14',
    reflexao: 'Esse versículo é sobre você — e sobre o seu bebê. Deus teceu cada um de vocês com intenção e cuidado. Não foi acidente. Você foi feita exatamente para ser quem é.',
    oracao: 'Obrigada por me fazer como sou. Por fazer meu filho como ele é. Que eu possa enxergar a maravilha disso nos dias comuns.',
  },
  {
    verso: 'Aquele que começou boa obra em você a completará até o dia de Cristo Jesus.',
    referencia: 'Filipenses 1:6',
    reflexao: 'Você está em obra — não está pronta, e tudo bem. Deus não abandona projetos no meio. A mãe que você está se tornando é parte de algo que ele começou e vai terminar.',
    oracao: 'Obrigada por não desistir de mim quando eu me sinto incompleta. Continua Tua obra em mim.',
  },
  {
    verso: 'Que o Deus da esperança os encha de toda alegria e paz, à medida que confiam nele.',
    referencia: 'Romanos 15:13',
    reflexao: 'Alegria e paz não são estados permanentes que você alcança — são dons que chegam à medida que você confia. Cada momento de entrega é uma porta aberta para eles entrarem.',
    oracao: 'Enche meu coração de paz hoje. Não a que o mundo dá — a Tua, que excede todo entendimento.',
  },
  {
    verso: 'Pode uma mãe esquecer seu filho de peito? Ainda que ela se esquecesse, eu não me esquecerei de você!',
    referencia: 'Isaías 49:15',
    reflexao: 'O amor que você sente pelo seu filho é o amor mais próximo que existe do amor de Deus. E mesmo esse amor tem limites — o de Deus, não. Você é lembrada, cuidada, vista.',
    oracao: 'Obrigada por me amar mais do que eu consigo amar. Por me lembrar nos dias em que me sinto esquecida.',
  },
  {
    verso: 'O SENHOR te abençoará e te guardará; o SENHOR fará resplandecer o seu rosto sobre ti.',
    referencia: 'Números 6:24-25',
    reflexao: 'Esta é uma bênção antiga — dita sobre pessoas comuns em dias comuns. Ela também é sua hoje. Que o rosto de Deus ilumine esse dia, essa semana, essa fase.',
    oracao: 'Recebo essa bênção hoje, Senhor. Guarda a mim e ao meu filho. Faz resplandecer Teu rosto sobre a nossa casa.',
  },
  {
    verso: 'Como mãe que consola o seu filho, assim eu os consolarei.',
    referencia: 'Isaías 66:13',
    reflexao: 'O mesmo instinto que te faz correr ao choro do seu bebê — Deus tem em relação a você. Você foi consolada antes de aprender a consolar. Deixa ele te consolar hoje.',
    oracao: 'Assim como eu consolo meu filho, Senhor, vem me consolar. Preciso do Teu colo hoje.',
  },
]

function getDayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

export type MoodPeriod = 'manha' | 'tarde' | 'noite' | 'madrugada'

export function getMoodPeriod(hour?: number): MoodPeriod {
  const h = hour ?? new Date().getHours()
  if (h >= 5 && h < 12) return 'manha'
  if (h >= 12 && h < 18) return 'tarde'
  if (h >= 18 && h < 23) return 'noite'
  return 'madrugada'
}

export const MOOD_CONFIG: Record<MoodPeriod, { label: string; icon: string; gradientFrom: string; gradientTo: string }> = {
  manha: { label: 'Bom dia', icon: '☀️', gradientFrom: '#F9A825', gradientTo: '#F57C00' },
  tarde: { label: 'Boa tarde', icon: '🌤️', gradientFrom: '#7986CB', gradientTo: '#4CAF50' },
  noite: { label: 'Boa noite', icon: '🌙', gradientFrom: '#283593', gradientTo: '#1A237E' },
  madrugada: { label: 'Madrugada', icon: '✨', gradientFrom: '#0D1B2A', gradientTo: '#1B1F3A' },
}

export function getMomentoDoDia(): MomentoDeusEntry {
  return MOMENTOS[getDayOfYear() % MOMENTOS.length]
}
```

- [ ] Create `src/data/babyDev.ts` with the full content above
- [ ] Create `src/data/momentoDeus.ts` with the full content above
- [ ] Commit: `git add src/data/babyDev.ts src/data/momentoDeus.ts && git commit -m "feat(data): add babyDev and momentoDeus data files"`

---

### Task 2: Zustand store — savedVerses

**Files:**
- Modify: `src/store/useAppStore.ts`

Add `savedVerses: string[]` (array of verse references, e.g. `"Mateus 11:28"`) to the store, with `saveVerse` and `unsaveVerse` actions, included in `partialize`.

- [ ] In `AppState` interface, add after `lastFeedSide`:

```ts
savedVerses: string[]
// actions:
saveVerse: (ref: string) => void
unsaveVerse: (ref: string) => void
```

- [ ] In initial state, add:

```ts
savedVerses: [],
```

- [ ] In actions, add:

```ts
saveVerse: (ref) => set((s) => ({ savedVerses: s.savedVerses.includes(ref) ? s.savedVerses : [...s.savedVerses, ref] })),
unsaveVerse: (ref) => set((s) => ({ savedVerses: s.savedVerses.filter((r) => r !== ref) })),
```

- [ ] In `partialize`, add `savedVerses: state.savedVerses`

- [ ] Commit: `git add src/store/useAppStore.ts && git commit -m "feat(store): add savedVerses with saveVerse/unsaveVerse actions"`

---

### Task 3: BabyDevCard + BabyDevScreen

**Files:**
- Create: `src/components/home/BabyDevCard.tsx`
- Create: `src/components/home/BabyDevScreen.tsx`

#### BabyDevCard.tsx

```tsx
import { useAppStore } from '../../store/useAppStore'
import { getBabyDevContent } from '../../data/babyDev'

interface Props { onClick: () => void }

export function BabyDevCard({ onClick }: Props) {
  const phase = useAppStore((s) => s.phase)
  const content = getBabyDevContent(phase)

  return (
    <button
      onClick={onClick}
      aria-label="Ver desenvolvimento do bebê"
      className="mx-4 w-[calc(100%-2rem)] bg-white rounded-2xl p-3.5 shadow-sm text-left active:scale-[0.98] transition-transform"
    >
      <p className="text-[9px] font-bold text-graphite-muted uppercase tracking-wide mb-1">
        Desenvolvimento
      </p>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sara-linen to-sara-cream flex items-center justify-center text-2xl flex-shrink-0">
          {content.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-graphite leading-tight line-clamp-1">
            {content.title}
          </p>
          <p className="text-[11px] text-graphite-muted mt-0.5 line-clamp-1">
            {content.size}
          </p>
          <p className="text-[10px] text-sara-gold font-semibold mt-1">
            Ver curiosidades →
          </p>
        </div>
      </div>
    </button>
  )
}
```

#### BabyDevScreen.tsx

```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { getBabyDevContent } from '../../data/babyDev'

interface Props { open: boolean; onClose: () => void }

export function BabyDevScreen({ open, onClose }: Props) {
  const phase = useAppStore((s) => s.phase)
  const content = getBabyDevContent(phase)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed inset-0 z-50 bg-sara-cream flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Desenvolvimento do bebê"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-14 pb-4">
            <p className="text-[11px] font-bold text-graphite-muted uppercase tracking-wide">
              Desenvolvimento
            </p>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-sara-linen text-graphite text-lg"
            >
              ×
            </button>
          </div>

          {/* Illustration area */}
          <div className="mx-5 rounded-2xl bg-gradient-to-br from-sara-gold/20 to-sara-linen flex flex-col items-center justify-center py-10 gap-2">
            <span className="text-6xl">{content.emoji}</span>
            <p className="text-[11px] text-graphite-muted font-medium mt-1">{content.size}</p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 pt-5 pb-10">
            <h2 className="text-[17px] font-bold font-serif text-graphite leading-snug mb-4">
              {content.title}
            </h2>

            <div className="flex flex-col gap-3">
              {content.curiosities.map((c, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-sara-gold text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-[13px] text-graphite leading-relaxed">{c}</p>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-graphite-muted/60 mt-5 text-center">
              Fonte: {content.source}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] Create `src/components/home/BabyDevCard.tsx`
- [ ] Create `src/components/home/BabyDevScreen.tsx`
- [ ] Commit: `git add src/components/home/BabyDevCard.tsx src/components/home/BabyDevScreen.tsx && git commit -m "feat(home): add BabyDevCard and BabyDevScreen components"`

---

### Task 4: MomentoDeusCard + MomentoDeusScreen

**Files:**
- Create: `src/components/home/MomentoDeusCard.tsx`
- Create: `src/components/home/MomentoDeusScreen.tsx`

#### MomentoDeusCard.tsx

```tsx
import { useMemo } from 'react'
import { getMomentoDoDia, getMoodPeriod, MOOD_CONFIG } from '../../data/momentoDeus'

interface Props { onClick: () => void }

export function MomentoDeusCard({ onClick }: Props) {
  const momento = useMemo(() => getMomentoDoDia(), [])
  const mood = useMemo(() => getMoodPeriod(), [])
  const config = MOOD_CONFIG[mood]

  return (
    <button
      onClick={onClick}
      aria-label="Abrir Momento com Deus"
      className="mx-4 w-[calc(100%-2rem)] rounded-2xl p-3.5 text-left active:scale-[0.98] transition-transform overflow-hidden relative"
      style={{ background: `linear-gradient(135deg, ${config.gradientFrom}, ${config.gradientTo})` }}
    >
      <p className="text-[9px] font-bold text-white/60 uppercase tracking-wide mb-1">
        {config.icon} Momento com Deus
      </p>
      <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2 mb-1.5">
        "{momento.verso.slice(0, 80)}{momento.verso.length > 80 ? '…' : ''}"
      </p>
      <p className="text-[10px] text-white/70 font-medium">
        {momento.referencia} · Toque para ler →
      </p>
    </button>
  )
}
```

#### MomentoDeusScreen.tsx

```tsx
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { getMomentoDoDia, getMoodPeriod, MOOD_CONFIG } from '../../data/momentoDeus'

interface Props { open: boolean; onClose: () => void }

export function MomentoDeusScreen({ open, onClose }: Props) {
  const momento = useMemo(() => getMomentoDoDia(), [])
  const mood = useMemo(() => getMoodPeriod(), [])
  const config = MOOD_CONFIG[mood]
  const [showPrayer, setShowPrayer] = useState(false)

  const savedVerses = useAppStore((s) => s.savedVerses)
  const saveVerse = useAppStore((s) => s.saveVerse)
  const unsaveVerse = useAppStore((s) => s.unsaveVerse)
  const isSaved = savedVerses.includes(momento.referencia)

  function handleShare() {
    const text = `"${momento.verso}" — ${momento.referencia}`
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text).catch(() => {})
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: `linear-gradient(160deg, ${config.gradientFrom}, ${config.gradientTo})` }}
          role="dialog"
          aria-modal="true"
          aria-label="Momento com Deus"
        >
          {/* Close */}
          <div className="flex justify-end px-5 pt-14 pb-2">
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white text-lg"
            >
              ×
            </button>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center px-6 pb-4">
            <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-6 text-center">
              {config.icon} {config.label}
            </p>

            <blockquote className="text-[20px] font-serif font-semibold text-white leading-relaxed text-center mb-3">
              "{momento.verso}"
            </blockquote>
            <p className="text-[12px] text-white/70 text-center font-medium mb-8">
              — {momento.referencia}
            </p>

            <div className="bg-white/10 rounded-2xl p-4 mb-4">
              <p className="text-[13px] text-white leading-relaxed">
                {momento.reflexao}
              </p>
            </div>

            <AnimatePresence>
              {showPrayer && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white/10 rounded-2xl p-4 overflow-hidden"
                >
                  <p className="text-[11px] font-bold text-white/50 uppercase tracking-wide mb-2">
                    🙏 Oração
                  </p>
                  <p className="text-[13px] text-white leading-relaxed italic">
                    {momento.oracao}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action bar */}
          <div className="px-6 pb-12 flex gap-3">
            <button
              onClick={() => setShowPrayer((p) => !p)}
              aria-label="Ver oração"
              className="flex-1 py-3 rounded-2xl bg-white/10 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              🙏 Oração
            </button>
            <button
              onClick={() => isSaved ? unsaveVerse(momento.referencia) : saveVerse(momento.referencia)}
              aria-label={isSaved ? 'Remover dos salvos' : 'Salvar versículo'}
              className={`flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                isSaved ? 'bg-white text-sara-gold' : 'bg-white/10 text-white'
              }`}
            >
              ❤️ {isSaved ? 'Salvo' : 'Salvar'}
            </button>
            <button
              onClick={handleShare}
              aria-label="Compartilhar versículo"
              className="flex-1 py-3 rounded-2xl bg-white/10 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              📤 Compartilhar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] Create `src/components/home/MomentoDeusCard.tsx`
- [ ] Create `src/components/home/MomentoDeusScreen.tsx`
- [ ] Commit: `git add src/components/home/MomentoDeusCard.tsx src/components/home/MomentoDeusScreen.tsx && git commit -m "feat(home): add MomentoDeusCard and MomentoDeusScreen components"`

---

### Task 5: Wire DashboardScreen — remove verse footer, add cards + overlays

**Files:**
- Modify: `src/components/home/DashboardScreen.tsx`

Changes:
1. Remove `import { getVersiculoDoDia }` and `const versiculo = ...`
2. Add imports for all 4 new components
3. Add `useState` for `babyDevOpen` and `momentoDeusOpen`
4. Remove the "Daily verse" section (lines 169-177 of current file)
5. Add `<BabyDevCard onClick={() => setBabyDevOpen(true)} />` after community card
6. Add `<MomentoDeusCard onClick={() => setMomentoDeusOpen(true)} />` after baby card
7. Add `<BabyDevScreen open={babyDevOpen} onClose={() => setBabyDevOpen(false)} />` after `<QuickRegisterSheet />`
8. Add `<MomentoDeusScreen open={momentoDeusOpen} onClose={() => setMomentoDeusOpen(false)} />` after that

The final return should look like:

```tsx
return (
  <>
    <div className="flex flex-col gap-3 pb-6 overflow-y-auto">
      {/* Header */}
      ...

      {/* Sara card */}
      ...

      {/* Row: next appointment + last feed */}
      ...

      {/* Community card */}
      ...

      {/* Baby development card */}
      <BabyDevCard onClick={() => setBabyDevOpen(true)} />

      {/* Momento com Deus card */}
      <MomentoDeusCard onClick={() => setMomentoDeusOpen(true)} />
    </div>

    <QuickRegisterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    <BabyDevScreen open={babyDevOpen} onClose={() => setBabyDevOpen(false)} />
    <MomentoDeusScreen open={momentoDeusOpen} onClose={() => setMomentoDeusOpen(false)} />
  </>
)
```

- [ ] Remove verse import and `const versiculo` line
- [ ] Add imports for BabyDevCard, BabyDevScreen, MomentoDeusCard, MomentoDeusScreen
- [ ] Add `const [babyDevOpen, setBabyDevOpen] = useState(false)` and `const [momentoDeusOpen, setMomentoDeusOpen] = useState(false)`
- [ ] Remove "Daily verse" JSX block
- [ ] Add BabyDevCard and MomentoDeusCard after the community card
- [ ] Add BabyDevScreen and MomentoDeusScreen after QuickRegisterSheet
- [ ] Run `npx tsc --noEmit` to verify no type errors
- [ ] Commit: `git add src/components/home/DashboardScreen.tsx && git commit -m "feat(home): wire BabyDev and MomentoDeus cards into DashboardScreen"`
