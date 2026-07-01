'use client'

import { cn } from '@/lib/utils'
import { Check, BarChart3 } from 'lucide-react'
import type { ChatPoll } from '@/types/circle-chat'

/**
 * Renders a poll with live vote percentages. Tapping an option casts/!changes a
 * vote. Single-choice polls move the user's vote; multi-choice toggle each.
 */
export function PollCard({
  poll, onVote, mine,
}: {
  poll: ChatPoll
  onVote: (optionId: string) => void
  mine: boolean
}) {
  const closed = poll.closesAt ? new Date(poll.closesAt).getTime() < Date.now() : false
  const total  = poll.totalVotes

  return (
    <div className={cn('rounded-2xl border p-3 min-w-[230px]', mine ? 'border-black/15 bg-white/70' : 'border-border bg-white')}>
      <div className="flex items-center gap-1.5 mb-2">
        <BarChart3 className="w-4 h-4 text-gold" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Poll{poll.allowMultiple ? ' · multiple' : ''}
        </span>
      </div>

      <p className="text-sm font-semibold text-foreground mb-2.5">{poll.question}</p>

      <div className="space-y-1.5">
        {poll.options.map(opt => {
          const count = poll.tallies[opt.id] ?? 0
          const pct   = total > 0 ? Math.round((count / total) * 100) : 0
          const voted = poll.myVotes.includes(opt.id)
          return (
            <button
              key={opt.id}
              onClick={() => !closed && onVote(opt.id)}
              disabled={closed}
              className={cn(
                'relative w-full overflow-hidden rounded-xl border text-left transition-colors',
                voted ? 'border-gold' : 'border-border hover:border-gold/40',
                closed && 'cursor-default',
              )}
            >
              {/* Fill bar */}
              <div
                className={cn('absolute inset-y-0 left-0 transition-all duration-500', voted ? 'bg-gold/25' : 'bg-muted')}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center gap-2 px-3 py-2">
                <span className={cn(
                  'w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0',
                  voted ? 'border-gold bg-gold text-white' : 'border-muted-foreground/40',
                )}>
                  {voted && <Check className="w-3 h-3" />}
                </span>
                <span className="text-sm text-foreground flex-1 truncate">{opt.text}</span>
                <span className="text-xs font-medium text-muted-foreground tabular-nums">{pct}%</span>
              </div>
            </button>
          )
        })}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        {total} {total === 1 ? 'vote' : 'votes'}{closed ? ' · closed' : ''}
      </p>
    </div>
  )
}
