import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChatsListPage from './ChatsListPage'

export default async function ChatsPage() {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, badge')
    .eq('id', user.id)
    .single()

  return (
    <ChatsListPage
      currentUser={{
        id:          user.id,
        displayName: profile?.display_name ?? 'User',
        avatarUrl:   profile?.avatar_url   ?? null,
      }}
    />
  )
}
