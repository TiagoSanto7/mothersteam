import type { HTMLAttributes, ReactNode } from 'react'

interface MtChipProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  active?: boolean
}

export function MtChip({ children, active = false, className = '', onClick, ...rest }: MtChipProps) {
  const base = 'inline-block text-xs font-semibold rounded-mt-pill px-3 py-1'
  const variant = active
    ? 'bg-mt-gradient text-white'
    : 'bg-mt-pink-soft text-mt-rose-dark'
  const interactive = onClick ? 'cursor-pointer' : ''

  return (
    <span
      role={onClick ? 'button' : undefined}
      className={`${base} ${variant} ${interactive} ${className}`}
      onClick={onClick}
      {...rest}
    >
      {children}
    </span>
  )
}
