import { Bell } from 'lucide-react'
import { MtAvatar } from './MtAvatar'

interface MtHeaderProps {
  name: string
  avatarUrl?: string
  unreadCount?: number
  onNotificationsClick: () => void
  onAvatarClick?: () => void
}

export function MtHeader({
  name,
  avatarUrl,
  unreadCount = 0,
  onNotificationsClick,
  onAvatarClick,
}: MtHeaderProps) {
  return (
    <header className="flex items-center justify-between px-5 pt-6 pb-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onAvatarClick}
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-white"
          aria-label={`Perfil de ${name}`}
        >
          <MtAvatar src={avatarUrl} alt={name} size="lg" />
        </button>
        <div className="text-white leading-tight">
          <div className="text-lg">Olá</div>
          <div className="text-2xl font-serif font-bold">{name}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onNotificationsClick}
        aria-label="Notificações"
        className="relative rounded-full bg-white/60 backdrop-blur-sm p-3 focus:outline-none focus:ring-2 focus:ring-white"
      >
        <Bell size={20} className="text-mt-charcoal" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-mt-rose text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount}
          </span>
        )}
      </button>
    </header>
  )
}
