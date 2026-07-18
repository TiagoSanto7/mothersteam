import type { QueryClient } from '@tanstack/react-query'
import type { ApiPost, ApiCommunity, ApiChat, ApiUser, ApiUserProfile, PaginatedResult } from './types'
import type { CommunityPost, Community, Chat, PregnancyPhase } from '../types'

export function patchPostLikeInAllCaches(
  queryClient: QueryClient,
  postId: string,
  liked: boolean,
  delta: number,
): void {
  queryClient.setQueriesData<unknown>(
    {
      predicate: (q) => {
        const k = q.queryKey
        return (
          Array.isArray(k) &&
          (k[0] === 'posts' || k[0] === 'communityPosts' || k[0] === 'userPosts')
        )
      },
    },
    (old: unknown) => {
      if (!old) return old
      // Handle infinite query shape: { pages: [...], pageParams: [...] }
      if (typeof old === 'object' && 'pages' in (old as object)) {
        const inf = old as { pages: PaginatedResult<ApiPost>[]; pageParams: unknown[] }
        return {
          ...inf,
          pages: inf.pages.map((page) => ({
            ...page,
            items: page.items.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    likedByCurrentUser: liked,
                    _count: { ...p._count, likes: p._count.likes + delta },
                  }
                : p,
            ),
          })),
        }
      }
      // Handle regular query shape: { items: [...], hasMore: boolean }
      const paged = old as PaginatedResult<ApiPost>
      if (paged.items) {
        return {
          ...paged,
          items: paged.items.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  likedByCurrentUser: liked,
                  _count: { ...p._count, likes: p._count.likes + delta },
                }
              : p,
          ),
        }
      }
      // Handle single post shape: raw ApiPost (from ['posts', postId] detail query)
      const single = old as ApiPost
      if (single.id === postId) {
        return {
          ...single,
          likedByCurrentUser: liked,
          _count: { ...single._count, likes: single._count.likes + delta },
        }
      }
      return old
    },
  )
}

export function patchUserProfileInCaches(
  queryClient: QueryClient,
  userId: string,
  patch: Partial<{ name: string; bio: string | null }>,
): void {
  queryClient.setQueryData<ApiUserProfile>(['user', userId], (old) =>
    old ? { ...old, ...patch } : old,
  )
}

export function relativeTime(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function buildPhase(
  user: Pick<ApiUser, 'pregnancyStage' | 'pregnancyWeek' | 'babyAgeInDays' | 'babyBirthDate' | 'expectedBirthDate'>,
): PregnancyPhase {
  if (user.pregnancyStage === 'pregnant') {
    if (user.expectedBirthDate) {
      const msUntilBirth = new Date(user.expectedBirthDate).getTime() - Date.now()
      const daysUntilBirth = Math.ceil(msUntilBirth / (1000 * 60 * 60 * 24))
      const week = Math.max(1, Math.min(42, 40 - Math.round(daysUntilBirth / 7)))
      return { stage: 'pregnant', week }
    }
    return { stage: 'pregnant', week: user.pregnancyWeek ?? 28 }
  }
  if (user.babyBirthDate) {
    const ageInDays = Math.max(0, Math.floor((Date.now() - new Date(user.babyBirthDate).getTime()) / (1000 * 60 * 60 * 24)))
    return { stage: 'postpartum', ageInDays }
  }
  return { stage: 'postpartum', ageInDays: user.babyAgeInDays ?? 0 }
}

export function calcMotherAge(motherBirthDate?: string | null): number | undefined {
  if (!motherBirthDate) return undefined
  const born = new Date(motherBirthDate)
  const today = new Date()
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--
  return age
}

export function apiPostToCommunityPost(post: ApiPost): CommunityPost {
  return {
    id: post.id,
    authorId: post.authorId,
    authorUsername: post.author.username ?? null,
    category: post.category,
    author: post.author.name,
    content: post.content,
    imageUrl: post.imageUrl ?? undefined,
    likes: post._count.likes,
    replies: post._count.comments,
    reposts: post._count.reposts ?? 0,
    time: relativeTime(post.createdAt),
    communityId: post.communityId ?? undefined,
    isRepost: post.isRepost,
    likedByCurrentUser: post.likedByCurrentUser,
    repostOriginal: post.repostFrom
      ? {
          originalPostId: post.repostFrom.id,
          content: post.repostFrom.content,
          author: post.repostFrom.author.name,
          authorId: post.repostFrom.author.id,
          authorUsername: post.repostFrom.author.username ?? null,
          category: post.repostFrom.category,
        }
      : undefined,
  }
}

export function apiCommunityToCommunity(c: ApiCommunity): Community {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    category: c.category,
    memberCount: c._count.members,
    colorKey: c.colorKey,
  }
}

export function apiChatToChat(c: ApiChat, currentUserId: string): Chat {
  const other = c.participants.find((p) => p.userId !== currentUserId)
  const lastMsg = c.messages[0]
  return {
    id: c.id,
    with: other?.user.name ?? 'Usuária',
    lastMessage: lastMsg?.content ?? '',
    time: lastMsg ? relativeTime(lastMsg.createdAt) : relativeTime(c.createdAt),
    unread: lastMsg && lastMsg.senderId !== currentUserId && !lastMsg.read ? 1 : 0,
    messages: [],
  }
}

export function getContextualPhrase(phase: PregnancyPhase): string {
  if (phase.stage === 'pregnant') {
    if (phase.week <= 13) return 'Primeiro trimestre — cada dia é uma descoberta. ✨'
    if (phase.week <= 27) return 'Você está no meio do caminho. Seu bebê está crescendo! 💛'
    if (phase.week <= 36) return 'Reta final chegando. Você está indo muito bem. 🌷'
    if (phase.week <= 40) return 'A hora está chegando. Respira — você foi feita para isso. ❤️'
    return 'Seu bebê está prestes a chegar. Coragem! 🌸'
  }
  if (phase.ageInDays <= 30) return 'Você está fazendo lindo, mesmo exausta. Isso é amor. 💪'
  if (phase.ageInDays <= 180) return 'Seu bebê está descobrindo o mundo com você. 🌟'
  return 'Olha até onde vocês chegaram juntos. ☀️'
}
