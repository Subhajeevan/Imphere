'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { cn, formatCompactNumber, getBadgeColorClass } from '@/lib/utils'
import { Search, TrendingUp, User, Users } from 'lucide-react'

interface UserResult {
  id: string
  displayName: string
  avatarUrl?: string
  badge: string
  standing: number
  isFollowing: boolean
}

export default function ExplorePage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [suggestedUsers, setSuggestedUsers] = useState<UserResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch suggested users on mount
  useEffect(() => {
    const fetchSuggested = async () => {
      try {
        const response = await fetch('/api/explore/suggested')
        if (response.ok) {
          const data = await response.json()
          setSuggestedUsers(data.users)
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSuggested()
  }, [])

  // Search as user types
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`
      )
      if (response.ok) {
        const data = await response.json()
        setResults(data.users)
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, handleSearch])

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    try {
      const method = isFollowing ? 'DELETE' : 'POST'
      const response = await fetch(`/api/users/${userId}/follow`, { method })

      if (response.ok) {
        // Update both lists
        const updateList = (list: UserResult[]) =>
          list.map((u) =>
            u.id === userId ? { ...u, isFollowing: !isFollowing } : u
          )
        setResults(updateList)
        setSuggestedUsers(updateList)
      }
    } catch (error) {
      console.error('Follow action failed:', error)
    }
  }

  const displayUsers = query.trim() ? results : suggestedUsers

  return (
    <AppLayout>
      {/* Search Header */}
      <div className="sticky top-14 lg:top-0 z-40 w-full bg-background border-b border-border p-4 transition-colors duration-300">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-3 bg-muted/30 border border-border rounded-lg
                       focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none
                       transition-all"
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-4 text-muted-foreground">
          {query.trim() ? (
            <>
              <Search className="w-4 h-4" />
              <span className="text-sm">
                {isSearching ? 'Searching...' : `${results.length} results`}
              </span>
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Suggested Catalysts</span>
            </>
          )}
        </div>

        {/* User List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-muted rounded mb-2" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
                <div className="h-8 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : displayUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {query.trim() ? 'No users found' : 'No suggestions available'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <Link href={`/profile/${user.id}`}>
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full bg-muted flex items-center justify-center',
                      'ring-2',
                      getBadgeColorClass(user.badge)
                    )}
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.displayName ?? 'Unknown User'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${user.id}`}>
                    <p className="font-medium text-foreground truncate hover:text-gold">
                      {user.displayName ?? 'Unknown User'}
                    </p>
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {formatCompactNumber(user.standing ?? 0)} Standing
                  </p>
                </div>

                <button
                  onClick={() => handleFollow(user.id, user.isFollowing)}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    user.isFollowing
                      ? 'bg-muted text-foreground hover:bg-muted/80'
                      : 'bg-gold text-white hover:bg-gold-dark'
                  )}
                >
                  {user.isFollowing ? 'Believing' : 'Believe'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
