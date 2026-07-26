import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SaraSays } from '../SaraSays'
import { useAppStore } from '../../../store/useAppStore'
import { SARA_FRASES } from '../../../data/reception/sara-frases'
import { versiculoParaHumor } from '../../../data/reception/versiculos-presente'
import type { MoodAnswer } from '../../../types/reception'

interface PresenteProps {
  mood: MoodAnswer | undefined
  onEnter: () => void
}

const VERSICULO_DELAY_MS = 2000
const BOTAO_DELAY_MS = 3000
const FALLBACK_SPEECH_MS = 15000

export function Presente({ mood, onEnter }: PresenteProps) {
  const versiculo = versiculoParaHumor(mood)
  const [showVerso, setShowVerso] = useState(false)
  const [speechEnded, setSpeechEnded] = useState(false)
  const [showBotao, setShowBotao] = useState(false)

  // Versículo aparece DURANTE a fala — Sara continua narrando
  useEffect(() => {
    const t = setTimeout(() => setShowVerso(true), VERSICULO_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  // Botão aparece 3s DEPOIS de ela terminar (silêncio contemplativo)
  useEffect(() => {
    if (!speechEnded) return
    const t = setTimeout(() => setShowBotao(true), BOTAO_DELAY_MS)
    return () => clearTimeout(t)
  }, [speechEnded])

  // Fallback: se onSpeechEnd nunca disparar (falha TTS), força
  useEffect(() => {
    const t = setTimeout(() => setSpeechEnded(true), FALLBACK_SPEECH_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-sara-cream px-6 py-12">
      <div className="flex-1 flex flex-col items-center justify-center gap-10">
        <SaraSays
          message={SARA_FRASES.presenteIntro()}
          tts
          responseType="none"
          onSpeechEnd={() => setSpeechEnded(true)}
        />

        <AnimatePresence>
          {showVerso && (
            <motion.div
              key="versiculo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
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

      <div className="min-h-[64px]">
        <AnimatePresence>
          {showBotao && (
            <motion.button
              key="entrar"
              type="button"
              onClick={() => {
                useAppStore.getState().completeReception()
                onEnter()
              }}
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
