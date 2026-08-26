import type { Q2Answer, Q3Answer } from '../../../types'

export interface StepHumorValue {
  mood: Q2Answer | null
  supportNetwork: Q3Answer | null
}

interface Props {
  value: StepHumorValue
  onChange: (v: StepHumorValue) => void
}

const MOODS: Array<{ key: Q2Answer; label: string }> = [
  { key: 'A', label: 'Confiante e animada' },
  { key: 'B', label: 'Cansada mas lidando' },
  { key: 'C', label: 'Ansiosa, com medos' },
  { key: 'D', label: 'Sobrecarregada, exausta' },
]

const SUPPORT: Array<{ key: Q3Answer; label: string }> = [
  { key: 'A', label: 'Sempre tenho ajuda quando preciso' },
  { key: 'B', label: 'Ajuda em momentos específicos' },
  { key: 'C', label: 'Cuido de quase tudo sozinha' },
]

export function StepHumor({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-mt-charcoal mb-2">
          Como você tem se sentido nos últimos dias?
        </legend>
        {MOODS.map((m) => (
          <label key={m.key} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-mt-linen cursor-pointer hover:border-mt-rose transition-colors">
            <input
              type="radio"
              name="mood"
              value={m.key}
              checked={value.mood === m.key}
              onChange={() => onChange({ ...value, mood: m.key })}
              aria-label={m.label}
              className="accent-mt-rose"
            />
            <span className="text-sm text-mt-charcoal">{m.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-mt-charcoal mb-2">
          Como está sua rede de apoio?
        </legend>
        {SUPPORT.map((s) => (
          <label key={s.key} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-mt-linen cursor-pointer hover:border-mt-rose transition-colors">
            <input
              type="radio"
              name="support"
              value={s.key}
              checked={value.supportNetwork === s.key}
              onChange={() => onChange({ ...value, supportNetwork: s.key })}
              aria-label={s.label}
              className="accent-mt-rose"
            />
            <span className="text-sm text-mt-charcoal">{s.label}</span>
          </label>
        ))}
      </fieldset>
    </div>
  )
}
