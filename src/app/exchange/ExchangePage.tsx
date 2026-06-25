'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { AppLayout } from '@/components/layout/AppLayout'
import { cn, formatCompactNumber, formatRelativeTime } from '@/lib/utils'
import {
  Coins, Search, X, Heart, Star, MapPin, Clock,
  Gift, TrendingUp, CheckCircle2, Loader2,
  Flame, Crown, Filter, ArrowRight,
  Lock, Percent, Sparkles, ShoppingBag,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import type {
  ExchangeProduct, ExchangeCategory, ProductCategory, SortOption,
  RedemptionStatus, ExchangeLevel, DailyDeal, RedemptionRecord,
  NearbyOffer, CSRPartner,
} from '@/types/exchange'

// ── Static UI content (not product data) ─────────────────────────────────────

const HERO_BANNERS = [
  {
    gradient: 'from-violet-600 to-indigo-600',
    badge: 'New This Week',
    emoji: '🎁',
    title: 'Fresh Rewards Just Dropped',
    subtitle: 'Over 50 new rewards from local businesses and CSR partners.',
  },
  {
    gradient: 'from-emerald-600 to-teal-600',
    badge: 'Eco Special',
    emoji: '🌳',
    title: 'Green Rewards Month',
    subtitle: 'Earn 2× IC on all environment-related activities this month.',
  },
  {
    gradient: 'from-gold to-amber-500',
    badge: 'Limited Time',
    emoji: '⚡',
    title: 'Flash Sale: 48 Hours',
    subtitle: 'Top-tier rewards at half the IC cost. Act fast!',
  },
  {
    gradient: 'from-rose-500 to-pink-600',
    badge: 'Community Pick',
    emoji: '❤️',
    title: 'Most Loved Rewards',
    subtitle: 'Curated by 12,000 active community members.',
  },
]

const NEARBY_OFFERS: NearbyOffer[] = [
  { id: 'n1', name: 'Chai Point',  type: 'Café',           distance: '0.2 km', pointsRequired: 50,  validDays: 3,  rating: 4.5, offer: '10% off any chai',       emoji: '🍵' },
  { id: 'n2', name: 'City Books',  type: 'Bookstore',      distance: '0.5 km', pointsRequired: 100, validDays: 7,  rating: 4.3, offer: '₹50 off on purchase',    emoji: '📖' },
  { id: 'n3', name: 'FreshMart',   type: 'Grocery',        distance: '0.8 km', pointsRequired: 150, validDays: 5,  rating: 4.6, offer: 'Free delivery on order', emoji: '🛒' },
  { id: 'n4', name: 'YogaZen',     type: 'Fitness Studio', distance: '1.1 km', pointsRequired: 200, validDays: 14, rating: 4.8, offer: '1 free yoga class',      emoji: '🧘' },
]

const CSR_PARTNERS: CSRPartner[] = [
  { id: 'c1', name: 'GreenTech Corp',   initials: 'GT', bgColor: 'bg-emerald-500', campaign: 'Solar Panel Initiative', rewardsSponsored: 23, impactGenerated: '1,200 trees' },
  { id: 'c2', name: 'NestlÉ India',     initials: 'NE', bgColor: 'bg-blue-500',    campaign: 'Clean Water Access',     rewardsSponsored: 15, impactGenerated: '800 wells'   },
  { id: 'c3', name: 'Tata Motors',      initials: 'TM', bgColor: 'bg-indigo-500',  campaign: 'EV Mobility Grants',     rewardsSponsored: 31, impactGenerated: '4.2t CO₂'   },
  { id: 'c4', name: 'Reliance Found.',  initials: 'RF', bgColor: 'bg-violet-500',  campaign: 'Digital Literacy Drive', rewardsSponsored: 18, impactGenerated: '2,100 kids' },
  { id: 'c5', name: 'HDFC Bank CSR',    initials: 'HB', bgColor: 'bg-rose-500',    campaign: 'Women Empowerment Fund', rewardsSponsored: 12, impactGenerated: '500 women'  },
]

const EXCHANGE_GLOBAL_STATS = {
  productsRedeemed: 84200,
  moneySaved:       '₹1.2Cr',
  co2Saved:         '340 tonnes',
  treesSponsored:   12000,
  csrCampaigns:     47,
}

// ── Level configuration ───────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<ExchangeLevel, { color: string; emoji: string; min: number; max: number | null }> = {
  Citizen:  { color: '#6B7280', emoji: '🏷️',  min: 0,     max: 999   },
  Bronze:   { color: '#CD7F32', emoji: '🥉',  min: 1000,  max: 4999  },
  Silver:   { color: '#C0C0C0', emoji: '🥈',  min: 5000,  max: 14999 },
  Gold:     { color: '#D4AF37', emoji: '🥇',  min: 15000, max: 49999 },
  Platinum: { color: '#B5B5D5', emoji: '💎',  min: 50000, max: null  },
}

function computeLevel(lifetime: number): ExchangeLevel {
  if (lifetime >= 50000) return 'Platinum'
  if (lifetime >= 15000) return 'Gold'
  if (lifetime >= 5000)  return 'Silver'
  if (lifetime >= 1000)  return 'Bronze'
  return 'Citizen'
}

function nextLevel(level: ExchangeLevel): ExchangeLevel | null {
  const order: ExchangeLevel[] = ['Citizen', 'Bronze', 'Silver', 'Gold', 'Platinum']
  const idx = order.indexOf(level)
  return idx < order.length - 1 ? order[idx + 1] : null
}

// ── Countdown hook ────────────────────────────────────────────────────────────

function useCountdown(target: Date) {
  const [diff, setDiff] = useState(() => Math.max(0, target.getTime() - Date.now()))
  useEffect(() => {
    const id = setInterval(() => setDiff(Math.max(0, target.getTime() - Date.now())), 1000)
    return () => clearInterval(id)
  }, [target])
  return {
    h: Math.floor(diff / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
    expired: diff === 0,
  }
}

// ── Reusable sub-components ───────────────────────────────────────────────────

function SectionHeader({
  title, subtitle, action, actionLabel,
}: { title: string; subtitle?: string; action?: () => void; actionLabel?: string }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-xl font-serif font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action && (
        <button
          onClick={action}
          className="flex items-center gap-1 text-xs font-semibold text-gold hover:text-gold-dark transition-colors"
        >
          {actionLabel ?? 'See all'} <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

function RewardCard({
  product, balance, isWishlisted, onWishlist, onSelect,
}: {
  product: ExchangeProduct
  balance: number
  isWishlisted: boolean
  onWishlist: (id: string) => void
  onSelect: (p: ExchangeProduct) => void
}) {
  const canAfford = balance >= product.pointsCost
  const isLocked  = product.minLevel !== undefined

  return (
    <div
      onClick={() => onSelect(product)}
      className={cn(
        'group relative rounded-3xl border bg-card overflow-hidden cursor-pointer',
        'transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
        canAfford ? 'border-border hover:border-gold/40' : 'border-border opacity-70',
      )}
    >
      {/* Image area */}
      <div className={cn('relative aspect-[4/3] flex items-center justify-center text-6xl', product.bgColor)}>
        <span>{product.emoji}</span>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isTrending && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
              <Flame className="w-2.5 h-2.5" /> Trending
            </span>
          )}
          {product.isNew && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
              <Sparkles className="w-2.5 h-2.5" /> New
            </span>
          )}
          {product.isLimited && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
              <Clock className="w-2.5 h-2.5" /> Limited
            </span>
          )}
        </div>

        {/* Discount badge */}
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center gap-0.5 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-bold text-gold">
            <Percent className="w-2.5 h-2.5" />{product.discountPercent}% off
          </span>
        </div>

        {/* Wishlist button */}
        <button
          onClick={e => { e.stopPropagation(); onWishlist(product.id) }}
          className={cn(
            'absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full transition',
            isWishlisted
              ? 'bg-red-500 text-white'
              : 'bg-white/80 text-muted-foreground hover:text-red-500',
          )}
        >
          <Heart className={cn('w-3.5 h-3.5', isWishlisted && 'fill-current')} />
        </button>

        {/* Lock overlay */}
        {isLocked && !canAfford && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
            <Lock className="w-5 h-5 text-white" />
            <span className="text-[10px] text-white font-semibold">{product.minLevel}+ only</span>
          </div>
        )}

        {/* Sponsor tag */}
        {product.isSponsored && (
          <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-foreground">
            CSR ✦ {product.sponsorName}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="p-3">
        <p className="text-[11px] text-muted-foreground font-medium">{product.brandName}</p>
        <p className="mt-0.5 text-sm font-semibold text-foreground line-clamp-2 leading-snug">{product.name}</p>

        {/* Rating */}
        <div className="mt-1.5 flex items-center gap-1">
          <Star className="w-3 h-3 fill-gold text-gold" />
          <span className="text-[11px] font-semibold text-foreground">{product.rating}</span>
          <span className="text-[11px] text-muted-foreground">({product.reviews})</span>
        </div>

        {/* Stock bar */}
        {product.stock < product.totalStock * 0.3 && (
          <div className="mt-2">
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="text-muted-foreground">Stock</span>
              <span className="font-semibold text-orange-500">{product.stock} left</span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-orange-400 rounded-full transition-all"
                style={{ width: `${(product.stock / product.totalStock) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Price row */}
        <div className="mt-2 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-gold" />
              <span className="text-sm font-bold text-gold">{product.pointsCost} IC</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Real value ₹{product.realPrice}</p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onSelect(product) }}
            disabled={!canAfford}
            className={cn(
              'rounded-full px-3 py-1.5 text-[11px] font-bold transition',
              canAfford
                ? 'bg-gold text-black hover:bg-gold-dark'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
          >
            {canAfford ? 'Redeem' : 'Need more IC'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProductSkeleton() {
  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-muted" />
      <div className="p-3 space-y-2">
        <div className="h-2.5 bg-muted rounded-full w-1/2" />
        <div className="h-3.5 bg-muted rounded-full w-3/4" />
        <div className="h-2.5 bg-muted rounded-full w-1/3" />
        <div className="flex justify-between items-center mt-3">
          <div className="h-4 bg-muted rounded-full w-16" />
          <div className="h-7 bg-muted rounded-full w-20" />
        </div>
      </div>
    </div>
  )
}

function DealCountdown({ endsAt }: { endsAt: string }) {
  const target = useMemo(() => new Date(endsAt), [endsAt])
  const { h, m, s, expired } = useCountdown(target)
  if (expired) return <span className="text-red-500 text-xs font-bold">Expired</span>
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <div className="flex items-center gap-1">
      {[pad(h), pad(m), pad(s)].map((unit, i) => (
        <span key={i} className="flex items-center gap-0.5">
          <span className="inline-block min-w-[28px] rounded-lg bg-black text-white text-xs font-bold text-center py-1 tabular-nums">{unit}</span>
          {i < 2 && <span className="text-xs font-bold text-foreground">:</span>}
        </span>
      ))}
    </div>
  )
}

function DealCard({
  deal, balance, onSelect,
}: { deal: DailyDeal; balance: number; onSelect: () => void }) {
  const claimedPct = Math.round((deal.claimed / deal.total) * 100)
  const canAfford  = balance >= deal.pointsCost

  return (
    <div className="rounded-3xl border border-border bg-card p-4 flex gap-4">
      <div className={cn('w-20 h-20 rounded-2xl flex-shrink-0 flex items-center justify-center text-4xl', deal.bgColor)}>
        {deal.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground font-medium">{deal.brandName}</p>
        <p className="text-sm font-semibold text-foreground line-clamp-1">{deal.name}</p>
        <div className="mt-1 flex items-center gap-2">
          <DealCountdown endsAt={deal.endsAt} />
          <span className="text-[10px] text-muted-foreground">remaining</span>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{deal.claimed} claimed</span>
            <span>{deal.total - deal.claimed} left</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold to-amber-300 transition-all duration-500"
              style={{ width: `${claimedPct}%` }}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between flex-shrink-0">
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <Coins className="w-3 h-3 text-gold" />
            <span className="text-sm font-bold text-gold">{deal.pointsCost}</span>
          </div>
          <span className="text-[10px] text-muted-foreground line-through">₹{deal.realPrice}</span>
        </div>
        <button
          onClick={onSelect}
          disabled={!canAfford}
          className={cn(
            'rounded-full px-3 py-1.5 text-[11px] font-bold transition',
            canAfford ? 'bg-gold text-black hover:bg-gold-dark' : 'bg-muted text-muted-foreground cursor-not-allowed',
          )}
        >
          Grab deal
        </button>
      </div>
    </div>
  )
}

// ── Redeem Modal ──────────────────────────────────────────────────────────────

type RedeemResult = { success: boolean; code?: string; error?: string }

function RewardModal({
  product, balance, isRedeeming, redeemResult, onRedeem, onClose,
}: {
  product: ExchangeProduct
  balance: number
  isRedeeming: boolean
  redeemResult: RedeemResult | null
  onRedeem: () => void
  onClose: () => void
}) {
  const canAfford = balance >= product.pointsCost

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-border flex items-center justify-between px-5 py-4 z-10">
          <h3 className="font-serif font-bold text-foreground text-lg">
            {redeemResult ? (redeemResult.success ? 'Redeemed!' : 'Failed') : 'Reward Details'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Success state */}
          {redeemResult?.success ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <div>
                <h4 className="text-xl font-serif font-bold text-foreground">Success!</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Show this QR code or redemption code at <strong>{product.brandName}</strong>
                </p>
              </div>
              <div className="flex justify-center">
                <QRCodeSVG
                  value={redeemResult.code ?? 'IMPHERE'}
                  size={160}
                  fgColor="#1A1A1A"
                  bgColor="#FFFFFF"
                  level="M"
                />
              </div>
              <div className="rounded-2xl bg-muted/50 px-4 py-3 border border-border">
                <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">Redemption Code</p>
                <p className="text-xl font-mono font-bold text-foreground tracking-widest">{redeemResult.code}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <p>Screenshot this code. It will also appear in your Redemption History.</p>
              </div>
              <button onClick={onClose} className="w-full py-3 rounded-2xl bg-black text-white font-semibold text-sm hover:bg-black/80 transition">
                Done
              </button>
            </div>
          ) : redeemResult?.error ? (
            /* Error state */
            <div className="text-center py-4 space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-red-50 flex items-center justify-center">
                <X className="w-10 h-10 text-red-500" />
              </div>
              <h4 className="text-lg font-serif font-bold text-foreground">Redemption Failed</h4>
              <p className="text-sm text-muted-foreground">{redeemResult.error}</p>
              <button onClick={onClose} className="w-full py-3 rounded-2xl bg-black text-white font-semibold text-sm">Done</button>
            </div>
          ) : (
            /* Default state */
            <>
              {/* Product hero */}
              <div className={cn('rounded-3xl flex items-center justify-center h-48 text-8xl', product.bgColor)}>
                {product.emoji}
              </div>

              {/* Badges row */}
              <div className="flex flex-wrap gap-2">
                {product.isSponsored && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 border border-gold/30 px-3 py-1 text-xs font-semibold text-gold">
                    <Sparkles className="w-3 h-3" /> CSR Sponsored · {product.sponsorName}
                  </span>
                )}
                {product.isTrending && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-600">
                    <Flame className="w-3 h-3" /> Trending
                  </span>
                )}
                {product.isLimited && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-600">
                    <Clock className="w-3 h-3" /> Limited Time
                  </span>
                )}
              </div>

              {/* Name + brand */}
              <div>
                <p className="text-sm text-muted-foreground font-medium">{product.brandName}</p>
                <h4 className="text-xl font-serif font-bold text-foreground mt-0.5">{product.name}</h4>
                <div className="mt-1 flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn('w-3.5 h-3.5', i < Math.round(product.rating) ? 'fill-gold text-gold' : 'text-muted')} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">{product.rating} ({product.reviews} reviews)</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>

              {/* How to redeem */}
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-2">How Redemption Works</p>
                <p className="text-sm text-emerald-800">{product.howToRedeem}</p>
                {product.deliveryDays !== undefined && product.deliveryDays > 0 && (
                  <p className="text-xs text-emerald-600 mt-1">📦 Delivered within {product.deliveryDays} business days</p>
                )}
              </div>

              {/* Terms */}
              <div className="rounded-2xl bg-muted/50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Terms & Conditions</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{product.terms}</p>
              </div>

              {/* Price summary */}
              <div className="rounded-2xl border border-border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cost</span>
                  <span className="font-bold text-gold flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" /> {product.pointsCost} IC
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Real market value</span>
                  <span className="font-medium">₹{product.realPrice}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">You save</span>
                  <span className="font-bold text-emerald-600">{product.discountPercent}% vs market</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Balance after redemption</span>
                  <span className={cn('font-bold', canAfford ? 'text-foreground' : 'text-red-500')}>
                    {balance - product.pointsCost} IC
                  </span>
                </div>
              </div>

              {/* Level lock warning */}
              {product.minLevel && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
                  <Lock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    Requires <strong>{product.minLevel}</strong> reward level or above to redeem.
                  </p>
                </div>
              )}

              {/* CTA */}
              {!canAfford ? (
                <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-center">
                  <p className="text-sm text-red-700 font-semibold">
                    You need {product.pointsCost - balance} more IC to redeem this reward.
                  </p>
                  <p className="text-xs text-red-500 mt-1">Complete challenges to earn more Impact Credits.</p>
                </div>
              ) : (
                <button
                  onClick={onRedeem}
                  disabled={isRedeeming}
                  className="w-full py-4 rounded-2xl bg-gold text-black font-bold text-sm hover:bg-gold-dark transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isRedeeming ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                  ) : (
                    <><Coins className="w-4 h-4" /> Redeem for {product.pointsCost} IC</>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Exchange Page ────────────────────────────────────────────────────────

interface ExchangePageProps {
  user?: {
    displayName: string
    avatarUrl?: string
    standing: number
    badge: string
  }
  impactCredits: number
  lifetimeEarned: number
  pointsRedeemed: number
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'trending',      label: 'Trending'       },
  { value: 'lowest-points', label: 'Lowest Points'  },
  { value: 'highest-rated', label: 'Highest Rated'  },
  { value: 'newest',        label: 'Newest'         },
  { value: 'limited-time',  label: 'Limited Time'   },
]

export function ExchangePage({ user, impactCredits, lifetimeEarned, pointsRedeemed }: ExchangePageProps) {
  const [balance,              setBalance]              = useState(impactCredits)
  const [activeCategory,       setActiveCategory]       = useState<ProductCategory>('all')
  const [searchQuery,          setSearchQuery]          = useState('')
  const [sortBy,               setSortBy]              = useState<SortOption>('trending')
  const [historyTab,           setHistoryTab]          = useState<RedemptionStatus>('upcoming')
  const [selectedProduct,      setSelectedProduct]     = useState<ExchangeProduct | null>(null)
  const [wishlist,             setWishlist]            = useState<Set<string>>(new Set())
  const [isRedeeming,          setIsRedeeming]         = useState(false)
  const [redeemResult,         setRedeemResult]        = useState<RedeemResult | null>(null)
  const [bannerIdx,            setBannerIdx]           = useState(0)
  const [showFilters,          setShowFilters]         = useState(false)

  // Live data from API
  const [products,             setProducts]            = useState<ExchangeProduct[]>([])
  const [categories,           setCategories]          = useState<ExchangeCategory[]>([])
  const [featured,             setFeatured]            = useState<ExchangeProduct[]>([])
  const [recommended,          setRecommended]         = useState<ExchangeProduct[]>([])
  const [dailyDeals,           setDailyDeals]          = useState<DailyDeal[]>([])
  const [historyRecords,       setHistoryRecords]      = useState<RedemptionRecord[]>([])
  const [leaderboardProducts,  setLeaderboardProducts] = useState<ExchangeProduct[]>([])
  const [isLoadingProducts,    setIsLoadingProducts]   = useState(true)

  const carouselRef = useRef<HTMLDivElement>(null)

  // Rotating banner
  useEffect(() => {
    const id = setInterval(() => setBannerIdx(i => (i + 1) % HERO_BANNERS.length), 4000)
    return () => clearInterval(id)
  }, [])

  // Load all data in parallel on mount
  useEffect(() => {
    const load = async () => {
      setIsLoadingProducts(true)

      const [
        productsRes, categoriesRes, featuredRes,
        recommendedRes, offersRes, historyRes, leaderboardRes, wishlistRes,
      ] = await Promise.allSettled([
        fetch('/api/exchange/products'),
        fetch('/api/exchange/categories'),
        fetch('/api/exchange/featured'),
        fetch('/api/exchange/recommended'),
        fetch('/api/exchange/offers'),
        fetch('/api/exchange/history'),
        fetch('/api/exchange/leaderboard-rewards'),
        fetch('/api/exchange/wishlist'),
      ])

      if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
        const d = await productsRes.value.json()
        setProducts(d.products ?? [])
      }
      if (categoriesRes.status === 'fulfilled' && categoriesRes.value.ok) {
        const d = await categoriesRes.value.json()
        setCategories(d.categories ?? [])
      }
      if (featuredRes.status === 'fulfilled' && featuredRes.value.ok) {
        const d = await featuredRes.value.json()
        setFeatured(d.products ?? [])
      }
      if (recommendedRes.status === 'fulfilled' && recommendedRes.value.ok) {
        const d = await recommendedRes.value.json()
        setRecommended(d.products ?? [])
      }
      if (offersRes.status === 'fulfilled' && offersRes.value.ok) {
        const d = await offersRes.value.json()
        setDailyDeals(d.dailyDeals ?? [])
      }
      if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
        const d = await historyRes.value.json()
        setHistoryRecords(d.records ?? [])
      }
      if (leaderboardRes.status === 'fulfilled' && leaderboardRes.value.ok) {
        const d = await leaderboardRes.value.json()
        setLeaderboardProducts(d.products ?? [])
      }
      if (wishlistRes.status === 'fulfilled' && wishlistRes.value.ok) {
        const d = await wishlistRes.value.json()
        setWishlist(new Set(d.productIds ?? []))
      }

      setIsLoadingProducts(false)
    }

    load()
  }, [])

  // Derived level
  const currentLevel = useMemo(() => computeLevel(lifetimeEarned), [lifetimeEarned])
  const next         = nextLevel(currentLevel)
  const levelCfg     = LEVEL_CONFIG[currentLevel]
  const nextCfg      = next ? LEVEL_CONFIG[next] : null
  const progressPct  = nextCfg
    ? Math.round(((lifetimeEarned - levelCfg.min) / ((nextCfg.min) - levelCfg.min)) * 100)
    : 100

  // Filtered products (client-side from live state)
  const filtered = useMemo(() => {
    let list = [...products]
    if (activeCategory !== 'all') list = list.filter(p => p.category === activeCategory)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brandName.toLowerCase().includes(q) ||
        p.tags.some(t => t.includes(q)),
      )
    }
    switch (sortBy) {
      case 'lowest-points':  return list.sort((a, b) => a.pointsCost - b.pointsCost)
      case 'highest-rated':  return list.sort((a, b) => b.rating - a.rating)
      case 'newest':         return [...list.filter(p => p.isNew), ...list.filter(p => !p.isNew)]
      case 'limited-time':   return [...list.filter(p => p.isLimited), ...list.filter(p => !p.isLimited)]
      default:               return [...list.filter(p => p.isTrending), ...list.filter(p => !p.isTrending)]
    }
  }, [products, activeCategory, searchQuery, sortBy])

  const historyFiltered = useMemo(
    () => historyRecords.filter(r => r.status === historyTab),
    [historyRecords, historyTab],
  )

  // Wishlist toggle — optimistic with API sync
  const toggleWishlist = useCallback(async (id: string) => {
    const wasWishlisted = wishlist.has(id)
    setWishlist(prev => {
      const n = new Set(prev)
      wasWishlisted ? n.delete(id) : n.add(id)
      return n
    })
    try {
      await fetch('/api/exchange/wishlist', {
        method:  wasWishlisted ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ productId: id }),
      })
    } catch {
      // Revert on failure
      setWishlist(prev => {
        const n = new Set(prev)
        wasWishlisted ? n.add(id) : n.delete(id)
        return n
      })
    }
  }, [wishlist])

  const handleRedeem = async () => {
    if (!selectedProduct) return
    setIsRedeeming(true)
    try {
      const res  = await fetch('/api/exchange/redeem', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ productId: selectedProduct.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setRedeemResult({ success: true, code: data.code })
        setBalance(b => b - selectedProduct.pointsCost)
        // Refresh history after successful redemption
        fetch('/api/exchange/history')
          .then(r => r.ok ? r.json() : { records: [] })
          .then(d => setHistoryRecords(d.records ?? []))
          .catch(() => {})
      } else {
        setRedeemResult({ success: false, error: data.error })
      }
    } catch {
      setRedeemResult({ success: false, error: 'Something went wrong. Please try again.' })
    } finally {
      setIsRedeeming(false)
    }
  }

  const closeModal = () => { setSelectedProduct(null); setRedeemResult(null) }

  const scrollCarousel = (dir: 'left' | 'right') => {
    if (!carouselRef.current) return
    carouselRef.current.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' })
  }

  const banner = HERO_BANNERS[bannerIdx]

  // Helper: find full product for a daily deal (deals are products in the main list)
  const dealProduct = (deal: DailyDeal): ExchangeProduct | undefined =>
    products.find(p => p.id === deal.id)

  return (
    <AppLayout user={user}>
      <div className="space-y-8 px-4 py-5 sm:px-0 pb-16">

        {/* ── 1. Page Header ──────────────────────────────────────────────── */}
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Exchange</p>
          <h1 className="mt-1 text-3xl font-serif font-bold text-foreground">Reward Marketplace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Redeem your impact. Every reward represents real change.
          </p>
        </div>

        {/* ── 2. User Summary Cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Available IC */}
          <div className="col-span-2 rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/10 to-amber-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-4 h-4 text-gold" />
              <span className="text-xs font-semibold uppercase tracking-widest text-gold">Available Credits</span>
            </div>
            <p className="text-4xl font-serif font-bold text-foreground">{formatCompactNumber(balance)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Impact Credits · not redeemable for cash</p>

            {/* Level + Progress */}
            <div className="mt-4 pt-4 border-t border-gold/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{levelCfg.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-foreground">{currentLevel} Level</p>
                    {next && nextCfg && (
                      <p className="text-[10px] text-muted-foreground">
                        {(nextCfg.min - lifetimeEarned).toLocaleString()} IC to {next}
                      </p>
                    )}
                  </div>
                </div>
                {next && (
                  <div className="flex items-center gap-1">
                    <span className="text-sm">{nextCfg?.emoji}</span>
                    <span className="text-xs text-muted-foreground">{next}</span>
                  </div>
                )}
              </div>
              <div className="h-2 rounded-full bg-white/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold to-amber-300 transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{progressPct}% to {next ?? 'Max level'}</p>
            </div>
          </div>

          {/* Lifetime Earned */}
          <div className="rounded-3xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Lifetime Earned</span>
            </div>
            <p className="text-2xl font-serif font-bold text-foreground">{formatCompactNumber(lifetimeEarned)}</p>
            <p className="text-[10px] text-muted-foreground">Impact Credits total</p>
          </div>

          {/* Points Redeemed */}
          <div className="rounded-3xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Gift className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Redeemed</span>
            </div>
            <p className="text-2xl font-serif font-bold text-foreground">{formatCompactNumber(pointsRedeemed)}</p>
            <p className="text-[10px] text-muted-foreground">Impact Credits spent</p>
          </div>
        </div>

        {/* ── 3. Hero Banner ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden">
          <div className={cn('rounded-3xl p-6 bg-gradient-to-br text-white transition-all duration-700', banner.gradient)}>
            <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest mb-3">
              {banner.badge}
            </span>
            <div className="flex items-start gap-4">
              <span className="text-5xl">{banner.emoji}</span>
              <div>
                <h3 className="text-xl font-serif font-bold">{banner.title}</h3>
                <p className="text-sm opacity-90 mt-1">{banner.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5 mt-3">
            {HERO_BANNERS.map((_, i) => (
              <button
                key={i}
                onClick={() => setBannerIdx(i)}
                className={cn(
                  'rounded-full transition-all duration-300',
                  i === bannerIdx ? 'w-5 h-1.5 bg-gold' : 'w-1.5 h-1.5 bg-border',
                )}
              />
            ))}
          </div>
        </div>

        {/* ── 4. Search + Filters ─────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search rewards, brands, categories…"
              className="w-full rounded-3xl border border-border bg-card pl-11 pr-12 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition"
            />
            <button
              onClick={() => setShowFilters(f => !f)}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                showFilters ? 'bg-gold text-black' : 'bg-muted text-muted-foreground hover:bg-gold/10 hover:text-gold',
              )}
            >
              <Filter className="w-3 h-3" />
              Filter
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="rounded-3xl border border-border bg-card p-4 space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Sort by</p>
                <div className="flex flex-wrap gap-2">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSortBy(opt.value)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                        sortBy === opt.value
                          ? 'bg-gold text-black'
                          : 'bg-muted text-muted-foreground hover:bg-gold/10 hover:text-gold',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Category pills — horizontal scroll */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                'flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition',
                activeCategory === 'all'
                  ? 'bg-gold text-black'
                  : 'bg-muted text-muted-foreground hover:bg-gold/10 hover:text-gold',
              )}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'flex-shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition whitespace-nowrap',
                  activeCategory === cat.id
                    ? 'bg-gold text-black'
                    : 'bg-muted text-muted-foreground hover:bg-gold/10 hover:text-gold',
                )}
              >
                <span>{cat.emoji}</span> {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 5. Category Grid ────────────────────────────────────────────── */}
        {activeCategory === 'all' && !searchQuery && categories.length > 0 && (
          <div>
            <SectionHeader title="Browse Categories" subtitle="Find rewards by what matters to you" />
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {categories.slice(0, 12).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-2xl p-3 transition hover:shadow-md hover:-translate-y-0.5',
                    cat.bgColor, 'border border-transparent hover:border-gold/30',
                  )}
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <span className="text-[10px] font-semibold text-foreground text-center leading-tight">{cat.label}</span>
                  <span className="text-[9px] text-muted-foreground">{cat.count} rewards</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── 6. Featured Carousel ────────────────────────────────────────── */}
        {activeCategory === 'all' && !searchQuery && featured.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-foreground">Featured Rewards</h2>
                <p className="text-xs text-muted-foreground">Handpicked by our community leaders</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => scrollCarousel('left')} className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card hover:bg-muted transition">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => scrollCarousel('right')} className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card hover:bg-muted transition">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div
              ref={carouselRef}
              className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {featured.map(product => (
                <div key={product.id} className="flex-shrink-0 w-52" style={{ scrollSnapAlign: 'start' }}>
                  <RewardCard
                    product={product}
                    balance={balance}
                    isWishlisted={wishlist.has(product.id)}
                    onWishlist={toggleWishlist}
                    onSelect={setSelectedProduct}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 7. Rewards Grid ─────────────────────────────────────────────── */}
        <div>
          <SectionHeader
            title={activeCategory === 'all' && !searchQuery ? 'All Rewards' : searchQuery ? `Results for "${searchQuery}"` : categories.find(c => c.id === activeCategory)?.label ?? 'Rewards'}
            subtitle={isLoadingProducts ? 'Loading…' : `${filtered.length} reward${filtered.length !== 1 ? 's' : ''} available`}
          />
          {isLoadingProducts ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-border bg-muted/30 p-12 text-center">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground font-medium">No rewards found</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different search or category</p>
              <button onClick={() => { setSearchQuery(''); setActiveCategory('all') }} className="mt-3 text-gold text-sm font-semibold hover:underline">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(product => (
                <RewardCard
                  key={product.id}
                  product={product}
                  balance={balance}
                  isWishlisted={wishlist.has(product.id)}
                  onWishlist={toggleWishlist}
                  onSelect={setSelectedProduct}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── 8. Daily Deals ──────────────────────────────────────────────── */}
        {activeCategory === 'all' && !searchQuery && dailyDeals.length > 0 && (
          <div>
            <SectionHeader title="⚡ Daily Deals" subtitle="Flash offers — gone when the timer hits zero" />
            <div className="space-y-3">
              {dailyDeals.map(deal => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  balance={balance}
                  onSelect={() => {
                    const p = dealProduct(deal)
                    if (p) setSelectedProduct(p)
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── 9. Recommended for You ──────────────────────────────────────── */}
        {activeCategory === 'all' && !searchQuery && recommended.length > 0 && (
          <div>
            <SectionHeader title="Recommended for You" subtitle="Based on your impact activities and location" />
            <div className="grid grid-cols-2 gap-3">
              {recommended.slice(0, 4).map(product => (
                <RewardCard
                  key={product.id}
                  product={product}
                  balance={balance}
                  isWishlisted={wishlist.has(product.id)}
                  onWishlist={toggleWishlist}
                  onSelect={setSelectedProduct}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── 10. Nearby Offers ───────────────────────────────────────────── */}
        {activeCategory === 'all' && !searchQuery && (
          <div>
            <SectionHeader title="📍 Nearby Offers" subtitle="Local merchants accepting Impact Credits near you" />
            <div className="grid grid-cols-2 gap-3">
              {NEARBY_OFFERS.map(offer => (
                <div key={offer.id} className="rounded-3xl border border-border bg-card p-4 hover:shadow-md hover:border-gold/30 transition cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{offer.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{offer.name}</p>
                      <p className="text-[10px] text-muted-foreground">{offer.type}</p>
                    </div>
                  </div>
                  <p className="text-xs text-foreground font-medium mb-2">"{offer.offer}"</p>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{offer.distance}</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-gold text-gold" />{offer.rating}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Coins className="w-3 h-3 text-gold" />
                      <span className="text-xs font-bold text-gold">{offer.pointsRequired} IC</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Valid {offer.validDays}d</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 11. Redemption History ──────────────────────────────────────── */}
        <div>
          <SectionHeader title="Redemption History" subtitle="Track all your past and upcoming rewards" />
          <div className="rounded-3xl border border-border bg-card overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-border">
              {(['upcoming', 'completed', 'expired', 'cancelled'] as RedemptionStatus[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setHistoryTab(tab)}
                  className={cn(
                    'flex-1 py-3 text-xs font-semibold capitalize transition',
                    historyTab === tab
                      ? 'border-b-2 border-gold text-gold'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Records */}
            <div className="divide-y divide-border">
              {historyFiltered.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <Gift className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No {historyTab} redemptions</p>
                </div>
              ) : (
                historyFiltered.map(record => (
                  <div key={record.id} className="flex items-center gap-3 p-4">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                      {record.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{record.productName}</p>
                      <p className="text-xs text-muted-foreground">{record.merchantName}</p>
                      {record.code && (
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{record.code}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        <Coins className="w-3 h-3 text-gold" />
                        <span className="text-sm font-bold text-foreground">{record.pointsUsed}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelativeTime(record.redeemedAt)}</p>
                      <span className={cn(
                        'inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase mt-1',
                        record.status === 'completed' && 'bg-emerald-100 text-emerald-700',
                        record.status === 'upcoming'  && 'bg-blue-100 text-blue-700',
                        record.status === 'expired'   && 'bg-red-100 text-red-700',
                        record.status === 'cancelled' && 'bg-muted text-muted-foreground',
                      )}>
                        {record.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── 12. Leaderboard Rewards ─────────────────────────────────────── */}
        {activeCategory === 'all' && !searchQuery && leaderboardProducts.length > 0 && (
          <div>
            <SectionHeader title="🏆 Leaderboard Rewards" subtitle="Exclusive rewards for top impact contributors" />
            <div className="space-y-3">
              {leaderboardProducts.map(reward => (
                <div
                  key={reward.id}
                  onClick={() => setSelectedProduct(reward)}
                  className="flex items-center gap-4 rounded-3xl border border-gold/20 bg-gradient-to-r from-amber-50 to-white p-4 cursor-pointer hover:shadow-md hover:border-gold/50 transition"
                >
                  <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0', reward.bgColor)}>
                    {reward.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Crown className="w-3 h-3 text-gold" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gold">{reward.minLevel}+ only</span>
                    </div>
                    <p className="text-sm font-bold text-foreground line-clamp-1">{reward.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{reward.description}</p>
                    {reward.isSponsored && (
                      <p className="text-[10px] text-gold mt-0.5">✦ {reward.sponsorName}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 justify-end">
                      <Coins className="w-3 h-3 text-gold" />
                      <span className="text-sm font-bold text-gold">{formatCompactNumber(reward.pointsCost)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{reward.stock} left</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 13. Achievements Unlock ─────────────────────────────────────── */}
        {activeCategory === 'all' && !searchQuery && (
          <div>
            <SectionHeader title="🎯 Achievement Rewards" subtitle="Unlock special rewards after reaching milestones" />
            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: '🌳', title: '100 Trees',          desc: 'Plant 100 trees total',            done: false, reward: '500 IC bonus'  },
                { emoji: '🩸', title: '10 Blood Donations', desc: '10 verified donations',            done: true,  reward: 'Health Kit'   },
                { emoji: '📅', title: '365-Day Streak',     desc: 'Login every day for a year',       done: false, reward: 'Platinum Badge' },
                { emoji: '⭕', title: 'Top Circle',         desc: 'Lead a top-10 Impact Circle',      done: false, reward: 'Circle Trophy' },
                { emoji: '🦸', title: 'Impact Hero',        desc: 'Top contributor in your district', done: false, reward: 'VIP Pass'      },
              ].map(a => (
                <div key={a.title} className={cn(
                  'rounded-3xl border p-4 transition',
                  a.done ? 'border-gold/40 bg-gold/5' : 'border-border bg-card opacity-70',
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{a.emoji}</span>
                    {a.done ? (
                      <CheckCircle2 className="w-4 h-4 text-gold" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm font-bold text-foreground">{a.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{a.desc}</p>
                  <p className={cn('text-[11px] font-semibold mt-2', a.done ? 'text-gold' : 'text-muted-foreground')}>
                    🎁 {a.reward}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 14. Gamification ────────────────────────────────────────────── */}
        {activeCategory === 'all' && !searchQuery && (
          <div>
            <SectionHeader title="🎮 Bonus Rewards" subtitle="Daily games to earn extra Impact Credits" />
            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: '🎰', title: 'Lucky Spin',         desc: 'Spin once daily',       badge: 'Available', color: 'bg-violet-50 border-violet-200'       },
                { emoji: '📦', title: 'Mystery Box',         desc: 'Open your daily box',   badge: 'Available', color: 'bg-blue-50 border-blue-200'            },
                { emoji: '🃏', title: 'Scratch Card',        desc: 'Reveal your prize',     badge: 'Claimed',   color: 'bg-muted border-border opacity-60'     },
                { emoji: '🎁', title: 'Weekly Reward Chest', desc: 'Every Sunday',          badge: '5 days',    color: 'bg-amber-50 border-amber-200'          },
                { emoji: '📅', title: 'Daily Login',         desc: '+10 IC for logging in', badge: '✓ Claimed', color: 'bg-muted border-border opacity-60'     },
              ].map(g => (
                <div key={g.title} className={cn('rounded-3xl border p-4 cursor-pointer hover:shadow-md transition', g.color)}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl">{g.emoji}</span>
                    <span className={cn(
                      'text-[9px] font-bold uppercase rounded-full px-2 py-0.5',
                      g.badge === 'Available' ? 'bg-emerald-100 text-emerald-700' :
                      g.badge === 'Claimed' || g.badge === '✓ Claimed' ? 'bg-muted text-muted-foreground' :
                      'bg-amber-100 text-amber-700',
                    )}>
                      {g.badge}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{g.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{g.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 15. Exchange Statistics ─────────────────────────────────────── */}
        {activeCategory === 'all' && !searchQuery && (
          <div>
            <SectionHeader title="Exchange Impact" subtitle="Collective impact made through the marketplace" />
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[
                  { emoji: '🛒', label: 'Products Redeemed', value: formatCompactNumber(EXCHANGE_GLOBAL_STATS.productsRedeemed) },
                  { emoji: '💰', label: 'Community Savings',  value: EXCHANGE_GLOBAL_STATS.moneySaved },
                  { emoji: '🌱', label: 'CO₂ Saved',          value: EXCHANGE_GLOBAL_STATS.co2Saved },
                  { emoji: '🌳', label: 'Trees Sponsored',    value: formatCompactNumber(EXCHANGE_GLOBAL_STATS.treesSponsored) },
                  { emoji: '🤝', label: 'CSR Campaigns',      value: String(EXCHANGE_GLOBAL_STATS.csrCampaigns) },
                ].map(stat => (
                  <div key={stat.label} className="text-center">
                    <span className="text-2xl">{stat.emoji}</span>
                    <p className="text-lg font-serif font-bold text-foreground mt-1">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 16. CSR Partner Showcase ────────────────────────────────────── */}
        {activeCategory === 'all' && !searchQuery && (
          <div>
            <SectionHeader title="CSR Partners" subtitle="Companies sponsoring your rewards and impact" />
            <div className="space-y-3">
              {CSR_PARTNERS.map(partner => (
                <div key={partner.id} className="rounded-3xl border border-border bg-card p-4 flex items-center gap-4">
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0', partner.bgColor)}>
                    {partner.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{partner.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{partner.campaign}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gold">{partner.rewardsSponsored}</p>
                    <p className="text-[10px] text-muted-foreground">rewards</p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">{partner.impactGenerated}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 17. Premium Features ────────────────────────────────────────── */}
        {activeCategory === 'all' && !searchQuery && (
          <div className="rounded-3xl border border-gold/30 bg-gradient-to-br from-black to-gray-900 p-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-5 h-5 text-gold" />
              <span className="text-xs font-bold uppercase tracking-widest text-gold">Impact Pro</span>
            </div>
            <h3 className="text-xl font-serif font-bold mb-1">Unlock Premium Benefits</h3>
            <p className="text-sm text-white/70 mb-4">Exclusive perks for our top impact contributors</p>
            <div className="space-y-2">
              {[
                '⚡ Priority redemption on limited rewards',
                '🎁 Exclusive rewards not listed publicly',
                '💎 10% bonus IC cashback on all redemptions',
                '🚀 Early access to new CSR campaigns',
              ].map(perk => (
                <div key={perk} className="flex items-center gap-2 text-sm text-white/90">
                  <span>{perk}</span>
                </div>
              ))}
            </div>
            <button className="mt-5 w-full rounded-2xl bg-gold text-black py-3 text-sm font-bold hover:bg-gold-dark transition">
              Unlock Impact Pro
            </button>
          </div>
        )}

      </div>

      {/* ── Reward Detail Modal ─────────────────────────────────────────────── */}
      {selectedProduct && (
        <RewardModal
          product={selectedProduct}
          balance={balance}
          isRedeeming={isRedeeming}
          redeemResult={redeemResult}
          onRedeem={handleRedeem}
          onClose={closeModal}
        />
      )}
    </AppLayout>
  )
}
