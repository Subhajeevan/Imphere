'use client'

import { useMemo, useState } from 'react'
import { Camera, Coins, Trophy, Clock, CheckCircle2 } from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { cn, formatCompactNumber, formatRelativeTime } from '@/lib/utils'

export interface QuestCardProps {
  id: string
  title: string
  description: string
  progress: number
  target: number
  standingReward: number
  creditReward: number
  expiresAt: string
  isCore?: boolean
  circleName?: string
}

export function QuestCard({
  title,
  description,
  progress,
  target,
  standingReward,
  creditReward,
  expiresAt,
  isCore = false,
  circleName,
}: QuestCardProps) {
  const [showUpload, setShowUpload] = useState(false)
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [proofSubmitted, setProofSubmitted] = useState(false)

  const completion = Math.min(100, Math.round((progress / target) * 100))
  const expiresIn = useMemo(() => {
    const now = new Date()
    const deadline = new Date(expiresAt)
    if (deadline.getTime() <= now.getTime()) return 'Expired'
    return formatRelativeTime(deadline)
  }, [expiresAt])

  const handleUploadComplete = (result: { publicId: string; secureUrl: string }) => {
    setProofUrl(result.secureUrl)
    setProofSubmitted(true)
  }

  const badgeLabel = isCore ? 'Core Quest' : `${circleName ?? 'Circle'} Bounty`

  return (
    <article className="rounded-3xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{badgeLabel}</p>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">{expiresIn}</p>
          <p className="text-xs text-muted-foreground">Deadline</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">{description}</p>

      <div className="mb-4 rounded-3xl bg-muted/40 p-3">
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground mb-2">
          <span>{formatCompactNumber(progress)} / {formatCompactNumber(target)} completed</span>
          <span>{completion}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-background overflow-hidden border border-border">
          <div className="h-full bg-gold" style={{ width: `${completion}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm text-foreground">
        <div className="rounded-2xl border border-border bg-background p-3">
          <div className="flex items-center gap-2 mb-2 text-gold">
            <Trophy className="w-4 h-4" />
            <span className="font-semibold">{standingReward}</span>
          </div>
          <p className="text-xs text-muted-foreground">Standing reward</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-3">
          <div className="flex items-center gap-2 mb-2 text-gold">
            <Coins className="w-4 h-4" />
            <span className="font-semibold">{creditReward}</span>
          </div>
          <p className="text-xs text-muted-foreground">Impact Credits</p>
        </div>
      </div>

      {proofUrl ? (
        <div className="mb-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Proof captured</p>
              <p className="text-xs text-emerald-600">Your photo has been uploaded for review.</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Uploaded
            </span>
          </div>
          {proofUrl && (
            <img
              src={proofUrl}
              alt="Proof preview"
              className="w-full rounded-3xl object-cover max-h-48"
            />
          )}
        </div>
      ) : null}

      {showUpload ? (
        <div className="space-y-3 mb-4">
          <ImageUpload
            preset="CHALLENGE"
            onUpload={handleUploadComplete}
            placeholder={
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Snap a photo from your device</p>
                <p className="text-xs text-muted-foreground mt-1">Use your camera to capture mission proof.</p>
              </div>
            }
            aspectRatio="landscape"
          />
          <button
            type="button"
            onClick={() => setShowUpload(false)}
            className="w-full rounded-3xl border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className={cn(
            'flex items-center justify-center gap-2 w-full rounded-3xl px-4 py-3 text-sm font-semibold',
            proofSubmitted ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-gold text-black hover:bg-gold-dark'
          )}
        >
          <Camera className="w-4 h-4" />
          {proofSubmitted ? 'Tap to update proof' : 'Capture proof'}
        </button>
      )}
    </article>
  )
}
