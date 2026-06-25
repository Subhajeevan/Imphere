import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number with compact notation (1K, 1M, etc.)
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return num.toString()
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`

  return then.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: then.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

/**
 * Get badge tier from standing score
 */
export function getBadgeTier(standing: number): 'Citizen' | 'Bronze' | 'Silver' | 'Gold' {
  if (standing >= 5000) return 'Gold'
  if (standing >= 2000) return 'Silver'
  if (standing >= 500) return 'Bronze'
  return 'Citizen'
}

/**
 * Get badge color class for Tailwind
 */
export function getBadgeColorClass(badge: string): string {
  switch (badge) {
    case 'Gold':
      return 'ring-badge-gold'
    case 'Silver':
      return 'ring-badge-silver'
    case 'Bronze':
      return 'ring-badge-bronze'
    default:
      return 'ring-badge-citizen'
  }
}

/**
 * Get badge hex color
 */
export function getBadgeColor(badge: string): string {
  switch (badge) {
    case 'Gold':
      return '#D4AF37'
    case 'Silver':
      return '#C0C0C0'
    case 'Bronze':
      return '#CD7F32'
    default:
      return '#6B7280'
  }
}

/**
 * Calculate distance between two coordinates (in meters)
 * Using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Check if location is within threshold distance (default 50m)
 */
export function isLocationValid(
  claimedLat: number,
  claimedLon: number,
  exifLat: number,
  exifLon: number,
  thresholdMeters: number = 50
): boolean {
  const distance = calculateDistance(claimedLat, claimedLon, exifLat, exifLon)
  return distance <= thresholdMeters
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generate a random alphanumeric string
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
