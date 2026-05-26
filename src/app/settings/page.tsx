import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsPage } from './SettingsPage'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, USER_IDS } from '@/lib/mock-data'

export default async function Page() {
  if (USE_MOCK_DATA) {
    const profile = mockData.profiles.find(p => p.id === USER_IDS.arjun)
    return (
      <SettingsPage
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
        profile={{
          displayName: profile?.display_name || '',
          bio: profile?.bio || '',
          avatarUrl: profile?.avatar_url,
        }}
        email={profile?.email || 'arjun.mehta@imphere.app'}
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
    .select('display_name, avatar_url, standing, badge, bio')
    .eq('id', user.id)
    .single()

  return (
    <SettingsPage
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
      profile={{
        displayName: profile?.display_name || '',
        bio: profile?.bio || '',
        avatarUrl: profile?.avatar_url,
      }}
      email={user.email || ''}
    />
  )
}
