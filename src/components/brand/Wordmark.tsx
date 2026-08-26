import wordmarkRose from '../../assets/brand/wordmark-mt-rose.svg'
import wordmarkCream from '../../assets/brand/wordmark-mt-cream.svg'

const SIZE_CLASSES = {
  sm: 'h-8',
  md: 'h-16',
  lg: 'h-24',
  xl: 'h-32',
} as const

interface WordmarkProps {
  variant?: 'rose' | 'cream'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Wordmark({ variant = 'rose', size = 'md', className = '' }: WordmarkProps) {
  const src = variant === 'cream' ? wordmarkCream : wordmarkRose
  return (
    <img
      src={src}
      alt="Mother's Team"
      className={`${SIZE_CLASSES[size]} w-auto ${className}`}
    />
  )
}
