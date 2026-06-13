import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CircleDetailPage } from '@/components/community/CircleDetailPage'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, mockImpactCircleStandings, USER_IDS } from '@/lib/mock-data'
import CircleDetailClient from './CircleDetailClient'

function getCircleCategory(name: string) {
  if (name.toLowerCase().includes('green')) return 'Environment'
  if (name.toLowerCase().includes('blood')) return 'Health'
  if (name.toLowerCase().includes('clean')) return 'Community'
  return 'Community'
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const circle = mockData.impactCircles.find((item) => item.id === params.id)

  return {
    title: circle ? `${circle.name} · Circle · IMPHERE` : 'Circle · IMPHERE',
    description: circle
      ? circle.description ?? `View ${circle.name} impact circle member chat and standings.`
      : 'Circle detail for IMPHERE.',
  }
}

export default async function Page({ params }: { params: { id: string } }) {
  if (!USE_MOCK_DATA) {
    // Future Supabase / Firebase backed circle detail retrieval.
    notFound()
  }

  const circle = mockData.impactCircles.find((item) => item.id === params.id)
  const profile = mockData.profiles.find((profile) => profile.id === USER_IDS.arjun)

  if (!circle) {
    return <CircleDetailClient circleId={params.id} user={
      profile
        ? {
            displayName: profile.display_name,
            avatarUrl: profile.avatar_url ?? undefined,
            standing: profile.standing ?? 0,
            badge: profile.badge ?? 'Citizen',
          }
        : {
            displayName: 'You',
            standing: 0,
            badge: 'Citizen',
          }
    } />
  }

  const standings = mockImpactCircleStandings[circle.id] ?? []

  return (
    <CircleDetailPage
      circle={{
        id: circle.id,
        name: circle.name,
        avatar_url: circle.avatar_url ?? undefined,
        description: circle.description ?? 'An active impact circle uplifting local efforts.',
        category: getCircleCategory(circle.name),
        member_count: circle.member_count ?? 0,
        eminence_score: circle.eminence_score ?? 0,
      }}
      standings={standings.map((entry) => ({
        ...entry,
        avatarUrl: entry.avatar_url ?? undefined,
      }))}
      user={
        profile
          ? {
              displayName: profile.display_name,
              avatarUrl: profile.avatar_url ?? undefined,
              standing: profile.standing ?? 0,
              badge: profile.badge ?? 'Citizen',
            }
          : {
              displayName: 'You',
              standing: 0,
              badge: 'Citizen',
            }
      }
    />
  )
}
