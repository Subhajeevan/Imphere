import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData } from '@/lib/mock-data'

/**
 * GET /api/leaderboard
 * Returns ranked users from the `leaderboard` Supabase VIEW.
 *
 * Query params:
 *   search  – filter by display_name (case-insensitive)
 *   area    – filter by native_pin_name ILIKE %area%
 *   limit   – default 50
 *   offset  – default 0
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const area   = searchParams.get('area') || ''
    const limit  = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    if (USE_MOCK_DATA) {
      // Sort profiles by standing descending, add rank
      let profiles = [...mockData.profiles].sort((a, b) => (b.standing ?? 0) - (a.standing ?? 0))

      if (search.trim()) {
        const s = search.toLowerCase()
        profiles = profiles.filter(p => p.display_name.toLowerCase().includes(s))
      }
      if (area.trim()) {
        const a = area.toLowerCase()
        profiles = profiles.filter(p => (p.native_pin_name ?? '').toLowerCase().includes(a))
      }

      const total = profiles.length
      profiles = profiles.slice(offset, offset + limit)

      const ranked = profiles.map((p, i) => ({
        id: p.id,
        rank: offset + i + 1,
        displayName: p.display_name,
        avatarUrl: p.avatar_url,
        badge: p.badge,
        standing: p.standing ?? 0,
        impactCredits: p.impact_credits ?? 0,
        nativePinName: p.native_pin_name,
      }))

      return NextResponse.json({ users: ranked, total })
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    // The `leaderboard` view already has: id, rank, display_name, avatar_url, badge, standing, native_pin_name
    let query = db
      .from('leaderboard')
      .select('id, rank, display_name, avatar_url, badge, standing, native_pin_name')
      .order('rank', { ascending: true })
      .range(offset, offset + limit - 1)

    if (search.trim()) {
      query = query.ilike('display_name', `%${search.trim()}%`)
    }
    if (area.trim()) {
      query = query.ilike('native_pin_name', `%${area.trim()}%`)
    }

    const { data: users, error, count } = await query

    if (error) {
      console.error('Leaderboard fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
    }

    // Fetch impact_credits from profiles for the returned user IDs
    type LeaderRow = { id: string; rank: number; display_name: string; avatar_url: string | null; badge: string; standing: number; native_pin_name: string | null }
    const userIds = ((users || []) as LeaderRow[]).map(u => u.id).filter(Boolean)
    const icMap: Record<string, number> = {}
    if (userIds.length > 0) {
      const { data: profileRows } = await db
        .from('profiles')
        .select('id, impact_credits')
        .in('id', userIds)
      ;((profileRows || []) as { id: string; impact_credits: number | null }[]).forEach(p => {
        if (p.id) icMap[p.id] = p.impact_credits ?? 0
      })
    }

    const transformed = ((users || []) as LeaderRow[]).map(u => ({
      id: u.id,
      rank: u.rank,
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      badge: u.badge,
      standing: u.standing ?? 0,
      impactCredits: u.id ? (icMap[u.id] ?? 0) : 0,
      nativePinName: u.native_pin_name,
      isCurrentUser: currentUser ? u.id === currentUser.id : false,
    }))

    return NextResponse.json({ users: transformed, total: count ?? transformed.length })
  } catch (error) {
    console.error('Leaderboard API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
