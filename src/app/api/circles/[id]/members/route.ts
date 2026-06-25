import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, mockImpactCircleStandings } from '@/lib/mock-data'

/**
 * GET /api/circles/[id]/members
 * Returns circle members ranked by their overall standing score.
 * The rank is computed server-side with a window function.
 *
 * Response shape matches the existing LeaderboardItem component props:
 *   { id, user_id, display_name, avatar_url, badge, standing, role, ready_to_serve, rank }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (USE_MOCK_DATA) {
      const standings = mockImpactCircleStandings[id]
      if (!standings) {
        // Circle exists but has no standings entry — return empty list
        const circleExists = mockData.impactCircles.some(c => c.id === id)
        if (!circleExists) return NextResponse.json({ error: 'Circle not found' }, { status: 404 })
        return NextResponse.json({ members: [] })
      }

      // Enrich with role from impactCircleMembers
      const memberships = mockData.impactCircleMembers.filter(m => m.circle_id === id)
      const roleMap = new Map(memberships.map(m => [m.user_id, m.role ?? 'member']))

      const members = standings.map(entry => ({
        id:            entry.id,
        user_id:       entry.user_id,
        display_name:  entry.displayName,
        avatar_url:    entry.avatar_url ?? null,
        badge:         entry.badge,
        standing:      entry.weeklyPoints,
        role:          roleMap.get(entry.user_id) ?? 'member',
        ready_to_serve: memberships.find(m => m.user_id === entry.user_id)?.ready_to_serve ?? false,
        rank:          entry.rank,
        is_active:     entry.isActive,
      }))

      return NextResponse.json({ members })
    }

    // ── Real Supabase path ──────────────────────────────────────────────────
    // Uses a window function via raw RPC or a ranked subquery.
    // Supabase JS does not natively support window functions in .select(),
    // so we use a raw SQL query via rpc or the REST API's computed columns.
    // Fallback: fetch members + profile standing, sort client-side, add rank.
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: rows, error } = await supabase
      .from('impact_circle_members')
      .select(`
        id,
        user_id,
        role,
        ready_to_serve,
        joined_at,
        profile:profiles!impact_circle_members_user_id_fkey (
          display_name, avatar_url, badge, standing
        )
      `)
      .eq('circle_id', id)
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('GET /api/circles/[id]/members error:', error)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ members: [] })
    }

    // Sort by standing descending, assign rank
    const sorted = [...rows].sort((a: any, b: any) =>
      (b.profile?.standing ?? 0) - (a.profile?.standing ?? 0)
    )

    const members = sorted.map((row: any, i: number) => ({
      id:            row.id,
      user_id:       row.user_id,
      display_name:  row.profile?.display_name ?? 'Unknown',
      avatar_url:    row.profile?.avatar_url ?? null,
      badge:         row.profile?.badge ?? 'Citizen',
      standing:      row.profile?.standing ?? 0,
      role:          row.role ?? 'member',
      ready_to_serve: row.ready_to_serve ?? false,
      rank:          i + 1,
      is_active:     true,
    }))

    return NextResponse.json({ members })
  } catch (err) {
    console.error('GET /api/circles/[id]/members unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
