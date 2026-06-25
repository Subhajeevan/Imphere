'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, mockCircleMessages, USER_IDS } from '@/lib/mock-data'
import type { CircleMessageResponse } from '@/app/api/circles/[id]/messages/route'

// ─── Public types consumed by ChatTab ────────────────────────────────────────

export interface ChatMessage {
  id: string
  author: string
  authorRank: string
  content: string
  timestamp: string
  isMine?: boolean
}

export interface RosterMember {
  id: string
  displayName: string
  rank: string
  isActive: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function roleLabel(role: string): string {
  if (role === 'principal') return 'Principal'
  if (role === 'steward')   return 'Steward'
  return 'Member'
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function toChat(msg: CircleMessageResponse): ChatMessage {
  return {
    id:         msg.id,
    author:     msg.author_display_name,
    authorRank: roleLabel(msg.author_role),
    content:    msg.content,
    timestamp:  formatTimestamp(msg.created_at),
    isMine:     msg.is_mine,
  }
}

// ─── Mock path ───────────────────────────────────────────────────────────────

function useMockCircleChat(circleId: string) {
  const memberships = mockData.impactCircleMembers.filter(m => m.circle_id === circleId)
  const roleMap     = new Map(memberships.map(m => [m.user_id, m.role ?? 'member']))

  const buildRoster = (): RosterMember[] =>
    memberships.map(m => {
      const profile = mockData.profiles.find(p => p.id === m.user_id)
      return {
        id:          m.user_id,
        displayName: profile?.display_name ?? 'Unknown',
        rank:        roleLabel(m.role ?? 'member'),
        isActive:    m.ready_to_serve ?? false,
      }
    })

  const buildMessages = (): ChatMessage[] => {
    const msgs = mockCircleMessages
      .filter(m => m.circle_id === circleId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))

    return msgs.map(msg => {
      const profile = mockData.profiles.find(p => p.id === msg.author_id)
      return {
        id:         msg.id,
        author:     profile?.display_name ?? 'Unknown',
        authorRank: roleLabel(roleMap.get(msg.author_id) ?? 'member'),
        content:    msg.content,
        timestamp:  formatTimestamp(msg.created_at),
        isMine:     msg.author_id === USER_IDS.arjun,
      }
    })
  }

  const [messages, setMessages] = useState<ChatMessage[]>(buildMessages)
  const [roster]                = useState<RosterMember[]>(buildRoster)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    const timer = window.setTimeout(() => setIsLoading(false), 250)
    return () => window.clearTimeout(timer)
  }, [circleId])

  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return
    const currentUser = mockData.profiles.find(p => p.id === USER_IDS.arjun)
    setMessages(prev => [
      ...prev,
      {
        id:         `msg-${Date.now()}`,
        author:     currentUser?.display_name ?? 'You',
        authorRank: roleLabel(roleMap.get(USER_IDS.arjun) ?? 'member'),
        content:    content.trim(),
        timestamp:  new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        isMine:     true,
      },
    ])
  }, [roleMap])

  return { roster, messages, isLoading, sendMessage }
}

// ─── Real Supabase + Realtime path ───────────────────────────────────────────

function useRealtimeCircleChat(circleId: string) {
  const [messages,  setMessages]  = useState<ChatMessage[]>([])
  const [roster,    setRoster]    = useState<RosterMember[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Keep a ref to the supabase channel so we can clean it up
  const channelRef = useRef<ReturnType<typeof createClient>['channel'] extends (...a: any[]) => infer R ? R : never | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      setIsLoading(true)

      // 1. Load message history
      const histRes = await fetch(`/api/circles/${circleId}/messages?limit=30`)
      if (!cancelled && histRes.ok) {
        const { messages: raw } = await histRes.json() as { messages: CircleMessageResponse[] }
        // API returns newest-first; reverse so oldest appears at top
        setMessages(raw.slice().reverse().map(toChat))
      }

      // 2. Load roster (members)
      const membersRes = await fetch(`/api/circles/${circleId}/members`)
      if (!cancelled && membersRes.ok) {
        const { members } = await membersRes.json()
        setRoster(
          (members ?? []).map((m: any) => ({
            id:          m.user_id,
            displayName: m.display_name,
            rank:        roleLabel(m.role),
            isActive:    m.ready_to_serve ?? false,
          }))
        )
      }

      if (!cancelled) setIsLoading(false)

      // 3. Subscribe to new messages via Supabase Realtime
      const supabase = createClient()
      const channel  = supabase
        .channel(`circle-chat-${circleId}`)
        .on(
          'postgres_changes' as any,
          {
            event:  'INSERT',
            schema: 'public',
            table:  'circle_messages',
            filter: `circle_id=eq.${circleId}`,
          },
          async (payload: any) => {
            if (cancelled) return
            const row = payload.new
            // Fetch the author profile so we can display name/badge
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, avatar_url, badge')
              .eq('id', row.author_id)
              .single() as any

            // Fetch the author's role in this circle
            const { data: membership } = await supabase
              .from('impact_circle_members')
              .select('role')
              .eq('circle_id', circleId)
              .eq('user_id', row.author_id)
              .maybeSingle() as any

            // Get current user to decide isMine
            const { data: { user } } = await supabase.auth.getUser()

            const newMsg: ChatMessage = {
              id:         row.id,
              author:     profile?.display_name ?? 'Unknown',
              authorRank: roleLabel(membership?.role ?? 'member'),
              content:    row.content,
              timestamp:  formatTimestamp(row.created_at),
              isMine:     row.author_id === user?.id,
            }
            if (!cancelled) {
              setMessages(prev => [...prev, newMsg])
            }
          }
        )
        .subscribe()

      channelRef.current = channel as any
    }

    init()

    return () => {
      cancelled = true
      if (channelRef.current) {
        createClient().removeChannel(channelRef.current as any)
        channelRef.current = null
      }
    }
  }, [circleId])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Optimistic update
    const optimisticId = `opt-${Date.now()}`
    setMessages(prev => [
      ...prev,
      {
        id:         optimisticId,
        author:     'You',
        authorRank: 'Member',
        content:    content.trim(),
        timestamp:  new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        isMine:     true,
      },
    ])

    // Real insert — Realtime subscription will fire and will be deduped by ID
    const { error } = await (supabase as any)
      .from('circle_messages')
      .insert({ circle_id: circleId, author_id: user.id, content: content.trim() })

    if (error) {
      console.error('sendMessage insert error:', error)
      // Roll back the optimistic message
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
    }
  }, [circleId])

  return { roster, messages, isLoading, sendMessage }
}

// ─── Exported hook ────────────────────────────────────────────────────────────

export function useCircleChat(circleId: string) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return USE_MOCK_DATA ? useMockCircleChat(circleId) : useRealtimeCircleChat(circleId)
}
