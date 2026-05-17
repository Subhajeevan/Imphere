'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ChevronUp,
  MessageCircle,
  Share2,
  Bookmark,
  MapPin,
  MoreHorizontal,
  CheckCircle,
} from 'lucide-react'
import { cn, formatCompactNumber, getBadgeColorClass } from '@/lib/utils'

interface PostAuthor {
  id: string
  displayName: string
  avatarUrl?: string
  badge: 'Citizen' | 'Bronze' | 'Silver' | 'Gold'
  isVerified?: boolean
}

interface PostProps {
  id: string
  author: PostAuthor
  content: string
  mediaUrl?: string
  mediaType?: 'image' | 'video'
  location?: string
  createdAt: string
  vouchCount: number
  commentCount: number
  isVouched?: boolean
  isSaved?: boolean
  challengeTitle?: string
  onVouch?: () => void
  onSave?: () => void
}

export function PostCard({
  id,
  author,
  content,
  mediaUrl,
  location,
  createdAt,
  vouchCount,
  commentCount,
  isVouched = false,
  isSaved = false,
  challengeTitle,
  onVouch,
  onSave,
}: PostProps) {
  const [vouched, setVouched] = useState(isVouched)
  const [saved, setSaved] = useState(isSaved)
  const [localVouchCount, setLocalVouchCount] = useState(vouchCount)

  const handleVouch = () => {
    if (vouched) {
      setLocalVouchCount((c) => c - 1)
    } else {
      setLocalVouchCount((c) => c + 1)
    }
    setVouched(!vouched)
    onVouch?.()
  }

  const handleSave = () => {
    setSaved(!saved)
    onSave?.()
  }

  return (
    <article className="border-b border-border bg-white">
      {/* Challenge Badge (if applicable) */}
      {challengeTitle && (
        <div className="px-4 pt-3 pb-1">
          <span className="inline-flex items-center gap-1 text-xs text-gold bg-gold/10 px-2 py-1 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Completed: {challengeTitle}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <Link href={`/profile/${author.id}`}>
          <div
            className={cn(
              'w-10 h-10 rounded-full bg-muted flex items-center justify-center',
              'ring-2',
              getBadgeColorClass(author.badge)
            )}
          >
            {author.avatarUrl ? (
              <img
                src={author.avatarUrl}
                alt={author.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-muted-foreground">
                {author.displayName.charAt(0)}
              </span>
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Link
              href={`/profile/${author.id}`}
              className="font-medium text-foreground hover:underline truncate"
            >
              {author.displayName}
            </Link>
            {author.isVerified && (
              <CheckCircle className="w-4 h-4 text-gold fill-gold/20" />
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{createdAt}</span>
            {location && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {location}
                </span>
              </>
            )}
          </div>
        </div>

        <button className="p-2 text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-foreground whitespace-pre-wrap">{content}</p>
      </div>

      {/* Media */}
      {mediaUrl && (
        <div className="relative aspect-[4/3] bg-muted">
          <img
            src={mediaUrl}
            alt="Post media"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Interaction Toolbar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          {/* Vouch Button */}
          <button
            onClick={handleVouch}
            className={cn(
              'flex items-center gap-1.5 transition-colors',
              vouched ? 'text-gold' : 'text-muted-foreground hover:text-gold'
            )}
          >
            <ChevronUp
              className={cn('w-5 h-5', vouched && 'fill-gold')}
              strokeWidth={vouched ? 2.5 : 2}
            />
            <span className="text-sm font-medium">
              {formatCompactNumber(localVouchCount)}
            </span>
          </button>

          {/* Comment Button */}
          <Link
            href={`/post/${id}`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">{formatCompactNumber(commentCount)}</span>
          </Link>

          {/* Share Button */}
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={cn(
            'transition-colors',
            saved ? 'text-gold' : 'text-muted-foreground hover:text-gold'
          )}
        >
          <Bookmark
            className={cn('w-5 h-5', saved && 'fill-gold')}
          />
        </button>
      </div>
    </article>
  )
}

/**
 * Skeleton loader for PostCard
 */
export function PostCardSkeleton() {
  return (
    <article className="border-b border-border bg-white animate-pulse">
      <div className="flex items-start gap-3 p-4 pb-2">
        <div className="w-10 h-10 rounded-full bg-muted" />
        <div className="flex-1">
          <div className="h-4 w-32 bg-muted rounded mb-2" />
          <div className="h-3 w-24 bg-muted rounded" />
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className="h-4 w-full bg-muted rounded mb-2" />
        <div className="h-4 w-3/4 bg-muted rounded" />
      </div>
      <div className="aspect-[4/3] bg-muted" />
      <div className="flex items-center gap-6 px-4 py-3">
        <div className="h-5 w-12 bg-muted rounded" />
        <div className="h-5 w-12 bg-muted rounded" />
        <div className="h-5 w-8 bg-muted rounded" />
      </div>
    </article>
  )
}
