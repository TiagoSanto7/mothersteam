import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../../store/useAppStore'
import { versiculoParaHumor } from '../../../data/reception/versiculos-presente'

interface PresenteProps {
  mood: 'A' | 'B' | 'C' | 'D' | null
  onEnter: () => void
}

// Sara já avisou por voz, na conversa anterior, que ia deixar essa palavrinha —
// aqui é só o texto, sem narração nova.
const VERSICULO_DELAY_MS = 400
const BOTAO_DELAY_MS = 3400

export function Presente({ mood, onEnter }: PresenteProps) {
  const versiculo = versiculoParaHumor(mood)
  const [showVerso, setShowVerso] = useState(false)
  const [showBotao, setShowBotao] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowVerso(true), VERSICULO_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  // Botão aparece depois de um silêncio contemplativo pra ler o versículo
  useEffect(() => {
    const t = setTimeout(() => setShowBotao(true), BOTAO_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-mt-cream px-6 py-12">
      <div className="flex-1 flex flex-col items-center justify-center gap-10">
        <AnimatePresence>
          {showVerso && (
            <motion.div
              key="versiculo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
              className="flex flex-col items-center gap-4 max-w-sm text-center"
            >
              <blockquote className="text-[22px] leading-snug font-serif text-mt-charcoal italic">
                “{versiculo.verso}”
              </blockquote>
              <p className="text-[12px] text-mt-muted font-medium tracking-wide">
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
              className="w-full py-4 rounded-2xl bg-mt-rose text-white text-sm font-semibold active:scale-95 transition-transform"
            >
              Entrar
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
