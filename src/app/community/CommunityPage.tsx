'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { cn, formatCompactNumber } from '@/lib/utils'
import { Plus, Lock, Users, Trophy, Star } from 'lucide-react'

interface Circle {
  id: string
  name: string
  avatar_url?: string
  mission_statement?: string
  member_count: number
  eminence_score: number
}

interface CommunityPageProps {
  user?: {
    displayName: string
    avatarUrl?: string
    standing: number
    badge: string
  }
  userBadge: string
  circles: Circle[]
}

export function CommunityPage({ user, userBadge, circles }: CommunityPageProps) {
  const canCreateCircle = userBadge !== 'Citizen'
  const [leaderboard, setLeaderboard] = useState<Circle[]>([])
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false)

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="bg-background border-b border-border px-4 py-4 transition-colors duration-300">
        <h1 className="text-xl font-serif font-bold text-foreground">
          Impact Circles
        </h1>
        <p className="text-sm text-muted-foreground">
          Join forces to multiply your impact
        </p>
      </div>

      {/* Create Circle Section */}
      <div className="py-4 px-4 sm:px-0">
        {canCreateCircle ? (
          <Link
            href="/community/create"
            className="flex items-center gap-4 p-4 border-2 border-dashed border-gold/50 rounded-lg
                       hover:border-gold hover:bg-gold/5 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
              <Plus className="w-6 h-6 text-gold" />
            </div>
            <div>
              <p className="font-medium text-foreground">Form an Impact Circle</p>
              <p className="text-sm text-muted-foreground">
                Unite citizens around a shared mission
              </p>
            </div>
          </Link>
        ) : (
          <div className="p-4 bg-muted/30 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Lock className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-muted-foreground">
                  Unlock at Bronze Badge
                </p>
                <p className="text-sm text-muted-foreground">
                  Achieve Bronze rank to create Impact Circles
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-badge-bronze transition-all"
                  style={{ width: `${Math.min((user?.standing || 0) / 500 * 100, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground text-center">
                {formatCompactNumber(user?.standing || 0)} / 500 Standing to Bronze
              </p>
            </div>
          </div>
        )}
      </div>

      {/* My Circles */}
      <div className="pb-4 pt-0 px-4 sm:px-0">
        <h2 className="font-medium text-foreground mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          My Circles
        </h2>

        {circles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>You haven't joined any circles yet</p>
            <p className="text-sm mt-1">
              Join or create an Impact Circle to collaborate with others
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {circles.map((circle) => (
              <Link
                key={circle.id}
                href={`/community/${circle.id}`}
                className="flex items-center gap-3 p-3 border border-border rounded-lg
                           hover:border-gold/50 hover:bg-gold/5 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  {circle.avatar_url ? (
                    <img
                      src={circle.avatar_url}
                      alt={circle.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <Users className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {circle.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {circle.member_count} members
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gold flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    {formatCompactNumber(circle.eminence_score)}
                  </p>
                  <p className="text-xs text-muted-foreground">Eminence</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="py-4 border-t border-border px-4 sm:px-0">
        <h2 className="font-medium text-foreground mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-gold" />
          Regional Leaderboard
        </h2>

        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-gold/30" />
          <p>Coming soon</p>
          <p className="text-sm mt-1">
            Compete with other circles in your region
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
