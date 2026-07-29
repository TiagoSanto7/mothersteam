import { motion, AnimatePresence } from 'framer-motion'

interface SaraPullIndicatorProps {
  pullY: number
  isLoading: boolean
}

const PETAL_THRESHOLDS = [0, 12, 23, 35, 47, 58]
const MAX_PULL = 70

export function SaraPullIndicator({ pullY, isLoading }: SaraPullIndicatorProps) {
  function petalScale(threshold: number) {
    const petalProgress = Math.min(pullY / MAX_PULL, 1)
    const petalThresholdNorm = threshold / MAX_PULL
    if (pullY < threshold) return 0
    return Math.min((petalProgress - petalThresholdNorm) / (1 - petalThresholdNorm + 0.001), 1)
  }

  return (
    <div className="flex flex-col items-center gap-2 py-3">
      {/* SVG Flor */}
      <motion.div
        animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
        transition={isLoading ? { repeat: Infinity, duration: 3, ease: 'linear' } : { duration: 0 }}
      >
        <svg width="48" height="48" viewBox="0 0 48 48">
          {/* 6 pétalas */}
          {PETAL_THRESHOLDS.map((threshold, i) => (
            <motion.ellipse
              key={i}
              cx="24"
              cy="10"
              rx="4"
              ry="7"
              fill="#E8A090"
              opacity="0.85"
              transform={`rotate(${i * 60} 24 24)`}
              initial={{ scale: 0 }}
              animate={{ scale: isLoading ? 1 : petalScale(threshold) }}
              style={{ transformOrigin: '24px 24px' }}
              transition={isLoading ? { type: 'spring', stiffness: 300, damping: 20 } : { duration: 0 }}
            />
          ))}
          {/* Miolo */}
          <motion.circle
            cx="24"
            cy="24"
            r="7"
            fill="#C9A96E"
            animate={{ scale: isLoading ? [1, 1.1, 1] : pullY / MAX_PULL > 0.1 ? 1 : 0 }}
            transition={isLoading ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' } : { duration: 0.2 }}
          />
        </svg>
      </motion.div>

      {/* Frase da Sara */}
      <AnimatePresence>
        {(pullY > 40 || isLoading) && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.25 }}
            className="text-[11px] text-sara-gold font-medium italic text-center px-4"
          >
            "Deixa eu ver se apareceu alguma novidade..."
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
