'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Camera, Loader2 } from 'lucide-react'
import {
  useImageUpload,
  createImagePreview,
  revokeImagePreview,
} from '@/hooks/useImageUpload'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  preset: 'PROFILE' | 'CHALLENGE' | 'POST' | 'CIRCLE'
  onUpload: (result: { publicId: string; secureUrl: string }) => void
  onError?: (error: string) => void
  currentImageUrl?: string
  className?: string
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'banner'
  showProgress?: boolean
  placeholder?: React.ReactNode
}

const aspectRatioClasses = {
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]',
  banner: 'aspect-[3/1]',
}

export function ImageUpload({
  preset,
  onUpload,
  onError,
  currentImageUrl,
  className,
  aspectRatio = 'square',
  showProgress = true,
  placeholder,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const { upload, isUploading, progress, error, reset } = useImageUpload(preset)

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Create preview
      const previewUrl = createImagePreview(file)
      setPreview(previewUrl)

      try {
        const result = await upload(file)
        onUpload({ publicId: result.publicId, secureUrl: result.secureUrl })
        // Keep preview until new image loads
      } catch (err) {
        // Revert to previous image on error
        revokeImagePreview(previewUrl)
        setPreview(null)
        if (onError && err instanceof Error) {
          onError(err.message)
        }
      }

      // Clear input for re-selection
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    },
    [upload, onUpload, onError]
  )

  const handleRemove = useCallback(() => {
    if (preview) {
      revokeImagePreview(preview)
      setPreview(null)
    }
    reset()
  }, [preview, reset])

  const displayImage = preview || currentImageUrl

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/30',
        'hover:border-gold/50 transition-colors cursor-pointer',
        aspectRatioClasses[aspectRatio],
        className
      )}
      onClick={() => !isUploading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {displayImage ? (
        <>
          <img
            src={displayImage}
            alt="Upload preview"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-8 h-8 text-white" />
          </div>
          {/* Remove button */}
          {!isUploading && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleRemove()
              }}
              className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          {placeholder || (
            <>
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to upload image
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG up to 10MB
              </p>
            </>
          )}
        </div>
      )}

      {/* Upload progress overlay */}
      {isUploading && showProgress && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
          <div className="w-3/4 h-2 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-white text-sm mt-2">{progress}%</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs p-2 text-center">
          {error}
        </div>
      )}
    </div>
  )
}

/**
 * Circular profile photo upload variant
 */
export function ProfilePhotoUpload({
  onUpload,
  onError,
  currentImageUrl,
  size = 'md',
}: {
  onUpload: (result: { publicId: string; secureUrl: string }) => void
  onError?: (error: string) => void
  currentImageUrl?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  }

  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const { upload, isUploading, progress } = useImageUpload('PROFILE')

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const previewUrl = createImagePreview(file)
      setPreview(previewUrl)

      try {
        const result = await upload(file)
        onUpload({ publicId: result.publicId, secureUrl: result.secureUrl })
      } catch (err) {
        revokeImagePreview(previewUrl)
        setPreview(null)
        if (onError && err instanceof Error) {
          onError(err.message)
        }
      }

      if (inputRef.current) {
        inputRef.current.value = ''
      }
    },
    [upload, onUpload, onError]
  )

  const displayImage = preview || currentImageUrl

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden cursor-pointer',
        'border-2 border-border hover:border-gold transition-colors',
        sizeClasses[size]
      )}
      onClick={() => !isUploading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {displayImage ? (
        <>
          <img
            src={displayImage}
            alt="Profile"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </>
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <Camera className="w-6 h-6 text-muted-foreground" />
        </div>
      )}

      {isUploading && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="relative">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
              {progress}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
