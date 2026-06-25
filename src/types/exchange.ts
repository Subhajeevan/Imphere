export type ProductCategory =
  | 'all' | 'eco' | 'electronics' | 'gift-cards' | 'food'
  | 'travel' | 'health' | 'learning' | 'fitness' | 'plants'
  | 'fashion' | 'events' | 'digital' | 'donations' | 'local' | 'exclusive'

export type ExchangeLevel = 'Citizen' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
export type RedemptionStatus = 'upcoming' | 'completed' | 'expired' | 'cancelled'
export type SortOption = 'trending' | 'lowest-points' | 'highest-rated' | 'newest' | 'limited-time'

export interface ExchangeProduct {
  id: string
  name: string
  description: string
  emoji: string
  bgColor: string
  brandName: string
  pointsCost: number
  realPrice: number
  discountPercent: number
  category: ProductCategory
  stock: number
  totalStock: number
  isSponsored: boolean
  sponsorName?: string
  isTrending: boolean
  isLimited: boolean
  isNew: boolean
  rating: number
  reviews: number
  expiresAt?: string
  deliveryDays?: number
  tags: string[]
  minLevel?: ExchangeLevel
  howToRedeem: string
  terms: string
}

export interface ExchangeCategory {
  id: ProductCategory
  label: string
  emoji: string
  count: number
  bgColor: string
}

export interface RedemptionRecord {
  id: string
  productName: string
  merchantName: string
  pointsUsed: number
  redeemedAt: string
  status: RedemptionStatus
  code?: string
  expiresAt?: string
  emoji: string
}

export interface CSRPartner {
  id: string
  name: string
  initials: string
  bgColor: string
  campaign: string
  rewardsSponsored: number
  impactGenerated: string
}

export interface NearbyOffer {
  id: string
  name: string
  type: string
  distance: string
  pointsRequired: number
  validDays: number
  rating: number
  offer: string
  emoji: string
}

export interface DailyDeal {
  id: string
  name: string
  emoji: string
  bgColor: string
  brandName: string
  pointsCost: number
  realPrice: number
  discountPercent: number
  endsAt: string
  claimed: number
  total: number
}

export interface HeroBanner {
  id: string
  emoji: string
  title: string
  subtitle: string
  gradient: string
  badge: string
}

export interface ExchangeStats {
  productsRedeemed: number
  moneySaved: string
  co2Saved: string
  treesSponsored: number
  csrCampaigns: number
}
