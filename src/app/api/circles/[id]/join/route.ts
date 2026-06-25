import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, USER_IDS } from '@/lib/mock-data'

const BADGE_ORDER: Record<string, number> = {
  Citizen: 0, citizen: 0,
  Bronze:  1, bronze:  1,
  Silver:  2, silver:  2,
  Gold:    3, gold:    3,
}

/**
 * POST /api/circles/[id]/join
 * Join an impact circle. Validates badge requirement.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (USE_MOCK_DATA) {
      const circle = mockData.impactCircles.find(c => c.id === id)
      if (!circle) return NextResponse.json({ error: 'Circle not found' }, { status: 404 })

      const existing = mockData.impactCircleMembers.find(
        m => m.circle_id === id && m.user_id === USER_IDS.arjun
      )
      if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 409 })

      return NextResponse.json({
        member_id:  `mock-member-${Date.now()}`,
        circle_id:  id,
        user_id:    USER_IDS.arjun,
        role:       'member',
        joined_at:  new Date().toISOString(),
      }, { status: 201 })
    }

    // ── Real Supabase path ──────────────────────────────────────────────────
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: circle, error: circleError } = await supabase
      .from('impact_circles')
      .select('id, min_badge_required, is_active')
      .eq('id', id)
      .single()

    if (circleError || !circle) {
      return NextResponse.json({ error: 'Circle not found' }, { status: 404 })
    }
    if (!circle.is_active) {
      return NextResponse.json({ error: 'Circle is not active' }, { status: 403 })
    }

    // Badge gate
    const { data: profile } = await supabase
      .from('profiles')
      .select('badge')
      .eq('id', user.id)
      .single()

    const userBadgeLevel    = BADGE_ORDER[profile?.badge ?? 'citizen'] ?? 0
    const requiredBadgeLevel = BADGE_ORDER[circle.min_badge_required ?? 'citizen'] ?? 0

    if (userBadgeLevel < requiredBadgeLevel) {
      return NextResponse.json({
        error: `This circle requires at least ${circle.min_badge_required} badge`,
      }, { status: 403 })
    }

    const { data: existing } = await supabase
      .from('impact_circle_members')
      .select('id')
      .eq('circle_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 409 })

    const { data: member, error: insertError } = await supabase
      .from('impact_circle_members')
      .insert({ circle_id: id, user_id: user.id, role: 'member' })
      .select()
      .single()

    if (insertError) {
      console.error('POST /api/circles/[id]/join insert error:', insertError)
      return NextResponse.json({ error: 'Failed to join circle' }, { status: 500 })
    }

    return NextResponse.json({
      member_id:  member.id,
      circle_id:  member.circle_id,
      user_id:    member.user_id,
      role:       member.role,
      joined_at:  member.joined_at,
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/circles/[id]/join unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/circles/[id]/join
 * Leave a circle. Principals must transfer ownership first.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (USE_MOCK_DATA) {
      return NextResponse.json({ ok: true })
    }

    // ── Real Supabase path ──────────────────────────────────────────────────
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: membership } = await supabase
      .from('impact_circle_members')
      .select('role')
      .eq('circle_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this circle' }, { status: 404 })
    }
    if (membership.role === 'principal') {
      return NextResponse.json({
        error: 'Principals cannot leave. Transfer ownership or delete the circle first.',
      }, { status: 403 })
    }

    const { error } = await supabase
      .from('impact_circle_members')
      .delete()
      .eq('circle_id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('DELETE /api/circles/[id]/join error:', error)
      return NextResponse.json({ error: 'Failed to leave circle' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/circles/[id]/join unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
