'use client'

import Link from 'next/link'
import { Clock, MapPin, Users, Trophy, Coins, CheckCircle } from 'lucide-react'
import { cn, formatCompactNumber, getBadgeColorClass } from '@/lib/utils'

interface ChallengeCardProps {
  id: string
  title: string
  description: string
  type: 'static' | 'proclamation'
  standingReward: number
  creditReward: number
  participantCount: number
  expiresAt?: string
  localityName?: string
  category?: {
    id: string
    name: string
    icon: string
  }
  creator?: {
    id: string
    displayName: string
    avatarUrl?: string
    badge: string
  }
  isAccepted?: boolean
  onAccept?: () => void
}

export function ChallengeCard({
  id,
  title,
  description,
  type,
  standingReward,
  creditReward,
  participantCount,
  expiresAt,
  localityName,
  category,
  creator,
  isAccepted,
  onAccept,
}: ChallengeCardProps) {
  const isProclamation = type === 'proclamation'

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!expiresAt) return null
    const now = new Date()
    const end = new Date(expiresAt)
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return 'Ended'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h left`
    return `${hours}h left`
  }

  const timeRemaining = getTimeRemaining()

  return (
    <article className="p-4 border border-border rounded-lg bg-white hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Category Icon */}
        {category && (
          <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center text-gold flex-shrink-0">
            <span className="text-lg">{category.icon || '🎯'}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <Link href={`/challenges/${id}`}>
            <h3 className="font-medium text-foreground hover:text-gold transition-colors line-clamp-2">
              {title}
            </h3>
          </Link>
          {category && (
            <span className="text-xs text-muted-foreground">{category.name}</span>
          )}
        </div>

        {/* Status Badge */}
        {isAccepted && (
          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Accepted
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {description}
      </p>

      {/* Proclamation Creator */}
      {isProclamation && creator && (
        <div className="flex items-center gap-2 mb-4 p-2 bg-muted/30 rounded-lg">
          <div
            className={cn(
              'w-8 h-8 rounded-full bg-muted flex items-center justify-center',
              'ring-2',
              getBadgeColorClass(creator.badge)
            )}
          >
            {creator.avatarUrl ? (
              <img
                src={creator.avatarUrl}
                alt={creator.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-xs font-medium text-muted-foreground">
                {creator.displayName.charAt(0)}
              </span>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Raised by</p>
            <p className="text-sm font-medium">{creator.displayName}</p>
          </div>
        </div>
      )}

      {/* Participant count for proclamations */}
      {isProclamation && participantCount > 0 && (
        <div className="mb-4 p-2 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground">
            {formatCompactNumber(participantCount)} backers
          </span>
        </div>
      )}

      {/* Meta Info */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
        {timeRemaining && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {timeRemaining}
          </span>
        )}
        {!isProclamation && participantCount > 0 && (
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {formatCompactNumber(participantCount)} completed
          </span>
        )}
        {localityName && (
          <span className="flex items-center gap-1 text-gold">
            <MapPin className="w-3.5 h-3.5" />
            {localityName}
          </span>
        )}
      </div>

      {/* Rewards */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1 text-sm">
          <Trophy className="w-4 h-4 text-gold" />
          <span className="font-medium">+{standingReward}</span>
          <span className="text-muted-foreground">Standing</span>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Coins className="w-4 h-4 text-gold" />
          <span className="font-medium">+{creditReward}</span>
          <span className="text-muted-foreground">IC</span>
        </div>
      </div>

      {/* Action Button */}
      {!isAccepted ? (
        <button
          onClick={onAccept}
          className="w-full py-2.5 bg-gold text-white font-medium rounded-lg
                     hover:bg-gold-dark transition-colors"
        >
          {isProclamation ? 'Back This Issue' : 'Accept Challenge'}
        </button>
      ) : (
        <Link
          href={`/challenges/${id}/submit`}
          className="block w-full py-2.5 text-center bg-gold/10 text-gold font-medium rounded-lg
                     hover:bg-gold/20 transition-colors"
        >
          Submit Proof
        </Link>
      )}
    </article>
  )
}

/**
 * Skeleton loader for ChallengeCard
 */
export function ChallengeCardSkeleton() {
  return (
    <article className="p-4 border border-border rounded-lg bg-white animate-pulse">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-muted" />
        <div className="flex-1">
          <div className="h-5 w-3/4 bg-muted rounded mb-2" />
          <div className="h-3 w-1/4 bg-muted rounded" />
        </div>
      </div>
      <div className="h-4 w-full bg-muted rounded mb-2" />
      <div className="h-4 w-2/3 bg-muted rounded mb-4" />
      <div className="flex gap-4 mb-4">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-4 w-20 bg-muted rounded" />
      </div>
      <div className="h-10 w-full bg-muted rounded" />
    </article>
  )
}
