import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's current IC balance
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('impact_credits')
      .eq('id', user.id)
      .single()

    const profile = profileData as any

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    // Get voucher details
    const { data: voucherData, error: voucherError } = await supabase
      .from('vouchers')
      .select('id, title, ic_cost, is_active, is_redeemed, encrypted_code')
      .eq('id', voucherId)
      .single()

    const voucher = voucherData as any

    if (voucherError || !voucher) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 })
    }

    if (!voucher.is_active || voucher.is_redeemed) {
      return NextResponse.json(
        { error: 'Voucher is no longer available' },
        { status: 400 }
      )
    }

    if (profile.impact_credits < voucher.ic_cost) {
      return NextResponse.json(
        { error: 'Insufficient Impact Credits' },
        { status: 400 }
      )
    }

    // Use admin client for atomic transaction
    // 1. Deduct IC from user
    const { error: deductError } = await (adminClient
      .from('profiles') as any)
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

    // 2. Mark voucher as redeemed
    const { error: redeemError } = await (adminClient
      .from('vouchers') as any)
      .update({
        is_redeemed: true,
        redeemed_by: user.id,
        redeemed_at: new Date().toISOString()
      })
      .eq('id', voucherId)

    if (redeemError) {
      // Rollback IC deduction
      await (adminClient
        .from('profiles') as any)
        .update({ impact_credits: profile.impact_credits })
        .eq('id', user.id)

      console.error('Failed to update voucher:', redeemError)
      return NextResponse.json(
        { error: 'Failed to process redemption' },
        { status: 500 }
      )
    }

    // 3. Log transaction
    await (adminClient
      .from('transactions') as any)
      .insert({
        user_id: user.id,
        type: 'voucher_redeemed',
        amount: voucher.ic_cost,
        balance_after: profile.impact_credits - voucher.ic_cost,
        description: `Redeemed voucher: ${voucher.title}`,
        related_voucher_id: voucherId
      })

    return NextResponse.json({
      success: true,
      code: voucher.encrypted_code, // Return the voucher code
    })
  } catch (error) {
    console.error('Voucher redeem error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
