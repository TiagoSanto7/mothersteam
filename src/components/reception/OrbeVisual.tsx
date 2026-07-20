import { motion } from 'framer-motion'
import type { NarrationState } from './hooks/useSaraNarration'

interface OrbeVisualProps {
  amplitude: number
  state: NarrationState | 'speaking'
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: 'w-24 h-24 text-xl',
  md: 'w-40 h-40 text-3xl',
  lg: 'w-56 h-56 text-4xl',
} as const

export function OrbeVisual({ amplitude, state, size = 'md' }: OrbeVisualProps) {
  const safeAmp = Number.isFinite(amplitude) ? Math.max(0, Math.min(1, amplitude)) : 0
  const isActive = state === 'listening' || state === 'speaking'

  return (
    <motion.div
      aria-label="Sara"
      animate={
        isActive
          ? { scale: 1 + safeAmp * 0.3 }
          : { scale: [1, 1.06, 1] }
      }
      transition={
        isActive
          ? { duration: 0.05 }
          : { repeat: Infinity, duration: 3, ease: 'easeInOut' }
      }
      className={`${SIZES[size]} rounded-full flex items-center justify-center shadow-xl`}
      style={{
        background: 'linear-gradient(135deg, #D4A84B, #C0604A)',
        boxShadow: `0 0 ${24 + safeAmp * 40}px rgba(212, 168, 75, 0.4)`,
      }}
    >
      <span className="text-white select-none">✦</span>
    </motion.div>
  )
}
