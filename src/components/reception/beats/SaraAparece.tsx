import { motion } from 'framer-motion'
import { SaraSays } from '../SaraSays'
import { SARA_FRASES } from '../../../data/reception/sara-frases'

interface SaraApareceProps {
  motherName: string
  onContinue: () => void
}

export function SaraAparece({ motherName, onContinue }: SaraApareceProps) {
  const nome = motherName?.trim() || 'mãe'

  return (
    <div className="min-h-screen flex flex-col items-center justify-between px-6 py-12 bg-sara-cream">
      <div className="flex-1 flex items-center w-full">
        <SaraSays message={SARA_FRASES.saraAparece(nome)} tts responseType="none" />
      </div>

      <motion.button
        type="button"
        onClick={onContinue}
        aria-label="Vamos lá"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        className="w-full max-w-xs py-4 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform"
      >
        Vamos lá
      </motion.button>
    </div>
  )
}
