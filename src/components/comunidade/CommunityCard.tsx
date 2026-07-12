import { Users } from 'lucide-react';
import type { Community, CommunityColorKey } from '../../types';

interface CommunityCardProps {
  community: Community;
  isFollowing: boolean;
  onToggle: (id: string) => void;
  onOpen?: () => void;
}

const COLOR_CONFIG: Record<CommunityColorKey, { avatarBg: string; avatarText: string }> = {
  gold:       { avatarBg: 'bg-sara-linen', avatarText: 'text-sara-gold' },
  terracotta: { avatarBg: 'bg-sara-linen', avatarText: 'text-sara-terracotta' },
  warm:       { avatarBg: 'bg-sara-cream', avatarText: 'text-sara-warm' },
  linen:      { avatarBg: 'bg-sara-linen', avatarText: 'text-sara-charcoal' },
  cream:      { avatarBg: 'bg-sara-cream', avatarText: 'text-sara-charcoal' },
};

export function CommunityCard({ community, isFollowing, onToggle, onOpen }: CommunityCardProps) {
  const { avatarBg, avatarText } = COLOR_CONFIG[community.colorKey];

  const inner = (
    <>
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${avatarBg}`}>
        <span className={`text-lg font-serif font-semibold ${avatarText}`}>
          {community.name.charAt(0)}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold font-serif text-graphite leading-snug">
          {community.name}
        </h3>
        <p className="text-xs text-graphite-muted leading-relaxed mt-0.5 line-clamp-2">
          {community.description}
        </p>
        <div className="flex items-center gap-1 mt-1.5">
          <Users size={11} className="text-graphite-muted" strokeWidth={1.8} />
          <span className="text-[10px] text-graphite-muted">
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
            ? 'bg-sara-linen text-sara-warm border border-sara-linen'
            : 'bg-sara-gold text-white'
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
        className="w-full text-left bg-white/70 backdrop-blur-sm border border-white/50 rounded-3xl p-4 flex items-start gap-3 shadow-sm"
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-3xl p-4 flex items-start gap-3 shadow-sm">
      {inner}
    </div>
  );
}
