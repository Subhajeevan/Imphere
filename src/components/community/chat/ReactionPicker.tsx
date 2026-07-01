'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { QUICK_REACTIONS } from '@/types/circle-chat'

/**
 * Floating row of quick emoji reactions (👍 ❤️ 😂 😮 😢 🔥 👏).
 * Appears above/below a message when the user taps the react button.
 */
export function ReactionPicker({
  open, onPick, onClose, align = 'left',
}: {
  open: boolean
  onPick: (emoji: string) => void
  onClose: () => void
  align?: 'left' | 'right'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setMounted(true))
      return () => cancelAnimationFrame(id)
    }
    setMounted(false)
  }, [open])

  // Dismiss on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-30 -top-12 flex items-center gap-0.5 rounded-full border border-border bg-white px-1.5 py-1 shadow-xl',
        'transition-all duration-150 origin-bottom',
        mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-90',
        align === 'right' ? 'right-0' : 'left-0',
      )}
    >
      {QUICK_REACTIONS.map(emoji => (
        <button
          key={emoji}
          onClick={() => { onPick(emoji); onClose() }}
          className="w-8 h-8 flex items-center justify-center rounded-full text-lg hover:bg-muted hover:scale-125 transition-transform"
          aria-label={`React ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}
