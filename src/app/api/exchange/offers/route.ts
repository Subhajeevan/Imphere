import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { DailyDeal, NearbyOffer } from '@/types/exchange'

// Nearby offers are static until geo/maps integration
const STATIC_NEARBY: NearbyOffer[] = [
  { id: 'n1', name: 'Chai Point',  type: 'Café',           distance: '0.2 km', pointsRequired: 50,  validDays: 3,  rating: 4.5, offer: '10% off any chai',       emoji: '🍵' },
  { id: 'n2', name: 'City Books',  type: 'Bookstore',      distance: '0.5 km', pointsRequired: 100, validDays: 7,  rating: 4.3, offer: '₹50 off on purchase',    emoji: '📖' },
  { id: 'n3', name: 'FreshMart',   type: 'Grocery',        distance: '0.8 km', pointsRequired: 150, validDays: 5,  rating: 4.6, offer: 'Free delivery on order', emoji: '🛒' },
  { id: 'n4', name: 'YogaZen',     type: 'Fitness Studio', distance: '1.1 km', pointsRequired: 200, validDays: 14, rating: 4.8, offer: '1 free yoga class',      emoji: '🧘' },
]

export async function GET() {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch active daily deals (deal ends in the future)
    const { data, error } = await supabase
      .from('exchange_products')
      .select('*')
      .eq('is_active', true)
      .eq('is_daily_deal', true)
      .gt('deal_ends_at', new Date().toISOString())
      .order('deal_ends_at', { ascending: true })

    if (error) {
      console.error('GET /api/exchange/offers error:', error)
      return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 })
    }

    const dailyDeals: DailyDeal[] = (data ?? []).map((row: any) => ({
      id:              row.id,
      name:            row.name,
      emoji:           row.emoji,
      bgColor:         row.bg_color,
      brandName:       row.brand_name,
      pointsCost:      row.points_cost,
      realPrice:       row.real_price,
      discountPercent: row.discount_percent,
      endsAt:          row.deal_ends_at,
      claimed:         row.deal_claimed ?? 0,
      total:           row.deal_total   ?? 0,
    }))

    return NextResponse.json({ dailyDeals, nearby: STATIC_NEARBY })
  } catch (err) {
    console.error('GET /api/exchange/offers unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
