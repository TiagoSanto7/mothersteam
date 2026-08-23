import { forwardRef, useEffect, useRef } from 'react'
import { MessageSquare, PlusSquare, CalendarPlus, Baby } from 'lucide-react'

interface MtQuickActionSheetProps {
  open: boolean
  onClose: () => void
  onMaeIA: () => void
  onNewPost: () => void
  onAddRoutine: () => void
  onRegisterBaby: () => void
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

  // Escape to dismiss + focus the first action when the sheet opens so
  // keyboard users can activate an item without hunting for it.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    firstButtonRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const wrap = (fn: () => void) => () => {
    fn()
    onClose()
  }

  return (
    <>
      <div
        data-testid="mt-sheet-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ações rápidas"
        className="fixed left-0 right-0 bottom-0 z-50 bg-white rounded-t-mt-lg shadow-mt-lg p-6"
        style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 24px)` }}
      >
        <div className="mx-auto w-12 h-1 bg-mt-linen rounded-full mb-4" />
        <div className="grid grid-cols-2 gap-3">
          <ActionButton ref={firstButtonRef} onClick={wrap(onMaeIA)} Icon={MessageSquare} label="Falar com a MãeIA" />
          <ActionButton onClick={wrap(onNewPost)} Icon={PlusSquare} label="Novo post" />
          <ActionButton onClick={wrap(onAddRoutine)} Icon={CalendarPlus} label="Adicionar rotina" />
          <ActionButton onClick={wrap(onRegisterBaby)} Icon={Baby} label="Registrar amamentação/sono/fralda" />
        </div>
      </div>
    </>
  )
}

const ActionButton = forwardRef<HTMLButtonElement, {
  onClick: () => void
  Icon: typeof MessageSquare
  label: string
}>(function ActionButton({ onClick, Icon, label }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-4 rounded-mt bg-mt-pink-soft text-mt-rose-dark font-semibold text-sm"
    >
      <Icon size={24} strokeWidth={1.8} />
      <span className="text-center leading-tight">{label}</span>
    </button>
  )
})
