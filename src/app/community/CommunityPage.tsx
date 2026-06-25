'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { CircleCard } from '@/components/community/CircleCard'
import { cn } from '@/lib/utils'

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
  const [activeTab, setActiveTab] = useState<'my-circles' | 'discover'>('my-circles')
  const [searchQuery, setSearchQuery] = useState('')

  // Optimistic join state — maps circleId → true/false
  const [joinOverrides, setJoinOverrides] = useState<Record<string, boolean>>({})

  // Merge server-provided isJoined with optimistic overrides
  function isJoined(circle: Circle): boolean {
    if (circle.id in joinOverrides) return joinOverrides[circle.id]
    return circle.isJoined ?? false
  }

  async function handleToggleJoin(circleId: string, currentlyJoined: boolean) {
    // Optimistic update
    setJoinOverrides(prev => ({ ...prev, [circleId]: !currentlyJoined }))

    try {
      const method = currentlyJoined ? 'DELETE' : 'POST'
      const res = await fetch(`/api/circles/${circleId}/join`, { method })
      if (!res.ok) {
        // Revert on failure
        setJoinOverrides(prev => ({ ...prev, [circleId]: currentlyJoined }))
      }
    } catch {
      setJoinOverrides(prev => ({ ...prev, [circleId]: currentlyJoined }))
    }
  }

  const filteredDiscoverCircles = useMemo(
    () =>
      discoverCircles.filter(circle => {
        const query = searchQuery.trim().toLowerCase()
        if (!query) return true
        return (
          circle.name.toLowerCase().includes(query) ||
          circle.category.toLowerCase().includes(query)
        )
      }),
    [discoverCircles, searchQuery]
  )

  const myCircles = useMemo(
    () => discoverCircles.filter(c => isJoined(c)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [discoverCircles, joinOverrides]
  )

  // Seed myCircles with the server-provided joined circles so they show
  // on first render even before the discover list is filtered
  const displayedMyCircles = useMemo(() => {
    const ids = new Set(myCircles.map(c => c.id))
    const extra = circles.filter(c => !ids.has(c.id))
    return [...myCircles, ...extra]
  }, [myCircles, circles])

  return (
    <AppLayout user={user}>
      <div className="space-y-6 px-4 py-5 sm:px-0">
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Impact Circles</p>
              <h1 className="mt-3 text-3xl font-serif font-bold text-foreground">Your circle network</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Find the circles you have joined and discover new citizen-led groups in your locality.
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

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'my-circles', label: 'My Circles' },
            { id: 'discover',   label: 'Discover Circles' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as 'my-circles' | 'discover')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                activeTab === tab.id
                  ? 'bg-gold text-black'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Discover tab */}
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
                <label htmlFor="circle-search" className="sr-only">Search circles</label>
                <input
                  id="circle-search"
                  type="search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
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
                {filteredDiscoverCircles.map(circle => (
                  <CircleCard
                    key={circle.id}
                    id={circle.id}
                    name={circle.name}
                    logoUrl={circle.avatar_url ?? undefined}
                    category={circle.category}
                    memberCount={circle.member_count}
                    weeklyRank={circle.weeklyRank}
                    isJoined={isJoined(circle)}
                    onToggleJoin={() => handleToggleJoin(circle.id, isJoined(circle))}
                    href={`/community/${circle.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Circles tab */}
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
                  {displayedMyCircles.length} joined
                </span>
              </div>
            </div>

            {displayedMyCircles.length === 0 ? (
              <div className="rounded-3xl border border-border bg-muted/30 p-8 text-center text-muted-foreground">
                You haven't joined any circles yet. Switch to Discover Circles to find one.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {displayedMyCircles.map(circle => (
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
                    onToggleJoin={() => handleToggleJoin(circle.id, true)}
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
