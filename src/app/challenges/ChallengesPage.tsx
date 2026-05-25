'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  ChallengeCard,
  ChallengeCardSkeleton,
} from '@/components/challenges/ChallengeCard'
import { cn } from '@/lib/utils'
import { Plus, AlertCircle, Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type ChallengeTab = 'welfare' | 'proclamation'

interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
}

interface Challenge {
  id: string
  title: string
  description: string
  type: 'static' | 'proclamation'
  standingReward: number
  creditReward: number
  participantCount: number
  expiresAt?: string
  localityName?: string
  category?: Category
  creator?: {
    id: string
    displayName: string
    avatarUrl?: string
    badge: string
  }
  isAccepted: boolean
}

interface ChallengesPageProps {
  user?: {
    displayName: string
    avatarUrl?: string
    standing: number
    badge: string
  }
  categories: Category[]
}

export function ChallengesPage({ user, categories }: ChallengesPageProps) {
  const [activeTab, setActiveTab] = useState<ChallengeTab>('welfare')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const ribbonRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Check ribbon scroll state
  const checkScroll = useCallback(() => {
    const el = ribbonRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 8)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }, [])

  useEffect(() => {
    const el = ribbonRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [checkScroll, categories])

  const scrollRibbon = (dir: 'left' | 'right') => {
    const el = ribbonRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' })
  }

  // Toggle a category in the multi-select set
  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const clearFilters = () => {
    setSelectedCategories([])
    setSearchQuery('')
  }

  const hasActiveFilters = selectedCategories.length > 0 || debouncedSearch.trim()

  const fetchChallenges = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ type: activeTab })

      if (selectedCategories.length > 0) {
        params.set('categories', selectedCategories.join(','))
      }

      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim())
      }

      const response = await fetch(`/api/challenges?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch challenges')
      }

      const data = await response.json()
      setChallenges(data.challenges)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load challenges')
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, selectedCategories, debouncedSearch])

  useEffect(() => {
    fetchChallenges()
  }, [fetchChallenges])

  const handleAccept = async (challengeId: string) => {
    try {
      const response = await fetch(`/api/challenges/${challengeId}/accept`, {
        method: 'POST',
      })

      if (response.ok) {
        setChallenges((prev) =>
          prev.map((c) =>
            c.id === challengeId ? { ...c, isAccepted: true } : c
          )
        )
      }
    } catch (error) {
      console.error('Failed to accept challenge:', error)
    }
  }

  return (
    <AppLayout user={user}>
      {/* ── Sticky Header Block ─────────────────────────────────────── */}
      {/* top-14 on mobile accounts for the 56px MobileTopBar; lg:top-0 because sidebar layout has no top bar */}
      <div className="sticky top-0 lg:top-0 z-40 w-full bg-background border-b border-border transition-colors duration-300">

        {/* Title row */}
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-xl font-serif font-bold text-foreground">Challenges</h1>
          <p className="text-sm text-muted-foreground">Complete civic tasks, earn rewards</p>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search challenges…"
              className={cn(
                'w-full pl-9 pr-9 py-2.5 rounded-xl text-sm',
                'bg-muted/40 border border-border text-foreground',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20',
                'transition-all duration-200'
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Welfare / Proclamation tab switcher */}
        <div className="flex border-b border-border">
          {(['welfare', 'proclamation'] as ChallengeTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab)
                setSelectedCategories([])
              }}
              className={cn(
                'flex-1 py-3 text-sm font-medium transition-colors relative capitalize',
                activeTab === tab
                  ? 'text-gold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab === 'welfare' ? 'Welfare Tracks' : 'Proclamations'}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
              )}
            </button>
          ))}
        </div>

        {/* ── YouTube-style Category Ribbon ───────────────────────── */}
        {activeTab === 'welfare' && categories.length > 0 && (
          <div className="relative">
            {/* Left fade + scroll button — desktop only */}
            {canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-0 z-10 hidden sm:flex items-center">
                <div className="w-10 h-full bg-gradient-to-r from-background to-transparent" />
                <button
                  onClick={() => scrollRibbon('left')}
                  className="absolute left-1 w-7 h-7 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-foreground hover:border-gold hover:text-gold transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Scrollable category chips */}
            <div
              ref={ribbonRef}
              className="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {/* "All" chip */}
              <button
                onClick={() => setSelectedCategories([])}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium',
                  'whitespace-nowrap flex-shrink-0 transition-all duration-200',
                  'border',
                  selectedCategories.length === 0
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-card text-foreground border-border hover:border-gold/60 hover:bg-gold/5'
                )}
                style={{ scrollSnapAlign: 'start' }}
              >
                <span className="text-base leading-none">🌐</span>
                <span>All</span>
              </button>

              {categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id)
                // Use the category's color for the indicator dot
                const dotColor = cat.color || '#B8860B'
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium',
                      'whitespace-nowrap flex-shrink-0 transition-all duration-200',
                      'border',
                      isSelected
                        ? 'bg-gold text-white border-gold shadow-sm scale-[1.03]'
                        : 'bg-card text-foreground border-border hover:border-gold/60 hover:bg-gold/5'
                    )}
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    {/* Color dot indicator */}
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: isSelected ? 'white' : dotColor }}
                    />
                    <span>{cat.name}</span>
                    {isSelected && <X className="w-3 h-3 opacity-80 ml-0.5" />}
                  </button>
                )
              })}
            </div>

            {/* Right fade + scroll button — desktop only */}
            {canScrollRight && (
              <div className="absolute right-0 top-0 bottom-0 z-10 hidden sm:flex items-center">
                <div className="w-10 h-full bg-gradient-to-l from-background to-transparent" />
                <button
                  onClick={() => scrollRibbon('right')}
                  className="absolute right-1 w-7 h-7 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-foreground hover:border-gold hover:text-gold transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Active filter summary bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between px-4 py-1.5 border-t border-border/60 bg-gold/5">
            <p className="text-xs text-muted-foreground">
              {selectedCategories.length > 0 && (
                <span>
                  <span className="text-gold font-medium">{selectedCategories.length}</span>
                  {' '}categor{selectedCategories.length === 1 ? 'y' : 'ies'} selected
                </span>
              )}
              {selectedCategories.length > 0 && debouncedSearch && <span className="mx-1">·</span>}
              {debouncedSearch && (
                <span>
                  Searching <span className="text-gold font-medium">"{debouncedSearch}"</span>
                </span>
              )}
            </p>
            <button
              onClick={clearFilters}
              className="text-xs text-gold hover:text-gold-dark font-medium transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
      {/* ── End Sticky Header ────────────────────────────────────────── */}

      {/* Raise Proclamation CTA */}
      {activeTab === 'proclamation' && (
        <Link
          href="/challenges/raise"
          className="flex items-center gap-4 mx-4 my-4 p-4 border-2 border-dashed border-gold/50 rounded-xl
                     hover:border-gold hover:bg-gold/5 transition-colors group"
        >
          <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
            <Plus className="w-6 h-6 text-gold" />
          </div>
          <div>
            <p className="font-medium text-foreground">Raise a Proclamation</p>
            <p className="text-sm text-muted-foreground">
              Spot a local problem? Rally the community to solve it.
            </p>
          </div>
        </Link>
      )}

      {/* ── Challenges List ───────────────────────────────────────────── */}
      <div className="py-3 px-0">
        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 mb-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid gap-4">
            {[...Array(4)].map((_, i) => (
              <ChallengeCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && challenges.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium mb-1">No challenges found</p>
            <p className="text-sm text-muted-foreground mb-4">
              {hasActiveFilters
                ? 'Try adjusting your search or category filters'
                : `No ${activeTab === 'welfare' ? 'challenges' : 'proclamations'} available right now`}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-gold hover:text-gold-dark font-medium underline-offset-2 hover:underline transition-all"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Challenges Grid */}
        {!isLoading && !error && challenges.length > 0 && (
          <div className="grid gap-4">
            {challenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                id={challenge.id}
                title={challenge.title}
                description={challenge.description || ''}
                type={challenge.type}
                standingReward={challenge.standingReward}
                creditReward={challenge.creditReward}
                participantCount={challenge.participantCount}
                expiresAt={challenge.expiresAt}
                localityName={challenge.localityName}
                category={challenge.category
                  ? { id: challenge.category.id, name: challenge.category.name, icon: challenge.category.icon ?? '' }
                  : undefined}
                creator={challenge.creator}
                isAccepted={challenge.isAccepted}
                onAccept={() => handleAccept(challenge.id)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
