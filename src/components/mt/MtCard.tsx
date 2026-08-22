import type { HTMLAttributes, ReactNode } from 'react'

interface MtCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function MtCard({ children, className = '', ...rest }: MtCardProps) {
  return (
    <div
      className={`bg-white/95 backdrop-blur-sm rounded-mt shadow-mt p-4 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

MtCard.Compact = function MtCardCompact({ children, className = '', ...rest }: MtCardProps) {
  return (
    <div
      className={`bg-white/95 backdrop-blur-sm rounded-mt shadow-mt p-3 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

MtCard.Feature = function MtCardFeature({ children, className = '', ...rest }: MtCardProps) {
  return (
    <div
      className={`bg-white/95 backdrop-blur-sm rounded-mt shadow-mt-lg p-6 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
