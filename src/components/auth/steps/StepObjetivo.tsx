import type { Q4Answer, Q5Answer } from '../../../types'

export interface StepObjetivoValue {
  goal: Q4Answer | null
  concern: Q5Answer | null
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

export function StepObjetivo({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-mt-charcoal mb-2">
          Qual seu principal objetivo por aqui?
        </legend>
        {GOALS.map((g) => (
          <label key={g.key} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-mt-linen cursor-pointer hover:border-mt-rose transition-colors">
            <input
              type="radio"
              name="goal"
              value={g.key}
              checked={value.goal === g.key}
              onChange={() => onChange({ ...value, goal: g.key })}
              aria-label={g.label}
              className="accent-mt-rose"
            />
            <span className="text-sm text-mt-charcoal">{g.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-mt-charcoal mb-2">
          Qual sua maior preocupação hoje?
        </legend>
        {CONCERNS.map((c) => (
          <label key={c.key} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-mt-linen cursor-pointer hover:border-mt-rose transition-colors">
            <input
              type="radio"
              name="concern"
              value={c.key}
              checked={value.concern === c.key}
              onChange={() => onChange({ ...value, concern: c.key })}
              aria-label={c.label}
              className="accent-mt-rose"
            />
            <span className="text-sm text-mt-charcoal">{c.label}</span>
          </label>
        ))}
      </fieldset>
    </div>
  )
}
