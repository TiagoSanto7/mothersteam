export interface ApiUser {
  id: string
  email: string
  name: string
  username?: string | null
  babyName?: string | null
  bio?: string | null
  pregnancyStage: 'pregnant' | 'postpartum'
  pregnancyWeek?: number | null
  babyAgeInDays?: number | null
  onboardingDone: boolean
  profileKey?: string | null
  archetypeKey?: string | null
  role?: string
  motherBirthDate?: string | null
  babyBirthDate?: string | null
  expectedBirthDate?: string | null
}

export interface ApiUserProfile {
  id: string
  name: string
  username?: string | null
  bio?: string | null
  pregnancyStage: 'pregnant' | 'postpartum'
  pregnancyWeek?: number | null
  babyAgeInDays?: number | null
  profileKey?: string | null
  archetypeKey?: string | null
  _count: { posts: number; followers: number; following: number }
  isSelf: boolean
  isFollowedByCurrentUser: boolean
}

export interface ApiFollowUser {
  id: string
  name: string
  username?: string | null
  bio?: string | null
  isFollowedByCurrentUser: boolean
  isSelf: boolean
}

export interface ApiPost {
  id: string
  content: string
  category: 'gestação' | 'pós-parto' | 'amamentação' | 'saúde mental'
  imageUrl?: string | null
  authorId: string
  author: { id: string; name: string; username?: string | null; archetypeKey?: string | null }
  communityId?: string | null
  isRepost: boolean
  repostFromId?: string | null
  repostFrom?: { id: string; content: string; category: string; author: { id: string; name: string; username?: string | null; archetypeKey?: string | null } } | null
  _count: { likes: number; comments: number; reposts: number }
  createdAt: string
  likedByCurrentUser: boolean
}

export interface ApiCommunity {
  id: string
  name: string
  description: string
  category: 'gestação' | 'pós-parto' | 'amamentação' | 'saúde mental'
  colorKey: 'gold' | 'terracotta' | 'warm' | 'linen' | 'cream'
  creatorId: string
  _count: { members: number }
  createdAt: string
}

export interface ApiCommunityDetail extends ApiCommunity {
  isMember: boolean
  role: 'owner' | 'admin' | 'member' | null
}

export interface ApiNotification {
  id: string
  type: 'like' | 'follow' | 'comment'
  text: string
  read: boolean
  recipientId: string
  createdAt: string
  targetType?: 'post' | 'user' | 'community' | string
  targetId?: string
  actorId?: string | null
  actorName?: string | null
  postExcerpt?: string | null
}

export interface ApiMessage {
  id: string
  content: string
  chatId: string
  senderId: string
  sender: { id: string; name: string; archetypeKey?: string | null }
  sharedPostId?: string | null
  sharedPostAuthor?: string | null
  sharedPostExcerpt?: string | null
  read: boolean
  createdAt: string
}

export interface ApiChat {
  id: string
  participants: Array<{ userId: string; chatId: string; user: { id: string; name: string; archetypeKey?: string | null } }>
  messages: ApiMessage[]
  createdAt: string
}

export interface ApiRoutineEntry {
  id: string
  time: string
  date: string
  title: string
  category: 'task' | 'appointment' | 'medication'
  done: boolean
  userId: string
  createdAt: string
}

export interface ApiBabyEntry {
  id: string
  time: string
  type: 'sleep' | 'feed' | 'diaper'
  detail: string
  userId: string
  createdAt: string
}

export interface PaginatedResult<T> {
  items: T[]
  hasMore: boolean
  nextCursor?: string
}

export type Phase = 'trimester1' | 'trimester2' | 'trimester3' | 'postpartum_0_30' | 'postpartum_31_180' | 'postpartum_181_365'

export interface ApiAdminProduct {
  id: string
  name: string
  description: string
  price: string
  affiliateUrl: string | null
  images: string[]
  phases: Phase[]
  stock: number | null
  featured: boolean
  active: boolean
  categoryId: string
  category: { id: string; name: string; slug: string }
  _count: { clicks: number }
  createdAt: string
  updatedAt: string
}

export interface ApiAdminCategory {
  id: string
  name: string
  slug: string
  icon: string
  active: boolean
  sortOrder: number
  _count: { products: number }
  createdAt: string
}

export interface ApiAdminDashboard {
  totalProducts: number
  activeProducts: number
  totalCategories: number
  totalClicks30d: number
  topProducts: Array<{ id: string; name: string; _count: { clicks: number } }>
}

export interface ApiClickStat {
  productId: string
  productName: string
  clicks: number
}

export interface ApiAdminProductList {
  items: ApiAdminProduct[]
  total: number
  page: number
  limit: number
  totalPages: number
}
