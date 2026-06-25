'use client'

import { useState, useCallback, useEffect } from 'react'
import { FeedTab } from '@/components/feed/FeedTabs'

interface PostAuthor {
  id: string
  displayName: string
  avatarUrl?: string
  badge: 'Citizen' | 'Bronze' | 'Silver' | 'Gold'
}

interface Post {
  id: string
  content: string
  mediaUrl?: string
  mediaType?: 'image' | 'video'
  location?: string
  createdAt: string
  vouchCount: number
  commentCount: number
  challengeTitle?: string
  isVouched: boolean
  isSaved: boolean
  author: PostAuthor
}

interface UseFeedReturn {
  posts: Post[]
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

export function useFeed(tab: FeedTab): UseFeedReturn {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const fetchPosts = useCallback(
    async (cursorId?: string | null) => {
      try {
        const params = new URLSearchParams({ type: tab })
        if (cursorId) {
          params.set('cursor', cursorId)
        }

        const response = await fetch(`/api/feed?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch posts')
        }

        const data = await response.json()
        return data
      } catch (err) {
        throw err
      }
    },
    [tab]
  )

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchPosts(null)
      setPosts(data.posts)
      setCursor(data.nextCursor)
      setHasMore(data.nextCursor !== null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts')
    } finally {
      setIsLoading(false)
    }
  }, [fetchPosts])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !cursor) return

    setIsLoadingMore(true)

    try {
      const data = await fetchPosts(cursor)
      setPosts((prev) => [...prev, ...data.posts])
      setCursor(data.nextCursor)
      setHasMore(data.nextCursor !== null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more posts')
    } finally {
      setIsLoadingMore(false)
    }
  }, [fetchPosts, cursor, hasMore, isLoadingMore])

  // Fetch posts when tab changes
  useEffect(() => {
    setPosts([])
    setCursor(null)
    setHasMore(true)
    refresh()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    posts,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  }
}
