import markMono from '../../assets/brand/mark-mt.svg'
import markGradient from '../../assets/brand/mark-mt-gradient.svg'
import markPink from '../../assets/brand/mark-mt-pink.svg'

const SRC_BY_VARIANT = {
  mono:     markMono,
  gradient: markGradient,
  pink:     markPink,
} as const

interface MarkProps {
  variant?: keyof typeof SRC_BY_VARIANT
  size?: number
  className?: string
  'aria-label'?: string
}

export function Mark({
  variant = 'mono',
  size = 32,
  className = '',
  'aria-label': ariaLabel = "Mother's Team",
}: MarkProps) {
  return (
    <img
      src={SRC_BY_VARIANT[variant]}
      alt={ariaLabel}
      className={className}
      style={{ width: size, height: size }}
    />
  )
}
