import { motion } from 'framer-motion'
import type { VoiceOrbState } from '../../hooks/useVoiceOrb'

interface VoiceOrbProps {
  amplitude: number
  state: Exclude<VoiceOrbState, 'done' | 'error' | 'idle'>
}

export function VoiceOrb({ amplitude, state }: VoiceOrbProps) {
  const isListening = state === 'listening'

  return (
    <motion.div
      aria-label="Sara voice orb"
      animate={
        isListening
          ? { scale: 1 + amplitude * 0.3 }
          : { scale: [1, 1.06, 1] }
      }
      transition={
        isListening
          ? { duration: 0.05 }
          : { repeat: Infinity, duration: 3, ease: 'easeInOut' }
      }
      className="w-40 h-40 rounded-full flex items-center justify-center shadow-xl"
      style={{
        background: 'linear-gradient(135deg, #D4A84B, #C0604A)',
        boxShadow: `0 0 ${24 + amplitude * 40}px rgba(212, 168, 75, 0.4)`,
      }}
    >
      <span className="text-white text-3xl select-none">✦</span>
    </motion.div>
  )
}
