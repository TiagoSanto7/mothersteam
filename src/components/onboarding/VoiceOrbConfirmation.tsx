import { useState } from 'react'
import type { VoiceCollectedProfile } from '../../hooks/useVoiceOrb'

interface Props {
  data: VoiceCollectedProfile
  onConfirm: (data: VoiceCollectedProfile) => void
  onBack: () => void
}

export function VoiceOrbConfirmation({ data, onConfirm, onBack }: Props) {
  const [form, setForm] = useState<VoiceCollectedProfile>(data)

  return (
    <div className="flex flex-col gap-5 px-6 py-8 bg-sara-cream min-h-screen">
      <p className="text-[16px] font-semibold font-serif text-graphite">Sara entendeu:</p>

      <div className="flex flex-col gap-4">
        <Field label="Seu nome">
          <input
            value={form.motherName}
            onChange={(e) => setForm((f) => ({ ...f, motherName: e.target.value }))}
            className="w-full border-b border-sara-linen/60 text-sm text-graphite py-1 bg-transparent outline-none"
          />
        </Field>

        <Field label="Nome do bebê">
          <input
            value={form.primaryChild.name ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                primaryChild: { ...f.primaryChild, name: e.target.value || null },
              }))
            }
            placeholder="ainda não definido"
            className="w-full border-b border-sara-linen/60 text-sm text-graphite py-1 bg-transparent outline-none placeholder:text-graphite-muted"
          />
        </Field>

        <Field label="Fase">
          <p className="text-sm text-graphite py-1">
            {form.primaryChild.phase === 'pregnant'
              ? `Grávida — semana ${form.primaryChild.week ?? '?'}`
              : `Bebê com ${form.primaryChild.ageInDays ?? '?'} dias`}
          </p>
        </Field>

        {form.otherChildren.length > 0 && (
          <Field label="Outros filhos">
            <div className="flex flex-col gap-2 mt-1">
              {form.otherChildren.map((child, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm text-graphite flex-1">
                    {child.name}, {child.ageDescription}
                  </span>
                  <button
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        otherChildren: f.otherChildren.filter((_, idx) => idx !== i),
                      }))
                    }
                    aria-label={`Remover ${child.name}`}
                    className="text-graphite-muted text-xs px-2 py-0.5 rounded-full hover:bg-black/5"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </Field>
        )}
      </div>

      <div className="flex gap-3 mt-auto pt-4">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="flex-1 py-3 rounded-2xl border-2 border-sara-gold text-sara-gold text-sm font-semibold"
        >
          Voltar
        </button>
        <button
          onClick={() => onConfirm(form)}
          aria-label="Confirmar"
          className="flex-1 py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold"
        >
          Confirmar →
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-graphite-muted font-medium mb-0.5">{label}</p>
      {children}
    </div>
  )
}
