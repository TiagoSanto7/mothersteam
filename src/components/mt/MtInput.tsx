import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface MtInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const MtInput = forwardRef<HTMLInputElement, MtInputProps>(function MtInput(
  { label, id, className = '', type, ...rest },
  ref,
) {
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-xs text-mt-muted mb-1.5 ml-3">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={isPassword && revealed ? 'text' : type}
          className={`w-full rounded-mt-pill bg-mt-cream border-0 py-3 px-5 text-mt-charcoal placeholder-mt-muted focus:outline-none focus:ring-2 focus:ring-mt-rose ${isPassword ? 'pr-14' : ''} ${isPassword && !revealed ? 'mt-password-mask' : ''} ${className}`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            // Out of the tab order so Tab goes straight from the field to the submit button.
            tabIndex={-1}
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={revealed}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-mt-muted active:text-mt-rose"
          >
            {revealed ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
          </button>
        )}
      </div>
    </div>
  )
})
