import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationsPage } from './NotificationsPage'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, USER_IDS } from '@/lib/mock-data'

export default async function Page() {
  if (USE_MOCK_DATA) {
    const profile = mockData.profiles.find(p => p.id === USER_IDS.arjun)
    // mockData doesn't have notifications for arjun, let's just use all mock notifications for demo
    const notifications = mockData.notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.message, // Map message to body
      data: null,
      is_read: n.is_read,
      created_at: n.created_at,
    }))
    return (
      <NotificationsPage
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
        notifications={notifications}
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

  // Fetch notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select(
      `
      id,
      type,
      title,
      body,
      data,
      is_read,
      created_at
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <NotificationsPage
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
      notifications={notifications || []}
    />
  )
}
