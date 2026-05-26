import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CommunityPage } from './CommunityPage'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, USER_IDS } from '@/lib/mock-data'

export default async function Page() {
  if (USE_MOCK_DATA) {
    const profile = mockData.profiles.find(p => p.id === USER_IDS.arjun)
    const circles = mockData.impactCircleMembers
      .filter(m => m.user_id === USER_IDS.arjun)
      .map(m => {
        const circle = mockData.impactCircles.find(c => c.id === m.circle_id)
        if (!circle) return null
        return {
          id: circle.id,
          name: circle.name,
          avatar_url: circle.avatar_url,
          mission_statement: circle.description,
          member_count: circle.member_count,
          eminence_score: circle.eminence_score,
          created_at: circle.created_at,
        }
      })
      .filter(Boolean) as any[]

    return (
      <CommunityPage
        user={
          profile
            ? {
                displayName: profile.display_name,
                avatarUrl: profile.avatar_url,
                standing: profile.standing,
                badge: profile.badge,
              }
            : undefined
        }
        userBadge={profile?.badge || 'Citizen'}
        circles={circles}
      />
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, standing, badge')
    .eq('id', user.id)
    .single()

  // Fetch user's circles
  const { data: circles } = await supabase
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
              displayName: profile.display_name,
              avatarUrl: profile.avatar_url,
              standing: profile.standing,
              badge: profile.badge,
            }
          : undefined
      }
      userBadge={profile?.badge || 'Citizen'}
      circles={circles?.map((c) => c.circle).filter(Boolean) || []}
    />
  )
}
