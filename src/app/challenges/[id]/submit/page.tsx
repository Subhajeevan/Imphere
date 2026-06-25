import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubmitProofPage } from './SubmitProofPage'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, USER_IDS } from '@/lib/mock-data'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return {
    title: 'Submit Proof · IMPHERE',
    description: `Submit your proof for challenge ${id}`,
  }
}

export default async function Page({ params }: Props) {
  const { id: challengeId } = await params

  if (USE_MOCK_DATA) {
    const profile = mockData.profiles.find(p => p.id === USER_IDS.arjun)
    const challenge = mockData.challenges.find(c => c.id === challengeId)

    if (!challenge) {
      redirect('/challenges')
    }

    return (
      <SubmitProofPage
        challengeId={challengeId}
        challengeTitle={challenge.title}
        standingReward={challenge.standing_reward ?? 50}
        icReward={challenge.ic_reward ?? 200}
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

  // Fetch challenge details
  const { data: challenge } = await supabase
    .from('challenges')
    .select('id, title, standing_reward, ic_reward, status')
    .eq('id', challengeId)
    .single()

  if (!challenge || challenge.status !== 'active') {
    redirect('/challenges')
  }

  // Fetch user profile for sidebar
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, standing, badge')
    .eq('id', user.id)
    .single()

  return (
    <SubmitProofPage
      challengeId={challengeId}
      challengeTitle={challenge.title}
      standingReward={challenge.standing_reward ?? 50}
      icReward={challenge.ic_reward ?? 200}
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
    />
  )
}

