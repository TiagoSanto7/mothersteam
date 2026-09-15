import type { Q4Answer, Q5Answer } from '../../../types'

export interface StepObjetivoValue {
  goals: Q4Answer[]
  concerns: Q5Answer[]
}

interface Props {
  value: StepObjetivoValue
  onChange: (v: StepObjetivoValue) => void
}

const GOALS: Array<{ key: Q4Answer; label: string }> = [
  { key: 'A', label: 'Entender o desenvolvimento do bebê' },
  { key: 'B', label: 'Cuidar da saúde física' },
  { key: 'C', label: 'Melhorar o sono' },
  { key: 'D', label: 'Organizar a rotina' },
]

const CONCERNS: Array<{ key: Q5Answer; label: string }> = [
  { key: 'A', label: 'Autocuidado / identidade' },
  { key: 'B', label: 'Choro, cólicas, sono do bebê' },
  { key: 'C', label: 'Amamentação / alimentação' },
  { key: 'D', label: 'Corpo, hormônios, autoestima' },
]

function toggle<T extends string>(list: T[], key: T): T[] {
  return list.includes(key) ? list.filter((x) => x !== key) : [...list, key]
}

export function StepObjetivo({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-mt-charcoal mb-1">
          Quais seus objetivos por aqui?
        </legend>
        <p className="text-xs text-mt-muted mb-2">Você pode escolher mais de uma opção.</p>
        {GOALS.map((g) => {
          const checked = value.goals.includes(g.key)
          return (
            <label key={g.key} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-mt-linen cursor-pointer hover:border-mt-rose transition-colors">
              <input
                type="checkbox"
                name="goal"
                value={g.key}
                checked={checked}
                onChange={() => onChange({ ...value, goals: toggle(value.goals, g.key) })}
                aria-label={g.label}
                className="accent-mt-rose"
              />
              <span className="text-sm text-mt-charcoal">{g.label}</span>
            </label>
          )
        })}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-mt-charcoal mb-1">
          Quais suas preocupações hoje?
        </legend>
        <p className="text-xs text-mt-muted mb-2">Você pode escolher mais de uma opção.</p>
        {CONCERNS.map((c) => {
          const checked = value.concerns.includes(c.key)
          return (
            <label key={c.key} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-mt-linen cursor-pointer hover:border-mt-rose transition-colors">
              <input
                type="checkbox"
                name="concern"
                value={c.key}
                checked={checked}
                onChange={() => onChange({ ...value, concerns: toggle(value.concerns, c.key) })}
                aria-label={c.label}
                className="accent-mt-rose"
              />
              <span className="text-sm text-mt-charcoal">{c.label}</span>
            </label>
          )
        })}
      </fieldset>
    </div>
  )
}
