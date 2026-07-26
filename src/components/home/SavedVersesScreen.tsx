import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, selectSavedVerses, selectPrayersByVerse } from '../../store/useAppStore'
import { findMomentoByRef } from '../../data/momentoDeus'

interface Props {
  open: boolean
  onClose: () => void
  /** When provided, renders in read-only mode showing another user's public verses */
  readOnlyVerses?: string[]
  readOnlyUserName?: string
}

/**
 * Shares a verse via Web Share API when available, otherwise copies to clipboard.
 * Returns 'shared' | 'copied' | 'error'.
 */
export async function shareVerse(verso: string, referencia: string): Promise<'shared' | 'copied' | 'error'> {
  const text = `"${verso}" — ${referencia}`
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch {
      // user cancelled or share failed — fall through to clipboard
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'error'
  }
}

export function SavedVersesScreen({ open, onClose, readOnlyVerses, readOnlyUserName }: Props) {
  const ownVerses = useAppStore(selectSavedVerses)
  const unsaveVerse = useAppStore((s) => s.unsaveVerse)
  const prayersByVerse = useAppStore(selectPrayersByVerse)
  const savePrayer = useAppStore((s) => s.savePrayer)

  const isReadOnly = readOnlyVerses !== undefined
  const savedVerses = isReadOnly ? readOnlyVerses : ownVerses

  // ref → whether the prayer textarea is open
  const [prayerOpen, setPrayerOpen] = useState<Record<string, boolean>>({})
  // ref → current textarea draft (before save)
  const [prayerDraft, setPrayerDraft] = useState<Record<string, string>>({})

  function togglePrayer(ref: string) {
    setPrayerOpen((prev) => {
      const opening = !prev[ref]
      if (opening) {
        // pre-fill draft with saved value
        setPrayerDraft((d) => ({ ...d, [ref]: prayersByVerse[ref] ?? '' }))
      }
      return { ...prev, [ref]: opening }
    })
  }

  function handlePrayerChange(ref: string, value: string) {
    setPrayerDraft((d) => ({ ...d, [ref]: value }))
  }

  function handlePrayerSave(ref: string) {
    savePrayer(ref, prayerDraft[ref] ?? '')
    setPrayerOpen((prev) => ({ ...prev, [ref]: false }))
  }

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
              {isReadOnly ? `Versículos de ${readOnlyUserName ?? 'outra mãe'}` : 'Versículos salvos'}
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
                  const isPrayerOpen = prayerOpen[ref] ?? false
                  const savedPrayer = isReadOnly ? '' : (prayersByVerse[ref] ?? '')
                  const draft = prayerDraft[ref] ?? ''

                  return (
                    <div
                      key={ref}
                      className="bg-white rounded-2xl p-4 shadow-sm"
                    >
                      <p className="text-[13px] font-serif text-graphite leading-relaxed mb-2">
                        "{entry.verso}"
                      </p>
                      <p className="text-[11px] font-semibold text-sara-gold mb-3">
                        {entry.referencia}
                      </p>

                      {/* Saved prayer preview */}
                      {savedPrayer && !isPrayerOpen && (
                        <p className="text-[12px] text-graphite-muted italic leading-relaxed mb-3 border-l-2 border-sara-gold/30 pl-3">
                          {savedPrayer}
                        </p>
                      )}

                      {/* Prayer textarea — hidden in read-only mode */}
                      {!isReadOnly && isPrayerOpen && (
                        <div className="mb-3">
                          <textarea
                            aria-label="Escreva sua oração"
                            value={draft}
                            onChange={(e) => handlePrayerChange(ref, e.target.value)}
                            placeholder="Escreva sua oração aqui..."
                            rows={4}
                            className="w-full rounded-xl border border-sara-gold/30 bg-sara-linen p-3 text-[13px] text-graphite placeholder-graphite-muted/50 resize-none focus:outline-none focus:border-sara-gold"
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handlePrayerSave(ref)}
                              aria-label="Salvar oração"
                              className="flex-1 py-2 rounded-xl bg-sara-gold text-white text-[12px] font-semibold"
                            >
                              Salvar oração
                            </button>
                            <button
                              onClick={() => setPrayerOpen((prev) => ({ ...prev, [ref]: false }))}
                              aria-label="Cancelar oração"
                              className="py-2 px-4 rounded-xl bg-sara-linen text-graphite-muted text-[12px] font-medium"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action row */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          {!isReadOnly && (
                            <button
                              onClick={() => togglePrayer(ref)}
                              aria-label={isPrayerOpen ? 'Fechar oração' : savedPrayer ? 'Editar oração' : 'Escrever oração'}
                              className="text-[11px] text-graphite-muted/70 font-medium flex items-center gap-1"
                            >
                              🙏 {isPrayerOpen ? 'Fechar' : savedPrayer ? 'Editar oração' : 'Oração'}
                            </button>
                          )}
                          <button
                            onClick={() => shareVerse(entry.verso, entry.referencia)}
                            aria-label="Compartilhar versículo"
                            className="text-[11px] text-graphite-muted/70 font-medium flex items-center gap-1"
                          >
                            📤 Compartilhar
                          </button>
                        </div>
                        {!isReadOnly && (
                          <button
                            onClick={() => unsaveVerse(ref)}
                            aria-label="Remover versículo dos salvos"
                            className="text-[10px] text-graphite-muted/60 font-medium"
                          >
                            Remover
                          </button>
                        )}
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
