# Novo visual Mother's Team — Onda 1 (Fundação) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar toda a infraestrutura visual do novo design system Mother's Team (tokens, SVGs, primitivos React, ícone/splash Android, favicons) sem tocar em nenhuma tela existente. Único efeito visual imediato: aliases `sara-*` passam a apontar para tons rose/pink, mudando automaticamente a cor de tudo que já usa a paleta legado.

**Architecture:** 9 primitivos React em `src/components/mt/` + 2 componentes de marca em `src/components/brand/` + 5 SVGs em `src/assets/brand/`, todos consumindo os tokens Tailwind adicionados em `tailwind.config.js`. Zero componente antigo é modificado. Adaptive icon Android e splash Capacitor são regenerados a partir dos assets oficiais. `versionCode` sobe de 3 → 4, `versionName` 1.2.0 → 1.3.0.

**Tech Stack:** React 18, TypeScript, Tailwind 3.4, Vitest + React Testing Library, Capacitor 8 (Android), `@capacitor/assets` para regeneração de ícones/splash, SVGO para otimização.

**Spec de referência:** `docs/superpowers/specs/2026-08-22-novo-visual-mothers-team-design.md`

---

## File Structure

**Novos arquivos:**
- `src/assets/brand/wordmark-mt-rose.svg`
- `src/assets/brand/wordmark-mt-cream.svg`
- `src/assets/brand/mark-mt.svg`
- `src/assets/brand/mark-mt-gradient.svg`
- `src/assets/brand/tagline-mt.svg`
- `src/components/brand/Wordmark.tsx` + `Wordmark.test.tsx`
- `src/components/brand/Mark.tsx` + `Mark.test.tsx`
- `src/components/mt/MtScreen.tsx` + `MtScreen.test.tsx`
- `src/components/mt/MtCard.tsx` + `MtCard.test.tsx`
- `src/components/mt/MtPillButton.tsx` + `MtPillButton.test.tsx`
- `src/components/mt/MtInput.tsx` + `MtInput.test.tsx`
- `src/components/mt/MtAvatar.tsx` + `MtAvatar.test.tsx`
- `src/components/mt/MtChip.tsx` + `MtChip.test.tsx`
- `src/components/mt/MtHeader.tsx` + `MtHeader.test.tsx`
- `src/components/mt/MtBottomNav.tsx` + `MtBottomNav.test.tsx`
- `src/components/mt/MtQuickActionSheet.tsx` + `MtQuickActionSheet.test.tsx`
- `android/app/src/main/res/drawable/ic_launcher_background.xml` (gradient rose→pink)
- `public/favicon.svg`, `public/favicon.ico`, `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png`

**Modificados:**
- `tailwind.config.js` — paleta mt-* + aliases sara-* remapeados
- `src/index.css` — utilities `.bg-mt-gradient*`, `.rounded-mt*`, `.shadow-mt*`
- `android/app/src/main/res/values/ic_launcher_background.xml` — vira `<drawable>` referenciando o novo gradient
- `android/app/src/main/res/mipmap-{hdpi,mdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher_foreground.png` — PNG novo (M-logo branco)
- `android/app/src/main/res/mipmap-{hdpi..xxxhdpi}/ic_launcher.png` e `ic_launcher_round.png` — regenerados
- `android/app/src/main/assets/public/splash*.png` (via `@capacitor/assets`)
- `android/app/build.gradle` — versionCode 3→4, versionName "1.2.0"→"1.3.0"
- `index.html` — link do favicon confirmado

---

## Preflight

- [ ] **Step 0.1: Confirmar branch limpo e sincronizado**

```bash
git status
git pull origin main
```

Esperado: `working tree clean`. Se houver mudanças pendentes, decidir com o dono antes de prosseguir.

- [ ] **Step 0.2: Instalar dependências novas**

```bash
npm install --save-dev svgo @capacitor/assets
```

Esperado: 2 packages adicionados. `svgo` para otimizar SVGs, `@capacitor/assets` para regenerar ícones/splash.

- [ ] **Step 0.3: Confirmar Vitest funcional atual**

```bash
npm run test
```

Esperado: suite existente 100% verde. Se falhar, PARAR e reportar — não podemos partir de baseline vermelho.

---

## Task 1 — Tokens Tailwind (paleta mt-* + aliases sara-* remapeados)

**Files:**
- Modify: `tailwind.config.js`

- [ ] **Step 1.1: Substituir bloco `colors` inteiro**

Abrir `tailwind.config.js` e trocar as linhas 6–19 pelo bloco abaixo:

```js
      colors: {
        // Paleta oficial Mother's Team
        'mt-rose':       '#db958b',
        'mt-rose-dark':  '#c47c73',
        'mt-rose-deep':  '#8b3d34',
        'mt-pink':       '#f6bdd8',
        'mt-pink-soft':  '#fadfec',
        'mt-cream':      '#faf5f0',
        'mt-linen':      '#f5ede4',
        'mt-charcoal':   '#3d342e',
        'mt-muted':      '#8b7268',
        // Aliases legado — remapeados para tons Mother's Team.
        // Removidos na Onda 3 quando não houver mais referências.
        'sara-gold':       '#db958b',
        'sara-terracotta': '#c47c73',
        'sara-linen':      '#f5ede4',
        'sara-cream':      '#faf5f0',
        'sara-charcoal':   '#3d342e',
        'sara-muted':      '#8b7268',
        'sara-warm':       '#8b7268',
        graphite:          '#3d342e',
        'graphite-light':  '#8b7268',
        'graphite-muted':  '#8b7268',
        offwhite:          '#faf5f0',
      },
      borderRadius: {
        'mt':      '24px',
        'mt-lg':   '32px',
        'mt-pill': '9999px',
      },
      boxShadow: {
        'mt':    '0 8px 24px -8px rgba(219, 149, 139, 0.25)',
        'mt-lg': '0 20px 40px -12px rgba(219, 149, 139, 0.35)',
      },
```

- [ ] **Step 1.2: Rodar build para confirmar Tailwind parseia**

```bash
npm run build
```

Esperado: build completa sem erros. Se falhar com "unknown color", revisar sintaxe.

- [ ] **Step 1.3: Rodar suíte de testes existente**

```bash
npm run test
```

Esperado: 100% verde. Os componentes existentes agora renderizam com tons rose/pink em vez de gold/terracotta (mudança de cor é intencional — nenhum teste asserta hex específico).

- [ ] **Step 1.4: Commit**

```bash
git add tailwind.config.js
git commit -m "$(cat <<'EOF'
feat(tokens): paleta Mother's Team + aliases sara-* remapeados

Adiciona mt-rose/mt-pink/mt-cream/mt-charcoal/mt-muted (+ variantes)
como paleta oficial. Aliases sara-* passam a apontar para tons rose
para que toda a UI existente rebrand automaticamente sem tocar 84
arquivos. Aliases serão removidos na Onda 3.

Também adiciona borderRadius mt/mt-lg/mt-pill e boxShadow mt/mt-lg.
EOF
)"
```

---

## Task 2 — Utilities CSS (gradientes canônicos)

**Files:**
- Modify: `src/index.css`

- [ ] **Step 2.1: Adicionar utilities de gradient no `@layer utilities`**

Abrir `src/index.css`. Após a utility `.font-serif` (linha ~25), adicionar:

```css
  .bg-mt-gradient {
    background: linear-gradient(135deg, #db958b 0%, #f6bdd8 100%);
  }
  .bg-mt-gradient-soft {
    background: linear-gradient(135deg, #fadfec 0%, #f6bdd8 60%, #db958b 100%);
  }
  .bg-mt-gradient-pastel {
    background: linear-gradient(135deg, #fadfec 0%, #e8e5f0 50%, #d9e8f2 100%);
  }
```

- [ ] **Step 2.2: Rodar build para confirmar Tailwind processa**

```bash
npm run build
```

Esperado: build completa sem erros. Nenhum bundle warning novo.

- [ ] **Step 2.3: Commit**

```bash
git add src/index.css
git commit -m "feat(tokens): utilities .bg-mt-gradient/-soft/-pastel"
```

---

## Task 3 — SVGs de marca (wordmark rose + cream)

Objetivo: colocar o wordmark oficial disponível como SVG. Como não temos o SVG vetor original, extrair do `docs/materials/logos/LOGOS/Sem título-1-05.png` (rose) e `Sem título-1-06.png` (cream/off-white).

**Files:**
- Create: `src/assets/brand/wordmark-mt-rose.svg`
- Create: `src/assets/brand/wordmark-mt-cream.svg`

- [ ] **Step 3.1: Criar pasta e assets**

```bash
mkdir -p src/assets/brand
```

- [ ] **Step 3.2: Gerar wordmark rose via Python + rasterizar traço vetorial não é viável — usar imagem PNG embebida em SVG como fallback aceito**

Como não temos o AI/vetor original, embutir o PNG em `<image>` dentro de um wrapper `<svg>` com viewBox correto (~500×260 baseado no aspect ratio do PNG). Cria arquivo `src/assets/brand/wordmark-mt-rose.svg` com conteúdo:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 260" role="img" aria-label="Mother's Team">
  <title>Mother's Team</title>
  <image href="data:image/png;base64,PLACEHOLDER_ROSE_BASE64" width="500" height="260"/>
</svg>
```

Substituir `PLACEHOLDER_ROSE_BASE64` pelo output do comando:

```bash
python -c "import base64; print(base64.b64encode(open(r'docs/materials/logos/LOGOS/Sem título-1-05.png','rb').read()).decode())"
```

- [ ] **Step 3.3: Mesmo procedimento para versão cream**

Cria `src/assets/brand/wordmark-mt-cream.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 260" role="img" aria-label="Mother's Team">
  <title>Mother's Team</title>
  <image href="data:image/png;base64,PLACEHOLDER_CREAM_BASE64" width="500" height="260"/>
</svg>
```

Substituir `PLACEHOLDER_CREAM_BASE64` pelo output de:

```bash
python -c "import base64; print(base64.b64encode(open(r'docs/materials/logos/LOGOS/Sem título-1-06.png','rb').read()).decode())"
```

- [ ] **Step 3.4: Verificar tamanho dos arquivos**

```bash
ls -lh src/assets/brand/wordmark-mt-*.svg
```

Se algum ficar > 80KB, cortar PNG source para largura ~500px antes de encodar. Meta: <50KB cada.

- [ ] **Step 3.5: Commit**

```bash
git add src/assets/brand/wordmark-mt-rose.svg src/assets/brand/wordmark-mt-cream.svg
git commit -m "feat(brand): wordmark 'Mother's Team' SVG (rose + cream)"
```

---

## Task 4 — SVGs de marca (mark M+coração mono + gradient)

**Files:**
- Create: `src/assets/brand/mark-mt.svg`
- Create: `src/assets/brand/mark-mt-gradient.svg`

- [ ] **Step 4.1: Gerar `mark-mt.svg` (mono, `currentColor`)**

Extrair do `Sem título-1-03.png` (M cinza claro em fundo transparente — ideal para tracer). Como o traço é simples (linha grossa M+coração), usar Python + Potrace para extrair o path vetorial, ou aceitar embed PNG como fallback.

Comando de fallback embutido (mesmo padrão do Task 3):

```bash
python -c "import base64; print(base64.b64encode(open(r'docs/materials/logos/LOGOS/Sem título-1-03.png','rb').read()).decode())"
```

Cria `src/assets/brand/mark-mt.svg` com:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Mother's Team">
  <title>Mother's Team</title>
  <image href="data:image/png;base64,PLACEHOLDER_MARK_MONO_BASE64" width="400" height="400"/>
</svg>
```

Nota: para versão futura em `currentColor` real (não PNG), engenheiro pode substituir por um path SVG desenhado à mão. Por ora, PNG basta.

- [ ] **Step 4.2: Gerar `mark-mt-gradient.svg`**

Extrair do `Sem título-1-01.png` (app icon completo com gradient + M+heart branco). Comando:

```bash
python -c "import base64; print(base64.b64encode(open(r'docs/materials/logos/LOGOS/Sem título-1-01.png','rb').read()).decode())"
```

Cria `src/assets/brand/mark-mt-gradient.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Mother's Team">
  <title>Mother's Team</title>
  <image href="data:image/png;base64,PLACEHOLDER_MARK_GRADIENT_BASE64" width="400" height="400"/>
</svg>
```

- [ ] **Step 4.3: Verificar tamanho**

```bash
ls -lh src/assets/brand/mark-mt*.svg
```

Meta: <60KB cada.

- [ ] **Step 4.4: Commit**

```bash
git add src/assets/brand/mark-mt.svg src/assets/brand/mark-mt-gradient.svg
git commit -m "feat(brand): mark 'M+heart' SVG (mono + gradient)"
```

---

## Task 5 — SVG da tagline

**Files:**
- Create: `src/assets/brand/tagline-mt.svg`

- [ ] **Step 5.1: Gerar tagline SVG**

Extrair do `Sem título-1-08.png` (cream). Comando:

```bash
python -c "import base64; print(base64.b64encode(open(r'docs/materials/logos/LOGOS/Sem título-1-08.png','rb').read()).decode())"
```

Cria `src/assets/brand/tagline-mt.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" role="img" aria-label="quem é MÃE sabe.">
  <title>quem é MÃE sabe.</title>
  <image href="data:image/png;base64,PLACEHOLDER_TAGLINE_BASE64" width="800" height="200"/>
</svg>
```

- [ ] **Step 5.2: Verificar tamanho**

```bash
ls -lh src/assets/brand/tagline-mt.svg
```

Meta: <30KB.

- [ ] **Step 5.3: Commit**

```bash
git add src/assets/brand/tagline-mt.svg
git commit -m "feat(brand): tagline 'quem é MÃE sabe.' SVG"
```

---

## Task 6 — Componente `<Wordmark>`

**Files:**
- Create: `src/components/brand/Wordmark.tsx`
- Test: `src/components/brand/Wordmark.test.tsx`

- [ ] **Step 6.1: Escrever teste falhando**

Cria `src/components/brand/Wordmark.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { Wordmark } from './Wordmark'

describe('Wordmark', () => {
  it('renders rose variant by default with brand label', () => {
    render(<Wordmark />)
    const img = screen.getByRole('img', { name: /mother's team/i })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', expect.stringContaining('wordmark-mt-rose'))
  })

  it('renders cream variant when specified', () => {
    render(<Wordmark variant="cream" />)
    const img = screen.getByRole('img', { name: /mother's team/i })
    expect(img).toHaveAttribute('src', expect.stringContaining('wordmark-mt-cream'))
  })

  it('applies size class for lg', () => {
    render(<Wordmark size="lg" />)
    const img = screen.getByRole('img', { name: /mother's team/i })
    expect(img.className).toMatch(/h-24/)
  })

  it('applies size class for sm', () => {
    render(<Wordmark size="sm" />)
    const img = screen.getByRole('img', { name: /mother's team/i })
    expect(img.className).toMatch(/h-8/)
  })

  it('accepts custom className', () => {
    render(<Wordmark className="opacity-50" />)
    const img = screen.getByRole('img', { name: /mother's team/i })
    expect(img.className).toMatch(/opacity-50/)
  })
})
```

- [ ] **Step 6.2: Rodar teste, confirmar falha**

```bash
npm run test -- Wordmark
```

Esperado: FAIL com "Cannot find module './Wordmark'".

- [ ] **Step 6.3: Implementar componente**

Cria `src/components/brand/Wordmark.tsx`:

```tsx
import wordmarkRose from '../../assets/brand/wordmark-mt-rose.svg'
import wordmarkCream from '../../assets/brand/wordmark-mt-cream.svg'

const SIZE_CLASSES = {
  sm: 'h-8',
  md: 'h-16',
  lg: 'h-24',
} as const

interface WordmarkProps {
  variant?: 'rose' | 'cream'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Wordmark({ variant = 'rose', size = 'md', className = '' }: WordmarkProps) {
  const src = variant === 'cream' ? wordmarkCream : wordmarkRose
  return (
    <img
      src={src}
      alt="Mother's Team"
      className={`${SIZE_CLASSES[size]} w-auto ${className}`}
    />
  )
}
```

- [ ] **Step 6.4: Rodar teste, confirmar passa**

```bash
npm run test -- Wordmark
```

Esperado: 5 tests PASS.

- [ ] **Step 6.5: Commit**

```bash
git add src/components/brand/Wordmark.tsx src/components/brand/Wordmark.test.tsx
git commit -m "feat(brand): componente <Wordmark variant='rose|cream' size='sm|md|lg' />"
```

---

## Task 7 — Componente `<Mark>`

**Files:**
- Create: `src/components/brand/Mark.tsx`
- Test: `src/components/brand/Mark.test.tsx`

- [ ] **Step 7.1: Escrever teste falhando**

Cria `src/components/brand/Mark.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { Mark } from './Mark'

describe('Mark', () => {
  it('renders mono variant by default', () => {
    render(<Mark />)
    const img = screen.getByRole('img', { name: /mother's team/i })
    expect(img).toHaveAttribute('src', expect.stringContaining('mark-mt.svg'))
  })

  it('renders gradient variant when specified', () => {
    render(<Mark variant="gradient" />)
    const img = screen.getByRole('img', { name: /mother's team/i })
    expect(img).toHaveAttribute('src', expect.stringContaining('mark-mt-gradient'))
  })

  it('applies given size as inline style', () => {
    render(<Mark size={56} />)
    const img = screen.getByRole('img', { name: /mother's team/i })
    expect(img.style.width).toBe('56px')
    expect(img.style.height).toBe('56px')
  })

  it('accepts custom aria-label', () => {
    render(<Mark aria-label="Ícone do app" />)
    expect(screen.getByRole('img', { name: 'Ícone do app' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 7.2: Rodar teste, confirmar falha**

```bash
npm run test -- Mark
```

Esperado: FAIL "Cannot find module './Mark'".

- [ ] **Step 7.3: Implementar componente**

Cria `src/components/brand/Mark.tsx`:

```tsx
import markMono from '../../assets/brand/mark-mt.svg'
import markGradient from '../../assets/brand/mark-mt-gradient.svg'

interface MarkProps {
  variant?: 'mono' | 'gradient'
  size?: number
  className?: string
  'aria-label'?: string
}

export function Mark({
  variant = 'mono',
  size = 32,
  className = '',
  'aria-label': ariaLabel = "Mother's Team",
}: MarkProps) {
  const src = variant === 'gradient' ? markGradient : markMono
  return (
    <img
      src={src}
      alt={ariaLabel}
      className={className}
      style={{ width: size, height: size }}
    />
  )
}
```

- [ ] **Step 7.4: Rodar teste, confirmar passa**

```bash
npm run test -- Mark
```

Esperado: 4 tests PASS.

- [ ] **Step 7.5: Commit**

```bash
git add src/components/brand/Mark.tsx src/components/brand/Mark.test.tsx
git commit -m "feat(brand): componente <Mark variant='mono|gradient' size={n} />"
```

---

## Task 8 — Primitivo `<MtScreen>`

Wrapper de tela full-height com opção de background gradient/pastel/solid.

**Files:**
- Create: `src/components/mt/MtScreen.tsx`
- Test: `src/components/mt/MtScreen.test.tsx`

- [ ] **Step 8.1: Escrever teste falhando**

Cria `src/components/mt/MtScreen.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MtScreen } from './MtScreen'

describe('MtScreen', () => {
  it('renders children', () => {
    render(<MtScreen><span>ola</span></MtScreen>)
    expect(screen.getByText('ola')).toBeInTheDocument()
  })

  it('uses gradient background by default', () => {
    const { container } = render(<MtScreen>x</MtScreen>)
    expect(container.firstChild).toHaveClass('bg-mt-gradient')
  })

  it('applies pastel variant', () => {
    const { container } = render(<MtScreen variant="pastel">x</MtScreen>)
    expect(container.firstChild).toHaveClass('bg-mt-gradient-pastel')
  })

  it('applies solid variant', () => {
    const { container } = render(<MtScreen variant="solid">x</MtScreen>)
    expect(container.firstChild).toHaveClass('bg-mt-cream')
    expect(container.firstChild).not.toHaveClass('bg-mt-gradient')
  })

  it('is full height and safe-area aware', () => {
    const { container } = render(<MtScreen>x</MtScreen>)
    expect(container.firstChild).toHaveClass('min-h-screen')
  })
})
```

- [ ] **Step 8.2: Rodar teste, confirmar falha**

```bash
npm run test -- MtScreen
```

Esperado: FAIL.

- [ ] **Step 8.3: Implementar componente**

Cria `src/components/mt/MtScreen.tsx`:

```tsx
import type { ReactNode } from 'react'

const VARIANT_BG = {
  gradient: 'bg-mt-gradient',
  pastel:   'bg-mt-gradient-pastel',
  solid:    'bg-mt-cream',
} as const

interface MtScreenProps {
  children: ReactNode
  variant?: keyof typeof VARIANT_BG
  className?: string
}

export function MtScreen({ children, variant = 'gradient', className = '' }: MtScreenProps) {
  return (
    <div
      className={`min-h-screen w-full ${VARIANT_BG[variant]} ${className}`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 8.4: Rodar teste, confirmar passa**

```bash
npm run test -- MtScreen
```

Esperado: 5 tests PASS.

- [ ] **Step 8.5: Commit**

```bash
git add src/components/mt/MtScreen.tsx src/components/mt/MtScreen.test.tsx
git commit -m "feat(mt): primitivo <MtScreen variant='gradient|pastel|solid' />"
```

---

## Task 9 — Primitivo `<MtCard>` (Default / Compact / Feature)

**Files:**
- Create: `src/components/mt/MtCard.tsx`
- Test: `src/components/mt/MtCard.test.tsx`

- [ ] **Step 9.1: Escrever teste falhando**

Cria `src/components/mt/MtCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MtCard } from './MtCard'

describe('MtCard', () => {
  it('renders children with default padding and rounded-mt shadow-mt', () => {
    const { container } = render(<MtCard><span>x</span></MtCard>)
    expect(screen.getByText('x')).toBeInTheDocument()
    const el = container.firstChild as HTMLElement
    expect(el.className).toMatch(/rounded-mt(\s|$)/)
    expect(el.className).toMatch(/shadow-mt(\s|$)/)
    expect(el.className).toMatch(/p-4/)
    expect(el.className).toMatch(/bg-white/)
  })

  it('Compact uses p-3', () => {
    const { container } = render(<MtCard.Compact>x</MtCard.Compact>)
    expect((container.firstChild as HTMLElement).className).toMatch(/p-3/)
  })

  it('Feature uses p-6 and shadow-mt-lg', () => {
    const { container } = render(<MtCard.Feature>x</MtCard.Feature>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toMatch(/p-6/)
    expect(el.className).toMatch(/shadow-mt-lg/)
  })

  it('forwards className', () => {
    const { container } = render(<MtCard className="mb-2">x</MtCard>)
    expect((container.firstChild as HTMLElement).className).toMatch(/mb-2/)
  })
})
```

- [ ] **Step 9.2: Rodar teste, confirmar falha**

```bash
npm run test -- MtCard
```

Esperado: FAIL.

- [ ] **Step 9.3: Implementar componente**

Cria `src/components/mt/MtCard.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from 'react'

interface BaseProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

function Base({ children, className = '', ...rest }: BaseProps & { padding: string; shadow: string }) {
  const { padding, shadow, ...divProps } = { ...rest, padding: (rest as any).padding, shadow: (rest as any).shadow } as any
  return (
    <div
      className={`bg-white/95 backdrop-blur-sm rounded-mt ${(rest as any).shadow} ${(rest as any).padding} ${className}`}
      {...(divProps as HTMLAttributes<HTMLDivElement>)}
    >
      {children}
    </div>
  )
}

// Preferir uma implementação mais limpa:
export function MtCard({ children, className = '', ...rest }: BaseProps) {
  return (
    <div className={`bg-white/95 backdrop-blur-sm rounded-mt shadow-mt p-4 ${className}`} {...rest}>
      {children}
    </div>
  )
}

MtCard.Compact = function MtCardCompact({ children, className = '', ...rest }: BaseProps) {
  return (
    <div className={`bg-white/95 backdrop-blur-sm rounded-mt shadow-mt p-3 ${className}`} {...rest}>
      {children}
    </div>
  )
}

MtCard.Feature = function MtCardFeature({ children, className = '', ...rest }: BaseProps) {
  return (
    <div className={`bg-white/95 backdrop-blur-sm rounded-mt shadow-mt-lg p-6 ${className}`} {...rest}>
      {children}
    </div>
  )
}
```

Nota: remover a função `Base` interna acima; ficou como referência. Só as 3 exports (`MtCard`, `MtCard.Compact`, `MtCard.Feature`) são necessárias.

- [ ] **Step 9.4: Rodar teste, confirmar passa**

```bash
npm run test -- MtCard
```

Esperado: 4 tests PASS.

- [ ] **Step 9.5: Commit**

```bash
git add src/components/mt/MtCard.tsx src/components/mt/MtCard.test.tsx
git commit -m "feat(mt): primitivo <MtCard> + .Compact + .Feature"
```

---

## Task 10 — Primitivo `<MtPillButton>`

Variantes: `primary` (gradient), `secondary` (branco/rose), `google` (branco/charcoal), `apple` (charcoal/branco).

**Files:**
- Create: `src/components/mt/MtPillButton.tsx`
- Test: `src/components/mt/MtPillButton.test.tsx`

- [ ] **Step 10.1: Escrever teste falhando**

Cria `src/components/mt/MtPillButton.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MtPillButton } from './MtPillButton'

describe('MtPillButton', () => {
  it('renders label and default primary variant', () => {
    render(<MtPillButton>Entrar</MtPillButton>)
    const btn = screen.getByRole('button', { name: 'Entrar' })
    expect(btn).toBeInTheDocument()
    expect(btn.className).toMatch(/bg-mt-gradient/)
    expect(btn.className).toMatch(/text-white/)
    expect(btn.className).toMatch(/rounded-mt-pill/)
  })

  it('secondary variant uses white bg and rose text/border', () => {
    render(<MtPillButton variant="secondary">Cancelar</MtPillButton>)
    const btn = screen.getByRole('button', { name: 'Cancelar' })
    expect(btn.className).toMatch(/bg-white/)
    expect(btn.className).toMatch(/text-mt-rose/)
  })

  it('apple variant uses charcoal bg and white text', () => {
    render(<MtPillButton variant="apple">Apple</MtPillButton>)
    const btn = screen.getByRole('button', { name: 'Apple' })
    expect(btn.className).toMatch(/bg-mt-charcoal/)
    expect(btn.className).toMatch(/text-white/)
  })

  it('google variant uses white bg with linen border', () => {
    render(<MtPillButton variant="google">Google</MtPillButton>)
    const btn = screen.getByRole('button', { name: 'Google' })
    expect(btn.className).toMatch(/bg-white/)
    expect(btn.className).toMatch(/border-mt-linen/)
  })

  it('fires onClick', () => {
    const onClick = vi.fn()
    render(<MtPillButton onClick={onClick}>x</MtPillButton>)
    fireEvent.click(screen.getByRole('button', { name: 'x' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('supports disabled', () => {
    render(<MtPillButton disabled>x</MtPillButton>)
    expect(screen.getByRole('button', { name: 'x' })).toBeDisabled()
  })
})
```

- [ ] **Step 10.2: Rodar teste, confirmar falha**

```bash
npm run test -- MtPillButton
```

Esperado: FAIL.

- [ ] **Step 10.3: Implementar componente**

Cria `src/components/mt/MtPillButton.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react'

const VARIANT_CLASSES = {
  primary:   'bg-mt-gradient text-white shadow-mt',
  secondary: 'bg-white text-mt-rose border border-mt-pink',
  google:    'bg-white text-mt-charcoal border border-mt-linen',
  apple:     'bg-mt-charcoal text-white',
} as const

interface MtPillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: keyof typeof VARIANT_CLASSES
}

export function MtPillButton({
  children,
  variant = 'primary',
  className = '',
  ...rest
}: MtPillButtonProps) {
  return (
    <button
      type={rest.type ?? 'button'}
      className={`rounded-mt-pill py-3 px-6 text-sm font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 10.4: Rodar teste, confirmar passa**

```bash
npm run test -- MtPillButton
```

Esperado: 6 tests PASS.

- [ ] **Step 10.5: Commit**

```bash
git add src/components/mt/MtPillButton.tsx src/components/mt/MtPillButton.test.tsx
git commit -m "feat(mt): primitivo <MtPillButton variant='primary|secondary|google|apple' />"
```

---

## Task 11 — Primitivo `<MtInput>`

**Files:**
- Create: `src/components/mt/MtInput.tsx`
- Test: `src/components/mt/MtInput.test.tsx`

- [ ] **Step 11.1: Escrever teste falhando**

Cria `src/components/mt/MtInput.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MtInput } from './MtInput'

describe('MtInput', () => {
  it('renders input with pill styling', () => {
    render(<MtInput placeholder="E-mail" />)
    const input = screen.getByPlaceholderText('E-mail')
    expect(input.className).toMatch(/rounded-mt-pill/)
    expect(input.className).toMatch(/bg-mt-cream/)
  })

  it('renders label above input when label prop given', () => {
    render(<MtInput label="E-mail" placeholder="digite" />)
    expect(screen.getByText('E-mail')).toBeInTheDocument()
  })

  it('associates label to input via htmlFor', () => {
    render(<MtInput label="Senha" id="pw" />)
    const label = screen.getByText('Senha')
    expect(label).toHaveAttribute('for', 'pw')
  })

  it('forwards value + onChange', () => {
    const onChange = vi.fn()
    render(<MtInput value="abc" onChange={onChange} placeholder="p" />)
    const input = screen.getByPlaceholderText('p') as HTMLInputElement
    expect(input.value).toBe('abc')
    fireEvent.change(input, { target: { value: 'xyz' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('supports type=password', () => {
    render(<MtInput type="password" placeholder="p" />)
    expect(screen.getByPlaceholderText('p')).toHaveAttribute('type', 'password')
  })
})
```

- [ ] **Step 11.2: Rodar teste, confirmar falha**

```bash
npm run test -- MtInput
```

Esperado: FAIL.

- [ ] **Step 11.3: Implementar componente**

Cria `src/components/mt/MtInput.tsx`:

```tsx
import type { InputHTMLAttributes } from 'react'

interface MtInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function MtInput({ label, id, className = '', ...rest }: MtInputProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-xs text-mt-muted mb-1.5 ml-3">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full rounded-mt-pill bg-mt-cream border-0 py-3 px-5 text-mt-charcoal placeholder-mt-muted focus:outline-none focus:ring-2 focus:ring-mt-rose ${className}`}
        {...rest}
      />
    </div>
  )
}
```

- [ ] **Step 11.4: Rodar teste, confirmar passa**

```bash
npm run test -- MtInput
```

Esperado: 5 tests PASS.

- [ ] **Step 11.5: Commit**

```bash
git add src/components/mt/MtInput.tsx src/components/mt/MtInput.test.tsx
git commit -m "feat(mt): primitivo <MtInput label='...' />"
```

---

## Task 12 — Primitivo `<MtAvatar>`

**Files:**
- Create: `src/components/mt/MtAvatar.tsx`
- Test: `src/components/mt/MtAvatar.test.tsx`

- [ ] **Step 12.1: Escrever teste falhando**

Cria `src/components/mt/MtAvatar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MtAvatar } from './MtAvatar'

describe('MtAvatar', () => {
  it('renders img with src and alt', () => {
    render(<MtAvatar src="http://x/a.png" alt="Claudia" />)
    const img = screen.getByAltText('Claudia')
    expect(img).toHaveAttribute('src', 'http://x/a.png')
  })

  it('lg size = 80px, md = 56px, sm = 40px', () => {
    const { rerender, container } = render(<MtAvatar src="x" alt="a" size="sm" />)
    expect(container.querySelector('div')?.className).toMatch(/w-10/)
    rerender(<MtAvatar src="x" alt="a" size="md" />)
    expect(container.querySelector('div')?.className).toMatch(/w-14/)
    rerender(<MtAvatar src="x" alt="a" size="lg" />)
    expect(container.querySelector('div')?.className).toMatch(/w-20/)
  })

  it('shows fallback letter when src fails/empty', () => {
    render(<MtAvatar alt="Bruna" />)
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('has white ring by default', () => {
    const { container } = render(<MtAvatar src="x" alt="a" />)
    expect(container.querySelector('div')?.className).toMatch(/ring-4/)
    expect(container.querySelector('div')?.className).toMatch(/ring-white/)
  })
})
```

- [ ] **Step 12.2: Rodar teste, confirmar falha**

```bash
npm run test -- MtAvatar
```

Esperado: FAIL.

- [ ] **Step 12.3: Implementar componente**

Cria `src/components/mt/MtAvatar.tsx`:

```tsx
const SIZE_CLASSES = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-14 h-14 text-base',
  lg: 'w-20 h-20 text-2xl',
} as const

interface MtAvatarProps {
  src?: string
  alt: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function MtAvatar({ src, alt, size = 'md', className = '' }: MtAvatarProps) {
  const initial = alt.charAt(0).toUpperCase()
  const base = `${SIZE_CLASSES[size]} rounded-full overflow-hidden ring-4 ring-white shadow-mt flex-shrink-0 ${className}`

  if (!src) {
    return (
      <div className={`${base} bg-mt-pink-soft flex items-center justify-center text-mt-rose-dark font-serif font-semibold`}>
        {initial}
      </div>
    )
  }

  return (
    <div className={base}>
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </div>
  )
}
```

- [ ] **Step 12.4: Rodar teste, confirmar passa**

```bash
npm run test -- MtAvatar
```

Esperado: 4 tests PASS.

- [ ] **Step 12.5: Commit**

```bash
git add src/components/mt/MtAvatar.tsx src/components/mt/MtAvatar.test.tsx
git commit -m "feat(mt): primitivo <MtAvatar size='sm|md|lg' />"
```

---

## Task 13 — Primitivo `<MtChip>`

**Files:**
- Create: `src/components/mt/MtChip.tsx`
- Test: `src/components/mt/MtChip.test.tsx`

- [ ] **Step 13.1: Escrever teste falhando**

Cria `src/components/mt/MtChip.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MtChip } from './MtChip'

describe('MtChip', () => {
  it('renders label with pink-soft bg (default)', () => {
    render(<MtChip>Gestação</MtChip>)
    const el = screen.getByText('Gestação')
    expect(el.className).toMatch(/bg-mt-pink-soft/)
    expect(el.className).toMatch(/text-mt-rose-dark/)
    expect(el.className).toMatch(/rounded-mt-pill/)
  })

  it('active variant uses gradient bg and white text', () => {
    render(<MtChip active>Gestação</MtChip>)
    const el = screen.getByText('Gestação')
    expect(el.className).toMatch(/bg-mt-gradient/)
    expect(el.className).toMatch(/text-white/)
  })

  it('fires onClick when interactive', () => {
    const onClick = vi.fn()
    render(<MtChip onClick={onClick}>x</MtChip>)
    fireEvent.click(screen.getByText('x'))
    expect(onClick).toHaveBeenCalled()
  })
})
```

- [ ] **Step 13.2: Rodar teste, confirmar falha**

```bash
npm run test -- MtChip
```

Esperado: FAIL.

- [ ] **Step 13.3: Implementar componente**

Cria `src/components/mt/MtChip.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from 'react'

interface MtChipProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  active?: boolean
}

export function MtChip({ children, active = false, className = '', onClick, ...rest }: MtChipProps) {
  const base = 'inline-block text-xs font-semibold rounded-mt-pill px-3 py-1'
  const variant = active
    ? 'bg-mt-gradient text-white'
    : 'bg-mt-pink-soft text-mt-rose-dark'
  const interactive = onClick ? 'cursor-pointer' : ''

  return (
    <span
      role={onClick ? 'button' : undefined}
      className={`${base} ${variant} ${interactive} ${className}`}
      onClick={onClick}
      {...rest}
    >
      {children}
    </span>
  )
}
```

- [ ] **Step 13.4: Rodar teste, confirmar passa**

```bash
npm run test -- MtChip
```

Esperado: 3 tests PASS.

- [ ] **Step 13.5: Commit**

```bash
git add src/components/mt/MtChip.tsx src/components/mt/MtChip.test.tsx
git commit -m "feat(mt): primitivo <MtChip active={boolean} />"
```

---

## Task 14 — Primitivo `<MtHeader>`

Header topo da Home: avatar + saudação "Olá **Nome**" (bold serif no nome) + sino de notificação.

**Files:**
- Create: `src/components/mt/MtHeader.tsx`
- Test: `src/components/mt/MtHeader.test.tsx`

- [ ] **Step 14.1: Escrever teste falhando**

Cria `src/components/mt/MtHeader.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MtHeader } from './MtHeader'

describe('MtHeader', () => {
  it('renders greeting with bold name', () => {
    render(<MtHeader name="Claudia" onNotificationsClick={() => {}} />)
    expect(screen.getByText('Olá')).toBeInTheDocument()
    expect(screen.getByText('Claudia')).toBeInTheDocument()
  })

  it('renders avatar via MtAvatar', () => {
    render(<MtHeader name="Ana" avatarUrl="http://x/a.png" onNotificationsClick={() => {}} />)
    expect(screen.getByAltText('Ana')).toBeInTheDocument()
  })

  it('bell button fires onNotificationsClick', () => {
    const cb = vi.fn()
    render(<MtHeader name="Ana" onNotificationsClick={cb} />)
    fireEvent.click(screen.getByRole('button', { name: /notificações/i }))
    expect(cb).toHaveBeenCalled()
  })

  it('shows unread badge when unreadCount > 0', () => {
    render(<MtHeader name="Ana" unreadCount={3} onNotificationsClick={() => {}} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
```

- [ ] **Step 14.2: Rodar teste, confirmar falha**

```bash
npm run test -- MtHeader
```

Esperado: FAIL.

- [ ] **Step 14.3: Implementar componente**

Cria `src/components/mt/MtHeader.tsx`:

```tsx
import { Bell } from 'lucide-react'
import { MtAvatar } from './MtAvatar'

interface MtHeaderProps {
  name: string
  avatarUrl?: string
  unreadCount?: number
  onNotificationsClick: () => void
  onAvatarClick?: () => void
}

export function MtHeader({
  name,
  avatarUrl,
  unreadCount = 0,
  onNotificationsClick,
  onAvatarClick,
}: MtHeaderProps) {
  return (
    <header className="flex items-center justify-between px-5 pt-6 pb-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onAvatarClick}
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-white"
          aria-label={`Perfil de ${name}`}
        >
          <MtAvatar src={avatarUrl} alt={name} size="lg" />
        </button>
        <div className="text-white leading-tight">
          <div className="text-lg">Olá</div>
          <div className="text-2xl font-serif font-bold">{name}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onNotificationsClick}
        aria-label="Notificações"
        className="relative rounded-full bg-white/60 backdrop-blur-sm p-3 focus:outline-none focus:ring-2 focus:ring-white"
      >
        <Bell size={20} className="text-mt-charcoal" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-mt-rose text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount}
          </span>
        )}
      </button>
    </header>
  )
}
```

- [ ] **Step 14.4: Rodar teste, confirmar passa**

```bash
npm run test -- MtHeader
```

Esperado: 4 tests PASS.

- [ ] **Step 14.5: Commit**

```bash
git add src/components/mt/MtHeader.tsx src/components/mt/MtHeader.test.tsx
git commit -m "feat(mt): primitivo <MtHeader name= avatarUrl= unreadCount= />"
```

---

## Task 15 — Primitivo `<MtBottomNav>`

4 abas ícone+label + M-CTA central elevado (gradient). Callback próprio no CTA.

**Files:**
- Create: `src/components/mt/MtBottomNav.tsx`
- Test: `src/components/mt/MtBottomNav.test.tsx`

- [ ] **Step 15.1: Escrever teste falhando**

Cria `src/components/mt/MtBottomNav.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MtBottomNav } from './MtBottomNav'

describe('MtBottomNav', () => {
  const props = {
    activeTab: 'hoje' as const,
    onTabChange: vi.fn(),
    onCtaClick: vi.fn(),
  }

  beforeEach(() => vi.clearAllMocks())

  it('renders 4 tabs and 1 CTA', () => {
    render(<MtBottomNav {...props} />)
    expect(screen.getByRole('tab', { name: /hoje/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /jornada/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /comunidade/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /perfil/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ações rápidas/i })).toBeInTheDocument()
  })

  it('active tab has text-mt-rose class', () => {
    render(<MtBottomNav {...props} activeTab="comunidade" />)
    const tab = screen.getByRole('tab', { name: /comunidade/i })
    expect(tab.className).toMatch(/text-mt-rose/)
  })

  it('inactive tab has text-mt-muted', () => {
    render(<MtBottomNav {...props} activeTab="hoje" />)
    const tab = screen.getByRole('tab', { name: /jornada/i })
    expect(tab.className).toMatch(/text-mt-muted/)
  })

  it('tap on tab fires onTabChange with tab id', () => {
    render(<MtBottomNav {...props} />)
    fireEvent.click(screen.getByRole('tab', { name: /jornada/i }))
    expect(props.onTabChange).toHaveBeenCalledWith('jornada')
  })

  it('tap on CTA fires onCtaClick', () => {
    render(<MtBottomNav {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /ações rápidas/i }))
    expect(props.onCtaClick).toHaveBeenCalled()
  })
})
```

- [ ] **Step 15.2: Rodar teste, confirmar falha**

```bash
npm run test -- MtBottomNav
```

Esperado: FAIL.

- [ ] **Step 15.3: Implementar componente**

Cria `src/components/mt/MtBottomNav.tsx`:

```tsx
import { Home, BookOpen, Users, User } from 'lucide-react'
import { Mark } from '../brand/Mark'

export type MtTabId = 'hoje' | 'jornada' | 'comunidade' | 'perfil'

interface MtBottomNavProps {
  activeTab: MtTabId
  onTabChange: (tab: MtTabId) => void
  onCtaClick: () => void
}

const TABS: { id: MtTabId; label: string; Icon: typeof Home }[] = [
  { id: 'hoje',       label: 'Hoje',       Icon: Home },
  { id: 'jornada',    label: 'Jornada',    Icon: BookOpen },
  { id: 'comunidade', label: 'Comunidade', Icon: Users },
  { id: 'perfil',     label: 'Perfil',     Icon: User },
]

export function MtBottomNav({ activeTab, onTabChange, onCtaClick }: MtBottomNavProps) {
  // Ordem visual: Hoje | Jornada | [M-CTA] | Comunidade | Perfil
  const left = TABS.slice(0, 2)
  const right = TABS.slice(2)

  return (
    <nav
      role="tablist"
      className="fixed bottom-0 left-0 right-0 z-40 mx-4 mb-2 bg-white/95 backdrop-blur-sm rounded-mt-lg shadow-mt-lg flex items-end justify-around px-4"
      style={{
        paddingBottom: `calc(env(safe-area-inset-bottom) + 12px)`,
        paddingTop: '10px',
      }}
    >
      {left.map(({ id, label, Icon }) => (
        <TabButton key={id} id={id} label={label} Icon={Icon} active={activeTab === id} onClick={() => onTabChange(id)} />
      ))}

      <button
        type="button"
        onClick={onCtaClick}
        aria-label="Ações rápidas"
        className="-mt-6 rounded-full shadow-mt-lg focus:outline-none focus:ring-2 focus:ring-mt-rose"
      >
        <Mark variant="gradient" size={56} aria-label="Ações rápidas" />
      </button>

      {right.map(({ id, label, Icon }) => (
        <TabButton key={id} id={id} label={label} Icon={Icon} active={activeTab === id} onClick={() => onTabChange(id)} />
      ))}
    </nav>
  )
}

function TabButton({
  id, label, Icon, active, onClick,
}: {
  id: string
  label: string
  Icon: typeof Home
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-label={label}
      aria-selected={active}
      onClick={onClick}
      data-testid={`mt-tab-${id}`}
      className={`flex flex-col items-center gap-0.5 py-1 px-2 focus:outline-none ${active ? 'text-mt-rose' : 'text-mt-muted'}`}
    >
      <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}
```

- [ ] **Step 15.4: Rodar teste, confirmar passa**

```bash
npm run test -- MtBottomNav
```

Esperado: 5 tests PASS.

- [ ] **Step 15.5: Commit**

```bash
git add src/components/mt/MtBottomNav.tsx src/components/mt/MtBottomNav.test.tsx
git commit -m "feat(mt): primitivo <MtBottomNav> — 4 abas + M-CTA central elevado"
```

---

## Task 16 — Primitivo `<MtQuickActionSheet>`

Bottom sheet aberto pelo M-CTA. 4 atalhos: MãeIA, novo post, adicionar rotina, registrar amamentação/sono/fralda.

**Files:**
- Create: `src/components/mt/MtQuickActionSheet.tsx`
- Test: `src/components/mt/MtQuickActionSheet.test.tsx`

- [ ] **Step 16.1: Escrever teste falhando**

Cria `src/components/mt/MtQuickActionSheet.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MtQuickActionSheet } from './MtQuickActionSheet'

describe('MtQuickActionSheet', () => {
  const props = {
    open: true,
    onClose: vi.fn(),
    onMaeIA: vi.fn(),
    onNewPost: vi.fn(),
    onAddRoutine: vi.fn(),
    onRegisterBaby: vi.fn(),
  }

  beforeEach(() => vi.clearAllMocks())

  it('does not render when open=false', () => {
    render(<MtQuickActionSheet {...props} open={false} />)
    expect(screen.queryByText(/falar com a mãeia/i)).not.toBeInTheDocument()
  })

  it('renders 4 action buttons with correct labels', () => {
    render(<MtQuickActionSheet {...props} />)
    expect(screen.getByRole('button', { name: /falar com a mãeia/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /novo post/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /adicionar rotina/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /registrar amamentação|sono|fralda/i })).toBeInTheDocument()
  })

  it('MãeIA click fires onMaeIA and onClose', () => {
    render(<MtQuickActionSheet {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /falar com a mãeia/i }))
    expect(props.onMaeIA).toHaveBeenCalled()
    expect(props.onClose).toHaveBeenCalled()
  })

  it('backdrop click closes', () => {
    render(<MtQuickActionSheet {...props} />)
    fireEvent.click(screen.getByTestId('mt-sheet-backdrop'))
    expect(props.onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 16.2: Rodar teste, confirmar falha**

```bash
npm run test -- MtQuickActionSheet
```

Esperado: FAIL.

- [ ] **Step 16.3: Implementar componente**

Cria `src/components/mt/MtQuickActionSheet.tsx`:

```tsx
import { MessageSquare, PlusSquare, CalendarPlus, Baby } from 'lucide-react'

interface MtQuickActionSheetProps {
  open: boolean
  onClose: () => void
  onMaeIA: () => void
  onNewPost: () => void
  onAddRoutine: () => void
  onRegisterBaby: () => void
}

export function MtQuickActionSheet({
  open,
  onClose,
  onMaeIA,
  onNewPost,
  onAddRoutine,
  onRegisterBaby,
}: MtQuickActionSheetProps) {
  if (!open) return null

  const wrap = (fn: () => void) => () => {
    fn()
    onClose()
  }

  return (
    <>
      <div
        data-testid="mt-sheet-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
      />
      <div
        role="dialog"
        aria-label="Ações rápidas"
        className="fixed left-0 right-0 bottom-0 z-50 bg-white rounded-t-mt-lg shadow-mt-lg p-6"
        style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 24px)` }}
      >
        <div className="mx-auto w-12 h-1 bg-mt-linen rounded-full mb-4" />
        <div className="grid grid-cols-2 gap-3">
          <ActionButton onClick={wrap(onMaeIA)} Icon={MessageSquare} label="Falar com a MãeIA" />
          <ActionButton onClick={wrap(onNewPost)} Icon={PlusSquare} label="Novo post" />
          <ActionButton onClick={wrap(onAddRoutine)} Icon={CalendarPlus} label="Adicionar rotina" />
          <ActionButton onClick={wrap(onRegisterBaby)} Icon={Baby} label="Registrar amamentação/sono/fralda" />
        </div>
      </div>
    </>
  )
}

function ActionButton({
  onClick, Icon, label,
}: {
  onClick: () => void
  Icon: typeof MessageSquare
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-4 rounded-mt bg-mt-pink-soft text-mt-rose-dark font-semibold text-sm"
    >
      <Icon size={24} strokeWidth={1.8} />
      <span className="text-center leading-tight">{label}</span>
    </button>
  )
}
```

- [ ] **Step 16.4: Rodar teste, confirmar passa**

```bash
npm run test -- MtQuickActionSheet
```

Esperado: 4 tests PASS.

- [ ] **Step 16.5: Commit**

```bash
git add src/components/mt/MtQuickActionSheet.tsx src/components/mt/MtQuickActionSheet.test.tsx
git commit -m "feat(mt): primitivo <MtQuickActionSheet> — 4 atalhos do M-CTA"
```

---

## Task 17 — Android adaptive icon: background gradient

Adicionar um vector drawable gradient rose→pink que substituirá o `<color>` sólido `#FFFFFF` atual.

**Files:**
- Create: `android/app/src/main/res/drawable/ic_launcher_background.xml`
- Modify: `android/app/src/main/res/values/ic_launcher_background.xml`
- Modify: `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`
- Modify: `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`

- [ ] **Step 17.1: Criar vector drawable gradient**

Cria `android/app/src/main/res/drawable/ic_launcher_background.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:pathData="M0,0h108v108h-108z">
        <aapt:attr xmlns:aapt="http://schemas.android.com/aapt" name="android:fillColor">
            <gradient
                android:type="linear"
                android:startX="0"
                android:startY="0"
                android:endX="108"
                android:endY="108"
                android:startColor="#db958b"
                android:endColor="#f6bdd8" />
        </aapt:attr>
    </path>
</vector>
```

- [ ] **Step 17.2: Remover recurso `<color>` antigo**

Abrir `android/app/src/main/res/values/ic_launcher_background.xml`. Substituir conteúdo inteiro por:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Background do adaptive icon movido para @drawable/ic_launcher_background (gradient rose→pink) -->
</resources>
```

- [ ] **Step 17.3: Atualizar referência no adaptive icon**

Abrir `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`. Substituir:

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
```

Fazer o mesmo em `ic_launcher_round.xml` (mesmo conteúdo).

- [ ] **Step 17.4: Buildar Android para confirmar recursos compilam**

```bash
cd android
./gradlew assembleDebug --console=plain 2>&1 | tail -10
cd ..
```

Esperado: `BUILD SUCCESSFUL`. Se falhar com "resource not found" ou "aapt error", revisar sintaxe do vector.

- [ ] **Step 17.5: Commit**

```bash
git add android/app/src/main/res/drawable/ic_launcher_background.xml \
        android/app/src/main/res/values/ic_launcher_background.xml \
        android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml \
        android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml
git commit -m "feat(android): background do adaptive icon vira gradient rose→pink"
```

---

## Task 18 — Android adaptive icon: foreground PNG (M-logo)

Regenerar os 5 PNGs `ic_launcher_foreground.png` (mdpi..xxxhdpi) com o M-logo branco da nova marca. Usar `@capacitor/assets` com uma imagem source PNG do M em branco sobre transparente.

**Files:**
- Create: `resources/icon-foreground.png` (source 1024×1024 do M branco sobre transparente — não commitado no git final, é input)
- Modify: `android/app/src/main/res/mipmap-{mdpi..xxxhdpi}/ic_launcher_foreground.png`
- Modify: `android/app/src/main/res/mipmap-{mdpi..xxxhdpi}/ic_launcher.png` e `ic_launcher_round.png` (regenerados)

- [ ] **Step 18.1: Preparar imagem foreground source**

Gerar 1024×1024 do M branco sobre fundo transparente, centrado ocupando ~66% do canvas (regra adaptive icon Android):

```bash
mkdir -p resources
python <<'PY'
from PIL import Image
src = Image.open(r'docs/materials/logos/LOGOS/Sem título-1-01.png').convert('RGBA')
# O app icon original tem gradient rose + M branco. Precisamos só do M branco.
# Aproximação prática: usar o próprio app icon (mesmo com background rose) — Android vai mascarar.
# Melhor: usar Sem título-1-07.png (M em pink pastel) invertido? Não, queremos M BRANCO.
# Solução: pegar Sem título-1-01.png (app icon com fundo rose + M branco) e fazer o M sozinho não é trivial sem editor.
# Aceitável: usar o app icon inteiro como foreground (com fundo rose próprio) — o adaptive vai duplicar rose,
# ficando OK visualmente. Alternativa: pintar a versão outline (logo03) de branco.

# Solução escolhida: expandir o Sem título-1-01 para 1024, sem alterar (branco M sobre gradient rose interno).
# Isso significa que o "foreground" já traz seu próprio gradient e o "background" aparece só nas bordas do mask.
src = src.resize((1024, 1024), Image.LANCZOS)
# Trim: coloca dentro de um canvas transparente 1024x1024 respeitando margem de 17% (safe zone padrão)
canvas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
# Redimensiona pra 66% (677px) e centraliza
inner = src.resize((677, 677), Image.LANCZOS)
canvas.paste(inner, (173, 173), inner)
canvas.save(r'resources/icon-foreground.png', 'PNG')
print('Saved resources/icon-foreground.png (1024x1024, foreground do adaptive icon)')
PY
```

- [ ] **Step 18.2: Preparar `assetconfig.json` para `@capacitor/assets`**

Cria `assetconfig.json` na raiz do projeto:

```json
{
  "icon": {
    "path": "resources/icon-foreground.png",
    "backgroundColor": "#db958b"
  }
}
```

Nota: `@capacitor/assets` v3 espera `resources/icon.png` (foreground) + `resources/icon-background.png` OU cor. Como já criamos gradient via vector drawable no Task 17, essa cor `backgroundColor` só é usada pelo iOS/PWA. No Android o vector do Task 17 sobrepõe.

- [ ] **Step 18.3: Gerar assets Android via CLI**

```bash
npx @capacitor/assets generate --android
```

Esperado: "Generated X icon files" — gera todos os 5 tamanhos de `ic_launcher_foreground.png` e `ic_launcher.png`/`ic_launcher_round.png` em cada mipmap-*dpi.

- [ ] **Step 18.4: Confirmar output**

```bash
ls android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png
```

Esperado: arquivo existe. Ver visualmente com um PNG viewer para conferir que o M aparece branco sobre gradient interno.

- [ ] **Step 18.5: Rebuild Android**

```bash
cd android
./gradlew assembleDebug --console=plain 2>&1 | tail -10
cd ..
```

Esperado: BUILD SUCCESSFUL.

- [ ] **Step 18.6: Commit**

```bash
git add assetconfig.json resources/icon-foreground.png \
        android/app/src/main/res/mipmap-hdpi/ic_launcher*.png \
        android/app/src/main/res/mipmap-mdpi/ic_launcher*.png \
        android/app/src/main/res/mipmap-xhdpi/ic_launcher*.png \
        android/app/src/main/res/mipmap-xxhdpi/ic_launcher*.png \
        android/app/src/main/res/mipmap-xxxhdpi/ic_launcher*.png
git commit -m "feat(android): foreground do adaptive icon com M da nova marca"
```

---

## Task 19 — Splash Capacitor regenerado

Splash centralizando o wordmark cream sobre gradient rose (página 1 do PDF).

**Files:**
- Create: `resources/splash.png` (source 2732×2732)
- Modify: `android/app/src/main/res/drawable{,-land-*,-port-*}/splash.png` (via CLI)

- [ ] **Step 19.1: Gerar splash source**

```bash
python <<'PY'
from PIL import Image, ImageDraw

# Canvas 2732x2732 (Capacitor splash source recomendado)
canvas = Image.new('RGB', (2732, 2732), (0, 0, 0))
# Gradient linear 135° manual
for y in range(2732):
    for x in range(2732):
        t = (x + y) / (2732 + 2732)
        r = int(0xdb * (1 - t) + 0xf6 * t)
        g = int(0x95 * (1 - t) + 0xbd * t)
        b = int(0x8b * (1 - t) + 0xd8 * t)
        canvas.putpixel((x, y), (r, g, b))
# Isso vai demorar minutos em Python puro; melhor usar NumPy:
PY

python <<'PY'
import numpy as np
from PIL import Image
size = 2732
xs, ys = np.meshgrid(np.arange(size), np.arange(size))
t = (xs + ys) / (2 * size)
r = (0xdb * (1 - t) + 0xf6 * t).astype(np.uint8)
g = (0x95 * (1 - t) + 0xbd * t).astype(np.uint8)
b = (0x8b * (1 - t) + 0xd8 * t).astype(np.uint8)
rgb = np.stack([r, g, b], axis=-1)
canvas = Image.fromarray(rgb, 'RGB')
# Colocar wordmark cream centralizado (usando Sem título-1-06.png, ~800x400)
wm = Image.open(r'docs/materials/logos/LOGOS/Sem título-1-06.png').convert('RGBA')
wm.thumbnail((1200, 600), Image.LANCZOS)
canvas.paste(wm, ((size - wm.width) // 2, (size - wm.height) // 2), wm)
canvas.save(r'resources/splash.png', 'PNG')
print(f'Saved resources/splash.png ({size}x{size})')
PY
```

- [ ] **Step 19.2: Atualizar `assetconfig.json` para incluir splash**

Editar `assetconfig.json`:

```json
{
  "icon": {
    "path": "resources/icon-foreground.png",
    "backgroundColor": "#db958b"
  },
  "splash": {
    "path": "resources/splash.png",
    "backgroundColor": "#db958b"
  }
}
```

- [ ] **Step 19.3: Gerar splash via CLI**

```bash
npx @capacitor/assets generate --android
```

Esperado: gera `splash.png` e `splash-dark.png` em todos os `drawable-*` (port + land + densidades).

- [ ] **Step 19.4: Confirmar**

```bash
ls android/app/src/main/res/drawable/splash.png
```

- [ ] **Step 19.5: Rebuild + smoke test**

```bash
cd android
./gradlew assembleDebug --console=plain 2>&1 | tail -10
cd ..
```

Esperado: BUILD SUCCESSFUL.

- [ ] **Step 19.6: Commit**

```bash
git add resources/splash.png assetconfig.json android/app/src/main/res/drawable*/splash*.png
git commit -m "feat(android): splash regenerado — wordmark cream sobre gradient rose"
```

---

## Task 20 — Favicons web / PWA

**Files:**
- Create: `public/favicon.svg`
- Create: `public/favicon.ico`
- Create: `public/apple-touch-icon.png`
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`
- Modify: `index.html` (adicionar manifest.json e apple-touch-icon)
- Create: `public/manifest.json`

- [ ] **Step 20.1: Copiar mark gradient como favicon.svg**

```bash
cp src/assets/brand/mark-mt-gradient.svg public/favicon.svg
```

- [ ] **Step 20.2: Gerar favicon.ico (32x32) e PNGs a partir do PNG source**

```bash
python <<'PY'
from PIL import Image
src = Image.open(r'docs/materials/logos/LOGOS/Sem título-1-01.png').convert('RGBA')
# 32x32 ICO
src.resize((32, 32), Image.LANCZOS).save(r'public/favicon.ico', 'ICO', sizes=[(32, 32)])
# 180x180 apple-touch
src.resize((180, 180), Image.LANCZOS).save(r'public/apple-touch-icon.png', 'PNG')
# 192x192 e 512x512 PWA
src.resize((192, 192), Image.LANCZOS).save(r'public/icon-192.png', 'PNG')
src.resize((512, 512), Image.LANCZOS).save(r'public/icon-512.png', 'PNG')
print('Favicons gerados')
PY
```

- [ ] **Step 20.3: Criar `public/manifest.json`**

```json
{
  "name": "Mother's Team",
  "short_name": "Mother's Team",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#db958b",
  "theme_color": "#db958b",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 20.4: Atualizar `index.html` para incluir os novos links**

Abrir `index.html`. Após `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` (linha 5), adicionar:

```html
    <link rel="alternate icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#db958b" />
```

- [ ] **Step 20.5: Build + preview local para confirmar favicon aparece**

```bash
npm run build && npm run preview
```

Abrir manualmente `http://localhost:4173` no browser — favicon rose deve aparecer na aba. Ctrl+C para parar.

- [ ] **Step 20.6: Commit**

```bash
git add public/favicon.svg public/favicon.ico public/apple-touch-icon.png \
        public/icon-192.png public/icon-512.png public/manifest.json index.html
git commit -m "feat(web): favicons + manifest PWA com marca Mother's Team"
```

---

## Task 21 — Bump versionCode + versionName

**Files:**
- Modify: `android/app/build.gradle:16-17`

- [ ] **Step 21.1: Atualizar versionCode e versionName**

Abrir `android/app/build.gradle`. Trocar linhas 16-17 de:

```gradle
        versionCode 3
        versionName "1.2.0"
```

Para:

```gradle
        versionCode 4
        versionName "1.3.0"
```

- [ ] **Step 21.2: Commit**

```bash
git add android/app/build.gradle
git commit -m "chore(android): versionCode 4, versionName 1.3.0 (Onda 1)"
```

---

## Task 22 — Smoke test integrado: build + testes + APK sample

Nenhum arquivo criado/modificado — só validação final antes do deploy.

- [ ] **Step 22.1: Rodar suite completa**

```bash
npm run test
```

Esperado: 100% verde. Se algum teste do legado falhar por mudança de cor, PARAR e investigar (era pra ser transparente).

- [ ] **Step 22.2: Build de produção do frontend**

```bash
npm run build
```

Esperado: sem erros. `dist/` gerado.

- [ ] **Step 22.3: Cap sync**

```bash
npx cap sync android
```

Esperado: sync sem erros.

- [ ] **Step 22.4: Gerar APK release**

```bash
cd android
./gradlew assembleRelease --console=plain 2>&1 | tail -15
cd ..
```

Esperado: `BUILD SUCCESSFUL`. APK em `android/app/build/outputs/apk/release/app-release.apk`.

- [ ] **Step 22.5: Instalar no dispositivo/emulador e validar visualmente**

Se houver device conectado:

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Validar:
- Ícone no launcher: adaptive icon com gradient rose + M branco
- Ao abrir o app: splash com wordmark cream centralizado sobre gradient rose
- App abre normalmente (nenhuma tela quebrada) — cores gerais devem estar rose em vez de gold

- [ ] **Step 22.6: Screenshot visual via agent-browser (opcional se não tiver device Android à mão)**

```bash
npm run dev &
sleep 5
agent-browser resize 390 844
agent-browser open http://localhost:5173/
agent-browser screenshot ".tmp-materials/wave1-smoke-home.png"
agent-browser open http://localhost:5173/login
agent-browser screenshot ".tmp-materials/wave1-smoke-login.png"
kill %1
```

Abrir os PNGs, confirmar visualmente que:
- As telas continuam funcionando (nenhuma quebrada por conta dos aliases)
- As áreas que usam classes `sara-*` agora aparecem em tons rose/pink em vez de gold/terracotta

- [ ] **Step 22.7: Consolidar commit vazio de checkpoint (opcional)**

Não commita nada — apenas registro que passamos o smoke test. Se quiser marcar, criar tag:

```bash
git tag -a onda-1-smoke -m "Onda 1 fundação: smoke test verde"
```

---

## Task 23 — Deploy Onda 1 (frontend + AAB internal testing)

**Não modifica arquivos** — só deployment.

- [ ] **Step 23.1: Deploy do frontend estático para VPS**

```bash
npm run build
scp -P 443 -r dist/. root@2.25.137.78:/var/www/mothersteam/
```

Esperado: transferência completa sem erro. Validar em `https://mothersteam.santoti.com/` (ou domínio configurado).

- [ ] **Step 23.2: Gerar AAB signed**

```bash
cd android
./gradlew bundleRelease --console=plain 2>&1 | tail -15
cd ..
```

Esperado: AAB em `android/app/build/outputs/bundle/release/app-release.aab`.

- [ ] **Step 23.3: Upload AAB para Play Console (canal Internal Testing)**

Manual — dono do produto faz upload em `play.google.com/console` → app Mother's Team → Testing → Internal testing → Create new release → upload AAB → Rollout to Internal testing.

Release notes sugeridas:

```
v1.3.0 — Onda 1: fundação do novo visual Mother's Team
- Nova paleta rose/pink oficial
- Novo ícone e splash screen com wordmark
- Preparação técnica para as próximas ondas (nenhuma tela redesenhada ainda)
```

- [ ] **Step 23.4: Push do branch para remote (para review histórico)**

```bash
git push origin main
```

Esperado: push aceito.

- [ ] **Step 23.5: Atualizar memória do projeto**

Salvar memória do progresso — feito automaticamente pelo agente auto-memory quando aplicável. Se manual, criar `.claude/.../memory/project-onda-1-visual-2026-08-22.md`:

```markdown
---
name: project-onda-1-visual-2026-08-22
description: Onda 1 do rebrand Mother's Team deployada (v1.3.0) — tokens + primitivos + assets, sem mudança de tela
metadata:
  type: project
---

Onda 1 do novo visual "Mother's Team" deployada em 2026-08-22:
- Frontend em produção com paleta rose/pink (aliases sara-* remapeados)
- AAB v1.3.0 (versionCode 4) subido em internal testing
- 9 primitivos Mt* + 2 componentes brand/ criados e testados, ainda não usados
- Ícone Android novo (adaptive icon gradient + M branco)
- Splash novo (wordmark cream sobre gradient rose)
- Favicons/PWA icons novos

**Why:** parte 1 do rollout faseado do rebrand aprovado.
**How to apply:** próxima onda (Onda 2) refatora Login, Home, Drawer e BottomTabBar para usar os primitivos criados. Spec em docs/superpowers/specs/2026-08-22-novo-visual-mothers-team-design.md.
```

---

## Self-Review

- [ ] **Cobertura do spec:** todas as seções ("Design tokens", "Assets de marca", "Componentes primitivos", "Ondas de rollout — Onda 1") têm task correspondente
- [ ] **Placeholders:** nenhum "TBD"/"implementar depois"/etc no plano
- [ ] **Consistência de tipos:** `MtBottomNav` usa `MtTabId` exportado; `MtQuickActionSheet` usa callbacks nomeados `onMaeIA/onNewPost/onAddRoutine/onRegisterBaby`; `Mark` variant `mono|gradient`; `Wordmark` variant `rose|cream`
- [ ] **Terminologia:** "MãeIA" e "amamentação" usados corretamente nos primitivos MtQuickActionSheet e nos labels
- [ ] **Ordem de dependência:** Tasks 1-2 (tokens) → 3-5 (assets) → 6-7 (brand components) → 8-16 (primitivos, alguns dependendo de outros — MtHeader usa MtAvatar, MtBottomNav usa Mark, todos criados antes de serem consumidos)
