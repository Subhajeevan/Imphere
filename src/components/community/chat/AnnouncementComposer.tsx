'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { X, Megaphone, Loader2 } from 'lucide-react'

/**
 * Bottom-sheet composer for a leader announcement. `onPost` resolves to a
 * boolean success flag.
 */
export function AnnouncementComposer({
  onClose, onPost,
}: {
  onClose: () => void
  onPost: (content: string) => Promise<boolean>
}) {
  const [text, setText]           = useState('')
  const [submitting, setSubmit]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [visible, setVisible]     = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const close = () => { setVisible(false); setTimeout(onClose, 250) }

  const submit = async () => {
    const content = text.trim()
    if (!content || submitting) return
    setSubmit(true)
    setError(null)
    const ok = await onPost(content)
    setSubmit(false)
    if (ok) close()
    else setError('Could not post the announcement. Please try again.')
  }

  return (
    <>
      <div
        className={cn('fixed inset-0 z-[80] bg-black/40 transition-opacity duration-300', visible ? 'opacity-100' : 'opacity-0')}
        onClick={close}
      />
      <div className={cn(
        'fixed left-0 right-0 bottom-0 z-[90] bg-white rounded-t-3xl shadow-2xl',
        'transition-transform duration-300 ease-in-out',
        visible ? 'translate-y-0' : 'translate-y-full',
      )}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="flex items-center justify-between px-5 pt-1 pb-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-gold" />
            <h3 className="text-base font-serif font-bold text-foreground">New Announcement</h3>
          </div>
          <button onClick={close} className="p-1.5 rounded-full hover:bg-muted"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="px-4 pb-8 space-y-3">
          <div className="rounded-2xl border border-gold/30 bg-gold/5 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Announcements are highlighted for everyone in the circle and can’t be replied to.
            </p>
          </div>
          <textarea
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Share an important update with the circle…"
            className="w-full resize-none rounded-2xl bg-muted px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={submit}
            disabled={!text.trim() || submitting}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-colors',
              text.trim() && !submitting ? 'bg-gold text-black hover:bg-gold-dark' : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Post Announcement
          </button>
        </div>
      </div>
    </>
  )
}
