'use client'

import { cn } from '@/lib/utils'
import type { ReactionGroup } from '@/types/circle-chat'

/**
 * Reaction count pills shown beneath a message bubble.
 * Tapping a pill toggles the current user's reaction.
 */
export function ReactionBar({
  reactions, onToggle, align,
}: {
  reactions: ReactionGroup[]
  onToggle: (emoji: string) => void
  align: 'start' | 'end'
}) {
  if (!reactions.length) return null

  return (
    <div className={cn('flex flex-wrap gap-1 mt-1', align === 'end' ? 'justify-end' : 'justify-start')}>
      {reactions.map(r => (
        <button
          key={r.emoji}
          onClick={() => onToggle(r.emoji)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
            r.mine
              ? 'border-gold/50 bg-gold/15 text-foreground'
              : 'border-border bg-white text-muted-foreground hover:bg-muted',
          )}
        >
          <span className="leading-none">{r.emoji}</span>
          <span className="leading-none font-medium tabular-nums">{r.count}</span>
        </button>
      ))}
    </div>
  )
}
