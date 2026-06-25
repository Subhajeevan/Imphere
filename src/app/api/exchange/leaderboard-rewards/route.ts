import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ExchangeProduct } from '@/types/exchange'

function mapRow(row: any): ExchangeProduct {
  return {
    id:              row.id,
    name:            row.name,
    description:     row.description,
    emoji:           row.emoji,
    bgColor:         row.bg_color,
    brandName:       row.brand_name,
    pointsCost:      row.points_cost,
    realPrice:       row.real_price,
    discountPercent: row.discount_percent,
    category:        row.category,
    stock:           row.stock,
    totalStock:      row.total_stock,
    isSponsored:     row.is_sponsored,
    sponsorName:     row.sponsor_name ?? undefined,
    isTrending:      row.is_trending,
    isLimited:       row.is_limited,
    isNew:           row.is_new,
    rating:          Number(row.rating),
    reviews:         row.reviews_count,
    expiresAt:       row.expires_at ?? undefined,
    deliveryDays:    row.delivery_days ?? undefined,
    tags:            row.tags ?? [],
    minLevel:        row.min_level ?? undefined,
    howToRedeem:     row.how_to_redeem,
    terms:           row.terms,
  }
}

export async function GET() {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('exchange_products')
      .select('*')
      .eq('is_active', true)
      .eq('is_leaderboard', true)
      .order('points_cost', { ascending: false })

    if (error) {
      console.error('GET /api/exchange/leaderboard-rewards error:', error)
      return NextResponse.json({ error: 'Failed to fetch leaderboard rewards' }, { status: 500 })
    }

    return NextResponse.json({ products: (data ?? []).map(mapRow) })
  } catch (err) {
    console.error('GET /api/exchange/leaderboard-rewards unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
