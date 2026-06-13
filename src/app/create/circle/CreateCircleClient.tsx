'use client'

import { DragEvent, useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { cn } from '@/lib/utils'
import { saveCreatedCircle } from '@/hooks/useCreatedCircles'
import { ArrowLeft, ImagePlus, Loader2, CheckCircle2, X } from 'lucide-react'

const CATEGORIES = [
  { id: 'environment', label: 'Environment' },
  { id: 'health', label: 'Health' },
  { id: 'community', label: 'Community' },
]

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
      if (file && file.type.startsWith('image/')) {
        onSelect(file)
      }
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
          onDragOver={(event) => event.preventDefault()}
          className={cn(
            'flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed',
            'border-border bg-muted/30 text-muted-foreground cursor-pointer transition hover:border-gold/50 hover:bg-gold/5'
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold">
            <ImagePlus className="w-7 h-7" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Add circle cover image</p>
            <p className="text-xs text-muted-foreground mt-1">Tap, drag, or drop an image to preview</p>
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onSelect(file)
        }}
      />
    </div>
  )
}

export default function CreateCirclePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].id)
  const [description, setDescription] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSelectImage = useCallback((file: File) => {
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }, [])

  const handleClearImage = useCallback(() => {
    setImageFile(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setImagePreview(null)
  }, [imagePreview])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setErrorMessage('Circle name is required.')
      return
    }
    if (!description.trim()) {
      setErrorMessage('Description is required.')
      return
    }

    const createdCircle = {
      id: `created-${Date.now()}`,
      name: name.trim(),
      avatar_url: null,
      category: CATEGORIES.find((item) => item.id === category)?.label ?? 'Community',
      member_count: 1,
      eminence_score: 0,
      weeklyRank: 0,
      isJoined: true,
      userRank: undefined,
      description: description.trim(),
    }

    saveCreatedCircle(createdCircle)
    setIsSubmitting(true)
    setErrorMessage('')

    // Mock submit flow; no backend connected yet.
    await new Promise((resolve) => setTimeout(resolve, 800))
    setSubmitStatus('success')
    setIsSubmitting(false)

    window.setTimeout(() => {
      router.push('/community')
    }, 1700)
  }

  if (submitStatus === 'success') {
    return (
      <AppLayout>
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gold/20 text-gold">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-serif font-semibold text-foreground">Circle created</h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-md">
            Your circle has been created in mock mode. You will be returned to the community page shortly.
          </p>
        </div>
      </AppLayout>
    )
  }

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
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Create Circle</p>
            <h1 className="mt-2 text-3xl font-serif font-bold text-foreground">Launch a new impact circle</h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
              Define the circle, choose a focus area, and invite community members when you are ready.
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-background p-4 text-sm text-muted-foreground">
            This form is currently mock-backed. No backend connection is required for the create circle experience.
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Circle name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
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
                onChange={(event) => setCategory(event.target.value)}
                className={cn(inputCls, 'cursor-pointer appearance-none')}
              >
                {CATEGORIES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
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
              disabled={isSubmitting}
              className={cn(
                'w-full rounded-3xl px-5 py-3.5 text-sm font-semibold text-black transition',
                'bg-gold hover:bg-gold-dark disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating Circle...
                </span>
              ) : (
                'Create Circle'
              )}
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
