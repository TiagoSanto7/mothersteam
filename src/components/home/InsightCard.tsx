import { useState } from 'react';
import { X } from 'lucide-react';
import type { MotherProfile } from '../../types';

interface InsightCardProps {
  profile: MotherProfile;
}

export function InsightCard({ profile }: InsightCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="mx-4 bg-lavender-50 border border-lavender-200 rounded-3xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold text-lavender-600 uppercase tracking-wide">
            Seu perfil personalizado
          </p>
          <p className="text-sm font-semibold text-graphite mt-0.5">
            {profile.profileLabel}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Fechar insights"
          className="w-7 h-7 rounded-full bg-lavender-100 flex items-center justify-center flex-shrink-0"
        >
          <X size={12} className="text-lavender-600" strokeWidth={2} />
        </button>
      </div>
      <p className="text-xs text-graphite-light leading-relaxed">
        {profile.insights[0]}
      </p>
    </div>
  );
}
