import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChatThreadPage from './ChatThreadPage'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: conversationId } = await params

  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, standing, badge')
    .eq('id', user.id)
    .single()

  return (
    <ChatThreadPage
      conversationId={conversationId}
      currentUserId={user.id}
      currentUser={{
        displayName: profile?.display_name ?? 'User',
        avatarUrl:   profile?.avatar_url   ?? null,
        standing:    profile?.standing     ?? 0,
        badge:       profile?.badge        ?? 'Citizen',
      }}
    />
  )
}
