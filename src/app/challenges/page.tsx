import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChallengesPage } from './ChallengesPage'

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
              avatarUrl: profile.avatar_url,
              standing: profile.standing,
              badge: profile.badge,
            }
          : undefined
      }
      categories={categories || []}
    />
  )
}
