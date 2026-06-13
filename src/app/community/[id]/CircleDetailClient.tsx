'use client'

import { useMemo } from 'react'
import { CircleDetailPage } from '@/components/community/CircleDetailPage'
import { useCreatedCircles } from '@/hooks/useCreatedCircles'
import { mockData, mockImpactCircleStandings } from '@/lib/mock-data'

interface CircleDetailClientProps {
  circleId: string
  user: {
    displayName: string
    avatarUrl?: string
    standing: number
    badge: string
  }
}

function getCircleCategory(name: string) {
  if (name.toLowerCase().includes('green')) return 'Environment'
  if (name.toLowerCase().includes('blood')) return 'Health'
  if (name.toLowerCase().includes('clean')) return 'Community'
  return 'Community'
}

export default function CircleDetailClient({ circleId, user }: CircleDetailClientProps) {
  const { createdCircles, isLoaded } = useCreatedCircles()

  const circle = useMemo(() => {
    const createdCircle = createdCircles.find((item) => item.id === circleId)
    if (createdCircle) {
      return {
        id: createdCircle.id,
        name: createdCircle.name,
        avatar_url: createdCircle.avatar_url ?? undefined,
        description: createdCircle.description ?? 'A newly created impact circle.',
        category: createdCircle.category,
        member_count: createdCircle.member_count,
        eminence_score: createdCircle.eminence_score,
        isCreated: true,
      }
    }

    const mockCircle = mockData.impactCircles.find((item) => item.id === circleId)
    if (mockCircle) {
      return {
        id: mockCircle.id,
        name: mockCircle.name,
        avatar_url: mockCircle.avatar_url ?? undefined,
        description: mockCircle.description ?? 'An active impact circle uplifting local efforts.',
        category: getCircleCategory(mockCircle.name),
        member_count: mockCircle.member_count ?? 0,
        eminence_score: mockCircle.eminence_score ?? 0,
        isCreated: false,
      }
    }

    return null
  }, [createdCircles, circleId])

  if (!isLoaded) {
    return (
      <div className="min-h-screen px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-semibold text-muted-foreground">Loading circle details</p>
          <h1 className="mt-3 text-2xl font-semibold text-foreground">Please wait…</h1>
          <p className="mt-2 text-sm text-muted-foreground">Retrieving your locally created circle before opening the detail screen.</p>
        </div>
      </div>
    )
  }

  if (!circle) {
    return (
      <div className="min-h-screen px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-semibold text-muted-foreground">Circle not found</p>
          <h1 className="mt-3 text-2xl font-semibold text-foreground">No circle available</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This circle is not available in mock data. Return to the community page to view your joined circles.
          </p>
        </div>
      </div>
    )
  }

  const standings = useMemo(() => {
    if (!circle.isCreated) {
      return (mockImpactCircleStandings[circle.id] ?? []).map((entry) => ({
        id: entry.id,
        user_id: entry.user_id,
        rank: entry.rank,
        displayName: entry.displayName,
        avatarUrl: entry.avatar_url ?? undefined,
        badge: entry.badge,
        weeklyPoints: entry.weeklyPoints,
        isActive: entry.isActive,
      }))
    }

    return [
      {
        id: `${circle.id}-user`,
        user_id: 'current-user',
        rank: 1,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        badge: user.badge,
        weeklyPoints: 24,
        isActive: true,
      },
      {
        id: `${circle.id}-2`,
        user_id: 'peer-1',
        rank: 2,
        displayName: 'Asha',
        avatarUrl: undefined,
        badge: 'Citizen',
        weeklyPoints: 18,
        isActive: true,
      },
      {
        id: `${circle.id}-3`,
        user_id: 'peer-2',
        rank: 3,
        displayName: 'Rohit',
        avatarUrl: undefined,
        badge: 'Citizen',
        weeklyPoints: 14,
        isActive: false,
      },
    ]
  }, [circle.id, circle.isCreated, user.displayName, user.avatarUrl, user.badge])

  return (
    <CircleDetailPage
      circle={{
        id: circle.id,
        name: circle.name,
        avatar_url: circle.avatar_url,
        description: circle.description,
        category: circle.category,
        member_count: circle.member_count,
        eminence_score: circle.eminence_score,
      }}
      standings={standings}
      user={user}
    />
  )
}
