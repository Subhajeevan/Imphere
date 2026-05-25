'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { cn } from '@/lib/utils'
import {
  ImagePlus, FileText, Megaphone, X, MapPin, ChevronDown,
  Upload, Loader2, CheckCircle2, AlertCircle, ArrowLeft,
} from 'lucide-react'
import Image from 'next/image'

type Mode = 'post' | 'proclamation'

interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
}

// ─── Cloudinary direct upload (client-side) ───────────────────────────────────
async function uploadToCloudinary(
  file: File,
  preset: 'POST' | 'CHALLENGE'
): Promise<string> {
  // 1. Get signed credentials from our API
  const sigRes = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preset }),
  })
  if (!sigRes.ok) throw new Error('Failed to get upload credentials')
  const { signature, timestamp, apiKey, cloudName, folder } = await sigRes.json()

  // 2. Upload directly to Cloudinary
  const formData = new FormData()
  formData.append('file', file)
  formData.append('signature', signature)
  formData.append('timestamp', timestamp)
  formData.append('api_key', apiKey)
  formData.append('folder', folder)

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData }
  )
  if (!uploadRes.ok) throw new Error('Upload to Cloudinary failed')
  const data = await uploadRes.json()
  return data.secure_url as string
}

// ─── Image Picker Component ───────────────────────────────────────────────────
function ImagePicker({
  preview,
  onSelect,
  onClear,
  uploading,
}: {
  preview: string | null
  onSelect: (file: File) => void
  onClear: () => void
  uploading: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) onSelect(file)
    },
    [onSelect]
  )

  return (
    <div className="relative">
      {preview ? (
        <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-muted">
          <Image src={preview} alt="Preview" fill className="object-cover" />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
          {!uploading && (
            <button
              type="button"
              onClick={onClear}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed',
            'aspect-[4/3] cursor-pointer transition-all duration-200',
            'border-border bg-muted/30 hover:border-gold/50 hover:bg-gold/5'
          )}
        >
          <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center">
            <ImagePlus className="w-7 h-7 text-gold" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Tap to add photo</p>
            <p className="text-xs text-muted-foreground mt-0.5">or drag and drop · JPG, PNG, WEBP</p>
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onSelect(file)
        }}
      />
    </div>
  )
}

// ─── Main Create Page ─────────────────────────────────────────────────────────
export default function CreatePage({
  categories,
}: {
  categories: Category[]
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('post')

  // Post state
  const [postFile, setPostFile] = useState<File | null>(null)
  const [postPreview, setPostPreview] = useState<string | null>(null)
  const [postCaption, setPostCaption] = useState('')
  const [postLocation, setPostLocation] = useState('')
  const [postUploading, setPostUploading] = useState(false)

  // Proclamation state
  const [procTitle, setProcTitle] = useState('')
  const [procDescription, setProcDescription] = useState('')
  const [procCategory, setProcCategory] = useState('')
  const [procLocation, setProcLocation] = useState('')

  // Shared
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // ── Image selection ──────────────────────────────────────────────────────
  const handleSelectFile = async (file: File) => {
    setPostFile(file)
    setPostPreview(URL.createObjectURL(file))
    // Upload immediately so submit is faster
    setPostUploading(true)
    try {
      const url = await uploadToCloudinary(file, 'POST')
      // Stash the Cloudinary URL in a ref-like pattern via closure capture
      setPostFile(null) // signal "already uploaded"
      // Use a hidden field pattern — store url in state
      setPostCaption((c) => c) // noop to force re-render
      ;(window as any).__cloudinaryPostUrl = url
    } catch {
      setErrorMsg('Image upload failed. Please try again.')
      setPostPreview(null)
    } finally {
      setPostUploading(false)
    }
  }

  const handleClearFile = () => {
    setPostFile(null)
    setPostPreview(null)
    delete (window as any).__cloudinaryPostUrl
  }

  // ── Submit post ──────────────────────────────────────────────────────────
  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!postPreview) { setErrorMsg('Please select a photo'); return }
    if (postUploading) { setErrorMsg('Please wait for the image to finish uploading'); return }

    const mediaUrl = (window as any).__cloudinaryPostUrl
    if (!mediaUrl) { setErrorMsg('Image upload failed. Please re-select your photo.'); return }

    setIsSubmitting(true)
    setErrorMsg('')

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrl,
          mediaType: 'image',
          caption: postCaption,
          localityName: postLocation,
        }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to create post')
      }

      setSubmitStatus('success')
      setTimeout(() => router.push('/'), 1800)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setIsSubmitting(false)
    }
  }

  // ── Submit proclamation ──────────────────────────────────────────────────
  const handleSubmitProclamation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!procTitle.trim()) { setErrorMsg('Title is required'); return }
    if (!procDescription.trim()) { setErrorMsg('Description is required'); return }

    setIsSubmitting(true)
    setErrorMsg('')

    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: procTitle,
          description: procDescription,
          categoryId: procCategory || undefined,
          localityName: procLocation || undefined,
        }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to raise proclamation')
      }

      setSubmitStatus('success')
      setTimeout(() => router.push('/challenges'), 1800)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setIsSubmitting(false)
    }
  }

  // ── Success screen ───────────────────────────────────────────────────────
  if (submitStatus === 'success') {
    return (
      <AppLayout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-semibold text-foreground">
              {mode === 'post' ? 'Post Published!' : 'Proclamation Raised!'}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {mode === 'post'
                ? 'Your post is live on the feed.'
                : 'The community can now back your proclamation.'}
            </p>
          </div>
          <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    )
  }

  const tabCls = (t: Mode) =>
    cn(
      'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all relative',
      mode === t ? 'text-gold' : 'text-muted-foreground hover:text-foreground'
    )

  const inputCls = cn(
    'w-full px-3.5 py-2.5 rounded-xl text-sm',
    'bg-card border border-border text-foreground',
    'placeholder:text-muted-foreground',
    'focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20',
    'transition-all duration-200'
  )

  return (
    <AppLayout>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 lg:top-0 z-40 w-full bg-background border-b border-border transition-colors">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-serif font-semibold text-foreground flex-1">Create</h1>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-border">
          <button onClick={() => { setMode('post'); setErrorMsg('') }} className={tabCls('post')}>
            <FileText className="w-4 h-4" />
            New Post
            {mode === 'post' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />}
          </button>
          <button onClick={() => { setMode('proclamation'); setErrorMsg('') }} className={tabCls('proclamation')}>
            <Megaphone className="w-4 h-4" />
            Raise Proclamation
            {mode === 'proclamation' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />}
          </button>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────────────────── */}
      {errorMsg && (
        <div className="flex items-start gap-2 mx-4 mt-4 p-3.5 rounded-xl text-sm bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* ══════════════════ NEW POST FORM ══════════════════ */}
      {mode === 'post' && (
        <form onSubmit={handleSubmitPost} className="px-4 py-5 space-y-5">

          {/* Image picker */}
          <ImagePicker
            preview={postPreview}
            onSelect={handleSelectFile}
            onClear={handleClearFile}
            uploading={postUploading}
          />

          {/* Caption */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Caption
            </label>
            <textarea
              value={postCaption}
              onChange={(e) => setPostCaption(e.target.value)}
              placeholder="Write something about this moment…"
              rows={3}
              maxLength={1000}
              className={cn(inputCls, 'resize-none')}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{postCaption.length}/1000</p>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Location <span className="font-normal normal-case">(optional)</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={postLocation}
                onChange={(e) => setPostLocation(e.target.value)}
                placeholder="e.g. Hyderabad, Telangana"
                className={cn(inputCls, 'pl-9')}
              />
            </div>
          </div>

          {/* What happens note */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-gold/5 border border-gold/20">
            <Upload className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Your post will be instantly visible on the community feed. The community can vouch for your civic action.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || postUploading || !postPreview}
            className={cn(
              'w-full py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2',
              'bg-gold text-white hover:bg-gold-dark transition-colors duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</>
            ) : (
              <><FileText className="w-4 h-4" /> Publish Post</>
            )}
          </button>
        </form>
      )}

      {/* ══════════════════ PROCLAMATION FORM ══════════════════ */}
      {mode === 'proclamation' && (
        <form onSubmit={handleSubmitProclamation} className="px-4 py-5 space-y-5">

          {/* Hero banner */}
          <div className="rounded-2xl p-5 text-center"
               style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)', border: '1px solid rgba(212,175,55,0.25)' }}>
            <div className="w-14 h-14 rounded-full bg-gold/15 flex items-center justify-center mx-auto mb-3">
              <Megaphone className="w-7 h-7 text-gold" />
            </div>
            <h2 className="font-serif font-semibold text-foreground text-base">Raise a Proclamation</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Spot a local problem? Rally the community. When enough Standing is pledged, it becomes an official challenge.
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Issue Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={procTitle}
              onChange={(e) => setProcTitle(e.target.value)}
              placeholder="e.g. Fix the broken streetlights on MG Road"
              maxLength={120}
              required
              className={inputCls}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{procTitle.length}/120</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={procDescription}
              onChange={(e) => setProcDescription(e.target.value)}
              placeholder="Describe the problem in detail. Where is it? How does it affect the community? What needs to be done?"
              rows={5}
              maxLength={2000}
              required
              className={cn(inputCls, 'resize-none')}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{procDescription.length}/2000</p>
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Category <span className="font-normal normal-case">(optional)</span>
              </label>
              <div className="relative">
                <select
                  value={procCategory}
                  onChange={(e) => setProcCategory(e.target.value)}
                  className={cn(inputCls, 'appearance-none pr-9 cursor-pointer')}
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Location <span className="font-normal normal-case">(optional)</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={procLocation}
                onChange={(e) => setProcLocation(e.target.value)}
                placeholder="e.g. Banjara Hills, Hyderabad"
                className={cn(inputCls, 'pl-9')}
              />
            </div>
          </div>

          {/* What happens note */}
          <div className="rounded-xl p-4 space-y-2.5"
               style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.18)' }}>
            <p className="text-xs font-semibold text-gold uppercase tracking-wider">What happens next?</p>
            {[
              { step: '1', text: 'Your proclamation goes live for 14 days' },
              { step: '2', text: 'Community members pledge their Standing to back it' },
              { step: '3', text: 'Once the threshold is reached, it becomes an official Welfare Challenge' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-gold/20 text-gold text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {step}
                </span>
                <p className="text-xs text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'w-full py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2',
              'bg-gold text-white hover:bg-gold-dark transition-colors duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Raising Proclamation…</>
            ) : (
              <><Megaphone className="w-4 h-4" /> Raise Proclamation</>
            )}
          </button>
        </form>
      )}
    </AppLayout>
  )
}
