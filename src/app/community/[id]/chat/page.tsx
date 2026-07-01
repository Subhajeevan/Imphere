import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CircleChatThread } from '@/components/community/chat/CircleChatThread'

export const metadata: Metadata = {
  title: 'Circle Chat · IMPHERE',
}

export default async function CircleChatRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: circle }, { data: profile }] = await Promise.all([
    supabase.from('impact_circles').select('id, name').eq('id', id).single(),
    supabase.from('profiles').select('display_name, avatar_url, standing, badge').eq('id', user.id).single(),
  ])

  if (!circle) notFound()

  return (
    <CircleChatThread
      circleId={circle.id}
      circleName={circle.name}
      user={{
        displayName: profile?.display_name ?? 'You',
        avatarUrl:   profile?.avatar_url ?? undefined,
        standing:    profile?.standing ?? 0,
        badge:       profile?.badge ?? 'Citizen',
      }}
    />
  )
}
