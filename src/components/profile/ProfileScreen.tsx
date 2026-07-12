import { useState } from 'react';
import { ChevronLeft, Settings, Heart, MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { ARCHETYPES } from '../../utils/onboardingScoring';
import { SettingsScreen } from './SettingsScreen';
import { EditProfileScreen } from './EditProfileScreen';
import { PostDetailScreen } from '../post/PostDetailScreen';
import { FollowListScreen } from './FollowListScreen';
import { apiFetch } from '../../lib/api';
import { apiPostToCommunityPost } from '../../lib/helpers';
import type { PaginatedResult, ApiPost } from '../../lib/types';
import type { CommunityPost } from '../../types';

interface ProfileScreenProps {
  onClose: () => void;
}

export function ProfileScreen({ onClose }: ProfileScreenProps) {
  const motherName = useAppStore((s) => s.motherName);
  const motherProfile = useAppStore((s) => s.motherProfile);
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const currentUserId = useAppStore((s) => s.currentUserId);

  const { data } = useQuery({
    queryKey: ['posts'],
    queryFn: () => apiFetch<PaginatedResult<ApiPost>>('/posts'),
    enabled: isLoggedIn,
  });

  const communityPosts: CommunityPost[] = (data?.items ?? []).map(apiPostToCommunityPost);

  const [showSettings, setShowSettings] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [followList, setFollowList] = useState<'followers' | 'following' | null>(null);

  const archetype = motherProfile ? ARCHETYPES[motherProfile.archetypeKey] : null;
  const avatarColor = archetype?.color ?? '#9D8FCC';
  const userPosts = communityPosts.filter((p) => p.author === motherName);

  const bio = archetype ? archetype.phrases[1] : 'Maternidade com presença e intenção.';

  if (showEdit) {
    return <EditProfileScreen onBack={() => setShowEdit(false)} />;
  }

  if (selectedPost) {
    return (
      <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
        <PostDetailScreen post={selectedPost} onBack={() => setSelectedPost(null)} />
      </div>
    );
  }

  if (followList && currentUserId) {
    return (
      <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
        <FollowListScreen
          mode={followList}
          userId={currentUserId}
          onOpenUser={() => { /* self view — no recursive nav available here */ }}
          onBack={() => setFollowList(null)}
        />
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
        <SettingsScreen onBack={() => setShowSettings(false)} onClose={onClose} />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
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
              { label: 'Posts', value: userPosts.length, mode: null as 'followers' | 'following' | null },
              { label: 'Seguidoras', value: 248, mode: 'followers' as const },
              { label: 'Seguindo', value: 31, mode: 'following' as const },
            ].map(({ label, value, mode }) => (
              mode ? (
                <button
                  key={label}
                  type="button"
                  onClick={() => setFollowList(mode)}
                  aria-label={label}
                  className="flex flex-col items-center"
                >
                  <span className="text-base font-bold text-graphite">{value}</span>
                  <span className="text-[10px] text-graphite-muted text-center leading-tight">{label}</span>
                </button>
              ) : (
                <div key={label} className="flex flex-col items-center">
                  <span className="text-base font-bold text-graphite">{value}</span>
                  <span className="text-[10px] text-graphite-muted text-center leading-tight">{label}</span>
                </div>
              )
            ))}
          </div>
        </div>

        <p className="text-xs text-graphite-muted leading-snug mt-3 italic">
          "{bio}"
        </p>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setShowEdit(true)}
            className="flex-1 py-2 rounded-xl bg-sara-linen text-xs font-semibold text-sara-gold active:scale-95 transition-transform"
          >
            Editar perfil
          </button>
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
