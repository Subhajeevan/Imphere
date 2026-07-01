'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { X, Plus, Trash2, BarChart3, Loader2 } from 'lucide-react'

/**
 * Bottom-sheet composer for creating a poll (2–6 options).
 * `onCreate` resolves to a boolean success flag.
 */
export function PollComposer({
  onClose, onCreate,
}: {
  onClose: () => void
  onCreate: (question: string, options: string[], allowMultiple: boolean) => Promise<boolean>
}) {
  const [question, setQuestion]       = useState('')
  const [options, setOptions]         = useState<string[]>(['', ''])
  const [allowMultiple, setMultiple]  = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [visible, setVisible]         = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const close = () => { setVisible(false); setTimeout(onClose, 250) }

  const setOption = (i: number, v: string) =>
    setOptions(prev => prev.map((o, idx) => (idx === i ? v : o)))
  const addOption = () => setOptions(prev => (prev.length < 6 ? [...prev, ''] : prev))
  const removeOption = (i: number) =>
    setOptions(prev => (prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev))

  const valid = question.trim().length > 0 && options.filter(o => o.trim()).length >= 2

  const submit = async () => {
    if (!valid || submitting) return
    setSubmitting(true)
    setError(null)
    const ok = await onCreate(question.trim(), options.map(o => o.trim()).filter(Boolean), allowMultiple)
    setSubmitting(false)
    if (ok) close()
    else setError('Could not create the poll. Please try again.')
  }

  return (
    <>
      <div
        className={cn('fixed inset-0 z-[80] bg-black/40 transition-opacity duration-300', visible ? 'opacity-100' : 'opacity-0')}
        onClick={close}
      />
      <div className={cn(
        'fixed left-0 right-0 bottom-0 z-[90] bg-white rounded-t-3xl shadow-2xl max-h-[88vh] overflow-y-auto',
        'transition-transform duration-300 ease-in-out',
        visible ? 'translate-y-0' : 'translate-y-full',
      )}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="flex items-center justify-between px-5 pt-1 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gold" />
            <h3 className="text-base font-serif font-bold text-foreground">Create Poll</h3>
          </div>
          <button onClick={close} className="p-1.5 rounded-full hover:bg-muted"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="px-4 pb-8 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Question</label>
            <input
              autoFocus
              value={question}
              onChange={e => setQuestion(e.target.value)}
              maxLength={300}
              placeholder="Which day should we organize the cleanup?"
              className="mt-1 w-full rounded-2xl bg-muted px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Options</label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={opt}
                  onChange={e => setOption(i, e.target.value)}
                  maxLength={120}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 rounded-2xl bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
                />
                {options.length > 2 && (
                  <button onClick={() => removeOption(i)} className="p-2 rounded-full hover:bg-muted text-muted-foreground" aria-label="Remove option">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <button onClick={addOption} className="flex items-center gap-1.5 text-sm text-gold font-medium px-2 py-1">
                <Plus className="w-4 h-4" /> Add option
              </button>
            )}
          </div>

          <label className="flex items-center gap-3 px-1">
            <button
              onClick={() => setMultiple(v => !v)}
              className={cn('w-10 h-6 rounded-full transition-colors relative flex-shrink-0', allowMultiple ? 'bg-gold' : 'bg-muted')}
            >
              <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all', allowMultiple ? 'left-[18px]' : 'left-0.5')} />
            </button>
            <span className="text-sm text-foreground">Allow multiple answers</span>
          </label>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            onClick={submit}
            disabled={!valid || submitting}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-colors',
              valid && !submitting ? 'bg-gold text-black hover:bg-gold-dark' : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Poll
          </button>
        </div>
      </div>
    </>
  )
}
