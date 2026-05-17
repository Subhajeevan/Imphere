import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationsPage } from './NotificationsPage'

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
