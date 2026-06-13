'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Upload, Camera, CheckCircle2, Trophy, Coins,
  ArrowLeft, Loader2, ImageIcon, X, MapPin
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useImageUpload } from '@/hooks/useImageUpload'

interface SubmitProofPageProps {
  challengeId: string
  challengeTitle: string
  standingReward: number
  icReward: number
  user?: {
    displayName: string
    avatarUrl?: string
    standing: number
    badge: string
  }
}

export function SubmitProofPage({
  challengeId,
  challengeTitle,
  standingReward,
  icReward,
  user,
}: SubmitProofPageProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [caption, setCaption]           = useState('')
  const [locality, setLocality]         = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl]     = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess]           = useState<null | { standing: number; ic: number; message: string }>(null)
  const [error, setError]               = useState<string | null>(null)

  const { upload, isUploading, progress, error: uploadError } = useImageUpload('CHALLENGE')

  // Handle file pick → preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported.')
      return
    }
    setError(null)
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!selectedFile || !previewUrl) {
      setError('Please select a proof photo first.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      let mediaUrl = previewUrl

      if (selectedFile) {
        try {
          const uploadResult = await upload(selectedFile)
          mediaUrl = uploadResult.secureUrl
        } catch (uploadErr) {
          setError(uploadError || 'Failed to upload proof image. Please try again.')
          setIsSubmitting(false)
          return
        }
      }

      const res = await fetch(`/api/challenges/${challengeId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrl,
          caption: caption.trim() || undefined,
          localityName: locality.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Submission failed.')
        return
      }

      setSuccess({
        standing: data.standingAwarded ?? standingReward,
        ic: data.icAwarded ?? icReward,
        message: data.message ?? 'Proof submitted and verified!',
      })
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Success screen ────────────────────────────────────────
  if (success) {
    return (
      <AppLayout user={user}>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center gap-6">
          {/* Animated check */}
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center animate-bounce">
            <CheckCircle2 className="w-11 h-11 text-green-600 dark:text-green-400" />
          </div>

          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground mb-2">
              Challenge Complete! 🎉
            </h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              {success.message}
            </p>
          </div>

          {/* Reward pills */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gold/10 border border-gold/30 rounded-xl">
              <Trophy className="w-5 h-5 text-gold" />
              <span className="font-bold text-gold text-lg">+{success.standing}</span>
              <span className="text-sm text-muted-foreground">Standing</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gold/10 border border-gold/30 rounded-xl">
              <Coins className="w-5 h-5 text-gold" />
              <span className="font-bold text-gold text-lg">+{success.ic}</span>
              <span className="text-sm text-muted-foreground">IC</span>
            </div>
          </div>

          {/* Your proof is in the feed */}
          <p className="text-xs text-muted-foreground">
            Your proof post has been added to the <strong>Challenges</strong> feed tab.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/?tab=challenges')}
              className="px-5 py-2.5 bg-gold text-white font-medium rounded-xl hover:bg-gold-dark transition-colors text-sm"
            >
              See it in Feed
            </button>
            <button
              onClick={() => router.push('/challenges')}
              className="px-5 py-2.5 border border-border text-foreground font-medium rounded-xl hover:bg-muted transition-colors text-sm"
            >
              More Challenges
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  // ── Upload form ───────────────────────────────────────────
  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="sticky top-14 lg:top-0 z-40 w-full bg-background border-b border-border transition-colors duration-300">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-serif font-bold text-foreground">Submit Proof</h1>
            <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
              {challengeTitle}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5 max-w-xl mx-auto">
        {/* Reward preview */}
        <div className="flex gap-3 p-3 bg-gold/5 border border-gold/20 rounded-xl">
          <div className="flex items-center gap-1.5 text-sm">
            <Trophy className="w-4 h-4 text-gold" />
            <span className="font-semibold text-gold">+{standingReward}</span>
            <span className="text-muted-foreground">Standing</span>
          </div>
          <div className="w-px bg-border" />
          <div className="flex items-center gap-1.5 text-sm">
            <Coins className="w-4 h-4 text-gold" />
            <span className="font-semibold text-gold">+{icReward}</span>
            <span className="text-muted-foreground">Impact Credits</span>
          </div>
        </div>

        {/* Photo upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Proof Photo <span className="text-red-500">*</span>
          </label>

          {previewUrl ? (
            <div className="relative rounded-xl overflow-hidden aspect-video bg-muted">
              <img
                src={previewUrl}
                alt="Proof preview"
                className="w-full h-full object-cover"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'w-full aspect-video rounded-xl border-2 border-dashed transition-all duration-200',
                'flex flex-col items-center justify-center gap-3',
                'border-border hover:border-gold/50 hover:bg-gold/5',
                'cursor-pointer group'
              )}
            >
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center group-hover:bg-gold/10 transition-colors">
                <Camera className="w-7 h-7 text-muted-foreground group-hover:text-gold transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Tap to add photo</p>
                <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WEBP — max 10MB</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold/10 text-gold text-sm font-medium group-hover:bg-gold group-hover:text-white transition-all">
                <Upload className="w-4 h-4" />
                Choose Photo
              </div>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Caption */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Caption <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder="Describe what you did for this challenge…"
            className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-foreground
                       placeholder:text-muted-foreground text-sm resize-none
                       focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
          />
          <p className="text-xs text-muted-foreground text-right">{caption.length}/280</p>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Location <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={locality}
              onChange={e => setLocality(e.target.value)}
              placeholder="e.g. Lalbagh, Bengaluru"
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-muted/30 text-foreground
                         placeholder:text-muted-foreground text-sm
                         focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
            />
          </div>
        </div>

        {/* Upload progress */}
        {isUploading && (
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-500 text-sm">
            Uploading proof image... {progress}%
          </div>
        )}

        {/* Error */}
        {(error || uploadError) && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 text-sm">
            {error || uploadError}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isUploading || !selectedFile}
          className={cn(
            'w-full py-3.5 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2',
            previewUrl && !isSubmitting
              ? 'bg-gold text-white hover:bg-gold-dark shadow-lg shadow-gold/20'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Submit Proof & Claim Rewards
            </>
          )}
        </button>

        <p className="text-xs text-muted-foreground text-center pb-2">
          Your proof will be auto-verified and rewards credited instantly.
        </p>
      </div>
    </AppLayout>
  )
}
