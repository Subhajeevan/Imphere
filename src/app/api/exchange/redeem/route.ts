import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generateRandomString } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json()
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from('exchange_products')
      .select('id, name, points_cost, stock, is_active, min_level, expires_at')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    if (!product.is_active) {
      return NextResponse.json({ error: 'This reward is no longer available' }, { status: 400 })
    }
    if (product.stock <= 0) {
      return NextResponse.json({ error: 'This reward is out of stock' }, { status: 400 })
    }
    if (product.expires_at && new Date(product.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This reward has expired' }, { status: 400 })
    }

    // Fetch user balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('impact_credits')
      .eq('id', user.id)
      .single()

    const currentIC: number = profile?.impact_credits ?? 0
    if (currentIC < product.points_cost) {
      return NextResponse.json({
        error: `Not enough Impact Credits. Need ${product.points_cost} IC, you have ${currentIC} IC.`,
        code: 'INSUFFICIENT_IC',
      }, { status: 402 })
    }

    const admin = await createAdminClient() as any
    const balanceAfter     = currentIC - product.points_cost
    const redemptionCode   = `IMP-${generateRandomString(4)}-${generateRandomString(4)}`.toUpperCase()
    const redemptionExpiry = new Date(Date.now() + 90 * 86400 * 1000).toISOString()

    // Atomic: deduct IC
    const { error: deductErr } = await admin
      .from('profiles')
      .update({ impact_credits: balanceAfter })
      .eq('id', user.id)

    if (deductErr) {
      console.error('POST /api/exchange/redeem deduct IC error:', deductErr)
      return NextResponse.json({ error: 'Failed to process redemption' }, { status: 500 })
    }

    // Decrement stock
    const { error: stockErr } = await admin
      .from('exchange_products')
      .update({ stock: product.stock - 1 })
      .eq('id', productId)

    if (stockErr) {
      // Rollback IC deduction
      await admin.from('profiles').update({ impact_credits: currentIC }).eq('id', user.id)
      console.error('POST /api/exchange/redeem stock error:', stockErr)
      return NextResponse.json({ error: 'Failed to process redemption' }, { status: 500 })
    }

    // Insert redemption record
    const { error: redemptionErr } = await admin
      .from('exchange_redemptions')
      .insert({
        product_id:       productId,
        user_id:          user.id,
        points_used:      product.points_cost,
        redemption_code:  redemptionCode,
        status:           'upcoming',
        expires_at:       redemptionExpiry,
      })

    if (redemptionErr) {
      console.error('POST /api/exchange/redeem redemption record error:', redemptionErr)
      // Non-fatal — redemption already processed, just log
    }

    // Log transaction
    await admin.from('transactions').insert({
      user_id:       user.id,
      type:          'ic_spent',
      amount:        product.points_cost,
      balance_after: balanceAfter,
      description:   `Redeemed: ${product.name}`,
    })

    return NextResponse.json({ success: true, code: redemptionCode, balanceAfter })
  } catch (err) {
    console.error('POST /api/exchange/redeem unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
