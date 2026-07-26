import { useEffect, type FormEvent, useState } from 'react'
import { OrbeVisual } from '../OrbeVisual'
import { ProgressBar } from '../ProgressBar'
import {
  useSaraNarration,
  receptionDataFromCapitulo2,
  CAP2_CONFIG,
  type Capitulo2Fatos,
} from '../hooks/useSaraNarration'
import type { ReceptionData } from '../../../types/reception'

interface Capitulo2Props {
  onComplete: (data: Partial<ReceptionData>) => void
}

export function Capitulo2({ onComplete }: Capitulo2Props) {
  const {
    state,
    amplitude,
    collectedFatos,
    startConversation,
    sendTextResponse,
    stop,
  } = useSaraNarration()

  const [textInput, setTextInput] = useState('')

  useEffect(() => {
    void startConversation(CAP2_CONFIG)
    return () => {
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (collectedFatos) {
      onComplete(receptionDataFromCapitulo2(collectedFatos as Capitulo2Fatos))
    }
  }, [collectedFatos, onComplete])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = textInput.trim()
    if (!trimmed) return
    sendTextResponse(trimmed)
    setTextInput('')
  }

  return (
    <div className="min-h-screen flex flex-col bg-sara-cream">
      <div className="px-6 pt-8">
        <ProgressBar percent={50} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <OrbeVisual amplitude={amplitude} state={state} size="md" />

        {state === 'connecting' && (
          <p className="text-[13px] text-graphite-muted">Conectando…</p>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-[13px] text-sara-terracotta text-center max-w-xs">
              Não foi possível conectar com a Sara. Verifique as permissões de microfone e tente novamente.
            </p>
            <button
              type="button"
              onClick={() => void startConversation(CAP2_CONFIG)}
              className="px-4 py-2 rounded-2xl bg-sara-gold text-white text-xs font-semibold"
            >
              Tentar de novo
            </button>
            <button
              type="button"
              onClick={() => { stop(); onComplete({}) }}
              className="px-4 py-2 rounded-2xl border border-graphite-muted text-graphite-muted text-xs"
            >
              Pular esta etapa
            </button>
          </div>
        )}
      </div>

      <div className="px-6 pb-10 flex flex-col gap-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="ou digite pra Sara…"
            aria-label="Digite sua resposta"
            className="flex-1 px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-graphite-muted focus:outline-none focus:border-sara-gold"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || (state !== 'listening' && state !== 'error')}
            aria-label="Enviar"
            className="px-4 py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold disabled:opacity-40"
          >
            →
          </button>
        </form>
      </div>
    </div>
  )
}
