import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateCirclePage from './CreateCircleClient'
import { CIRCLE_CREATION_COST } from '@/app/api/circles/route'

export const metadata = {
  title: 'Create Circle · IMPHERE',
  description: 'Create a new impact circle for your community.',
}

export default async function Page() {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/create/circle')

  const { data: profile } = await supabase
    .from('profiles')
    .select('impact_credits')
    .eq('id', user.id)
    .single()

  return (
    <CreateCirclePage
      icBalance={profile?.impact_credits ?? 0}
      creationCost={CIRCLE_CREATION_COST}
    />
  )
}
