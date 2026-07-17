import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { getBabyDevContent } from '../../data/babyDev'

interface Props { open: boolean; onClose: () => void }

export function BabyDevScreen({ open, onClose }: Props) {
  const phase = useAppStore((s) => s.phase)
  const content = getBabyDevContent(phase)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed inset-0 z-50 bg-sara-cream flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Desenvolvimento do bebê"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-14 pb-4">
            <p className="text-[11px] font-bold text-graphite-muted uppercase tracking-wide">
              Desenvolvimento
            </p>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-sara-linen text-graphite text-lg"
            >
              ×
            </button>
          </div>

          {/* Illustration area */}
          <div className="mx-5 rounded-2xl bg-gradient-to-br from-sara-gold/20 to-sara-linen flex flex-col items-center justify-center py-10 gap-2">
            <span className="text-6xl">{content.emoji}</span>
            <p className="text-[11px] text-graphite-muted font-medium mt-1">{content.size}</p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 pt-5 pb-10">
            <h2 className="text-[17px] font-bold font-serif text-graphite leading-snug mb-4">
              {content.title}
            </h2>

            <div className="flex flex-col gap-3">
              {content.curiosities.map((c, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-sara-gold text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-[13px] text-graphite leading-relaxed">{c}</p>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-graphite-muted/60 mt-5 text-center">
              Fonte: {content.source}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
