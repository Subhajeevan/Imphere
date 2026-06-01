import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExplorePageClient } from './ExplorePageClient'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, USER_IDS } from '@/lib/mock-data'

export default async function ExplorePage() {
  if (USE_MOCK_DATA) {
    const profile = mockData.profiles.find(p => p.id === USER_IDS.arjun)
    return (
      <ExplorePageClient
        user={
          profile
            ? {
                displayName: profile.display_name || '',
                avatarUrl: profile.avatar_url || undefined,
                standing: profile.standing || 0,
                badge: profile.badge || 'Citizen',
              }
            : undefined
        }
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
  const { data: profileData } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, standing, badge')
    .eq('id', user.id)
    .single()

  const profile = profileData as any

  return (
    <ExplorePageClient
      user={
        profile
          ? {
              displayName: profile.display_name || '',
              avatarUrl: profile.avatar_url || undefined,
              standing: profile.standing || 0,
              badge: profile.badge || 'Citizen',
            }
          : undefined
      }
    />
  )
}
