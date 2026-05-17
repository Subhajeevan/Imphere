import { Redis } from '@upstash/redis'

/**
 * Upstash Redis client for caching and rate limiting
 *
 * Used for:
 * - Leaderboard caching
 * - Session rate limiting
 * - Feed caching
 * - Real-time counters
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/**
 * Cache keys constants
 */
export const CACHE_KEYS = {
  // Leaderboards
  LEADERBOARD_GLOBAL: 'leaderboard:global',
  LEADERBOARD_LOCALITY: (locality: string) => `leaderboard:locality:${locality}`,
  CIRCLE_LEADERBOARD: 'leaderboard:circles',

  // User data
  USER_PROFILE: (userId: string) => `user:${userId}:profile`,
  USER_STATS: (userId: string) => `user:${userId}:stats`,

  // Feed caching
  FEED_FOR_YOU: (page: number) => `feed:foryou:page:${page}`,
  FEED_CHALLENGES: (page: number) => `feed:challenges:page:${page}`,

  // Rate limiting
  RATE_LIMIT: (userId: string, action: string) => `ratelimit:${userId}:${action}`,
} as const

/**
 * Cache TTL values (in seconds)
 */
export const CACHE_TTL = {
  LEADERBOARD: 60 * 5, // 5 minutes
  USER_PROFILE: 60 * 10, // 10 minutes
  FEED: 60 * 2, // 2 minutes
  RATE_LIMIT: 60, // 1 minute
} as const

/**
 * Simple rate limiter
 * Returns true if action is allowed, false if rate limited
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  maxRequests: number = 10,
  windowSeconds: number = 60
): Promise<boolean> {
  const key = CACHE_KEYS.RATE_LIMIT(userId, action)

  const current = await redis.incr(key)

  if (current === 1) {
    // First request, set expiry
    await redis.expire(key, windowSeconds)
  }

  return current <= maxRequests
}

/**
 * Get cached data or fetch fresh
 */
export async function getOrSetCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  // Try to get from cache
  const cached = await redis.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // Fetch fresh data
  const fresh = await fetchFn()

  // Cache it
  await redis.setex(key, ttlSeconds, fresh)

  return fresh
}

/**
 * Invalidate cache by pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}
