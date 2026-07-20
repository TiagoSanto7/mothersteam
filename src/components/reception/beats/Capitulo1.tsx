import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { OrbeVisual } from '../OrbeVisual'
import { ProgressBar } from '../ProgressBar'
import { SARA_FRASES } from '../../../data/reception/sara-frases'
import {
  useSaraNarration,
  receptionDataFromCapitulo1,
} from '../hooks/useSaraNarration'
import type { ReceptionData } from '../../../types/reception'

interface Capitulo1Props {
  onComplete: (data: Partial<ReceptionData>) => void
}

export function Capitulo1({ onComplete }: Capitulo1Props) {
  const {
    state,
    amplitude,
    transcript,
    collectedFatos,
    error,
    startCapitulo1,
    sendTextResponse,
    stop,
  } = useSaraNarration()

  const [textInput, setTextInput] = useState('')

  useEffect(() => {
    void startCapitulo1()
    return () => {
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (collectedFatos) {
      onComplete(receptionDataFromCapitulo1(collectedFatos))
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
        <ProgressBar percent={25} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <OrbeVisual amplitude={amplitude} state={state} size="md" />

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-[17px] leading-relaxed text-graphite text-center font-serif max-w-sm"
        >
          {SARA_FRASES.capitulo1_pergunta1()}
        </motion.p>

        {transcript && state !== 'connecting' && (
          <p className="text-[13px] text-graphite-muted italic text-center max-w-sm">
            {transcript}
          </p>
        )}

        {state === 'connecting' && (
          <p className="text-[13px] text-graphite-muted">Conectando…</p>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-[13px] text-sara-terracotta text-center">
              {error || 'Algo não deu certo na conexão.'}
            </p>
            <button
              type="button"
              onClick={() => void startCapitulo1()}
              className="px-4 py-2 rounded-2xl bg-sara-gold text-white text-xs font-semibold"
            >
              Tentar de novo
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
            disabled={!textInput.trim() || state !== 'listening'}
            aria-label="Enviar"
            className="px-4 py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold disabled:opacity-40"
          >
            →
          </button>
        </form>
        <p className="text-[11px] text-graphite-muted text-center">
          Ou toque no orbe e fale com a Sara.
        </p>
      </div>
    </div>
  )
}
