import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsPage } from './SettingsPage'

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
