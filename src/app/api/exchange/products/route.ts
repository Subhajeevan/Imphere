import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') ?? 'all'
    const search   = (searchParams.get('search') ?? '').trim().toLowerCase()
    const sort     = searchParams.get('sort') ?? 'trending'

    let query = supabase
      .from('exchange_products')
      .select('*')
      .eq('is_active', true)
      .eq('is_leaderboard', false)

    if (category !== 'all') query = query.eq('category', category)

    switch (sort) {
      case 'lowest-points':  query = query.order('points_cost', { ascending: true });  break
      case 'highest-rated':  query = query.order('rating', { ascending: false });       break
      case 'newest':         query = query.order('created_at', { ascending: false });   break
      case 'limited-time':   query = query.eq('is_limited', true).order('expires_at', { ascending: true }); break
      default:               query = query.order('is_trending', { ascending: false }).order('rating', { ascending: false })
    }

    const { data, error } = await query
    if (error) {
      console.error('GET /api/exchange/products error:', error)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    let products = (data ?? []).map(mapRow)

    if (search) {
      products = products.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.brandName.toLowerCase().includes(search) ||
        p.tags.some((t: string) => t.includes(search)),
      )
    }

    return NextResponse.json({ products })
  } catch (err) {
    console.error('GET /api/exchange/products unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
