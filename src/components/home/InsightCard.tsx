import { useState } from 'react';
import { X } from 'lucide-react';
import type { MotherProfile } from '../../types';
import { ARCHETYPES } from '../../utils/onboardingScoring';

interface InsightCardProps {
  profile: MotherProfile;
}

export function InsightCard({ profile }: InsightCardProps) {
  const [dismissed, setDismissed] = useState(false);
  const archetype = profile.archetypeKey ? ARCHETYPES[profile.archetypeKey] : null;

  if (dismissed || !archetype) return null;

  const initial = archetype.label.split(' ')[1][0];

  return (
    <div className="mx-4 bg-sara-linen border border-sara-linen rounded-3xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div
            style={{ background: archetype.color }}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
          >
            {initial}
          </div>
          <span className="text-[9px] font-semibold text-graphite-muted whitespace-nowrap">
            {archetype.label}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-sara-gold uppercase tracking-wide mb-0.5">
            Seu perfil personalizado
          </p>
          <p className="text-sm font-semibold font-serif text-graphite leading-snug">
            {profile.profileLabel}
          </p>
          <p className="text-xs text-graphite-light leading-relaxed mt-1.5 italic">
            "{archetype.phrases[0]}"
          </p>
        </div>

        <button
          onClick={() => setDismissed(true)}
          aria-label="Fechar insight"
          className="w-7 h-7 rounded-full bg-sara-linen flex items-center justify-center flex-shrink-0"
        >
          <X size={12} className="text-sara-gold" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
