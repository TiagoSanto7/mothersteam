import { motion } from 'framer-motion'

interface BemVindaProps {
  onContinue: () => void
}

export function BemVinda({ onContinue }: BemVindaProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen flex flex-col items-center justify-center px-8 gap-10 bg-sara-cream"
    >
      <div className="text-center max-w-sm">
        <h1 className="text-[26px] leading-snug font-serif font-semibold text-graphite">
          Uma companhia para cada fase da maternidade.
        </h1>
      </div>
      <button
        type="button"
        onClick={onContinue}
        aria-label="Começar"
        className="w-full max-w-xs py-4 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform"
      >
        Começar
      </button>
    </motion.div>
  )
}
