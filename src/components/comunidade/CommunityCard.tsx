import { Users } from 'lucide-react';
import { resolveMediaUrl } from '../../lib/api';
import type { Community, CommunityColorKey } from '../../types';

interface CommunityCardProps {
  community: Community;
  isFollowing: boolean;
  onToggle: (id: string) => void;
  onOpen?: () => void;
}

const COLOR_CONFIG: Record<CommunityColorKey, { avatarBg: string; avatarText: string }> = {
  gold:       { avatarBg: 'bg-mt-linen', avatarText: 'text-mt-rose' },
  terracotta: { avatarBg: 'bg-mt-linen', avatarText: 'text-mt-rose-dark' },
  warm:       { avatarBg: 'bg-mt-cream', avatarText: 'text-mt-muted' },
  linen:      { avatarBg: 'bg-mt-linen', avatarText: 'text-mt-charcoal' },
  cream:      { avatarBg: 'bg-mt-cream', avatarText: 'text-mt-charcoal' },
};

export function CommunityCard({ community, isFollowing, onToggle, onOpen }: CommunityCardProps) {
  const { avatarBg, avatarText } = COLOR_CONFIG[community.colorKey];

  const resolvedAvatar = community.avatarUrl ? resolveMediaUrl(community.avatarUrl) : null;

  const inner = (
    <>
      {resolvedAvatar ? (
        <div className="w-11 h-11 rounded-2xl overflow-hidden flex-shrink-0 bg-mt-linen">
          <img
            src={resolvedAvatar}
            alt={community.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      ) : (
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${avatarBg}`}>
          <span className={`text-lg font-serif font-semibold ${avatarText}`}>
            {community.name.charAt(0)}
          </span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold font-serif text-mt-charcoal leading-snug">
          {community.name}
        </h3>
        <p className="text-xs text-mt-muted leading-relaxed mt-0.5 line-clamp-2">
          {community.description}
        </p>
        <div className="flex items-center gap-1 mt-1.5">
          <Users size={11} className="text-mt-muted" strokeWidth={1.8} />
          <span className="text-[10px] text-mt-muted">
            {community.memberCount.toLocaleString('pt-BR')} membros
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(community.id); }}
        aria-label={isFollowing ? 'Deixar de seguir' : 'Seguir'}
        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
          isFollowing
            ? 'bg-mt-linen text-mt-muted border border-mt-linen'
            : 'bg-mt-rose text-white'
        }`}
      >
        {isFollowing ? 'Seguindo' : 'Seguir'}
      </button>
    </>
  );

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ver comunidade ${community.name}`}
        className="w-full text-left bg-white/95 backdrop-blur-sm rounded-mt shadow-mt p-4 flex items-start gap-3 shadow-sm"
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-mt shadow-mt p-4 flex items-start gap-3 shadow-sm">
      {inner}
    </div>
  );
}
