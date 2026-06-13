'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { CircleCard } from '@/components/community/CircleCard'
import { cn } from '@/lib/utils'
import { useCreatedCircles, CreatedCircle } from '@/hooks/useCreatedCircles'

interface Circle {
  id: string
  name: string
  avatar_url?: string | null
  category: string
  member_count: number
  eminence_score: number
  weeklyRank: number
  isJoined?: boolean
  userRank?: number
}

interface CommunityPageProps {
  user?: {
    id?: string
    displayName: string
    avatarUrl?: string
    standing: number
    badge: string
  }
  circles: Circle[]
  discoverCircles: Circle[]
}

export function CommunityPage({ user, circles, discoverCircles }: CommunityPageProps) {
  const { createdCircles } = useCreatedCircles()
  const [activeTab, setActiveTab] = useState<'my-circles' | 'discover'>('my-circles')
  const [searchQuery, setSearchQuery] = useState('')
  const [joinedCircleIds, setJoinedCircleIds] = useState<string[]>(() => circles.map((circle) => circle.id))

  useEffect(() => {
    const createdJoinedIds = createdCircles.filter((circle) => circle.isJoined).map((circle) => circle.id)
    setJoinedCircleIds((current) => Array.from(new Set([...current, ...createdJoinedIds])))
  }, [createdCircles])

  const joinedCircleSet = useMemo(() => new Set(joinedCircleIds), [joinedCircleIds])
  const mergedDiscoverCircles = useMemo(() => {
    const map = new Map<string, Circle | CreatedCircle>()
    createdCircles.forEach((circle) => {
      map.set(circle.id, circle)
    })
    discoverCircles.forEach((circle) => {
      if (!map.has(circle.id)) {
        map.set(circle.id, circle)
      }
    })
    return Array.from(map.values())
  }, [createdCircles, discoverCircles])

  const filteredDiscoverCircles = useMemo(
    () =>
      mergedDiscoverCircles.filter((circle) => {
        const query = searchQuery.trim().toLowerCase()
        if (!query) return true
        return (
          circle.name.toLowerCase().includes(query) ||
          circle.category.toLowerCase().includes(query)
        )
      }),
    [mergedDiscoverCircles, searchQuery]
  )

  const myCircles = useMemo(
    () => mergedDiscoverCircles.filter((circle) => joinedCircleSet.has(circle.id)),
    [mergedDiscoverCircles, joinedCircleSet]
  )

  const handleToggleJoin = (circleId: string) => {
    setJoinedCircleIds((current) =>
      current.includes(circleId) ? current.filter((id) => id !== circleId) : [...current, circleId]
    )
  }

  return (
    <AppLayout user={user}>
      <div className="space-y-6 px-4 py-5 sm:px-0">
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Impact Circles</p>
              <h1 className="mt-3 text-3xl font-serif font-bold text-foreground">Your circle network</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Find the circles you have joined and discover new citizen-led groups with mock-backed data.
              </p>
            </div>
            <Link
              href="/create/circle"
              className="inline-flex items-center justify-center rounded-3xl bg-gold px-4 py-3 text-sm font-semibold text-black transition hover:bg-gold-dark"
            >
              Create Circle
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'my-circles', label: 'My Circles' },
            { id: 'discover', label: 'Discover Circles' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as 'my-circles' | 'discover')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                activeTab === tab.id ? 'bg-gold text-black' : 'bg-muted text-muted-foreground hover:bg-muted/70'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'discover' && (
          <div className="space-y-5">
            <div className="rounded-3xl border border-border bg-background p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Discover Circles</h2>
                  <p className="text-sm text-muted-foreground">
                    Search by circle name or category and join the groups that matter most.
                  </p>
                </div>
                <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                  {filteredDiscoverCircles.length} circles
                </span>
              </div>

              <div className="mt-4">
                <label htmlFor="circle-search" className="sr-only">
                  Search circles
                </label>
                <input
                  id="circle-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search circles by name or category"
                  className="w-full rounded-3xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
                />
              </div>
            </div>

            {filteredDiscoverCircles.length === 0 ? (
              <div className="rounded-3xl border border-border bg-muted/30 p-8 text-center text-muted-foreground">
                No circles match that search.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredDiscoverCircles.map((circle) => (
                  <CircleCard
                    key={circle.id}
                    id={circle.id}
                    name={circle.name}
                    logoUrl={circle.avatar_url ?? undefined}
                    category={circle.category}
                    memberCount={circle.member_count}
                    weeklyRank={circle.weeklyRank}
                    isJoined={joinedCircleIds.includes(circle.id)}
                    onToggleJoin={() => handleToggleJoin(circle.id)}
                    href={`/community/${circle.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'my-circles' && (
          <div className="space-y-5">
            <div className="rounded-3xl border border-border bg-background p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">My Circles</h2>
                  <p className="text-sm text-muted-foreground">
                    Access the circles you have joined and open their detail screens.
                  </p>
                </div>
                <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                  {myCircles.length} joined
                </span>
              </div>
            </div>

            {myCircles.length === 0 ? (
              <div className="rounded-3xl border border-border bg-muted/30 p-8 text-center text-muted-foreground">
                You haven’t joined any circles yet.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {myCircles.map((circle) => (
                  <CircleCard
                    key={circle.id}
                    id={circle.id}
                    name={circle.name}
                    logoUrl={circle.avatar_url ?? undefined}
                    category={circle.category}
                    memberCount={circle.member_count}
                    weeklyRank={circle.weeklyRank}
                    isJoined
                    userRank={circle.userRank}
                    onToggleJoin={() => handleToggleJoin(circle.id)}
                    href={`/community/${circle.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
