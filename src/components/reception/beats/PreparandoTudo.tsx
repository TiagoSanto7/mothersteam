import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { OrbeVisual } from '../OrbeVisual'
import { useAppStore } from '../../../store/useAppStore'
import type { ReceptionData } from '../../../types/reception'

interface PreparandoTudoProps {
  data: ReceptionData
  onReady: () => void
}

export function PreparandoTudo({ data, onReady }: PreparandoTudoProps) {
  useEffect(() => {
    useAppStore.getState().applyReceptionData(data)
    const t = setTimeout(onReady, 4000)
    return () => clearTimeout(t)
  }, [data, onReady])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-sara-cream px-8">
      <OrbeVisual amplitude={0.3} state="listening" size="lg" />
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="text-[15px] text-graphite-muted text-center"
      >
        Preparando tudo pra você…
      </motion.p>
    </div>
  )
}
