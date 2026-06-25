import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CommunityPage } from './CommunityPage'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, USER_IDS } from '@/lib/mock-data'

export const metadata = {
  title: 'Circles · IMPHERE',
  description: 'Explore your joined circles and discover new local impact circles to join.',
}

function deriveCategory(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('green') || n.includes('environment') || n.includes('nature') || n.includes('tree')) return 'environment'
  if (n.includes('blood') || n.includes('health') || n.includes('medical')) return 'health'
  return 'community'
}

export default async function Page() {
  if (USE_MOCK_DATA) {
    const profile = mockData.profiles.find(p => p.id === USER_IDS.arjun)

    // Memberships for the mock user
    const joinedCircleIds = new Set(
      mockData.impactCircleMembers
        .filter(m => m.user_id === USER_IDS.arjun)
        .map(m => m.circle_id)
    )

    // Rank of the mock user within each joined circle
    function getUserRank(circleId: string): number | undefined {
      const standings = mockData.impactCircleStandings[circleId]
      return standings?.find(e => e.user_id === USER_IDS.arjun)?.rank
    }

    // All circles sorted by eminence for the discover list
    const allCircles = [...mockData.impactCircles]
      .filter(c => c.is_active)
      .sort((a, b) => (b.eminence_score ?? 0) - (a.eminence_score ?? 0))
      .map((c, i) => ({
        id:             c.id,
        name:           c.name,
        avatar_url:     c.avatar_url,
        category:       deriveCategory(c.name),
        member_count:   c.member_count ?? 0,
        eminence_score: c.eminence_score ?? 0,
        weeklyRank:     i + 1,
        isJoined:       joinedCircleIds.has(c.id),
        userRank:       getUserRank(c.id),
      }))

    const circles         = allCircles.filter(c => c.isJoined)
    const discoverCircles = allCircles

    return (
      <CommunityPage
        user={
          profile
            ? {
                displayName: profile.display_name,
                avatarUrl:   profile.avatar_url ?? undefined,
                standing:    profile.standing ?? 0,
                badge:       profile.badge ?? 'Citizen',
              }
            : undefined
        }
        circles={circles}
        discoverCircles={discoverCircles}
      />
    )
  }

  // ── Real Supabase path ──────────────────────────────────────────────────────
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, standing, badge, id')
    .eq('id', user.id)
    .single()

  // My Circles — joined circles with the user's rank within each
  const { data: memberRows } = await supabase
    .from('impact_circle_members')
    .select(`
      role,
      circle:impact_circles (
        id, name, avatar_url, category, locality_name,
        member_count, eminence_score, created_at, is_active
      )
    `)
    .eq('user_id', user.id)

  const joinedCircleIds = new Set(
    (memberRows ?? [])
      .map((r: any) => r.circle?.id)
      .filter(Boolean)
  )

  // Compute rank for each joined circle
  async function fetchUserRank(circleId: string): Promise<number | undefined> {
    const userStanding = profile?.standing ?? 0
    const { count } = await supabase
      .from('impact_circle_members')
      .select('user_id, profiles!inner(standing)', { count: 'exact', head: true })
      .eq('circle_id', circleId)
      .gt('profiles.standing', userStanding)
    return typeof count === 'number' ? count + 1 : undefined
  }

  const circles = await Promise.all(
    (memberRows ?? [])
      .filter((r: any) => r.circle?.is_active)
      .map(async (r: any, i: number) => {
        const c = r.circle
        const userRank = await fetchUserRank(c.id)
        return {
          id:             c.id,
          name:           c.name,
          avatar_url:     c.avatar_url,
          category:       c.category ?? deriveCategory(c.name),
          member_count:   c.member_count ?? 0,
          eminence_score: c.eminence_score ?? 0,
          weeklyRank:     i + 1,
          isJoined:       true,
          userRank,
        }
      })
  )

  // Discover list — circle_leaderboard view, first 20
  const { data: discoverRows } = await supabase
    .from('circle_leaderboard')
    .select('id, name, avatar_url, category, locality_name, member_count, eminence_score, rank')
    .order('rank', { ascending: true })
    .limit(20)

  const discoverCircles = (discoverRows ?? []).map((c: any) => ({
    id:             c.id,
    name:           c.name,
    avatar_url:     c.avatar_url,
    category:       c.category ?? deriveCategory(c.name),
    member_count:   c.member_count ?? 0,
    eminence_score: c.eminence_score ?? 0,
    weeklyRank:     c.rank ?? 0,
    isJoined:       joinedCircleIds.has(c.id),
  }))

  return (
    <CommunityPage
      user={
        profile
          ? {
              id:          profile.id,
              displayName: profile.display_name,
              avatarUrl:   profile.avatar_url ?? undefined,
              standing:    profile.standing ?? 0,
              badge:       profile.badge ?? 'Citizen',
            }
          : undefined
      }
      circles={circles}
      discoverCircles={discoverCircles}
    />
  )
}
