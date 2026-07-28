import { useState } from 'react'
import { getAvatarColor } from '../../utils/avatar'
import { resolveMediaUrl } from '../../lib/api'

interface Props {
  name: string
  archetypeKey?: string | null
  avatarUrl?: string | null
  size?: number
  className?: string
}

export function UserAvatar({ name, archetypeKey, avatarUrl, size = 40, className = '' }: Props) {
  const [imgError, setImgError] = useState(false)
  const resolvedUrl = avatarUrl ? resolveMediaUrl(avatarUrl) : null

  const baseClass = `flex-shrink-0 rounded-full flex items-center justify-center font-bold text-white overflow-hidden`
  const style = { width: size, height: size, background: getAvatarColor(archetypeKey) }
  const fontSize = size <= 32 ? 'text-xs' : size <= 48 ? 'text-sm' : 'text-xl'

  if (resolvedUrl && !imgError) {
    return (
      <div style={style} className={`${baseClass} ${className}`}>
        <img
          src={resolvedUrl}
          alt={`Foto de ${name}`}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  return (
    <div style={style} className={`${baseClass} ${fontSize} ${className}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
