import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, USER_IDS } from '@/lib/mock-data'

function deriveCategory(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('green') || n.includes('environment') || n.includes('nature') || n.includes('tree')) return 'environment'
  if (n.includes('blood') || n.includes('health') || n.includes('medical')) return 'health'
  return 'community'
}

/**
 * GET /api/circles/[id]
 * Returns a single circle with principal info and current user membership status.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (USE_MOCK_DATA) {
      const circle = mockData.impactCircles.find(c => c.id === id)
      if (!circle) return NextResponse.json({ error: 'Circle not found' }, { status: 404 })

      const principal = mockData.profiles.find(p => p.id === circle.principal_id)
      const membership = mockData.impactCircleMembers.find(
        m => m.circle_id === id && m.user_id === USER_IDS.arjun
      )

      return NextResponse.json({
        id:                 circle.id,
        name:               circle.name,
        description:        circle.description,
        avatar_url:         circle.avatar_url,
        category:           deriveCategory(circle.name),
        locality_name:      circle.locality_name,
        member_count:       circle.member_count ?? 0,
        eminence_score:     circle.eminence_score ?? 0,
        min_badge_required: circle.min_badge_required ?? 'Citizen',
        created_at:         circle.created_at,
        principal: principal
          ? {
              id:           principal.id,
              display_name: principal.display_name,
              avatar_url:   principal.avatar_url,
              badge:        principal.badge,
            }
          : null,
        is_member:   !!membership,
        member_role: membership?.role ?? null,
      })
    }

    // ── Real Supabase path ──────────────────────────────────────────────────
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: circle, error } = await supabase
      .from('impact_circles')
      .select(`
        id, name, description, avatar_url, category, locality_name,
        member_count, eminence_score, min_badge_required, created_at,
        principal:profiles!impact_circles_principal_id_fkey (
          id, display_name, avatar_url, badge
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error || !circle) {
      return NextResponse.json({ error: 'Circle not found' }, { status: 404 })
    }

    const { data: membership } = await supabase
      .from('impact_circle_members')
      .select('role')
      .eq('circle_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({
      ...circle,
      is_member:   !!membership,
      member_role: membership?.role ?? null,
    })
  } catch (err) {
    console.error('GET /api/circles/[id] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
