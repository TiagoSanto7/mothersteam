import { useState } from 'react';
import { ChevronLeft, Settings, Bell, MessageCircle, Grid3X3 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ARCHETYPES } from '../../utils/onboardingScoring';
import { SettingsScreen } from './SettingsScreen';

interface ProfileScreenProps {
  onClose: () => void;
}

export function ProfileScreen({ onClose }: ProfileScreenProps) {
  const { motherName, motherProfile, communityPosts } = useAppStore((s) => ({
    motherName: s.motherName,
    motherProfile: s.motherProfile,
    communityPosts: s.communityPosts,
  }));

  const [showSettings, setShowSettings] = useState(false);
  const [bellActive, setBellActive] = useState(false);

  const archetype = motherProfile ? ARCHETYPES[motherProfile.archetypeKey] : null;
  const avatarColor = archetype?.color ?? '#9D8FCC';
  const userPosts = communityPosts.filter((p) => p.author === motherName);

  if (showSettings) {
    return (
      <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-offwhite sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
        <SettingsScreen onBack={() => setShowSettings(false)} onClose={onClose} />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-offwhite sm:rounded-[44px] sm:shadow-2xl overflow-y-auto">
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-lavender-50">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <p className="text-sm font-semibold text-graphite">{motherName}</p>
        <button onClick={() => setShowSettings(true)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-lavender-50">
          <Settings size={18} className="text-graphite" />
        </button>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-center gap-6">
          <div
            style={{ background: avatarColor }}
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0"
          >
            {motherName.charAt(0).toUpperCase()}
          </div>
          <div className="flex gap-4 flex-1 justify-around">
            {[
              { label: 'Publicações', value: userPosts.length },
              { label: 'Seguidoras', value: 248 },
              { label: 'Seguindo', value: 31 },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center">
                <span className="text-base font-bold text-graphite">{value}</span>
                <span className="text-[10px] text-graphite-muted text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3">
          {motherProfile ? (
            <p className="text-[11px] text-graphite-muted leading-snug">
              {motherProfile.archetypeLabel} · {motherProfile.archetypeAttributes}
            </p>
          ) : (
            <p className="text-[11px] text-graphite-muted">Mothers Team · Maternidade com presença</p>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <button className="flex-1 py-2 rounded-xl bg-lavender-100 text-xs font-semibold text-lavender-600 active:scale-95 transition-transform">
            Editar perfil
          </button>
          <button className="w-10 h-9 flex items-center justify-center rounded-xl bg-lavender-100 active:scale-95 transition-transform">
            <MessageCircle size={16} className="text-lavender-600" />
          </button>
          <button
            onClick={() => setBellActive(!bellActive)}
            className={`w-10 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95 ${bellActive ? 'bg-lavender-600' : 'bg-lavender-100'}`}
          >
            <Bell size={16} className={bellActive ? 'text-white' : 'text-lavender-600'} />
          </button>
        </div>
      </div>

      <div className="border-t border-gray-100 flex items-center justify-center py-2 gap-1.5">
        <Grid3X3 size={14} className="text-graphite" />
        <span className="text-xs font-semibold text-graphite">Publicações</span>
      </div>

      {userPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 py-12 text-graphite-muted">
          <p className="text-sm">Nenhuma publicação ainda</p>
          <p className="text-xs">Use o botão Desabafar na Comunidade</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 px-0.5 pb-4">
          {userPosts.map((post) => (
            <div
              key={post.id}
              className="aspect-square bg-lavender-50 border border-lavender-100 flex items-center justify-center p-2"
            >
              <p className="text-[10px] text-graphite-light leading-tight line-clamp-4 text-center">
                {post.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
