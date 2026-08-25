import { useCallback } from 'react'
import type { Baby } from '../../../types'

export interface StepBebesValue {
  hasMultiples: boolean
  babies: Baby[]
}

interface Props {
  value: StepBebesValue
  onChange: (v: StepBebesValue) => void
}

export function StepBebes({ value, onChange }: Props) {
  const setHasMultiples = useCallback((checked: boolean) => {
    onChange({
      hasMultiples: checked,
      babies: checked
        ? (value.babies.length >= 2 ? value.babies : [value.babies[0] ?? { name: '' }, { name: '' }])
        : [value.babies[0] ?? { name: '' }],
    })
  }, [value.babies, onChange])

  const setCount = useCallback((n: number) => {
    const count = Math.max(2, Math.min(6, n))
    const babies: Baby[] = Array.from({ length: count }, (_, i) => value.babies[i] ?? { name: '' })
    onChange({ hasMultiples: true, babies })
  }, [value.babies, onChange])

  const setName = useCallback((idx: number, name: string) => {
    const babies = value.babies.map((b, i) => (i === idx ? { ...b, name } : b))
    onChange({ ...value, babies })
  }, [value, onChange])

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm text-mt-charcoal cursor-pointer">
        <input
          type="checkbox"
          checked={value.hasMultiples}
          onChange={(e) => setHasMultiples(e.target.checked)}
          aria-label="mais de um bebê (gêmeos, trigêmeos)"
          className="accent-mt-rose"
        />
        <span>Mais de um bebê (gêmeos, trigêmeos)?</span>
      </label>

      {value.hasMultiples && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-mt-muted" htmlFor="baby-count">
            Quantos bebês?
          </label>
          <input
            id="baby-count"
            type="number"
            min={2}
            max={6}
            value={value.babies.length}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-24 px-4 py-3 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal focus:outline-none focus:border-mt-rose"
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {value.babies.map((b, i) => (
          <input
            key={i}
            type="text"
            value={b.name ?? ''}
            onChange={(e) => setName(i, e.target.value)}
            placeholder={value.babies.length > 1 ? `Nome do bebê ${i + 1} (opcional)` : 'Nome do bebê (opcional)'}
            className="w-full px-4 py-3 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal placeholder:text-mt-muted focus:outline-none focus:border-mt-rose"
          />
        ))}
      </div>
    </div>
  )
}
