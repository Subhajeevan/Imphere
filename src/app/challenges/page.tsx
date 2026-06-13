import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChallengesPage } from './ChallengesPage'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, USER_IDS } from '@/lib/mock-data'

export default async function Page() {
  if (USE_MOCK_DATA) {
    const profile = mockData.profiles.find(p => p.id === USER_IDS.arjun)
    return (
      <ChallengesPage
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
        categories={mockData.challengeCategories.map(c => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          color: c.color
        }))}
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

  // Fetch challenge categories (no 'slug' column in schema)
  const { data: categories } = await supabase
    .from('challenge_categories')
    .select('id, name, icon, color')
    .eq('is_active', true)
    .order('display_order')

  return (
    <ChallengesPage
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
      categories={categories || []}
    />
  )
}

