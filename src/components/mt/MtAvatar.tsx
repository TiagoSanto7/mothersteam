const SIZE_CLASSES = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-14 h-14 text-base',
  lg: 'w-20 h-20 text-2xl',
} as const

interface MtAvatarProps {
  src?: string
  alt: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function MtAvatar({ src, alt, size = 'md', className = '' }: MtAvatarProps) {
  const initial = alt.charAt(0).toUpperCase()
  const base = `${SIZE_CLASSES[size]} rounded-full overflow-hidden ring-4 ring-white shadow-mt flex-shrink-0 ${className}`

  if (!src) {
    return (
      <div className={`${base} bg-mt-pink-soft flex items-center justify-center text-mt-rose-dark font-serif font-semibold`}>
        {initial}
      </div>
    )
  }

  return (
    <div className={base}>
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </div>
  )
}
