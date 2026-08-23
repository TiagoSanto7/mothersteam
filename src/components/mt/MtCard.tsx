import type { HTMLAttributes, KeyboardEvent, ReactNode } from 'react'

interface MtCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

// When the card is clickable, promote it to a button role with keyboard support
// so screen readers announce it and Enter/Space activate it.
function a11yProps(onClick: MtCardProps['onClick']) {
  if (!onClick) return {}
  return {
    role: 'button' as const,
    tabIndex: 0,
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        ;(onClick as (e: unknown) => void)(e)
      }
    },
  }
}

export function MtCard({ children, className = '', ...rest }: MtCardProps) {
  return (
    <div
      {...rest}
      {...a11yProps(rest.onClick)}
      className={`bg-white/95 backdrop-blur-sm rounded-mt shadow-mt p-4 ${className}`}
    >
      {children}
    </div>
  )
}

MtCard.Compact = function MtCardCompact({ children, className = '', ...rest }: MtCardProps) {
  return (
    <div
      {...rest}
      {...a11yProps(rest.onClick)}
      className={`bg-white/95 backdrop-blur-sm rounded-mt shadow-mt p-3 ${className}`}
    >
      {children}
    </div>
  )
}

MtCard.Feature = function MtCardFeature({ children, className = '', ...rest }: MtCardProps) {
  return (
    <div
      {...rest}
      {...a11yProps(rest.onClick)}
      className={`bg-white/95 backdrop-blur-sm rounded-mt shadow-mt-lg p-6 ${className}`}
    >
      {children}
    </div>
  )
}
