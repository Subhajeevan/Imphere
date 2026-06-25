'use client'

import { Star, MapPin } from 'lucide-react'
import { cn, formatCompactNumber } from '@/lib/utils'

export interface LeaderboardItemProps {
  rank: number
  displayName: string
  avatarUrl?: string
  badge: string
  standing: number
  area?: string
  isCurrentUser?: boolean
  isActive?: boolean
}

export function LeaderboardItem({
  rank,
  displayName,
  avatarUrl,
  badge,
  standing,
  area,
  isCurrentUser = false,
  isActive,
}: LeaderboardItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-3xl border p-4 transition',
        'border-border bg-card',
        isCurrentUser ? 'bg-gold/10 border-gold' : 'hover:border-gold/50 hover:bg-gold/5'
      )}
    >
      <div className={cn(
        'flex h-12 w-12 items-center justify-center rounded-3xl text-lg font-semibold',
        rank === 1 ? 'bg-gold text-black' : 'bg-muted text-foreground'
      )}>
        {rank}
      </div>

      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-12 h-12 rounded-3xl bg-muted flex items-center justify-center overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">{displayName.charAt(0)}</span>
          )}
        </div>

        <div className="min-w-0">
          <p className={cn('font-semibold text-sm truncate', isCurrentUser ? 'text-foreground' : 'text-foreground')}>
            {displayName}{isCurrentUser ? ' (You)' : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
            {badge !== 'Citizen' && (
              <span className="rounded-full border border-border px-2 py-1">
                {badge}
              </span>
            )}
            {typeof isActive === 'boolean' && (
              <span
                className={cn(
                  'rounded-full px-2 py-1',
                  isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                )}
              >
                {isActive ? '⚡ Active' : '💤 Inactive'}
              </span>
            )}
            {area && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {area}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 text-right text-sm">
        <div className="inline-flex items-center gap-1 text-foreground font-semibold">
          <Star className="w-4 h-4 text-gold" />
          {formatCompactNumber(standing)}
        </div>
        <span className="text-xs text-muted-foreground">Weekly Standing</span>
      </div>
    </div>
  )
}
