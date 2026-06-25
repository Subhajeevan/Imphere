import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { RedemptionRecord } from '@/types/exchange'

export async function GET() {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('exchange_redemptions')
      .select(`
        id, points_used, redemption_code, status, expires_at, created_at,
        product:exchange_products ( name, emoji, brand_name )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('GET /api/exchange/history error:', error)
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    const records: RedemptionRecord[] = (data ?? []).map((row: any) => ({
      id:           row.id,
      productName:  row.product?.name     ?? 'Unknown',
      merchantName: row.product?.brand_name ?? 'Unknown',
      pointsUsed:   row.points_used,
      redeemedAt:   row.created_at,
      status:       row.status,
      code:         row.redemption_code,
      expiresAt:    row.expires_at ?? undefined,
      emoji:        row.product?.emoji    ?? '🎁',
    }))

    return NextResponse.json({ records })
  } catch (err) {
    console.error('GET /api/exchange/history unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
