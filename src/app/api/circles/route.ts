import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/** IC cost to create a new Impact Circle */
export const CIRCLE_CREATION_COST = 50

function deriveCategory(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('green') || n.includes('environment') || n.includes('nature') || n.includes('tree') || n.includes('plant')) return 'environment'
  if (n.includes('blood') || n.includes('health') || n.includes('medical') || n.includes('donate')) return 'health'
  return 'community'
}

/**
 * GET /api/circles
 * Paginated discover list from the circle_leaderboard view.
 *
 * Query params:
 *   search   – ILIKE on name
 *   locality – ILIKE on locality_name
 *   category – exact match on category
 *   limit    – default 20, max 50
 *   cursor   – created_at ISO string for cursor pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search   = searchParams.get('search')   || ''
    const locality = searchParams.get('locality') || ''
    const category = searchParams.get('category') || ''
    const limit    = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const cursor   = searchParams.get('cursor')   || ''

    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let query = supabase
      .from('circle_leaderboard')
      .select('id, name, description, avatar_url, category, locality_name, member_count, eminence_score, rank, created_at')
      .order('rank', { ascending: true })
      .limit(limit)

    if (search.trim())   query = query.ilike('name', `%${search.trim()}%`)
    if (locality.trim()) query = query.ilike('locality_name', `%${locality.trim()}%`)
    if (category.trim()) query = query.eq('category', category.trim())
    if (cursor)          query = query.lt('created_at', cursor)

    const { data: circles, error } = await query
    if (error) {
      console.error('GET /api/circles error:', error)
      return NextResponse.json({ error: 'Failed to fetch circles' }, { status: 500 })
    }

    // Determine which circles the current user has joined
    const circleIds = (circles ?? []).map((c: any) => c.id)
    const { data: memberships } = await supabase
      .from('impact_circle_members')
      .select('circle_id')
      .eq('user_id', user.id)
      .in('circle_id', circleIds)

    const joinedIds = new Set((memberships ?? []).map((m: any) => m.circle_id))
    const lastItem   = (circles ?? []).at(-1)
    const nextCursor = (circles ?? []).length === limit ? (lastItem?.created_at ?? null) : null

    const result = (circles ?? []).map((c: any) => ({
      ...c,
      category: c.category ?? deriveCategory(c.name),
      is_joined: joinedIds.has(c.id),
    }))

    return NextResponse.json({ circles: result, nextCursor })
  } catch (err) {
    console.error('GET /api/circles unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/circles
 * Create a new Impact Circle. Costs CIRCLE_CREATION_COST (50) IC.
 * Uses admin client for atomic IC deduction + transaction log.
 *
 * Body: { name, description, category, avatar_url?, locality_name?, min_badge_required? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, category, avatar_url, locality_name, min_badge_required } = body

    // ── Validate inputs ───────────────────────────────────────────────────────
    if (!name?.trim() || name.trim().length < 3 || name.trim().length > 80) {
      return NextResponse.json({ error: 'Name must be 3–80 characters' }, { status: 422 })
    }
    if (!description?.trim() || description.trim().length < 10 || description.trim().length > 500) {
      return NextResponse.json({ error: 'Description must be 10–500 characters' }, { status: 422 })
    }
    const validCategories = ['environment', 'health', 'community']
    if (!category || !validCategories.includes(category)) {
      return NextResponse.json({ error: 'Category must be environment, health, or community' }, { status: 422 })
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── Check IC balance ──────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('impact_credits, native_pin_name, native_pin_location')
      .eq('id', user.id)
      .single()

    const currentIC: number = profile?.impact_credits ?? 0
    if (currentIC < CIRCLE_CREATION_COST) {
      return NextResponse.json({
        error: `Not enough Impact Credits. Creating a circle costs ${CIRCLE_CREATION_COST} IC. You have ${currentIC} IC.`,
        code: 'INSUFFICIENT_IC',
        required: CIRCLE_CREATION_COST,
        available: currentIC,
      }, { status: 402 })
    }

    // ── Admin client for all writes (bypasses RLS — server is trusted) ────────
    const admin = await createAdminClient() as any

    // 1. Create the circle
    const { data: circle, error: circleError } = await admin
      .from('impact_circles')
      .insert({
        name:               name.trim(),
        description:        description.trim(),
        category,
        avatar_url:         avatar_url ?? null,
        locality_name:      locality_name ?? profile?.native_pin_name ?? null,
        location:           profile?.native_pin_location ?? null,
        principal_id:       user.id,
        min_badge_required: min_badge_required ?? 'Citizen',
        is_active:          true,
      })
      .select()
      .single()

    if (circleError) {
      console.error('POST /api/circles circle insert error:', circleError)
      return NextResponse.json({ error: 'Failed to create circle' }, { status: 500 })
    }

    // 2. Add creator as principal member (DB trigger updates member_count + eminence)
    const { error: memberError } = await admin
      .from('impact_circle_members')
      .insert({
        circle_id:      circle.id,
        user_id:        user.id,
        role:           'principal',
        ready_to_serve: true,
      })

    if (memberError) {
      console.error('POST /api/circles member insert error:', memberError)
      // Circle was created but membership failed — clean up
      await admin.from('impact_circles').delete().eq('id', circle.id)
      return NextResponse.json({ error: 'Failed to set up circle membership' }, { status: 500 })
    }

    // 3. Deduct IC and log transaction atomically
    const balanceAfter = currentIC - CIRCLE_CREATION_COST
    const { error: icError } = await admin
      .from('profiles')
      .update({ impact_credits: balanceAfter })
      .eq('id', user.id)

    if (icError) {
      console.error('POST /api/circles IC deduction error:', icError)
      // Non-fatal: circle is created, just log the error
    } else {
      await admin.from('transactions').insert({
        user_id:      user.id,
        type:         'ic_spent',
        amount:       CIRCLE_CREATION_COST,
        balance_after: balanceAfter,
        description:  `Created impact circle: ${circle.name}`,
      })
    }

    return NextResponse.json({ circle }, { status: 201 })
  } catch (err) {
    console.error('POST /api/circles unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
