'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { FeedTabs, FeedTab } from '@/components/feed/FeedTabs'
import { PostCard, PostCardSkeleton } from '@/components/feed/PostCard'
import { useFeed } from '@/hooks/useFeed'
import { formatRelativeTime } from '@/lib/utils'
import { RefreshCw } from 'lucide-react'

interface HomePageProps {
  user?: {
    displayName: string
    avatarUrl?: string
    standing: number
    badge: string
  }
}

export function HomePage({ user }: HomePageProps) {
  const [activeTab, setActiveTab] = useState<FeedTab>('for-you')
  const { posts, isLoading, isLoadingMore, error, hasMore, loadMore, refresh } =
    useFeed(activeTab)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Infinite scroll observer
  const setupObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }
  }, [hasMore, isLoadingMore, loadMore])

  useEffect(() => {
    setupObserver()
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [setupObserver])

  return (
    <AppLayout user={user}>
      {/* Feed Header with Tabs */}
      <FeedTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* Pull to Refresh (Desktop) */}
      <div className="hidden lg:flex justify-center py-2 border-b border-border">
        <button
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <button
            onClick={refresh}
            className="text-gold hover:underline text-sm"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div>
          {[...Array(3)].map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Posts */}
      {!isLoading && !error && (
        <>
          {posts.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground mb-2">
                {activeTab === 'believing'
                  ? "You're not following anyone yet"
                  : 'No posts to show'}
              </p>
              {activeTab === 'believing' && (
                <p className="text-sm text-muted-foreground">
                  Follow other users to see their posts here
                </p>
              )}
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  id={post.id}
                  author={{
                    id: post.author.id,
                    displayName: post.author.displayName,
                    avatarUrl: post.author.avatarUrl,
                    badge: post.author.badge,
                  }}
                  content={post.content}
                  mediaUrl={post.mediaUrl}
                  location={post.location}
                  createdAt={formatRelativeTime(post.createdAt)}
                  vouchCount={post.vouchCount}
                  commentCount={post.commentCount}
                  isVouched={post.isVouched}
                  isSaved={post.isSaved}
                  challengeTitle={post.challengeTitle}
                />
              ))}

              {/* Load More Trigger */}
              <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
                {isLoadingMore && (
                  <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                )}
                {!hasMore && posts.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    You've reached the end
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </AppLayout>
  )
}
