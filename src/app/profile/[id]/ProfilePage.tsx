'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { PostCard, PostCardSkeleton } from '@/components/feed/PostCard'
import { cn, formatCompactNumber, getBadgeColorClass, formatRelativeTime } from '@/lib/utils'
import {
  MapPin,
  Settings,
  Edit,
  Calendar,
  Trophy,
  Shield,
  User,
} from 'lucide-react'

type ProfileTab = 'posts' | 'challenges'

interface Profile {
  id: string
  displayName: string
  avatarUrl?: string
  bio?: string
  standing: number
  impactCredits: number
  badge: string
  nativePin?: string | null
  believers: number
  believing: number
  postCount: number
  challengeCount: number
  isFollowing: boolean
  isOwnProfile: boolean
  createdAt: string
}

interface ProfilePageProps {
  profile: Profile
  currentUser?: {
    displayName: string
    avatarUrl?: string
    standing: number
    badge: string
  }
}

export function ProfilePage({ profile, currentUser }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts')
  const [isFollowing, setIsFollowing] = useState(profile.isFollowing)
  const [followers, setFollowers] = useState(profile.believers)
  const [posts, setPosts] = useState<any[]>([])
  const [challenges, setChallenges] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchContent = useCallback(async () => {
    setIsLoading(true)
    try {
      if (activeTab === 'posts') {
        const response = await fetch(`/api/users/${profile.id}/posts`)
        if (response.ok) {
          const data = await response.json()
          setPosts(data.posts)
        }
      } else {
        const response = await fetch(`/api/users/${profile.id}/challenges`)
        if (response.ok) {
          const data = await response.json()
          setChallenges(data.challenges)
        }
      }
    } catch (error) {
      console.error('Failed to fetch content:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile.id, activeTab])

  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  const handleFollow = async () => {
    try {
      const method = isFollowing ? 'DELETE' : 'POST'
      const response = await fetch(`/api/users/${profile.id}/follow`, { method })

      if (response.ok) {
        setIsFollowing(!isFollowing)
        setFollowers((f) => (isFollowing ? f - 1 : f + 1))
      }
    } catch (error) {
      console.error('Follow action failed:', error)
    }
  }

  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <AppLayout user={currentUser}>
      {/* Profile Header */}
      <div className="bg-card border-b border-border transition-colors duration-300">
        {/* Avatar and Stats */}
        <div className="px-4 py-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              className={cn(
                'w-20 h-20 rounded-full bg-muted flex items-center justify-center',
                'ring-4',
                getBadgeColorClass(profile.badge)
              )}
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>

            {/* Stats Grid */}
            <div className="flex-1 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-foreground">
                  {formatCompactNumber(followers)}
                </p>
                <p className="text-xs text-muted-foreground">Believers</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {formatCompactNumber(profile.believing)}
                </p>
                <p className="text-xs text-muted-foreground">Believing</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gold">
                  {formatCompactNumber(profile.standing)}
                </p>
                <p className="text-xs text-muted-foreground">Standing</p>
              </div>
            </div>
          </div>

          {/* Name and Badge */}
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-serif font-bold text-foreground">
                {profile.displayName}
              </h1>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  profile.badge === 'Gold' && 'bg-badge-gold/20 text-badge-gold',
                  profile.badge === 'Silver' && 'bg-badge-silver/20 text-badge-silver',
                  profile.badge === 'Bronze' && 'bg-badge-bronze/20 text-badge-bronze',
                  profile.badge === 'Citizen' && 'bg-muted text-muted-foreground'
                )}
              >
                {profile.badge}
              </span>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="mt-2 text-sm text-muted-foreground">{profile.bio}</p>
          )}

          {/* Meta Info */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {profile.nativePin && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {profile.nativePin}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Joined {memberSince}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex gap-2">
            {profile.isOwnProfile ? (
              <>
                <Link
                  href="/settings/profile"
                  className="flex-1 py-2 px-4 border border-border rounded-lg
                             text-sm font-medium text-foreground
                             hover:bg-muted transition-colors text-center"
                >
                  <Edit className="w-4 h-4 inline mr-2" />
                  Edit Profile
                </Link>
                <Link
                  href="/settings"
                  className="p-2 border border-border rounded-lg
                             text-muted-foreground hover:text-foreground
                             hover:bg-muted transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </Link>
              </>
            ) : (
              <button
                onClick={handleFollow}
                className={cn(
                  'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
                  isFollowing
                    ? 'bg-muted text-foreground hover:bg-muted/80'
                    : 'bg-gold text-white hover:bg-gold-dark'
                )}
              >
                {isFollowing ? 'Believing' : 'Believe'}
              </button>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        <div className="flex border-t border-border">
          <button
            onClick={() => setActiveTab('posts')}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors relative',
              'flex items-center justify-center gap-2',
              activeTab === 'posts'
                ? 'text-gold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span>Posts</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {profile.postCount}
            </span>
            {activeTab === 'posts' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('challenges')}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors relative',
              'flex items-center justify-center gap-2',
              activeTab === 'challenges'
                ? 'text-gold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Shield className="w-4 h-4" />
            <span>Verified</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {profile.challengeCount}
            </span>
            {activeTab === 'challenges' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
        {isLoading ? (
          <div>
            {[...Array(3)].map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : activeTab === 'posts' ? (
          posts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No posts yet
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                id={post.id}
                author={{
                  id: profile.id,
                  displayName: profile.displayName,
                  avatarUrl: profile.avatarUrl,
                  badge: profile.badge as any,
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
            ))
          )
        ) : challenges.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No verified actions yet
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 p-0.5">
            {challenges.map((challenge) => (
              <Link
                key={challenge.id}
                href={`/challenges/${challenge.challengeId}`}
                className="relative aspect-square bg-muted"
              >
                {challenge.mediaUrl ? (
                  <img
                    src={challenge.mediaUrl}
                    alt={challenge.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                {/* Gold Shield Watermark */}
                <div className="absolute bottom-1 right-1">
                  <Shield className="w-5 h-5 text-gold drop-shadow-md" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
