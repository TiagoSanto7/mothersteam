import { useCallback } from 'react'
import { Trash2, Plus } from 'lucide-react'
import type { OtherChild } from '../../../types'

interface Props {
  value: OtherChild[]
  onChange: (v: OtherChild[]) => void
}

const today = new Date().toISOString().split('T')[0]

export function StepOutrosFilhos({ value, onChange }: Props) {
  const add = useCallback(() => {
    onChange([...value, { name: '', birthDate: '' }])
  }, [value, onChange])

  const remove = useCallback((idx: number) => {
    onChange(value.filter((_, i) => i !== idx))
  }, [value, onChange])

  const update = useCallback((idx: number, patch: Partial<OtherChild>) => {
    onChange(value.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  }, [value, onChange])

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-mt-muted">
        Se quiser, adicione outros filhos que você já tem. Isso é opcional — pode pular.
      </p>

      {value.map((child, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            type="text"
            value={child.name}
            onChange={(e) => update(i, { name: e.target.value })}
            placeholder="Nome"
            className="flex-1 px-4 py-3 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal placeholder:text-mt-muted focus:outline-none focus:border-mt-rose"
          />
          <input
            type="date"
            max={today}
            value={child.birthDate}
            onChange={(e) => update(i, { birthDate: e.target.value })}
            aria-label={`Data de nascimento de ${child.name || 'filho ' + (i + 1)}`}
            className="px-3 py-3 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal focus:outline-none focus:border-mt-rose"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label={`remover ${child.name || 'filho ' + (i + 1)}`}
            className="p-2 text-mt-rose-dark hover:bg-mt-linen rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-mt-linen text-mt-muted text-sm font-medium flex items-center justify-center gap-1 hover:border-mt-rose hover:text-mt-rose transition-colors"
      >
        <Plus size={14} /> Adicionar filho
      </button>
    </div>
  )
}
