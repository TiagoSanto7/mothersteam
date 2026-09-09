import { forwardRef, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageSquare, PlusSquare, CalendarPlus, Baby, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface MtQuickActionSheetProps {
  open: boolean
  onClose: () => void
  onMaeIA: () => void
  onNewPost: () => void
  onAddRoutine: () => void
  onRegisterBaby: () => void
}

interface ActionSpec {
  key: string
  label: string
  description: string
  Icon: LucideIcon
  onClick: () => void
}

export function MtQuickActionSheet({
  open,
  onClose,
  onMaeIA,
  onNewPost,
  onAddRoutine,
  onRegisterBaby,
}: MtQuickActionSheetProps) {
  const firstButtonRef = useRef<HTMLButtonElement>(null)

  // Escape to dismiss + focus the first action on open (keyboard support).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // Small delay so the entry animation completes before focus jumps.
    const t = window.setTimeout(() => firstButtonRef.current?.focus(), 150)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(t)
    }
  }, [open, onClose])

  const wrap = (fn: () => void) => () => {
    fn()
    onClose()
  }

  const actions: ActionSpec[] = [
    {
      key: 'maeIA',
      label: 'Falar com a Sara',
      description: 'Tire uma dúvida agora',
      Icon: MessageSquare,
      onClick: wrap(onMaeIA),
    },
    {
      key: 'post',
      label: 'Novo post',
      description: 'Compartilhe com a comunidade',
      Icon: PlusSquare,
      onClick: wrap(onNewPost),
    },
    {
      key: 'routine',
      label: 'Adicionar rotina',
      description: 'Tarefa, consulta ou medicação',
      Icon: CalendarPlus,
      onClick: wrap(onAddRoutine),
    },
    {
      key: 'baby',
      label: 'Registrar bebê',
      description: 'Amamentação, sono ou fralda',
      Icon: Baby,
      onClick: wrap(onRegisterBaby),
    },
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="mt-sheet-backdrop"
            data-testid="mt-sheet-backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          <motion.div
            key="mt-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Ações rápidas"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.9 }}
            className="fixed left-0 right-0 bottom-0 z-50 bg-white rounded-t-mt-lg shadow-mt-lg"
            style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 16px)` }}
          >
            <div className="mx-auto w-12 h-1.5 bg-mt-linen rounded-full mt-3 mb-1" />
            <div className="px-5 pt-3 pb-2">
              <p className="text-[11px] font-semibold text-mt-muted uppercase tracking-wider">
                Ações rápidas
              </p>
            </div>
            <div className="px-3 pb-2 flex flex-col">
              {actions.map((a, i) => {
                const { key, ...rest } = a
                return (
                  <ActionRow
                    key={key}
                    ref={i === 0 ? firstButtonRef : undefined}
                    {...rest}
                  />
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

const ActionRow = forwardRef<HTMLButtonElement, ActionSpec>(function ActionRow(
  { label, description, Icon, onClick },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-mt hover:bg-mt-pink-soft/60 active:bg-mt-pink-soft transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-mt-rose"
    >
      <span className="flex-shrink-0 w-11 h-11 rounded-full bg-mt-pink-soft flex items-center justify-center text-mt-rose-dark">
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-semibold text-mt-charcoal leading-tight">
          {label}
        </span>
        <span className="block text-[12px] text-mt-muted leading-tight mt-0.5 truncate">
          {description}
        </span>
      </span>
      <ChevronRight size={18} className="text-mt-muted flex-shrink-0" strokeWidth={1.8} />
    </button>
  )
})
