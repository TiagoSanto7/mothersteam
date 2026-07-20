import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { OrbeVisual } from '../OrbeVisual'
import { SARA_FRASES } from '../../../data/reception/sara-frases'
import { versiculoParaHumor } from '../../../data/reception/versiculos-presente'
import type { MoodAnswer } from '../../../types/reception'

interface PresenteProps {
  mood: MoodAnswer | undefined
  onEnter: () => void
}

export function Presente({ mood, onEnter }: PresenteProps) {
  const versiculo = versiculoParaHumor(mood)
  const [showVersiculo, setShowVersiculo] = useState(false)
  const [showBotao, setShowBotao] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setShowVersiculo(true), 2200)
    const t2 = setTimeout(() => setShowBotao(true), 5200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-sara-cream">
      <div className="flex flex-col items-center pt-16 gap-6 px-6">
        <OrbeVisual amplitude={0} state="idle" size="sm" />

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-[15px] leading-relaxed text-graphite text-center font-serif max-w-sm"
        >
          {SARA_FRASES.presenteIntro()}
        </motion.p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-10">
        <AnimatePresence>
          {showVersiculo && (
            <motion.div
              key="versiculo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="flex flex-col items-center gap-4 max-w-sm text-center"
            >
              <blockquote className="text-[22px] leading-snug font-serif text-graphite italic">
                “{versiculo.verso}”
              </blockquote>
              <p className="text-[12px] text-graphite-muted font-medium tracking-wide">
                {versiculo.referencia}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-6 pb-12">
        <AnimatePresence>
          {showBotao && (
            <motion.button
              key="entrar"
              type="button"
              onClick={onEnter}
              aria-label="Entrar"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="w-full py-4 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform"
            >
              Entrar
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
