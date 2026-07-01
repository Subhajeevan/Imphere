'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Lightweight emoji keyboard for the composer (no external dependency).
 * Inserts an emoji into the message input. A full searchable picker can replace
 * this later without changing the call site.
 */
const EMOJIS = [
  '😀','😁','😂','🤣','😊','😍','😘','😎','🤔','😅',
  '👍','👎','👏','🙏','🔥','❤️','💪','✨','🎉','✅',
  '😮','😢','😡','🥳','🤝','👀','💯','⭐','📢','📍',
]

export function EmojiKeyboard({
  open, onPick,
}: {
  open: boolean
  onPick: (emoji: string) => void
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setMounted(true))
      return () => cancelAnimationFrame(id)
    }
    setMounted(false)
  }, [open])

  if (!open) return null

  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-200',
        mounted ? 'max-h-44 opacity-100' : 'max-h-0 opacity-0',
      )}
    >
      <div className="grid grid-cols-10 gap-1 px-2 py-2 border-t border-border bg-white">
        {EMOJIS.map(e => (
          <button
            key={e}
            type="button"
            onClick={() => onPick(e)}
            className="aspect-square flex items-center justify-center rounded-lg text-xl hover:bg-muted transition-colors"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}
