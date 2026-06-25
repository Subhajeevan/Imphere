'use client'

import { DragEvent, useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { cn } from '@/lib/utils'
import { useImageUpload } from '@/hooks/useImageUpload'
import { ArrowLeft, ImagePlus, Loader2, CheckCircle2, X, Coins, AlertTriangle } from 'lucide-react'

const CATEGORIES = [
  { id: 'environment', label: 'Environment' },
  { id: 'health',      label: 'Health'       },
  { id: 'community',   label: 'Community'    },
]

interface Props {
  icBalance: number
  creationCost: number
}

function ImagePicker({
  preview,
  onSelect,
  onClear,
}: {
  preview: string | null
  onSelect: (file: File) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const file = event.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) onSelect(file)
    },
    [onSelect]
  )

  return (
    <div className="relative">
      {preview ? (
        <div className="relative rounded-3xl overflow-hidden aspect-[4/3] bg-muted">
          <Image src={preview} alt="Circle preview" fill className="object-cover" />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className={cn(
            'flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed',
            'border-border bg-muted/30 text-muted-foreground cursor-pointer transition hover:border-gold/50 hover:bg-gold/5'
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold">
            <ImagePlus className="w-7 h-7" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Add circle cover image</p>
            <p className="text-xs text-muted-foreground mt-1">Tap, drag, or drop an image</p>
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onSelect(file)
        }}
      />
    </div>
  )
}

export default function CreateCirclePage({ icBalance, creationCost }: Props) {
  const router = useRouter()
  const { upload, isUploading } = useImageUpload('CIRCLE')

  const [name,         setName]         = useState('')
  const [category,     setCategory]     = useState(CATEGORIES[0].id)
  const [description,  setDescription]  = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const imageFileRef                    = useRef<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success,      setSuccess]      = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const canAfford = icBalance >= creationCost

  const handleSelectImage = useCallback((file: File) => {
    imageFileRef.current = file
    setImagePreview(URL.createObjectURL(file))
  }, [])

  const handleClearImage = useCallback(() => {
    imageFileRef.current = null
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
  }, [imagePreview])

  const handleSubmit = async (event: { preventDefault(): void }) => {
    event.preventDefault()
    setErrorMessage('')

    if (!name.trim() || name.trim().length < 3) {
      setErrorMessage('Circle name must be at least 3 characters.')
      return
    }
    if (!description.trim() || description.trim().length < 10) {
      setErrorMessage('Description must be at least 10 characters.')
      return
    }
    if (!canAfford) {
      setErrorMessage(`You need ${creationCost} IC to create a circle. You currently have ${icBalance} IC.`)
      return
    }

    setIsSubmitting(true)

    try {
      let avatarUrl: string | null = null
      if (imageFileRef.current) {
        const result = await upload(imageFileRef.current)
        avatarUrl = result?.secureUrl ?? null
      }

      const res = await fetch('/api/circles', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:        name.trim(),
          description: description.trim(),
          category,
          avatar_url:  avatarUrl,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setErrorMessage(data?.error ?? 'Failed to create circle. Please try again.')
        setIsSubmitting(false)
        return
      }

      setSuccess(true)
      window.setTimeout(() => router.push('/community'), 1600)
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <AppLayout>
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gold/20 text-gold">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-serif font-semibold text-foreground">Circle created!</h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-md">
            Your impact circle is live. Taking you to your circles…
          </p>
        </div>
      </AppLayout>
    )
  }

  const isBusy = isSubmitting || isUploading

  const inputCls = cn(
    'w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm text-foreground',
    'placeholder:text-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition'
  )

  return (
    <AppLayout>
      <div className="space-y-6 px-4 py-5 sm:px-0">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Link href="/community" className="inline-flex items-center gap-2 hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to Circles
          </Link>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 space-y-5">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Create Circle</p>
              <h1 className="mt-2 text-3xl font-serif font-bold text-foreground">Launch a new impact circle</h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                Define the circle, choose a focus area, and invite community members.
              </p>
            </div>

            {/* IC cost pill */}
            <div className={cn(
              'flex items-center gap-2 self-start rounded-2xl border px-4 py-2.5 text-sm font-semibold whitespace-nowrap',
              canAfford
                ? 'border-gold/40 bg-gold/10 text-gold'
                : 'border-red-300/40 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
            )}>
              <Coins className="w-4 h-4 shrink-0" />
              <span>{creationCost} IC</span>
              <span className="text-xs font-normal opacity-70">·</span>
              <span className="text-xs font-normal opacity-70">You have {icBalance} IC</span>
            </div>
          </div>

          {/* Insufficient IC warning */}
          {!canAfford && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                You need <strong>{creationCost} Impact Credits</strong> to create a circle.
                Complete challenges to earn more IC.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Circle name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Green Champions"
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Focus category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className={cn(inputCls, 'cursor-pointer appearance-none')}
              >
                {CATEGORIES.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the circle's mission and who should join."
                rows={5}
                className={cn(inputCls, 'resize-none')}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Cover image <span className="text-muted-foreground">(optional)</span>
              </label>
              <ImagePicker
                preview={imagePreview}
                onSelect={handleSelectImage}
                onClear={handleClearImage}
              />
            </div>

            <button
              type="submit"
              disabled={isBusy || !canAfford}
              className={cn(
                'w-full rounded-3xl px-5 py-3.5 text-sm font-semibold transition',
                canAfford
                  ? 'bg-gold text-black hover:bg-gold-dark disabled:opacity-50 disabled:cursor-not-allowed'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {isUploading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Uploading image…
                </span>
              ) : isSubmitting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating Circle…
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  Create Circle
                  <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">
                    {creationCost} IC
                  </span>
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
