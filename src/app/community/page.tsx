import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CommunityPage } from './CommunityPage'

export default async function Page() {
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
