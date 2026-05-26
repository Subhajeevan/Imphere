import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { USER_IDS } from '@/lib/mock-data'

export default async function ProfilePage() {
  if (USE_MOCK_DATA) {
    redirect(`/profile/${USER_IDS.arjun}`)
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
