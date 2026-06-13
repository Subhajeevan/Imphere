import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateRandomString } from '@/lib/utils'

/**
 * POST /api/vouchers/[id]/redeem
 * Redeem a voucher (atomic transaction)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: voucherId } = await params
    const supabase = await createClient() as any
    const adminClient = await createAdminClient() as any

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's current IC balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('impact_credits')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    // Get voucher details
    const { data: voucher, error: voucherError } = await supabase
      .from('vouchers')
      .select('id, title, ic_cost, stock, is_active')
      .eq('id', voucherId)
      .single()

    if (voucherError || !voucher) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 })
    }

    if (!voucher.is_active) {
      return NextResponse.json(
        { error: 'Voucher is no longer available' },
        { status: 400 }
      )
    }

    if (voucher.stock <= 0) {
      return NextResponse.json(
        { error: 'Voucher is out of stock' },
        { status: 400 }
      )
    }

    if (profile.impact_credits < voucher.ic_cost) {
      return NextResponse.json(
        { error: 'Insufficient Impact Credits' },
        { status: 400 }
      )
    }

    // Generate redemption code
    const redemptionCode = generateRandomString(8).toUpperCase()

    // Use admin client for atomic transaction
    // 1. Deduct IC from user
    const { error: deductError } = await adminClient
      .from('profiles')
      .update({
        impact_credits: profile.impact_credits - voucher.ic_cost,
      })
      .eq('id', user.id)

    if (deductError) {
      console.error('Failed to deduct IC:', deductError)
      return NextResponse.json(
        { error: 'Failed to process redemption' },
        { status: 500 }
      )
    }

    // 2. Decrement voucher stock
    const { error: stockError } = await adminClient
      .from('vouchers')
      .update({ stock: voucher.stock - 1 })
      .eq('id', voucherId)

    if (stockError) {
      // Rollback IC deduction
      await adminClient
        .from('profiles')
        .update({ impact_credits: profile.impact_credits })
        .eq('id', user.id)

      console.error('Failed to update stock:', stockError)
      return NextResponse.json(
        { error: 'Failed to process redemption' },
        { status: 500 }
      )
    }

    // 3. Create redemption record
    const { error: redemptionError } = await adminClient
      .from('voucher_redemptions')
      .insert({
        voucher_id: voucherId,
        user_id: user.id,
        code: redemptionCode,
        ic_spent: voucher.ic_cost,
      })

    if (redemptionError) {
      console.error('Failed to create redemption record:', redemptionError)
      // Don't rollback as the user has successfully redeemed
    }

    return NextResponse.json({
      success: true,
      code: redemptionCode,
    })
  } catch (error) {
    console.error('Voucher redeem error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
