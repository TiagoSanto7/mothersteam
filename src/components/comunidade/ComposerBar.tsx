import { Camera } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getAvatarColor } from '../../utils/avatar';

interface ComposerBarProps {
  onOpen: () => void;
  onOpenWithImage?: () => void;
}

export function ComposerBar({ onOpen, onOpenWithImage }: ComposerBarProps) {
  const motherName    = useAppStore((s) => s.motherName);
  const motherProfile = useAppStore((s) => s.motherProfile);
  const initial = motherName[0]?.toUpperCase() ?? 'M';

  return (
    <div className="mx-4 mb-3 bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-3 flex items-center gap-3 w-[calc(100%-2rem)]">
      <button
        onClick={onOpen}
        aria-label="Escrever post"
        className="flex items-center gap-3 flex-1 text-left"
      >
        <div
          style={{ background: getAvatarColor(motherProfile?.archetypeKey ?? null) }}
          className="w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0"
        >
          {initial}
        </div>
        <span className="flex-1 text-graphite-muted text-sm">
          O que você está sentindo hoje?
        </span>
      </button>
      <button
        onClick={onOpenWithImage ?? onOpen}
        aria-label="Adicionar foto"
        className="p-1 flex-shrink-0"
      >
        <Camera size={20} className="text-sara-gold" />
      </button>
    </div>
  );
}
