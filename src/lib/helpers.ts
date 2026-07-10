import type { ApiPost, ApiCommunity, ApiChat, ApiUser } from './types'
import type { CommunityPost, Community, Chat, PregnancyPhase } from '../types'

export function relativeTime(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function buildPhase(user: Pick<ApiUser, 'pregnancyStage' | 'pregnancyWeek' | 'babyAgeInDays'>): PregnancyPhase {
  if (user.pregnancyStage === 'pregnant') {
    return { stage: 'pregnant', week: user.pregnancyWeek ?? 28 }
  }
  return { stage: 'postpartum', ageInDays: user.babyAgeInDays ?? 0 }
}

export function apiPostToCommunityPost(post: ApiPost): CommunityPost {
  return {
    id: post.id,
    category: post.category,
    author: post.author.name,
    content: post.content,
    imageUrl: post.imageUrl ?? undefined,
    likes: post._count.likes,
    replies: post._count.comments,
    time: relativeTime(post.createdAt),
    communityId: post.communityId ?? undefined,
    isRepost: post.isRepost,
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
