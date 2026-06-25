import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationsPage } from './NotificationsPage'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, USER_IDS } from '@/lib/mock-data'

export default async function Page() {
  if (USE_MOCK_DATA) {
    const profile = mockData.profiles.find(p => p.id === USER_IDS.arjun)
    const notifications = mockData.notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.message ?? undefined,
      // Populate data object from individual mock fields
      data: {
        postId: n.related_post_id ?? undefined,
        userId: n.related_user_id ?? undefined,
        challengeId: n.related_challenge_id ?? undefined,
        circleId: n.related_circle_id ?? undefined,
      },
      is_read: n.is_read ?? false,
      created_at: n.created_at ?? new Date().toISOString(),
    }))
    return (
      <NotificationsPage
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
        notifications={notifications}
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

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, standing, badge')
    .eq('id', user.id)
    .single()

  // Fetch notifications — DB uses `message` (not `body`) and individual related_* columns
  const { data: rawNotifications } = await supabase
    .from('notifications')
    .select(
      `
      id,
      type,
      title,
      message,
      is_read,
      created_at,
      related_post_id,
      related_user_id,
      related_challenge_id,
      related_circle_id
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Map to the shape NotificationsPage expects
  const notifications = (rawNotifications || []).map((n: any) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.message ?? undefined,
    data: {
      postId: n.related_post_id ?? undefined,
      userId: n.related_user_id ?? undefined,
      challengeId: n.related_challenge_id ?? undefined,
      circleId: n.related_circle_id ?? undefined,
    },
    is_read: n.is_read ?? false,
    created_at: n.created_at ?? new Date().toISOString(),
  }))

  return (
    <NotificationsPage
      user={
        profile
          ? {
              displayName: profile.display_name ?? 'Unknown',
              avatarUrl: profile.avatar_url ?? undefined,
              standing: profile.standing ?? 0,
              badge: profile.badge ?? 'Citizen',
            }
          : undefined
      }
      notifications={notifications}
    />
  )
}

