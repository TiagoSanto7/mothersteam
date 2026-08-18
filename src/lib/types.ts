export interface ApiUser {
  id: string
  email: string
  name: string
  username?: string | null
  babyName?: string | null
  bio?: string | null
  avatarUrl?: string | null
  pregnancyStage: 'pregnant' | 'postpartum'
  pregnancyWeek?: number | null
  babyAgeInDays?: number | null
  onboardingDone: boolean
  profileKey?: string | null
  archetypeKey?: string | null
  role?: string
  versesPublic?: boolean
  motherBirthDate?: string | null
  babyBirthDate?: string | null
  expectedBirthDate?: string | null
}

export interface ApiUserProfile {
  id: string
  name: string
  username?: string | null
  bio?: string | null
  avatarUrl?: string | null
  pregnancyStage: 'pregnant' | 'postpartum'
  pregnancyWeek?: number | null
  babyAgeInDays?: number | null
  profileKey?: string | null
  archetypeKey?: string | null
  versesPublic?: boolean
  role?: string
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
  author: { id: string; name: string; username?: string | null; archetypeKey?: string | null; avatarUrl?: string | null }
  communityId?: string | null
  communityName?: string | null
  isRepost: boolean
  repostFromId?: string | null
  repostFrom?: { id: string; content: string; category: string; author: { id: string; name: string; username?: string | null; archetypeKey?: string | null; avatarUrl?: string | null } } | null
  _count: { likes: number; comments: number; reposts: number }
  createdAt: string
  likedByCurrentUser: boolean
  isSuggestion?: boolean
}

export interface ApiCommunity {
  id: string
  name: string
  description: string
  category: 'gestação' | 'pós-parto' | 'amamentação' | 'saúde mental'
  colorKey: 'gold' | 'terracotta' | 'warm' | 'linen' | 'cream'
  imageUrl?: string | null
  avatarUrl?: string | null
  creatorId: string
  isPrivate: boolean
  isOpen: boolean
  _count: { members: number }
  createdAt: string
}

export interface ApiCommunityDetail extends ApiCommunity {
  isMember: boolean
  role: 'owner' | 'admin' | 'member' | null
}

export interface ApiCommunityMember {
  id: string
  name: string
  username?: string | null
  archetypeKey?: string | null
  role: 'owner' | 'admin' | 'member'
  isFollowedByCurrentUser: boolean
  isSelf: boolean
}

export interface ApiNotification {
  id: string
  type: 'like' | 'follow' | 'comment' | 'mention'
  text: string
  read: boolean
  recipientId: string
  createdAt: string
  targetType?: 'post' | 'user' | 'community' | string
  targetId?: string
  actorId?: string | null
  actorName?: string | null
  actorAvatarUrl?: string | null
  postExcerpt?: string | null
  isFollowedByCurrentUser?: boolean
}

export interface ApiMessage {
  id: string
  content: string
  chatId: string
  senderId: string
  sender: { id: string; name: string; archetypeKey?: string | null; avatarUrl?: string | null }
  sharedPostId?: string | null
  sharedPostAuthor?: string | null
  sharedPostExcerpt?: string | null
  audioUrl?: string | null
  imageUrl?: string | null
  read: boolean
  createdAt: string
}

export interface ApiChat {
  id: string
  participants: Array<{ userId: string; chatId: string; user: { id: string; name: string; username?: string | null; archetypeKey?: string | null; avatarUrl?: string | null } }>
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
  notes?: string | null
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

// ── Shopping types ──────────────────────────────────────────

export interface ApiCategory {
  id: string
  name: string
  slug: string
  icon: string
}

export interface ApiOwnProduct {
  id: string
  type: 'own'
  name: string
  description: string
  price: string
  images: string[]
  stock: number
  sku?: string | null
  featured: boolean
  active: boolean
  categoryId: string
  category: ApiCategory
  createdAt: string
  updatedAt: string
}

export interface ApiReview {
  id: string
  rating: number
  text?: string | null
  verifiedPurchase: boolean
  userId: string
  user: { id: string; name: string; avatarUrl?: string | null }
  createdAt: string
}

export interface ApiReviewsSummary {
  average: number
  count: number
  distribution: Record<string, number>
}

export interface ApiProductDetail {
  id: string
  type: 'affiliate'
  name: string
  description: string
  price: string
  affiliateUrl?: string | null
  images: string[]
  phases: string[]
  stock?: number | null
  featured: boolean
  active: boolean
  categoryId: string
  category: ApiCategory
  reviewsSummary: ApiReviewsSummary
  reviews: ApiReview[]
  inWishlist: boolean
  related: Array<ApiProductDetail | ApiOwnProductDetail>
  createdAt: string
  updatedAt: string
}

export interface ApiOwnProductDetail extends ApiOwnProduct {
  reviewsSummary: ApiReviewsSummary
  reviews: ApiReview[]
  inWishlist: boolean
  related: ApiOwnProduct[]
}

export type AnyProductDetail = ApiProductDetail | ApiOwnProductDetail

export interface ApiCartItem {
  id: string
  ownProductId: string
  ownProduct: ApiOwnProduct
  quantity: number
  createdAt: string
}

export interface ApiCart {
  items: ApiCartItem[]
  subtotal: string
  itemCount: number
}

export interface ApiWishlistEntry {
  type: 'affiliate' | 'own'
  product: ApiAdminProduct | ApiOwnProduct
  savedAt: string
}

export interface ApiAddress {
  id: string
  recipientName: string
  street: string
  number: string
  complement?: string | null
  neighborhood: string
  city: string
  state: string
  zipCode: string
  isDefault: boolean
  createdAt: string
}

export interface ApiOrderItem {
  id: string
  ownProductId: string
  ownProduct: { id: string; name: string; images: string[]; price: string }
  quantity: number
  priceAtPurchase: string
}

export interface ApiInstallmentOption {
  installments: number
  rate: number
  installmentAmount: number
  totalAmount: number
  label: string
}

export interface ApiPaymentMethod {
  id: string
  mpCardId: string
  brand: string
  lastFour: string
  holderName: string
  expirationMonth: number
  expirationYear: number
}

export interface ApiOrder {
  id: string
  userId: string
  status: 'PENDING' | 'PAID' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  total: string
  shippingFee: string
  mercadoPagoPaymentId?: string | null
  mercadoPagoPixQrCode?: string | null
  mercadoPagoPixCode?: string | null
  trackingCode?: string | null
  addressId: string
  address: ApiAddress
  items: ApiOrderItem[]
  createdAt: string
  updatedAt: string
}
