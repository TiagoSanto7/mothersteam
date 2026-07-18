import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { getMomentoDoDia, getMoodPeriod, MOOD_CONFIG } from '../../data/momentoDeus'
import { SavedVersesScreen } from './SavedVersesScreen'

interface Props { open: boolean; onClose: () => void }

export function MomentoDeusScreen({ open, onClose }: Props) {
  const momento = useMemo(() => getMomentoDoDia(), [])
  const mood = useMemo(() => getMoodPeriod(), [])
  const config = MOOD_CONFIG[mood]
  const [showPrayer, setShowPrayer] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)

  const savedVerses = useAppStore((s) => s.savedVerses)
  const saveVerse = useAppStore((s) => s.saveVerse)
  const unsaveVerse = useAppStore((s) => s.unsaveVerse)
  const isSaved = savedVerses.includes(momento.referencia)

  function handleShare() {
    const text = `"${momento.verso}" — ${momento.referencia}`
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text).catch(() => {})
    }
  }

  return (
  <>
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: `linear-gradient(160deg, ${config.gradientFrom}, ${config.gradientTo})` }}
          role="dialog"
          aria-modal="true"
          aria-label="Momento com Deus"
        >
          {/* Close */}
          <div className="flex justify-end px-5 pt-14 pb-2">
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white text-lg"
            >
              ×
            </button>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center px-6 pb-4">
            <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-6 text-center">
              {config.icon} {config.label}
            </p>

            <blockquote className="text-[20px] font-serif font-semibold text-white leading-relaxed text-center mb-3">
              "{momento.verso}"
            </blockquote>
            <p className="text-[12px] text-white/70 text-center font-medium mb-8">
              — {momento.referencia}
            </p>

            <div className="bg-white/10 rounded-2xl p-4 mb-4">
              <p className="text-[13px] text-white leading-relaxed">
                {momento.reflexao}
              </p>
            </div>

            <AnimatePresence>
              {showPrayer && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white/10 rounded-2xl p-4 overflow-hidden"
                >
                  <p className="text-[11px] font-bold text-white/50 uppercase tracking-wide mb-2">
                    🙏 Oração
                  </p>
                  <p className="text-[13px] text-white leading-relaxed italic">
                    {momento.oracao}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action bar */}
          <div className="px-6 pb-12 flex gap-3">
            <button
              onClick={() => setShowPrayer((p) => !p)}
              aria-label="Ver oração"
              className="flex-1 py-3 rounded-2xl bg-white/10 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              🙏 Oração
            </button>
            <button
              onClick={() => isSaved ? unsaveVerse(momento.referencia) : saveVerse(momento.referencia)}
              aria-label={isSaved ? 'Remover dos salvos' : 'Salvar versículo'}
              className={`flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                isSaved ? 'bg-white text-sara-gold' : 'bg-white/10 text-white'
              }`}
            >
              ❤️ {isSaved ? 'Salvo' : 'Salvar'}
            </button>
            <button
              onClick={handleShare}
              aria-label="Compartilhar versículo"
              className="flex-1 py-3 rounded-2xl bg-white/10 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              📤 Compartilhar
            </button>
            <button
              onClick={() => setSavedOpen(true)}
              aria-label="Ver versículos salvos"
              className="flex-1 py-3 rounded-2xl bg-white/10 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              📖 Salvos
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    <SavedVersesScreen open={open && savedOpen} onClose={() => setSavedOpen(false)} />
  </>
  )
}
