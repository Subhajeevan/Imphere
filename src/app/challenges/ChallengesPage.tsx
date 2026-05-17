'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  ChallengeCard,
  ChallengeCardSkeleton,
} from '@/components/challenges/ChallengeCard'
import { cn } from '@/lib/utils'
import { Plus, AlertCircle } from 'lucide-react'
import Link from 'next/link'

type ChallengeTab = 'welfare' | 'proclamation'

interface Category {
  id: string
  name: string
  slug: string
  icon: string
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchChallenges = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ type: activeTab })
      if (selectedCategory) {
        params.set('category', selectedCategory)
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
  }, [activeTab, selectedCategory])

  useEffect(() => {
    fetchChallenges()
  }, [fetchChallenges])

  const handleAccept = async (challengeId: string) => {
    try {
      const response = await fetch(`/api/challenges/${challengeId}/accept`, {
        method: 'POST',
      })

      if (response.ok) {
        // Update local state
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
      {/* Header */}
      <div className="sticky top-0 lg:top-0 z-40 bg-white border-b border-border">
        <div className="px-4 py-4">
          <h1 className="text-xl font-serif font-bold text-foreground">
            Challenges
          </h1>
          <p className="text-sm text-muted-foreground">
            Complete civic tasks, earn rewards
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('welfare')}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors relative',
              activeTab === 'welfare'
                ? 'text-gold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Welfare Tracks
            {activeTab === 'welfare' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('proclamation')}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors relative',
              activeTab === 'proclamation'
                ? 'text-gold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Proclamations
            {activeTab === 'proclamation' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
            )}
          </button>
        </div>
      </div>

      {/* Category Filter */}
      {activeTab === 'welfare' && categories.length > 0 && (
        <div className="p-4 border-b border-border overflow-x-auto">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                selectedCategory === null
                  ? 'bg-gold text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1',
                  selectedCategory === category.id
                    ? 'bg-gold text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <span>{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Raise Issue Card (for Proclamations) */}
      {activeTab === 'proclamation' && (
        <Link
          href="/challenges/raise"
          className="m-4 p-4 border-2 border-dashed border-gold/50 rounded-lg
                     hover:border-gold hover:bg-gold/5 transition-colors
                     flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
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

      {/* Content */}
      <div className="p-4">
        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-4">
            {[...Array(4)].map((_, i) => (
              <ChallengeCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Challenges Grid */}
        {!isLoading && !error && (
          <>
            {challenges.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-2">
                  No {activeTab === 'welfare' ? 'challenges' : 'proclamations'} found
                </p>
                {selectedCategory && (
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-gold hover:underline text-sm"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            ) : (
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
                    category={challenge.category}
                    creator={challenge.creator}
                    isAccepted={challenge.isAccepted}
                    onAccept={() => handleAccept(challenge.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
