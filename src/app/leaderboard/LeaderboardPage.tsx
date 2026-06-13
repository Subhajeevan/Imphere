'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Search, Trophy, Medal, Star, MapPin, Coins,
  ChevronUp, Loader2, X, Filter, Crown
} from 'lucide-react'
import { cn, getBadgeColorClass } from '@/lib/utils'

interface LeaderUser {
  id: string
  rank: number
  displayName: string
  avatarUrl?: string | null
  badge: string
  standing: number
  impactCredits: number
  nativePinName?: string | null
  isCurrentUser?: boolean
}

interface LeaderboardPageProps {
  user?: {
    displayName: string
    avatarUrl?: string
    standing: number
    badge: string
  }
  currentUserId?: string
}

// Badge ring color CSS classes (aligned with tailwind config)
const BADGE_RING: Record<string, string> = {
  Gold:    'ring-yellow-400 shadow-yellow-400/30',
  Silver:  'ring-slate-400 shadow-slate-400/20',
  Bronze:  'ring-amber-600 shadow-amber-600/20',
  Citizen: 'ring-border shadow-transparent',
}

// Rank medal icons & colours
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <span className="flex items-center justify-center w-9 h-9">
      <Crown className="w-7 h-7 text-yellow-400 drop-shadow-sm" />
    </span>
  )
  if (rank === 2) return (
    <span className="flex items-center justify-center w-9 h-9">
      <Medal className="w-6 h-6 text-slate-400" />
    </span>
  )
  if (rank === 3) return (
    <span className="flex items-center justify-center w-9 h-9">
      <Medal className="w-6 h-6 text-amber-600" />
    </span>
  )
  return (
    <span className="flex items-center justify-center w-9 h-9 text-sm font-bold text-muted-foreground tabular-nums">
      #{rank}
    </span>
  )
}

// Extract area segments from native_pin_name: "City, State, India" → ["City", "State", "India"]
function extractArea(nativePinName: string | null | undefined): { city: string; state: string } {
  if (!nativePinName) return { city: '', state: '' }
  const parts = nativePinName.split(',').map(p => p.trim())
  return { city: parts[0] || '', state: parts[1] || '' }
}

// Derive a subtle hue for community grouping (same state gets same color band)
const STATE_COLORS: string[] = [
  'from-blue-500/8',
  'from-violet-500/8',
  'from-emerald-500/8',
  'from-rose-500/8',
  'from-amber-500/8',
  'from-cyan-500/8',
  'from-indigo-500/8',
  'from-fuchsia-500/8',
  'from-teal-500/8',
  'from-orange-500/8',
]

function getStateColor(state: string): string {
  if (!state) return ''
  let hash = 0
  for (let i = 0; i < state.length; i++) hash = (hash * 31 + state.charCodeAt(i)) & 0xffff
  return STATE_COLORS[hash % STATE_COLORS.length]
}

// Unique areas for the quick-filter chips
function getUniqueStates(users: LeaderUser[]): string[] {
  const seen = new Set<string>()
  const states: string[] = []
  for (const u of users) {
    const { state } = extractArea(u.nativePinName)
    if (state && !seen.has(state)) { seen.add(state); states.push(state) }
  }
  return states
}

export function LeaderboardPage({ user, currentUserId }: LeaderboardPageProps) {
  const [users, setUsers]           = useState<LeaderUser[]>([])
  const [total, setTotal]           = useState(0)
  const [search, setSearch]         = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [activeArea, setActiveArea] = useState<string | null>(null)
  const [uniqueStates, setUniqueStates] = useState<string[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [offset, setOffset]         = useState(0)
  const LIMIT = 30
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchUsers = useCallback(async (
    newSearch: string,
    newArea: string,
    newOffset: number,
    append = false
  ) => {
    if (newOffset === 0) setIsLoading(true)
    else setIsLoadingMore(true)

    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(newOffset) })
      if (newSearch.trim()) params.set('search', newSearch.trim())
      if (newArea.trim())   params.set('area', newArea.trim())

      const res  = await fetch(`/api/leaderboard?${params}`)
      const data = await res.json()

      if (append) {
        setUsers(prev => [...prev, ...(data.users || [])])
      } else {
        setUsers(data.users || [])
        if (!newArea && !newSearch) setUniqueStates(getUniqueStates(data.users || []))
      }
      setTotal(data.total || 0)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [])

  // Initial + filter-driven load
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      const area = activeArea ?? areaFilter
      setOffset(0)
      fetchUsers(search, area, 0, false)
    }, 300)
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [search, areaFilter, activeArea, fetchUsers])

  const loadMore = () => {
    const nextOffset = offset + LIMIT
    setOffset(nextOffset)
    fetchUsers(search, activeArea ?? areaFilter, nextOffset, true)
  }

  const clearFilters = () => {
    setSearch('')
    setAreaFilter('')
    setActiveArea(null)
  }

  const hasFilter = search || areaFilter || activeArea

  // Current user's rank info
  const myEntry = users.find(u => u.isCurrentUser || u.id === currentUserId)

  return (
    <AppLayout user={user}>
      {/* ── Sticky Header ─────────────────────────────────── */}
      <div className="sticky top-0 lg:top-0 z-40 w-full bg-background border-b border-border transition-colors duration-300">
        {/* Title row */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h1 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-gold" />
              Leaderboard
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total > 0 ? `${total} civic champions ranked` : 'Ranked by Standing Points'}
            </p>
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all',
              showFilters || hasFilter
                ? 'border-gold bg-gold/10 text-gold'
                : 'border-border text-muted-foreground hover:border-gold/50 hover:text-foreground'
            )}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>
            {hasFilter && <span className="w-2 h-2 rounded-full bg-gold" />}
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm bg-muted/40 border border-border
                         text-foreground placeholder:text-muted-foreground
                         focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="px-4 pb-3 space-y-2 border-t border-border/60 pt-3 bg-muted/20">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Filter by Area / State
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={areaFilter}
                onChange={e => { setAreaFilter(e.target.value); setActiveArea(null) }}
                placeholder="e.g. Maharashtra, Karnataka, Mumbai…"
                className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm bg-card border border-border
                           text-foreground placeholder:text-muted-foreground
                           focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
              />
              {areaFilter && (
                <button onClick={() => setAreaFilter('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick-select state chips */}
            {uniqueStates.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {uniqueStates.slice(0, 8).map(state => (
                  <button
                    key={state}
                    onClick={() => { setActiveArea(s => s === state ? null : state); setAreaFilter('') }}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                      activeArea === state
                        ? 'bg-gold text-white border-gold'
                        : 'bg-card border-border text-muted-foreground hover:border-gold/50 hover:text-foreground'
                    )}
                  >
                    {state}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active filter chip */}
        {hasFilter && (
          <div className="flex items-center justify-between px-4 py-1.5 bg-gold/5 border-t border-gold/20">
            <p className="text-xs text-muted-foreground">
              {search && <span>Searching "<span className="text-gold font-medium">{search}</span>"</span>}
              {search && (areaFilter || activeArea) && <span className="mx-1">·</span>}
              {(areaFilter || activeArea) && (
                <span>Area: <span className="text-gold font-medium">{activeArea || areaFilter}</span></span>
              )}
            </p>
            <button onClick={clearFilters} className="text-xs text-gold hover:text-gold-dark font-medium">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── My Rank Banner ─────────────────────────────────── */}
      {myEntry && !hasFilter && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-gradient-to-r from-gold/15 to-gold/5 border border-gold/30 flex items-center gap-3">
          <Trophy className="w-5 h-5 text-gold flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Your Rank</p>
            <p className="font-semibold text-foreground">#{myEntry.rank} · {myEntry.standing.toLocaleString()} Standing</p>
          </div>
          <ChevronUp className="w-4 h-4 text-gold" />
        </div>
      )}

      {/* ── Leaderboard List ───────────────────────────────── */}
      <div className="pb-8">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                <div className="w-9 h-9 bg-muted rounded-full" />
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-muted rounded w-36" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
                <div className="h-4 bg-muted rounded w-20" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <Trophy className="w-14 h-14 text-muted-foreground/50 mb-4" />
            <p className="font-medium text-foreground mb-1">No results found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filter</p>
          </div>
        ) : (
          <>
            {/* Top 3 podium (only when no filter) */}
            {!hasFilter && users.length >= 3 && (
              <div className="flex items-end justify-center gap-3 px-4 pt-6 pb-2">
                {/* 2nd place */}
                <PodiumCard user={users[1]} position={2} />
                {/* 1st place */}
                <PodiumCard user={users[0]} position={1} />
                {/* 3rd place */}
                <PodiumCard user={users[2]} position={3} />
              </div>
            )}

            {/* Full ranked list */}
            <div className="divide-y divide-border/50 mt-2">
              {users.map((u, idx) => {
                const { state } = extractArea(u.nativePinName)
                const stateColor = getStateColor(state)
                const isMe = u.isCurrentUser || u.id === currentUserId
                const isTop3 = u.rank <= 3 && !hasFilter

                return (
                  <Link
                    key={u.id}
                    href={`/profile/${u.id}`}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 transition-all duration-150 group',
                      'hover:bg-muted/40',
                      isMe && 'bg-gold/5 hover:bg-gold/10',
                      isTop3 && `bg-gradient-to-r ${stateColor} to-transparent`,
                    )}
                  >
                    {/* Rank */}
                    <RankBadge rank={u.rank} />

                    {/* Avatar + badge ring */}
                    <div className={cn(
                      'w-11 h-11 rounded-full bg-muted flex-shrink-0 flex items-center justify-center',
                      'ring-2 shadow-sm',
                      BADGE_RING[u.badge] || BADGE_RING.Citizen
                    )}>
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt={u.displayName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-bold text-muted-foreground">
                          {u.displayName.charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className={cn(
                          'font-medium text-sm truncate group-hover:text-gold transition-colors',
                          isMe ? 'text-gold' : 'text-foreground'
                        )}>
                          {u.displayName}
                          {isMe && <span className="ml-1 text-xs">(You)</span>}
                        </p>
                        {u.badge !== 'Citizen' && (
                          <span className={cn(
                            'flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium',
                            u.badge === 'Gold'   && 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400',
                            u.badge === 'Silver' && 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
                            u.badge === 'Bronze' && 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
                          )}>
                            {u.badge}
                          </span>
                        )}
                      </div>
                      {u.nativePinName && (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {u.nativePinName}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                        <Star className="w-3.5 h-3.5 text-gold" />
                        {u.standing.toLocaleString()}
                      </div>
                      {u.impactCredits > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Coins className="w-3 h-3" />
                          {u.impactCredits.toLocaleString()} IC
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Load more */}
            {users.length < total && (
              <div className="flex justify-center py-6">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border
                             text-sm text-muted-foreground hover:border-gold hover:text-gold transition-all"
                >
                  {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isLoadingMore ? 'Loading…' : `Load more (${total - users.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}

/* ── Podium Card (top 3 visual) ──────────────────────────── */
function PodiumCard({ user, position }: { user: LeaderUser; position: 1 | 2 | 3 }) {
  const heights: Record<number, string> = { 1: 'h-24', 2: 'h-16', 3: 'h-12' }
  const avatarSize: Record<number, string> = { 1: 'w-16 h-16 ring-4', 2: 'w-12 h-12 ring-2', 3: 'w-12 h-12 ring-2' }
  const crownColor: Record<number, string> = { 1: 'text-yellow-400', 2: 'text-slate-400', 3: 'text-amber-600' }
  const bgColor: Record<number, string> = {
    1: 'bg-gradient-to-b from-yellow-400/20 to-gold/10 border-yellow-400/40',
    2: 'bg-gradient-to-b from-slate-400/10 to-slate-400/5 border-slate-400/30',
    3: 'bg-gradient-to-b from-amber-600/10 to-amber-600/5 border-amber-600/30',
  }

  return (
    <Link href={`/profile/${user.id}`} className="flex flex-col items-center gap-2 group flex-1 max-w-[120px]">
      {/* Avatar */}
      <div className={cn(
        'rounded-full bg-muted flex items-center justify-center shadow-lg transition-transform group-hover:scale-105',
        avatarSize[position],
        BADGE_RING[user.badge] || BADGE_RING.Citizen
      )}>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full rounded-full object-cover" />
        ) : (
          <span className={cn('font-bold text-muted-foreground', position === 1 ? 'text-xl' : 'text-base')}>
            {user.displayName.charAt(0)}
          </span>
        )}
      </div>
      {/* Name */}
      <p className="text-xs font-medium text-foreground text-center truncate max-w-full px-1 group-hover:text-gold transition-colors">
        {user.displayName}
      </p>
      {/* Podium block */}
      <div className={cn('w-full rounded-t-lg border flex items-center justify-center', heights[position], bgColor[position])}>
        <span className={cn('text-lg font-bold', crownColor[position])}>#{position}</span>
      </div>
    </Link>
  )
}
