import type { InputHTMLAttributes } from 'react'

interface MtInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function MtInput({ label, id, className = '', ...rest }: MtInputProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-xs text-mt-muted mb-1.5 ml-3">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full rounded-mt-pill bg-mt-cream border-0 py-3 px-5 text-mt-charcoal placeholder-mt-muted focus:outline-none focus:ring-2 focus:ring-mt-rose ${className}`}
        {...rest}
      />
    </div>
  )
}
