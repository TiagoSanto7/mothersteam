import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { CommunityCard } from './CommunityCard';
import { apiFetch } from '../../lib/api';
import type { ApiCommunity } from '../../lib/types';
import { apiCommunityToCommunity } from '../../lib/helpers';
import type { Community, PregnancyPhase } from '../../types';
import { useState } from 'react';

type SubFilter = 'seguindo' | 'sugestoes';

function getSuggestionScore(community: Community, phase: PregnancyPhase, archetypeKey: string | undefined): number {
  let score = 0;
  if (phase.stage === 'pregnant' && community.category === 'gestação') score += 3;
  if (phase.stage === 'postpartum' && (community.category === 'pós-parto' || community.category === 'amamentação')) score += 3;
  if (archetypeKey === 'ana' && community.category === 'saúde mental') score += 2;
  return score;
}

interface ComunidadesScreenProps {
  onOpenCommunity?: (id: string) => void;
}

type ApiCommunityWithMember = ApiCommunity & { isMember?: boolean };

export function ComunidadesScreen({ onOpenCommunity }: ComunidadesScreenProps = {}) {
  const phase          = useAppStore((s) => s.phase);
  const motherProfile  = useAppStore((s) => s.motherProfile);
  const isLoggedIn     = useAppStore((s) => s.isLoggedIn);
  const queryClient    = useQueryClient();
  const [subFilter, setSubFilter] = useState<SubFilter>('seguindo');

  const { data: apiCommunities = [] } = useQuery({
    queryKey: ['communities'],
    queryFn: () => apiFetch<ApiCommunityWithMember[]>('/communities?includeMember=1'),
    enabled: isLoggedIn,
  });

  const communities = apiCommunities.map((c) => ({
    ...apiCommunityToCommunity(c),
    isMember: !!c.isMember,
  }));

  const joinMutation = useMutation({
    mutationFn: ({ id, isJoining }: { id: string; isJoining: boolean }) =>
      apiFetch(`/communities/${id}/join`, { method: isJoining ? 'POST' : 'DELETE' }),
    onMutate: async ({ id, isJoining }) => {
      await queryClient.cancelQueries({ queryKey: ['communities'] });
      const previous = queryClient.getQueryData<ApiCommunityWithMember[]>(['communities']);
      queryClient.setQueryData<ApiCommunityWithMember[]>(['communities'], (old) =>
        old?.map((c) => (c.id === id ? { ...c, isMember: isJoining } : c)) ?? old
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['communities'], ctx.previous);
    },
  });

  function handleToggle(id: string, isMember: boolean) {
    joinMutation.mutate({ id, isJoining: !isMember });
  }

  const followed    = communities.filter((c) => c.isMember);
  const suggestions = communities
    .filter((c) => !c.isMember)
    .sort((a, b) =>
      getSuggestionScore(b, phase, motherProfile?.archetypeKey) -
      getSuggestionScore(a, phase, motherProfile?.archetypeKey)
    );
  const displayList = subFilter === 'seguindo' ? followed : suggestions;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 px-4">
        {(['seguindo', 'sugestoes'] as SubFilter[]).map((f) => {
          const label = f === 'seguindo' ? 'Seguindo' : 'Sugestões';
          return (
            <button
              key={f}
              aria-pressed={subFilter === f}
              onClick={() => setSubFilter(f)}
              aria-label={label}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                subFilter === f
                  ? 'bg-sara-gold text-white'
                  : 'bg-white/70 text-graphite-muted border border-white/50'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 px-4">
        {displayList.length === 0 ? (
          <p className="text-sm text-graphite-muted text-center py-8">
            {subFilter === 'seguindo'
              ? 'Você ainda não segue nenhuma comunidade. Explore as sugestões!'
              : 'Todas as comunidades disponíveis já estão no seu feed.'}
          </p>
        ) : (
          displayList.map((community) => (
            <CommunityCard
              key={community.id}
              community={community}
              isFollowing={community.isMember}
              onToggle={() => handleToggle(community.id, community.isMember)}
              onOpen={onOpenCommunity ? () => onOpenCommunity(community.id) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
