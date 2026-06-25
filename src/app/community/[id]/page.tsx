import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { CircleDetailPage } from '@/components/community/CircleDetailPage'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, mockImpactCircleStandings, USER_IDS } from '@/lib/mock-data'
import { createClient } from '@/lib/supabase/server'

function deriveCategory(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('green') || n.includes('environment') || n.includes('nature') || n.includes('tree')) return 'environment'
  if (n.includes('blood') || n.includes('health') || n.includes('medical')) return 'health'
  return 'community'
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  if (USE_MOCK_DATA) {
    const circle = mockData.impactCircles.find(c => c.id === id)
    return {
      title:       circle ? `${circle.name} · Circle · IMPHERE` : 'Circle · IMPHERE',
      description: circle?.description ?? 'View circle member chat and standings.',
    }
  }
  return { title: 'Circle · IMPHERE' }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (USE_MOCK_DATA) {
    const circle  = mockData.impactCircles.find(c => c.id === id)
    const profile = mockData.profiles.find(p => p.id === USER_IDS.arjun)

    if (!circle) notFound()

    const standings = (mockImpactCircleStandings[id] ?? []).map(entry => ({
      id:          entry.id,
      user_id:     entry.user_id,
      rank:        entry.rank,
      displayName: entry.displayName,
      avatarUrl:   entry.avatar_url ?? undefined,
      badge:       entry.badge,
      weeklyPoints: entry.weeklyPoints,
      isActive:    entry.isActive,
    }))

    return (
      <CircleDetailPage
        circle={{
          id:             circle.id,
          name:           circle.name,
          avatar_url:     circle.avatar_url ?? undefined,
          description:    circle.description ?? 'An active impact circle uplifting local efforts.',
          category:       deriveCategory(circle.name),
          member_count:   circle.member_count ?? 0,
          eminence_score: circle.eminence_score ?? 0,
        }}
        standings={standings}
        user={
          profile
            ? {
                displayName: profile.display_name,
                avatarUrl:   profile.avatar_url ?? undefined,
                standing:    profile.standing ?? 0,
                badge:       profile.badge ?? 'Citizen',
              }
            : { displayName: 'You', standing: 0, badge: 'Citizen' }
        }
      />
    )
  }

  // ── Real Supabase path ──────────────────────────────────────────────────────
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, standing, badge')
    .eq('id', user.id)
    .single()

  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()
  const fetchOpts = { cache: 'no-store' as const, headers: { cookie: cookieHeader } }

  // Fetch circle detail
  const circleRes = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/circles/${id}`,
    fetchOpts
  )
  if (!circleRes.ok) notFound()
  const circle = await circleRes.json()

  // Fetch ranked members for the Standings tab
  const membersRes = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/circles/${id}/members`,
    fetchOpts
  )
  const membersData = membersRes.ok ? await membersRes.json() : { members: [] }

  const standings = (membersData.members ?? []).map((m: any) => ({
    id:           m.id,
    user_id:      m.user_id,
    rank:         m.rank,
    displayName:  m.display_name,
    avatarUrl:    m.avatar_url ?? undefined,
    badge:        m.badge,
    weeklyPoints: m.standing,
    isActive:     m.ready_to_serve ?? false,
  }))

  return (
    <CircleDetailPage
      circle={{
        id:             circle.id,
        name:           circle.name,
        avatar_url:     circle.avatar_url ?? undefined,
        description:    circle.description ?? 'An active impact circle.',
        category:       circle.category ?? deriveCategory(circle.name),
        member_count:   circle.member_count ?? 0,
        eminence_score: circle.eminence_score ?? 0,
      }}
      standings={standings}
      user={
        profile
          ? {
              displayName: profile.display_name,
              avatarUrl:   profile.avatar_url ?? undefined,
              standing:    profile.standing ?? 0,
              badge:       profile.badge ?? 'Citizen',
            }
          : { displayName: 'You', standing: 0, badge: 'Citizen' }
      }
    />
  )
}
