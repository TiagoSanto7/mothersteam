import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../../store/useAppStore'
import { apiFetch } from '../../lib/api'
import type { ApiCommunity, ApiFollowUser, PaginatedResult } from '../../lib/types'

interface SocialOnboardingScreenProps {
  onDone: () => void
}

export function SocialOnboardingScreen({ onDone }: SocialOnboardingScreenProps) {
  const isLoggedIn    = useAppStore((s) => s.isLoggedIn)
  const currentUserId = useAppStore((s) => s.currentUserId) ?? ''
  const completeSocialOnboarding = useAppStore((s) => s.completeSocialOnboarding)
  const queryClient   = useQueryClient()

  const { data: suggestedCommunities = [] } = useQuery({
    queryKey: ['communities', 'suggested'],
    queryFn: () => apiFetch<ApiCommunity[]>('/communities/suggested'),
    enabled: isLoggedIn,
  })

  const { data: suggestedUsersRaw = { items: [], hasMore: false } } = useQuery({
    queryKey: ['users', 'suggested'],
    queryFn: () => apiFetch<PaginatedResult<ApiFollowUser>>(`/users?limit=5`),
    enabled: isLoggedIn,
  })
  const suggestedUsersFiltered = suggestedUsersRaw.items.filter(
    (u) => u.id !== currentUserId && !u.isFollowedByCurrentUser,
  )

  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set())

  const joinMutation = useMutation({
    mutationFn: (communityId: string) =>
      apiFetch(`/communities/${communityId}/join`, { method: 'POST' }),
    onSuccess: (_, communityId) => {
      setJoinedIds((prev) => new Set([...prev, communityId]))
      queryClient.invalidateQueries({ queryKey: ['communities'] })
    },
  })

  const followMutation = useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/users/${userId}/follow`, { method: 'POST' }),
    onSuccess: (_, userId) => {
      setFollowedIds((prev) => new Set([...prev, userId]))
      queryClient.invalidateQueries({ queryKey: ['users', currentUserId, 'following'] })
    },
  })

  function handleDone() {
    completeSocialOnboarding()
    onDone()
  }

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 pt-10 pb-6">
        <h1 className="text-2xl font-bold text-graphite mb-1">Conecte-se</h1>
        <p className="text-sm text-graphite-muted mb-6">
          Siga pessoas e entre em comunidades para começar.
        </p>

        {suggestedCommunities.length > 0 && (
          <>
            <p className="text-xs font-semibold text-graphite-muted uppercase tracking-wide mb-3">
              Comunidades sugeridas
            </p>
            <ul className="flex flex-col gap-2 mb-6">
              {suggestedCommunities.map((community) => {
                const joined = joinedIds.has(community.id)
                return (
                  <li
                    key={community.id}
                    className="flex items-center gap-3 bg-white/60 rounded-2xl px-4 py-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-sara-terracotta flex items-center justify-center text-white font-bold flex-shrink-0">
                      {community.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-graphite truncate">{community.name}</p>
                      {community.description && (
                        <p className="text-xs text-graphite-muted truncate">{community.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => !joined && joinMutation.mutate(community.id)}
                      disabled={joined}
                      aria-label={
                        joined ? `Membro de ${community.name}` : `Entrar em ${community.name}`
                      }
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                        joined
                          ? 'bg-sara-linen text-graphite-muted'
                          : 'bg-sara-gold text-white active:scale-95'
                      }`}
                    >
                      {joined ? 'Membro' : 'Entrar'}
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}

        {suggestedUsersFiltered.length > 0 && (
          <>
            <p className="text-xs font-semibold text-graphite-muted uppercase tracking-wide mb-3">
              Pessoas para seguir
            </p>
            <ul className="flex flex-col gap-2 mb-6">
              {suggestedUsersFiltered.map((user) => {
                const followed = followedIds.has(user.id)
                return (
                  <li
                    key={user.id}
                    className="flex items-center gap-3 bg-white/60 rounded-2xl px-4 py-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-sara-gold flex items-center justify-center text-white font-bold flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="flex-1 text-sm font-semibold text-graphite truncate">{user.name}</p>
                    <button
                      onClick={() => !followed && followMutation.mutate(user.id)}
                      disabled={followed}
                      aria-label={followed ? `Seguindo ${user.name}` : `Seguir ${user.name}`}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                        followed
                          ? 'bg-sara-linen text-graphite-muted'
                          : 'bg-sara-gold text-white active:scale-95'
                      }`}
                    >
                      {followed ? 'Seguindo' : 'Seguir'}
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      <div className="px-5 pb-8 flex-shrink-0">
        <button
          onClick={handleDone}
          data-testid="social-onboarding-continue"
          className="w-full py-4 rounded-2xl bg-sara-gold text-white font-semibold text-base active:scale-95 transition-all"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
