'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { ChatTab } from '@/components/community/ChatTab'
import { SharedFilesPanel } from '@/components/community/chat/SharedFilesPanel'
import { LeaderboardItem } from '@/components/community/LeaderboardItem'
import { useCircleChat } from '@/hooks/useCircleChat'
import { cn, formatCompactNumber } from '@/lib/utils'
import { ArrowLeft, Sparkles } from 'lucide-react'

interface CircleDetailPageProps {
  circle: {
    id: string
    name: string
    avatar_url?: string
    description: string
    category: string
    member_count: number
    eminence_score: number
  }
  standings: Array<{
    id: string
    user_id: string
    rank: number
    displayName: string
    avatarUrl?: string
    badge: string
    weeklyPoints: number
    isActive: boolean
  }>
  user: {
    displayName: string
    avatarUrl?: string
    standing: number
    badge: string
  }
}

export function CircleDetailPage({ circle, standings, user }: CircleDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'standings' | 'files'>('chat')
  const { roster, messages, isLoading, sendMessage } = useCircleChat(circle.id)

  const currentUserEntry = useMemo(
    () => standings.find((entry) => entry.displayName === user.displayName),
    [standings, user.displayName]
  )

  const nextEntry = useMemo(
    () => currentUserEntry && standings.find((entry) => entry.rank === currentUserEntry.rank - 1),
    [standings, currentUserEntry]
  )

  const motivateMessage = currentUserEntry
    ? nextEntry
      ? `Earn ${Math.max(0, nextEntry.weeklyPoints - currentUserEntry.weeklyPoints + 1)} more points to pass ${nextEntry.displayName}.`
      : 'You are leading the circle leaderboard — keep the momentum going!'
    : 'Join this circle and start earning weekly points.'

  return (
    <AppLayout user={user}>
      <div className="space-y-6 px-4 py-5 sm:px-0">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Link href="/community" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to Circles
          </Link>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Circle details</p>
              <h1 className="mt-2 text-3xl font-serif font-bold text-foreground">{circle.name}</h1>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{circle.description}</p>
              <Link
                href={`/community/${circle.id}/chat`}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-gold-dark"
              >
                <Sparkles className="w-4 h-4" />
                Open Circle Chat
              </Link>
            </div>
            <div className="grid gap-2 text-right text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{circle.member_count} members</span>
              <span>{circle.category}</span>
              <span className="font-semibold text-gold">{formatCompactNumber(circle.eminence_score)} eminence</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-border bg-background p-4">
          <div className="flex items-center gap-3">
            {roster.map((member) => (
              <div key={member.id} className="min-w-[120px] rounded-3xl border border-border/80 bg-card p-3 text-sm">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-10 w-10 rounded-3xl bg-muted" />
                  <div>
                    <p className="font-semibold text-foreground">{member.displayName}</p>
                    <p className="text-xs text-muted-foreground">{member.rank}</p>
                  </div>
                </div>
                <div className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold', member.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground')}>
                  {member.isActive ? '⚡ Active' : '💤 Inactive'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'chat', label: 'Chat' },
            { id: 'standings', label: 'Standings' },
            { id: 'files', label: 'Shared Files' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as 'chat' | 'standings' | 'files')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                activeTab === tab.id ? 'bg-gold text-black' : 'bg-muted text-muted-foreground hover:bg-muted/70'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'chat' ? (
          <ChatTab
            circleName={circle.name}
            roster={roster}
            messages={messages}
            isLoading={isLoading}
            onSendMessage={sendMessage}
          />
        ) : activeTab === 'files' ? (
          <SharedFilesPanel circleId={circle.id} />
        ) : (
          <div className="space-y-5">
            <div className="rounded-3xl border border-border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Weekly Standings</p>
                  <h2 className="text-lg font-semibold text-foreground">Circle leaderboard</h2>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{standings.length} members</p>
                  <p className="mt-1 text-foreground font-semibold">{motivateMessage}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {standings.map((entry) => (
                <LeaderboardItem
                  key={entry.id}
                  rank={entry.rank}
                  displayName={entry.displayName}
                  avatarUrl={entry.avatarUrl}
                  badge={entry.badge}
                  standing={entry.weeklyPoints}
                  isCurrentUser={entry.displayName === user.displayName}
                  isActive={entry.isActive}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
