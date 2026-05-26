import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreatePage from './CreatePage'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData } from '@/lib/mock-data'

export const metadata = {
  title: 'Create — IMPHERE',
  description: 'Share a civic post or raise a community proclamation',
}

export default async function Page() {
  if (USE_MOCK_DATA) {
    return <CreatePage categories={mockData.challengeCategories.map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color
    }))} />
  }

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
