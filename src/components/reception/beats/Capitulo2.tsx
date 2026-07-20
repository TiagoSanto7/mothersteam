import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { OrbeVisual } from '../OrbeVisual'
import { ProgressBar } from '../ProgressBar'
import { SARA_FRASES } from '../../../data/reception/sara-frases'
import { OPCOES_MOOD, OPCOES_SUPPORT } from '../../../data/reception/capitulos-opcoes'
import type {
  MoodAnswer,
  SupportAnswer,
  ReceptionData,
} from '../../../types/reception'

interface Capitulo2Props {
  onComplete: (data: Partial<ReceptionData>) => void
}

export function Capitulo2({ onComplete }: Capitulo2Props) {
  const [perguntaAtual, setPerguntaAtual] = useState<1 | 2>(1)
  const [mood, setMood] = useState<MoodAnswer | null>(null)

  function handleMood(value: MoodAnswer) {
    setMood(value)
    setPerguntaAtual(2)
  }

  function handleSupport(value: SupportAnswer) {
    if (mood) {
      onComplete({ mood, supportNetwork: value })
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-sara-cream">
      <div className="px-6 pt-8">
        <ProgressBar percent={50} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-start gap-6 px-6 pt-8">
        <OrbeVisual amplitude={0} state="idle" size="sm" />

        <AnimatePresence mode="wait">
          <motion.p
            key={`p-${perguntaAtual}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-[17px] leading-relaxed text-graphite text-center font-serif max-w-sm"
          >
            {perguntaAtual === 1
              ? SARA_FRASES.capitulo2_pergunta1()
              : SARA_FRASES.capitulo2_pergunta2()}
          </motion.p>
        </AnimatePresence>

        <div className="w-full max-w-sm flex flex-col gap-2 mt-2">
          {perguntaAtual === 1
            ? OPCOES_MOOD.map((opt, i) => (
                <motion.button
                  key={opt.value}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  onClick={() => handleMood(opt.value)}
                  aria-pressed={mood === opt.value}
                  className="w-full text-left px-4 py-3 rounded-2xl border border-sara-linen bg-white/70 text-sm text-graphite active:scale-98 transition-transform"
                >
                  {opt.label}
                </motion.button>
              ))
            : OPCOES_SUPPORT.map((opt, i) => (
                <motion.button
                  key={opt.value}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  onClick={() => handleSupport(opt.value)}
                  className="w-full text-left px-4 py-3 rounded-2xl border border-sara-linen bg-white/70 text-sm text-graphite active:scale-98 transition-transform"
                >
                  {opt.label}
                </motion.button>
              ))}
        </div>
      </div>
    </div>
  )
}
