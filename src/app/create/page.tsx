import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreatePage from './CreatePage'

export const metadata = {
  title: 'Create — IMPHERE',
  description: 'Share a civic post or raise a community proclamation',
}

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch active challenge categories for the proclamation form
  const { data: categories } = await supabase
    .from('challenge_categories')
    .select('id, name, icon, color')
    .eq('is_active', true)
    .order('display_order')

  return <CreatePage categories={categories || []} />
}
