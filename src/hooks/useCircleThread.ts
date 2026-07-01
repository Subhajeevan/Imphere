'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  CircleChatMessage, ReactionGroup, MessageType, ChatPoll, ChatLocation,
} from '@/types/circle-chat'
import { messageExcerpt } from '@/types/circle-chat'

/**
 * Realtime state for the enhanced circle chat.
 *
 * Write paths:
 *   • text / location  → direct browser insert (Realtime broadcasts it)
 *   • reactions / votes → direct browser insert/delete on their tables
 *   • polls / announcements / pin → server API (atomic + leader gating)
 *
 * Designed to be extended: new message kinds reuse the same insert + realtime
 * pipeline; `sendText` already accepts a reply target.
 */
export function useCircleThread(circleId: string) {
  const [messages,  setMessages]  = useState<CircleChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLeader,  setIsLeader]  = useState(false)
  const userIdRef   = useRef<string | null>(null)
  const supabaseRef = useRef(createClient())
  const messagesRef = useRef<CircleChatMessage[]>([])

  // Keep a ref mirror of messages for use inside realtime callbacks
  useEffect(() => { messagesRef.current = messages }, [messages])

  // ── Load history ────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/circles/${circleId}/thread?limit=50`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages ?? [])
        setIsLeader(!!data.isLeader)
        userIdRef.current = data.currentUserId ?? null
      }
    } finally {
      setIsLoading(false)
    }
  }, [circleId])

  useEffect(() => { load() }, [load])

  // ── Reaction recompute ────────────────────────────────────────────────────────

  const refreshReactions = useCallback(async (messageId: string) => {
    const supabase = supabaseRef.current
    const { data } = await supabase
      .from('circle_message_reactions')
      .select('user_id, emoji')
      .eq('message_id', messageId) as any

    const byEmoji = new Map<string, { count: number; mine: boolean }>()
    for (const r of data ?? []) {
      const cur = byEmoji.get(r.emoji) ?? { count: 0, mine: false }
      cur.count += 1
      if (r.user_id === userIdRef.current) cur.mine = true
      byEmoji.set(r.emoji, cur)
    }
    const groups: ReactionGroup[] = [...byEmoji.entries()].map(([emoji, v]) => ({
      emoji, count: v.count, mine: v.mine,
    }))
    setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, reactions: groups } : m)))
  }, [])

  // ── Poll load ─────────────────────────────────────────────────────────────────

  const loadPoll = useCallback(async (messageId: string): Promise<ChatPoll | null> => {
    const supabase = supabaseRef.current
    const { data: poll } = await supabase
      .from('circle_polls')
      .select('id, question, options, allow_multiple, closes_at')
      .eq('message_id', messageId)
      .maybeSingle() as any
    if (!poll) return null

    const { data: votes } = await supabase
      .from('circle_poll_votes')
      .select('user_id, option_id')
      .eq('poll_id', poll.id) as any

    const tallies: Record<string, number> = {}
    const myVotes: string[] = []
    for (const v of votes ?? []) {
      tallies[v.option_id] = (tallies[v.option_id] ?? 0) + 1
      if (v.user_id === userIdRef.current) myVotes.push(v.option_id)
    }
    return {
      id: poll.id, question: poll.question, options: poll.options ?? [],
      allowMultiple: poll.allow_multiple, closesAt: poll.closes_at,
      tallies, totalVotes: (votes ?? []).length, myVotes,
    }
  }, [])

  // Attach a poll to its message (retry once to cover the message→poll insert gap)
  const applyPoll = useCallback(async (messageId: string, retries = 1) => {
    let poll = await loadPoll(messageId)
    if (!poll && retries > 0) {
      await new Promise(r => setTimeout(r, 500))
      poll = await loadPoll(messageId)
    }
    if (poll) setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, poll } : m)))
  }, [loadPoll])

  // ── Realtime ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = supabaseRef.current
    let cancelled = false

    const channel = supabase
      .channel(`circle-thread-${circleId}`)
      // New messages
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'circle_messages', filter: `circle_id=eq.${circleId}` },
        async (payload: any) => {
          if (cancelled) return
          const row = payload.new

          const { data: profile } = await supabase
            .from('profiles').select('display_name, avatar_url').eq('id', row.author_id).single() as any
          const { data: membership } = await supabase
            .from('impact_circle_members').select('role')
            .eq('circle_id', circleId).eq('user_id', row.author_id).maybeSingle() as any

          let replyTo = null
          if (row.reply_to_id) {
            const { data: rep } = await supabase
              .from('circle_messages')
              .select('id, content, message_type, attachment, author:profiles!circle_messages_author_id_fkey(display_name)')
              .eq('id', row.reply_to_id).single() as any
            if (rep) {
              replyTo = {
                id: rep.id,
                authorName: rep.author?.display_name ?? 'Unknown',
                excerpt: messageExcerpt({ type: rep.message_type, content: rep.content, attachment: rep.attachment }),
              }
            }
          }

          const incoming: CircleChatMessage = {
            id: row.id, circleId: row.circle_id, type: (row.message_type ?? 'text') as MessageType,
            content: row.content, authorId: row.author_id,
            authorName: profile?.display_name ?? 'Unknown', authorAvatarUrl: profile?.avatar_url ?? null,
            authorRole: (membership?.role ?? 'member') as CircleChatMessage['authorRole'],
            createdAt: row.created_at, isMine: row.author_id === userIdRef.current,
            attachment: row.attachment ?? null, location: row.location ?? null, poll: null,
            replyTo, isPinned: !!row.is_pinned, isAnnouncement: !!row.is_announcement, reactions: [],
          }

          if (cancelled) return
          setMessages(prev => {
            if (prev.some(m => m.id === incoming.id)) return prev
            if (incoming.isMine) {
              const optIdx = prev.findIndex(
                m => m.pending && m.content === incoming.content && m.type === incoming.type,
              )
              if (optIdx !== -1) {
                const next = prev.slice()
                next[optIdx] = incoming
                return next
              }
            }
            return [...prev, incoming]
          })

          if (incoming.type === 'poll') applyPoll(incoming.id)
        },
      )
      // Message updates (pin / announcement toggles, edits)
      .on(
        'postgres_changes' as any,
        { event: 'UPDATE', schema: 'public', table: 'circle_messages', filter: `circle_id=eq.${circleId}` },
        (payload: any) => {
          if (cancelled) return
          const row = payload.new
          setMessages(prev => prev.map(m => (m.id === row.id
            ? { ...m, content: row.content, type: (row.message_type ?? m.type) as MessageType,
                isPinned: !!row.is_pinned, isAnnouncement: !!row.is_announcement }
            : m)))
        },
      )
      // Reaction changes
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'circle_message_reactions' },
        (payload: any) => {
          if (cancelled) return
          const mid = payload.new?.message_id ?? payload.old?.message_id
          if (mid && messagesRef.current.some(m => m.id === mid)) refreshReactions(mid)
        },
      )
      // Poll vote changes
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'circle_poll_votes' },
        (payload: any) => {
          if (cancelled) return
          const pollId = payload.new?.poll_id ?? payload.old?.poll_id
          if (!pollId) return
          const msg = messagesRef.current.find(m => m.poll?.id === pollId)
          if (msg) applyPoll(msg.id, 0)
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [circleId, refreshReactions, applyPoll])

  // ── Generic optimistic insert for browser-side messages ───────────────────────

  const insertMessage = useCallback(async (
    fields: { content: string | null; type: MessageType; replyToId?: string | null; location?: ChatLocation | null },
  ) => {
    const supabase = supabaseRef.current
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    userIdRef.current = user.id

    const tempId = `opt-${Date.now()}`
    const optimistic: CircleChatMessage = {
      id: tempId, circleId, type: fields.type, content: fields.content,
      authorId: user.id, authorName: 'You', authorAvatarUrl: null, authorRole: 'member',
      createdAt: new Date().toISOString(), isMine: true,
      attachment: null, location: fields.location ?? null, poll: null, replyTo: null,
      isPinned: false, isAnnouncement: false, reactions: [], pending: true,
    }
    setMessages(prev => [...prev, optimistic])

    const { error } = await supabase.from('circle_messages').insert({
      circle_id:    circleId,
      author_id:    user.id,
      content:      fields.content,
      message_type: fields.type,
      reply_to_id:  fields.replyToId ?? null,
      location:     fields.location ?? null,
    } as any)

    if (error) {
      console.error('insertMessage error:', error)
      setMessages(prev => prev.filter(m => m.id !== tempId))
    }
  }, [circleId])

  // ── Public actions ─────────────────────────────────────────────────────────────

  const sendText = useCallback((content: string, replyToId?: string | null) => {
    const text = content.trim()
    if (!text) return
    return insertMessage({ content: text, type: 'text', replyToId })
  }, [insertMessage])

  const sendLocation = useCallback((loc: ChatLocation) => {
    return insertMessage({ content: null, type: 'location', location: loc })
  }, [insertMessage])

  // Upload a photo/document. Shows an instant local preview, then the server
  // uploads to Cloudinary and Realtime reconciles the confirmed message.
  const uploadAttachment = useCallback(async (
    file: File, kind: 'image' | 'document', caption?: string, replyToId?: string | null,
  ): Promise<boolean> => {
    const supabase = supabaseRef.current
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    userIdRef.current = user.id

    const tempId     = `opt-${Date.now()}`
    const previewUrl = kind === 'image' ? URL.createObjectURL(file) : undefined
    const optimistic: CircleChatMessage = {
      id: tempId, circleId, type: kind, content: caption?.trim() || null,
      authorId: user.id, authorName: 'You', authorAvatarUrl: null, authorRole: 'member',
      createdAt: new Date().toISOString(), isMine: true,
      attachment: {
        kind, url: previewUrl ?? '', publicId: '', name: file.name,
        mimeType: file.type, size: file.size, thumbnailUrl: previewUrl,
      },
      location: null, poll: null, replyTo: null,
      isPinned: false, isAnnouncement: false, reactions: [], pending: true,
    }
    setMessages(prev => [...prev, optimistic])

    const form = new FormData()
    form.append('file', file)
    form.append('kind', kind)
    if (caption?.trim()) form.append('caption', caption.trim())
    if (replyToId) form.append('replyToId', replyToId)

    const res = await fetch(`/api/circles/${circleId}/attachments`, { method: 'POST', body: form })
    if (!res.ok) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      return false
    }
    return true
  }, [circleId])

  const createPoll = useCallback(async (question: string, options: string[], allowMultiple: boolean) => {
    const res = await fetch(`/api/circles/${circleId}/polls`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, options, allowMultiple }),
    })
    return res.ok
  }, [circleId])

  const sendAnnouncement = useCallback(async (content: string) => {
    const res = await fetch(`/api/circles/${circleId}/announcements`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    return res.ok
  }, [circleId])

  const togglePin = useCallback(async (messageId: string, pinned: boolean) => {
    // optimistic
    setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, isPinned: pinned } : m)))
    const res = await fetch(`/api/circles/${circleId}/messages/${messageId}/pin`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    })
    if (!res.ok) setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, isPinned: !pinned } : m)))
  }, [circleId])

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    const supabase = supabaseRef.current
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    userIdRef.current = user.id

    let willAdd = true
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m
      const groups = m.reactions.slice()
      const idx = groups.findIndex(g => g.emoji === emoji)
      if (idx !== -1 && groups[idx].mine) {
        willAdd = false
        const count = groups[idx].count - 1
        if (count <= 0) groups.splice(idx, 1)
        else groups[idx] = { ...groups[idx], count, mine: false }
      } else if (idx !== -1) {
        groups[idx] = { ...groups[idx], count: groups[idx].count + 1, mine: true }
      } else {
        groups.push({ emoji, count: 1, mine: true })
      }
      return { ...m, reactions: groups }
    }))

    if (willAdd) {
      const { error } = await supabase
        .from('circle_message_reactions')
        .insert({ message_id: messageId, user_id: user.id, emoji } as any)
      if (error) { console.error('addReaction error:', error); refreshReactions(messageId) }
    } else {
      const { error } = await supabase
        .from('circle_message_reactions')
        .delete().eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji)
      if (error) { console.error('removeReaction error:', error); refreshReactions(messageId) }
    }
  }, [refreshReactions])

  const votePoll = useCallback(async (messageId: string, optionId: string) => {
    const supabase = supabaseRef.current
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    userIdRef.current = user.id

    const msg = messagesRef.current.find(m => m.id === messageId)
    const poll = msg?.poll
    if (!poll) return
    const already = poll.myVotes.includes(optionId)
    const pollId = poll.id

    // Optimistic
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId || !m.poll) return m
      const p = m.poll
      let myVotes = p.myVotes.slice()
      const tallies = { ...p.tallies }
      if (already) {
        myVotes = myVotes.filter(o => o !== optionId)
        tallies[optionId] = Math.max(0, (tallies[optionId] ?? 1) - 1)
      } else {
        if (!p.allowMultiple) {
          for (const o of myVotes) tallies[o] = Math.max(0, (tallies[o] ?? 1) - 1)
          myVotes = []
        }
        myVotes.push(optionId)
        tallies[optionId] = (tallies[optionId] ?? 0) + 1
      }
      const totalVotes = Object.values(tallies).reduce((a, b) => a + b, 0)
      return { ...m, poll: { ...p, myVotes, tallies, totalVotes } }
    }))

    try {
      if (already) {
        await supabase.from('circle_poll_votes').delete()
          .eq('poll_id', pollId).eq('user_id', user.id).eq('option_id', optionId)
      } else {
        if (!poll.allowMultiple) {
          await supabase.from('circle_poll_votes').delete().eq('poll_id', pollId).eq('user_id', user.id)
        }
        await supabase.from('circle_poll_votes').insert({ poll_id: pollId, user_id: user.id, option_id: optionId } as any)
      }
    } catch (e) {
      console.error('votePoll error:', e)
      applyPoll(messageId, 0)
    }
  }, [applyPoll])

  return {
    messages, isLoading, isLeader,
    sendText, sendLocation, uploadAttachment, createPoll, sendAnnouncement, togglePin, toggleReaction, votePoll,
    reload: load,
  }
}
