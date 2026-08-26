import type { ReactNode } from 'react'

const VARIANT_BG = {
  gradient: 'bg-mt-gradient',
  pastel:   'bg-mt-gradient-pastel',
  solid:    'bg-mt-cream',
} as const

interface MtScreenProps {
  children: ReactNode
  variant?: keyof typeof VARIANT_BG
  className?: string
}

export function MtScreen({ children, variant = 'gradient', className = '' }: MtScreenProps) {
  return (
    <div
      className={`min-h-screen w-full ${VARIANT_BG[variant]} ${className}`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {children}
    </div>
  )
}
