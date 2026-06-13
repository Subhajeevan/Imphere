import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LeaderboardPage } from './LeaderboardPage'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, USER_IDS } from '@/lib/mock-data'

export const metadata = {
  title: 'Leaderboard · IMPHERE',
  description: 'Top civic champions ranked by Standing Points.',
}

export default async function Page() {
  if (USE_MOCK_DATA) {
    const profile = mockData.profiles.find(p => p.id === USER_IDS.arjun)
    return (
      <LeaderboardPage
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
        currentUserId={USER_IDS.arjun}
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, standing, badge')
    .eq('id', user.id)
    .single()

  return (
    <LeaderboardPage
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
      currentUserId={user.id}
    />
  )
}

