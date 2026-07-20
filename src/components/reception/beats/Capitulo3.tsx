import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { OrbeVisual } from '../OrbeVisual'
import { ProgressBar } from '../ProgressBar'
import { SARA_FRASES } from '../../../data/reception/sara-frases'
import { OPCOES_GOAL, OPCOES_CONCERN } from '../../../data/reception/capitulos-opcoes'
import type {
  GoalAnswer,
  ConcernAnswer,
  ReceptionData,
} from '../../../types/reception'

interface Capitulo3Props {
  onComplete: (data: Partial<ReceptionData>) => void
}

export function Capitulo3({ onComplete }: Capitulo3Props) {
  const [perguntaAtual, setPerguntaAtual] = useState<1 | 2>(1)
  const [goal, setGoal] = useState<GoalAnswer | null>(null)

  function handleGoal(value: GoalAnswer) {
    setGoal(value)
    setPerguntaAtual(2)
  }

  function handleConcern(value: ConcernAnswer) {
    if (goal) {
      onComplete({ goal, concern: value })
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-sara-cream">
      <div className="px-6 pt-8">
        <ProgressBar percent={75} />
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
              ? SARA_FRASES.capitulo3_pergunta1()
              : SARA_FRASES.capitulo3_pergunta2()}
          </motion.p>
        </AnimatePresence>

        <div className="w-full max-w-sm flex flex-col gap-2 mt-2">
          {perguntaAtual === 1
            ? OPCOES_GOAL.map((opt, i) => (
                <motion.button
                  key={opt.value}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  onClick={() => handleGoal(opt.value)}
                  className="w-full text-left px-4 py-3 rounded-2xl border border-sara-linen bg-white/70 text-sm text-graphite active:scale-98 transition-transform"
                >
                  {opt.label}
                </motion.button>
              ))
            : OPCOES_CONCERN.map((opt, i) => (
                <motion.button
                  key={opt.value}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  onClick={() => handleConcern(opt.value)}
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
