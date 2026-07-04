import { useState } from 'react';
import { ChevronLeft, Settings, Heart, MessageCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ARCHETYPES } from '../../utils/onboardingScoring';
import { SettingsScreen } from './SettingsScreen';
import { PostDetailScreen } from '../post/PostDetailScreen';
import type { CommunityPost } from '../../types';

interface ProfileScreenProps {
  onClose: () => void;
}

export function ProfileScreen({ onClose }: ProfileScreenProps) {
  const motherName = useAppStore((s) => s.motherName);
  const motherProfile = useAppStore((s) => s.motherProfile);
  const communityPosts = useAppStore((s) => s.communityPosts);

  const [showSettings, setShowSettings] = useState(false);
  const [isVisitorView, setIsVisitorView] = useState(false);
  const [following, setFollowing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

  const archetype = motherProfile ? ARCHETYPES[motherProfile.archetypeKey] : null;
  const avatarColor = archetype?.color ?? '#9D8FCC';
  const userPosts = communityPosts.filter((p) => p.author === motherName);

  const bio = archetype ? archetype.phrases[1] : 'Maternidade com presença e intenção.';

  if (selectedPost) {
    return (
      <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-offwhite sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
        <PostDetailScreen post={selectedPost} onBack={() => setSelectedPost(null)} />
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-offwhite sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
        <SettingsScreen onBack={() => setShowSettings(false)} onClose={onClose} />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-offwhite sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3 flex-shrink-0">
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <p className="text-sm font-semibold font-serif text-graphite">{motherName}</p>
        <button onClick={() => setShowSettings(true)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <Settings size={18} className="text-graphite" />
        </button>
      </div>

      {/* Profile info */}
      <div className="px-4 pb-3 flex-shrink-0">
        <div className="flex items-center gap-5">
          <div
            style={{ background: avatarColor }}
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0"
          >
            {motherName.charAt(0).toUpperCase()}
          </div>
          <div className="flex gap-4 flex-1 justify-around">
            {[
              { label: 'Posts', value: userPosts.length },
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

        <p className="text-xs text-graphite-muted leading-snug mt-3 italic">
          "{bio}"
        </p>

        {/* Owner / Visitor toggle */}
        <div className="flex items-center gap-1 mt-3 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setIsVisitorView(false)}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all ${!isVisitorView ? 'bg-white text-graphite shadow-sm' : 'text-graphite-muted'}`}
          >
            Meu perfil
          </button>
          <button
            onClick={() => setIsVisitorView(true)}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all ${isVisitorView ? 'bg-white text-graphite shadow-sm' : 'text-graphite-muted'}`}
          >
            Como visitante
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          {!isVisitorView ? (
            <button className="flex-1 py-2 rounded-xl bg-sara-linen text-xs font-semibold text-sara-gold active:scale-95 transition-transform">
              Editar perfil
            </button>
          ) : (
            <>
              <button
                onClick={() => setFollowing(!following)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-all ${following ? 'bg-gray-100 text-graphite border border-gray-200' : 'bg-sara-gold text-white'}`}
              >
                {following ? 'Seguindo' : 'Seguir'}
              </button>
              <button className="flex-1 py-2 rounded-xl bg-gray-100 text-xs font-semibold text-graphite active:scale-95 transition-transform border border-gray-200">
                Mensagem
              </button>
              <button className="w-10 h-9 flex items-center justify-center rounded-xl bg-gray-100 border border-gray-200 active:scale-95 transition-transform">
                <span className="text-sm">🔔</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100 flex-shrink-0" />

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {userPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-12 text-graphite-muted">
            <p className="text-sm">Nenhuma publicação ainda</p>
            <p className="text-xs text-center px-8">Use o botão Desabafar na Comunidade para compartilhar</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {userPosts.map((post) => (
              <li key={post.id} className="px-4 py-4 active:bg-sara-linen transition-colors cursor-pointer" onClick={() => setSelectedPost(post)}>
                <div className="flex items-start gap-3">
                  <div
                    style={{ background: avatarColor }}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  >
                    {motherName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold text-graphite">{motherName}</span>
                      <span className="text-[11px] text-graphite-muted">· agora</span>
                    </div>
                    <p className="text-sm text-graphite leading-relaxed mt-1">{post.content}</p>
                    <div className="flex items-center gap-5 mt-2">
                      <button className="flex items-center gap-1.5 text-graphite-muted">
                        <Heart size={14} />
                        <span className="text-[11px]">{post.likes}</span>
                      </button>
                      <button className="flex items-center gap-1.5 text-graphite-muted">
                        <MessageCircle size={14} />
                        <span className="text-[11px]">{post.replies}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
