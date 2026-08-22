import markMono from '../../assets/brand/mark-mt.svg'
import markGradient from '../../assets/brand/mark-mt-gradient.svg'

interface MarkProps {
  variant?: 'mono' | 'gradient'
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
  const src = variant === 'gradient' ? markGradient : markMono
  return (
    <img
      src={src}
      alt={ariaLabel}
      className={className}
      style={{ width: size, height: size }}
    />
  )
}
