'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { formatRelativeTime } from '@/lib/utils'
import {
  Bell,
  ChevronUp,
  MessageCircle,
  UserPlus,
  Trophy,
  Coins,
  CheckCircle,
  Users,
} from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  body?: string
  data?: Record<string, any>
  is_read: boolean
  created_at: string
}

interface NotificationsPageProps {
  user?: {
    displayName: string
    avatarUrl?: string
    standing: number
    badge: string
  }
  notifications: Notification[]
}

const notificationIcons: Record<string, typeof Bell> = {
  vouch: ChevronUp,
  comment: MessageCircle,
  follow: UserPlus,
  // DB enum uses challenge_verified / challenge_rejected
  challenge_verified: Trophy,
  challenge_rejected: Trophy,
  // legacy names kept for backward compatibility
  challenge_approved: Trophy,
  ic_credited: Coins,
  credit_earned: Coins,
  proclamation_threshold: Trophy,
  circle_invite: Users,
  circle_task: Users,
  mention: MessageCircle,
  system: Bell,
  default: Bell,
}

const notificationColors: Record<string, string> = {
  vouch: 'bg-gold/10 text-gold',
  comment: 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
  follow: 'bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
  challenge_verified: 'bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400',
  challenge_approved: 'bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400',
  challenge_rejected: 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400',
  ic_credited: 'bg-gold/10 text-gold',
  credit_earned: 'bg-gold/10 text-gold',
  proclamation_threshold: 'bg-gold/10 text-gold',
  circle_invite: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
  circle_task: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
  mention: 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
  system: 'bg-muted text-muted-foreground',
  default: 'bg-muted text-muted-foreground',
}

export function NotificationsPage({
  user,
  notifications: initialNotifications,
}: NotificationsPageProps) {
  const [notifications, setNotifications] = useState(initialNotifications)

  // Mark all as read on mount
  useEffect(() => {
    const markAsRead = async () => {
      const unreadIds = notifications
        .filter((n) => !n.is_read)
        .map((n) => n.id)

      if (unreadIds.length > 0) {
        await fetch('/api/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: unreadIds }),
        })

        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true }))
        )
      }
    }
    markAsRead()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getNotificationLink = (notification: Notification): string => {
    const data = notification.data || {}
    switch (notification.type) {
      case 'vouch':
      case 'comment':
      case 'mention':
        return data.postId ? `/post/${data.postId}` : '/'
      case 'follow':
        return data.userId ? `/profile/${data.userId}` : '/'
      case 'challenge_verified':
      case 'challenge_approved':
      case 'challenge_rejected':
      case 'ic_credited':
      case 'credit_earned':
      case 'proclamation_threshold':
        return data.challengeId ? `/challenges/${data.challengeId}` : '/challenges'
      case 'circle_invite':
      case 'circle_task':
        return data.circleId ? `/community/${data.circleId}` : '/community'
      case 'system':
        return '/'
      default:
        return '/'
    }
  }

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="sticky top-14 lg:top-0 z-40 w-full bg-background border-b border-border px-4 py-4 transition-colors duration-300">
        <h1 className="text-xl font-serif font-bold text-foreground">
          Notifications
        </h1>
      </div>

      {/* Notifications List */}
      <div>
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No notifications yet</p>
            <p className="text-sm mt-1">
              We'll notify you when something happens
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => {
              const Icon =
                notificationIcons[notification.type] ||
                notificationIcons.default
              const colorClass =
                notificationColors[notification.type] ||
                notificationColors.default

              return (
                <Link
                  key={notification.id}
                  href={getNotificationLink(notification)}
                  className="flex items-start gap-3 p-4 border-b border-border
                             hover:bg-muted/30 transition-colors"
                >
                  {/* Unread indicator */}
                  <div className="pt-1">
                    {!notification.is_read && (
                      <div className="w-2 h-2 rounded-full bg-gold" />
                    )}
                    {notification.is_read && <div className="w-2 h-2" />}
                  </div>

                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">
                      {notification.title}
                    </p>
                    {notification.body && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.body}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelativeTime(notification.created_at)}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
