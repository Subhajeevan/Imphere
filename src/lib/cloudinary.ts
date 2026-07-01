import { v2 as cloudinary } from 'cloudinary'

/**
 * Initialize Cloudinary configuration
 * Required env vars:
 * - NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 * - CLOUDINARY_API_KEY
 * - CLOUDINARY_API_SECRET
 */
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export { cloudinary }

/**
 * Image folder structure in Cloudinary
 */
export const CLOUDINARY_FOLDERS = {
  PROFILE_PHOTOS: 'imphere/profiles',
  CHALLENGE_SUBMISSIONS: 'imphere/challenges',
  POST_MEDIA: 'imphere/posts',
  CIRCLE_BANNERS: 'imphere/circles',
  CIRCLE_CHAT: 'imphere/circle-chat',
} as const

/**
 * Upload presets for different use cases
 */
export const UPLOAD_PRESETS = {
  PROFILE: {
    folder: CLOUDINARY_FOLDERS.PROFILE_PHOTOS,
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  },
  CHALLENGE: {
    folder: CLOUDINARY_FOLDERS.CHALLENGE_SUBMISSIONS,
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  },
  POST: {
    folder: CLOUDINARY_FOLDERS.POST_MEDIA,
    transformation: [
      { width: 1080, height: 1350, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  },
  CIRCLE: {
    folder: CLOUDINARY_FOLDERS.CIRCLE_BANNERS,
    transformation: [
      { width: 1200, height: 400, crop: 'fill' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  },
} as const

export type UploadPresetType = keyof typeof UPLOAD_PRESETS

/**
 * Generate a signed upload URL for client-side uploads
 * This allows secure direct uploads from the browser
 */
export function generateUploadSignature(
  preset: UploadPresetType,
  publicId?: string
): {
  signature: string
  timestamp: number
  apiKey: string
  cloudName: string
  folder: string
} {
  const timestamp = Math.round(Date.now() / 1000)
  const presetConfig = UPLOAD_PRESETS[preset]

  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder: presetConfig.folder,
  }

  if (publicId) {
    paramsToSign.public_id = publicId
  }

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  )

  return {
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
    folder: presetConfig.folder,
  }
}

/**
 * Upload a circle-chat attachment (server-side).
 *
 * Images go to Cloudinary as `image` (so we can derive thumbnails); documents
 * go as `raw` so any file type (PDF/DOCX/PPT/XLSX/TXT/ZIP) is stored verbatim.
 *
 * `source` is a data URI (`data:<mime>;base64,<...>`).
 */
export async function uploadChatAttachment(
  source: string,
  kind: 'image' | 'document',
  originalName: string,
): Promise<{
  publicId: string
  secureUrl: string
  thumbnailUrl?: string
  width?: number
  height?: number
  bytes: number
}> {
  const result = await cloudinary.uploader.upload(source, {
    folder: CLOUDINARY_FOLDERS.CIRCLE_CHAT,
    resource_type: kind === 'image' ? 'image' : 'raw',
    // Preserve a sensible filename for downloads (raw files keep their name)
    use_filename: true,
    unique_filename: true,
    filename_override: originalName,
  })

  return {
    publicId:  result.public_id,
    secureUrl: result.secure_url,
    bytes:     result.bytes,
    width:     result.width,
    height:    result.height,
    thumbnailUrl:
      kind === 'image'
        ? getImageUrl(result.public_id, { width: 600, crop: 'limit', quality: 'auto', format: 'auto' })
        : undefined,
  }
}

/**
 * Upload an image from a base64 string or URL (server-side)
 */
export async function uploadImage(
  source: string,
  preset: UploadPresetType,
  publicId?: string
): Promise<{
  publicId: string
  secureUrl: string
  width: number
  height: number
}> {
  const presetConfig = UPLOAD_PRESETS[preset]

  const result = await cloudinary.uploader.upload(source, {
    folder: presetConfig.folder,
    public_id: publicId,
    transformation: presetConfig.transformation,
    resource_type: 'image',
  })

  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    width: result.width,
    height: result.height,
  }
}

/**
 * Delete an image by public ID
 */
export async function deleteImage(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    return result.result === 'ok'
  } catch (error) {
    console.error('Failed to delete image:', error)
    return false
  }
}

/**
 * Generate optimized image URL with transformations
 */
export function getImageUrl(
  publicId: string,
  options?: {
    width?: number
    height?: number
    crop?: 'fill' | 'fit' | 'limit' | 'thumb'
    gravity?: 'face' | 'center' | 'auto'
    quality?: 'auto' | number
    format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png'
  }
): string {
  const transformations: string[] = []

  if (options?.width) transformations.push(`w_${options.width}`)
  if (options?.height) transformations.push(`h_${options.height}`)
  if (options?.crop) transformations.push(`c_${options.crop}`)
  if (options?.gravity) transformations.push(`g_${options.gravity}`)
  if (options?.quality) transformations.push(`q_${options.quality}`)
  if (options?.format) transformations.push(`f_${options.format}`)

  const transformation = transformations.length > 0 ? transformations.join(',') + '/' : ''
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}${publicId}`
}

/**
 * Generate thumbnail URL for a given image
 */
export function getThumbnailUrl(publicId: string, size: number = 150): string {
  return getImageUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
    format: 'auto',
  })
}

/**
 * Extract EXIF metadata from an uploaded image
 * Used for anti-cheat verification in challenge submissions
 */
export async function getImageExifData(publicId: string): Promise<{
  gpsLatitude?: number
  gpsLongitude?: number
  dateTimeOriginal?: string
  make?: string
  model?: string
} | null> {
  try {
    const result = await cloudinary.api.resource(publicId, {
      image_metadata: true,
      exif: true,
    })

    const exif = result.image_metadata || {}

    // Parse GPS coordinates if available
    let gpsLatitude: number | undefined
    let gpsLongitude: number | undefined

    if (exif.GPSLatitude && exif.GPSLatitudeRef) {
      gpsLatitude = parseGpsCoordinate(exif.GPSLatitude, exif.GPSLatitudeRef)
    }
    if (exif.GPSLongitude && exif.GPSLongitudeRef) {
      gpsLongitude = parseGpsCoordinate(exif.GPSLongitude, exif.GPSLongitudeRef)
    }

    return {
      gpsLatitude,
      gpsLongitude,
      dateTimeOriginal: exif.DateTimeOriginal,
      make: exif.Make,
      model: exif.Model,
    }
  } catch (error) {
    console.error('Failed to get EXIF data:', error)
    return null
  }
}

/**
 * Parse GPS coordinate from EXIF format to decimal degrees
 */
function parseGpsCoordinate(coord: string, ref: string): number {
  // EXIF GPS format: "degrees/1, minutes/1, seconds/100"
  const parts = coord.split(',').map((p) => {
    const [num, denom] = p.trim().split('/')
    return parseFloat(num) / parseFloat(denom)
  })

  let decimal = parts[0] + parts[1] / 60 + (parts[2] || 0) / 3600

  if (ref === 'S' || ref === 'W') {
    decimal = -decimal
  }

  return decimal
}
