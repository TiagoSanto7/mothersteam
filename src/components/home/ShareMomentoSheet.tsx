import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  open: boolean
  onClose: () => void
  verso: string
  referencia: string
  oracao: string
  onShareToFeed: (content: string) => void
  onShareToCommunity: (content: string) => void
}

export function ShareMomentoSheet({ open, onClose, verso, referencia, oracao, onShareToFeed, onShareToCommunity }: Props) {
  const [incluirOracao, setIncluirOracao] = useState(true)

  function buildText() {
    const base = `"${verso}" — ${referencia}`
    return incluirOracao ? `${base}\n\n${oracao}` : base
  }

  function handleAmigos() {
    const text = buildText()
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text).catch(() => {})
    }
    onClose()
  }

  function handleFeed() {
    onShareToFeed(buildText())
    onClose()
  }

  function handleComunidade() {
    onShareToCommunity(buildText())
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl px-5 pt-5 pb-12 max-w-[390px] mx-auto"
          >
            <div className="w-9 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="text-[11px] font-bold text-graphite-muted uppercase tracking-wide mb-4">
              Compartilhar versículo
            </p>

            {/* Toggle com/sem oração */}
            <div className="flex bg-sara-linen rounded-xl p-1 mb-5 gap-1">
              <button
                onClick={() => setIncluirOracao(true)}
                aria-label="Com oração"
                aria-pressed={incluirOracao}
                className={`flex-1 rounded-lg py-2 text-[12px] font-semibold transition-colors ${
                  incluirOracao ? 'bg-sara-gold text-white' : 'text-graphite-muted'
                }`}
              >
                Com oração
              </button>
              <button
                onClick={() => setIncluirOracao(false)}
                aria-label="Só o versículo"
                aria-pressed={!incluirOracao}
                className={`flex-1 rounded-lg py-2 text-[12px] font-semibold transition-colors ${
                  !incluirOracao ? 'bg-sara-gold text-white' : 'text-graphite-muted'
                }`}
              >
                Só o versículo
              </button>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleAmigos}
                aria-label="Compartilhar com amigos"
                className="flex items-center gap-3 p-3.5 bg-sara-linen rounded-xl active:scale-[0.98] transition-transform"
              >
                <span className="text-xl">📱</span>
                <div className="text-left">
                  <p className="text-[13px] font-semibold text-graphite">Compartilhar com amigos</p>
                  <p className="text-[11px] text-graphite-muted">WhatsApp, Instagram, e-mail…</p>
                </div>
              </button>

              <button
                onClick={handleFeed}
                aria-label="Publicar no feed"
                className="flex items-center gap-3 p-3.5 bg-sara-linen rounded-xl active:scale-[0.98] transition-transform"
              >
                <span className="text-xl">✏️</span>
                <div className="text-left">
                  <p className="text-[13px] font-semibold text-graphite">Publicar no feed</p>
                  <p className="text-[11px] text-graphite-muted">Cria um post com o versículo</p>
                </div>
              </button>

              <button
                onClick={handleComunidade}
                aria-label="Compartilhar em comunidade"
                className="flex items-center gap-3 p-3.5 bg-sara-linen rounded-xl active:scale-[0.98] transition-transform"
              >
                <span className="text-xl">👥</span>
                <div className="text-left">
                  <p className="text-[13px] font-semibold text-graphite">Compartilhar em comunidade</p>
                  <p className="text-[11px] text-graphite-muted">Escolhe a comunidade no post</p>
                </div>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
