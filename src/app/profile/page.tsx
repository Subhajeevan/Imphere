import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, USER_IDS } from '@/lib/mock-data'

export default async function ProfilePage() {
  if (USE_MOCK_DATA) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let currentUserId = USER_IDS.arjun
    if (user) {
      const profileById = mockData.profiles.find(p => p.id === user.id)
      const profileByEmail = user.email
        ? mockData.profiles.find(p => p.email === user.email)
        : undefined

      currentUserId = profileById?.id ?? profileByEmail?.id ?? USER_IDS.arjun
    }

    redirect(`/profile/${currentUserId}`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Redirect to own profile
  redirect(`/profile/${user.id}`)
}
