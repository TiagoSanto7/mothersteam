import { useState, useEffect } from 'react';
import { Search, UserPlus, UserCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { getAvatarColor } from '../../utils/avatar';

interface RightPanelProps {
  onOpenUser: (userId: string) => void;
  onOpenCommunity: (communityId: string) => void;
}

interface SearchResults {
  users: Array<{ id: string; name: string; pregnancyStage: string; archetypeKey?: string | null }>;
  communities: Array<{ id: string; name: string; description: string; category: string; colorKey: string; _count: { members: number } }>;
}

interface SuggestedUser {
  id: string;
  name: string;
  pregnancyStage: string;
  isFollowedByCurrentUser: boolean;
  archetypeKey?: string | null;
}

interface SuggestedUsersResponse {
  items: SuggestedUser[];
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

const DAILY_PHRASES = [
  'Você é mais forte do que imagina 🌸',
  'Cada dia é uma nova chance de se reconectar com seu bebê 💛',
  'Maternidade é amor que transborda, mesmo nos dias difíceis 🤍',
  'Cuide de você para poder cuidar de quem você ama ✨',
  'Nenhuma mãe é perfeita — e está tudo bem assim 🌿',
  'Você não está sozinha nessa jornada 💜',
  'Seu amor já é suficiente para o seu bebê 🌺',
];

export function RightPanel({ onOpenUser, onOpenCommunity }: RightPanelProps) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query.trim(), 300);

  const dailyPhrase = DAILY_PHRASES[new Date().getDay()];

  const { data: searchData } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => apiFetch<SearchResults>(`/search?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.length >= 2,
  });

  const { data: suggestedData } = useQuery({
    queryKey: ['suggested-users'],
    queryFn: () => apiFetch<SuggestedUsersResponse>('/users/?limit=5'),
    staleTime: 300_000,
  });

  const followMutation = useMutation({
    mutationFn: (userId: string) => apiFetch(`/users/${userId}/follow`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['suggested-users'] });
    },
  });

  const searchUsers = searchData?.users ?? [];
  const searchCommunities = searchData?.communities ?? [];
  const suggestedUsers = (suggestedData?.items ?? []).filter((u) => !u.isFollowedByCurrentUser);

  return (
    <div className="bg-sara-cream border-l border-sara-linen sticky top-0 h-screen overflow-y-auto p-4 flex flex-col gap-5">
      {/* Search bar */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-sara-linen px-3 py-2.5">
          <Search size={16} className="text-graphite-muted flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pessoas e comunidades"
            aria-label="Buscar pessoas e comunidades"
            className="flex-1 bg-transparent text-sm text-graphite placeholder:text-sara-muted outline-none min-w-0"
          />
        </div>

        {debouncedQuery.length >= 2 && (searchUsers.length > 0 || searchCommunities.length > 0) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-sara-linen shadow-lg z-10 overflow-hidden max-h-72 overflow-y-auto">
            {searchUsers.length > 0 && (
              <section>
                <h3 className="text-[10px] font-semibold text-graphite-muted uppercase tracking-wide px-3 py-2">Pessoas</h3>
                {searchUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { setQuery(''); onOpenUser(u.id); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-sara-linen transition-colors"
                  >
                    <div
                      style={{ background: getAvatarColor(u.archetypeKey) }}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-graphite truncate">{u.name}</span>
                  </button>
                ))}
              </section>
            )}

            {searchCommunities.length > 0 && (
              <section>
                <h3 className="text-[10px] font-semibold text-graphite-muted uppercase tracking-wide px-3 py-2">Comunidades</h3>
                {searchCommunities.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setQuery(''); onOpenCommunity(c.id); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-sara-linen transition-colors"
                  >
                    <div className="w-8 h-8 rounded-xl bg-sara-gold flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-graphite truncate">{c.name}</p>
                      <p className="text-[11px] text-graphite-muted">{c._count.members} membros</p>
                    </div>
                  </button>
                ))}
              </section>
            )}
          </div>
        )}

        {debouncedQuery.length >= 2 && searchUsers.length === 0 && searchCommunities.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-sara-linen shadow-lg z-10 px-3 py-4">
            <p className="text-sm text-graphite-muted text-center">Nada encontrado</p>
          </div>
        )}
      </div>

      {/* Mães para seguir */}
      {suggestedUsers.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-graphite-muted uppercase tracking-wide mb-3">Mães para seguir</h2>
          <div className="flex flex-col gap-2">
            {suggestedUsers.slice(0, 5).map((u) => {
              const isFollowed = u.isFollowedByCurrentUser;
              const isPendingThis = followMutation.isPending && followMutation.variables === u.id;
              return (
                <div key={u.id} className="flex items-center gap-2.5">
                  <button
                    onClick={() => onOpenUser(u.id)}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                  >
                    <div
                      style={{ background: getAvatarColor(u.archetypeKey) }}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-graphite truncate">{u.name}</span>
                  </button>
                  <button
                    onClick={() => { if (!isFollowed) followMutation.mutate(u.id); }}
                    disabled={isFollowed || isPendingThis}
                    title={isFollowed ? 'Seguindo' : `Seguir ${u.name}`}
                    aria-label={isFollowed ? `Seguindo ${u.name}` : `Seguir ${u.name}`}
                    className={[
                      'flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 transition-colors',
                      isFollowed
                        ? 'bg-sara-gold/10 text-sara-gold'
                        : 'bg-sara-gold text-white hover:bg-sara-gold/90',
                    ].join(' ')}
                  >
                    {isFollowed
                      ? <UserCheck size={15} strokeWidth={2} />
                      : <UserPlus size={15} strokeWidth={2} />
                    }
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Frase do dia */}
      <section className="mt-auto">
        <h2 className="text-xs font-semibold text-graphite-muted uppercase tracking-wide mb-2">Frase do dia</h2>
        <div className="bg-sara-gold/10 rounded-2xl px-4 py-3">
          <p className="text-sm font-medium text-graphite leading-relaxed">{dailyPhrase}</p>
        </div>
      </section>
    </div>
  );
}
