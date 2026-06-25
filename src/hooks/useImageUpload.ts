'use client'

import { useState, useCallback } from 'react'

type UploadPreset = 'PROFILE' | 'CHALLENGE' | 'POST' | 'CIRCLE'

interface UploadResult {
  publicId: string
  secureUrl: string
  width: number
  height: number
}

interface UseImageUploadReturn {
  upload: (file: File) => Promise<UploadResult>
  isUploading: boolean
  progress: number
  error: string | null
  reset: () => void
}

/**
 * Hook for uploading images to Cloudinary via signed uploads
 */
export function useImageUpload(preset: UploadPreset): UseImageUploadReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setIsUploading(false)
    setProgress(0)
    setError(null)
  }, [])

  const upload = useCallback(
    async (file: File): Promise<UploadResult> => {
      setIsUploading(true)
      setProgress(0)
      setError(null)

      try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error('File must be an image')
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024
        if (file.size > maxSize) {
          throw new Error('File size must be less than 10MB')
        }

        // Get signed upload credentials from our API
        const signatureResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preset }),
        })

        if (!signatureResponse.ok) {
          const errorData = await signatureResponse.json()
          throw new Error(errorData.error || 'Failed to get upload credentials')
        }

        const { signature, timestamp, apiKey, cloudName, folder } =
          await signatureResponse.json()

        // Prepare form data for Cloudinary upload
        const formData = new FormData()
        formData.append('file', file)
        formData.append('api_key', apiKey)
        formData.append('timestamp', timestamp.toString())
        formData.append('signature', signature)
        formData.append('folder', folder)

        // Upload to Cloudinary with progress tracking
        const uploadResult = await new Promise<UploadResult>((resolve, reject) => {
          const xhr = new XMLHttpRequest()

          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100)
              setProgress(percent)
            }
          })

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const response = JSON.parse(xhr.responseText)
              resolve({
                publicId: response.public_id,
                secureUrl: response.secure_url,
                width: response.width,
                height: response.height,
              })
            } else {
              reject(new Error('Upload failed'))
            }
          })

          xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'))
          })

          xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`)
          xhr.send(formData)
        })

        setIsUploading(false)
        setProgress(100)
        return uploadResult
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed'
        setError(errorMessage)
        setIsUploading(false)
        throw err
      }
    },
    [preset]
  )

  return { upload, isUploading, progress, error, reset }
}

/**
 * Helper to create a preview URL for a file before upload
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Helper to clean up a preview URL
 */
export function revokeImagePreview(url: string): void {
  URL.revokeObjectURL(url)
}
