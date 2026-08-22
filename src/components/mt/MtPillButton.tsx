import type { ButtonHTMLAttributes, ReactNode } from 'react'

const VARIANT_CLASSES = {
  primary:   'bg-mt-gradient text-white shadow-mt',
  secondary: 'bg-white text-mt-rose border border-mt-pink',
  google:    'bg-white text-mt-charcoal border border-mt-linen',
  apple:     'bg-mt-charcoal text-white',
} as const

interface MtPillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: keyof typeof VARIANT_CLASSES
}

export function MtPillButton({
  children,
  variant = 'primary',
  className = '',
  ...rest
}: MtPillButtonProps) {
  return (
    <button
      type={rest.type ?? 'button'}
      className={`rounded-mt-pill py-3 px-6 text-sm font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
