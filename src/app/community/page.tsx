import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CommunityPage } from './CommunityPage'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, mockImpactCircleStandings, USER_IDS } from '@/lib/mock-data'

export const metadata = {
  title: 'Circles · IMPHERE',
  description: 'Explore your joined circles and discover new local impact circles to join.',
}

interface Circle {
  id: string
  name: string
  avatar_url?: string | null
  category: string
  member_count: number
  eminence_score: number
  weeklyRank: number
  isJoined?: boolean
  userRank?: number
}

function getCircleCategory(name: string) {
  if (name.toLowerCase().includes('green')) return 'Environment'
  if (name.toLowerCase().includes('blood')) return 'Health'
  if (name.toLowerCase().includes('clean')) return 'Community'
  return 'Community'
}

function getUserRank(circleId: string) {
  const standings = mockImpactCircleStandings[circleId]
  return standings?.find((entry) => entry.user_id === USER_IDS.arjun)?.rank
}

export default async function Page() {
  if (USE_MOCK_DATA) {
    const profile = mockData.profiles.find((p) => p.id === USER_IDS.arjun)
    const joinedCircleIds = mockData.impactCircleMembers
      .filter((m) => m.user_id === USER_IDS.arjun)
      .map((m) => m.circle_id)

    const discoverCircles = mockData.impactCircles
      .slice()
      .sort((a, b) => (b.eminence_score ?? 0) - (a.eminence_score ?? 0))
      .map((circle, index) => ({
        id: circle.id,
        name: circle.name,
        avatar_url: circle.avatar_url,
        category: getCircleCategory(circle.name),
        member_count: circle.member_count ?? 0,
        eminence_score: circle.eminence_score ?? 0,
        weeklyRank: index + 1,
        isJoined: joinedCircleIds.includes(circle.id),
        userRank: getUserRank(circle.id),
      }))

    const circles = discoverCircles.filter((circle) => circle.isJoined)

    return (
      <CommunityPage
        user={
          profile
            ? {
                displayName: profile.display_name,
                avatarUrl: profile.avatar_url ?? undefined,
                standing: profile.standing ?? 0,
                badge: profile.badge ?? 'Citizen',
              }
            : undefined
        }
        circles={circles}
        discoverCircles={discoverCircles}
      />
    )
  }

  const supabase = await createClient() as any as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('display_name, avatar_url, standing, badge')
    .eq('id', user.id)
    .single()

  const { data: circles } = await (supabase as any)
    .from('impact_circle_members')
    .select(
      `
      circle:impact_circles (
        id,
        name,
        avatar_url,
        mission_statement,
        member_count,
        eminence_score,
        created_at
      )
    `
    )
    .eq('user_id', user.id)

  return (
    <CommunityPage
      user={
        profile
          ? {
              displayName: (profile as any).display_name,
              avatarUrl: (profile as any).avatar_url ?? undefined,
              standing: (profile as any).standing ?? 0,
              badge: (profile as any).badge ?? 'Citizen',
            }
          : undefined
      }
      circles={
        circles?.map((c: any) => ({
          id: c.circle.id,
          name: c.circle.name,
          avatar_url: c.circle.avatar_url ?? undefined,
          category: 'Community',
          member_count: c.circle.member_count ?? 0,
          eminence_score: c.circle.eminence_score ?? 0,
          weeklyRank: 0,
        })) || []
      }
      discoverCircles={[]}
    />
  )
}

