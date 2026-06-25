'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle2, UserPlus } from 'lucide-react'
import { cn, formatCompactNumber } from '@/lib/utils'
import type { KeyboardEvent } from 'react'

interface CircleCardProps {
  id: string
  name: string
  logoUrl?: string
  category: string
  memberCount: number
  weeklyRank: number
  isJoined?: boolean
  userRank?: number
  href?: string
  onToggleJoin?: () => void
}

export function CircleCard({
  id,
  name,
  logoUrl,
  category,
  memberCount,
  weeklyRank,
  isJoined = false,
  userRank,
  href,
  onToggleJoin,
}: CircleCardProps) {
  const router = useRouter()

  const handleClick = () => {
    if (href) {
      router.push(href)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!href) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      router.push(href)
    }
  }

  return (
    <article
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={href ? 0 : undefined}
      role={href ? 'button' : undefined}
      className={cn(
        'group border border-border rounded-3xl bg-card p-4 shadow-sm transition hover:shadow-lg',
        href ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold' : ''
      )}
    >
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center overflow-hidden ring-1 ring-border">
          {logoUrl ? (
            <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-muted-foreground text-lg font-semibold">C</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground hover:text-gold transition-colors line-clamp-2">
              {name}
            </h3>
            <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">#{weeklyRank}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{category}</span>
            {userRank !== undefined && (
              <span className="rounded-full border border-border px-2 py-1 text-[11px] font-semibold text-foreground">
                Your rank {userRank}
              </span>
            )}
          </div>
        </div>

        {typeof onToggleJoin === 'function' && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onToggleJoin()
            }}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
              isJoined
                ? 'border border-border bg-muted text-foreground hover:bg-muted/80'
                : 'bg-gold text-black hover:bg-gold-dark'
            )}
          >
            {isJoined ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Joined
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Join
              </>
            )}
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-muted/70 p-3">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Members</p>
          <p className="mt-2 text-sm font-semibold text-foreground">{formatCompactNumber(memberCount)}</p>
        </div>

        <div className="rounded-2xl bg-muted/70 p-3">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Weekly rank</p>
          <p className="mt-2 text-sm font-semibold text-foreground">#{weeklyRank}</p>
        </div>
      </div>
    </article>
  )
}
