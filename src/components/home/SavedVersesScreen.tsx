import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { findMomentoByRef } from '../../data/momentoDeus'

interface Props { open: boolean; onClose: () => void }

export function SavedVersesScreen({ open, onClose }: Props) {
  const savedVerses = useAppStore((s) => s.savedVerses)
  const unsaveVerse = useAppStore((s) => s.unsaveVerse)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed inset-0 z-[60] bg-sara-cream flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Versículos salvos"
        >
          <div className="flex items-center justify-between px-5 pt-14 pb-4 flex-shrink-0">
            <p className="text-[11px] font-bold text-graphite-muted uppercase tracking-wide">
              Versículos salvos
            </p>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-sara-linen text-graphite text-lg"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-10">
            {savedVerses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
                <span className="text-4xl">📖</span>
                <p className="text-[13px] text-graphite-muted text-center">
                  Você ainda não salvou nenhum versículo.
                </p>
                <p className="text-[11px] text-graphite-muted/60 text-center">
                  Abra o Momento com Deus e toque em ❤️ Salvar.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 pt-2">
                {savedVerses.map((ref) => {
                  const entry = findMomentoByRef(ref)
                  if (!entry) return null
                  return (
                    <div
                      key={ref}
                      className="bg-white rounded-2xl p-4 shadow-sm"
                    >
                      <p className="text-[13px] font-serif text-graphite leading-relaxed mb-2">
                        "{entry.verso}"
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-sara-gold">
                          {entry.referencia}
                        </p>
                        <button
                          onClick={() => unsaveVerse(ref)}
                          aria-label="Remover versículo dos salvos"
                          className="text-[10px] text-graphite-muted/60 font-medium"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
