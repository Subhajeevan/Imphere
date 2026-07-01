'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  CircleChatMessage, ReactionGroup, MessageType, ChatLocation, ReplyPreview,
} from '@/types/circle-chat'
import { messageExcerpt } from '@/types/circle-chat'

export interface DmOtherUser {
  id: string
  displayName: string
  avatarUrl: string | null
}

/** API DM message shape (from GET /api/chats/[id]) */
interface ApiDmMessage {
  id: string
  senderId: string
  content: string | null
  createdAt: string
  isOwn: boolean
  type?: MessageType
  attachment?: CircleChatMessage['attachment']
  location?: ChatLocation | null
  replyTo?: ReplyPreview | null
  reactions?: ReactionGroup[]
}

/**
 * Realtime state for a 1-on-1 DM thread, exposing the same shared
 * `CircleChatMessage` shape so it can reuse the chat components. Mirrors
 * `useCircleThread` but scoped to `direct_messages`; own messages come from the
 * send API response, others arrive via Realtime.
 */
export function useDirectThread(conversationId: string, currentUserId: string) {
  const [messages,  setMessages]  = useState<CircleChatMessage[]>([])
  const [otherUser, setOtherUser] = useState<DmOtherUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const supabaseRef = useRef(createClient())
  const messagesRef = useRef<CircleChatMessage[]>([])
  const otherRef    = useRef<DmOtherUser | null>(null)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { otherRef.current = otherUser }, [otherUser])

  const toCM = useCallback((m: ApiDmMessage): CircleChatMessage => ({
    id: m.id, circleId: conversationId, type: (m.type ?? 'text') as MessageType, content: m.content,
    authorId: m.senderId, authorName: m.isOwn ? 'You' : (otherRef.current?.displayName ?? 'Unknown'),
    authorAvatarUrl: m.isOwn ? null : (otherRef.current?.avatarUrl ?? null), authorRole: 'member',
    createdAt: m.createdAt, isMine: m.isOwn,
    attachment: m.attachment ?? null, location: m.location ?? null, poll: null,
    replyTo: m.replyTo ?? null, isPinned: false, isAnnouncement: false, reactions: m.reactions ?? [],
  }), [conversationId])

  // ── Load ──────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoadError(false)
    try {
      const res = await fetch(`/api/chats/${conversationId}`)
      if (!res.ok) { setLoadError(true); return }
      const data = await res.json()
      setOtherUser(data.otherUser ?? null)
      otherRef.current = data.otherUser ?? null
      setMessages((data.messages ?? []).map(toCM))
    } catch {
      setLoadError(true)
    } finally {
      setIsLoading(false)
    }
  }, [conversationId, toCM])

  useEffect(() => { load() }, [load])

  // ── Reaction recompute ────────────────────────────────────────────────────────

  const refreshReactions = useCallback(async (messageId: string) => {
    const { data } = await supabaseRef.current
      .from('direct_message_reactions')
      .select('user_id, emoji')
      .eq('message_id', messageId) as any

    const byEmoji = new Map<string, { count: number; mine: boolean }>()
    for (const r of data ?? []) {
      const cur = byEmoji.get(r.emoji) ?? { count: 0, mine: false }
      cur.count += 1
      if (r.user_id === currentUserId) cur.mine = true
      byEmoji.set(r.emoji, cur)
    }
    const groups: ReactionGroup[] = [...byEmoji.entries()].map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine }))
    setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, reactions: groups } : m)))
  }, [currentUserId])

  // ── Realtime ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = supabaseRef.current
    let cancelled = false

    const channel = supabase
      .channel(`dm-thread-${conversationId}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          if (cancelled) return
          const row = payload.new
          if (row.sender_id === currentUserId) return // own handled via send API

          let replyTo: ReplyPreview | null = null
          if (row.reply_to_id) {
            const ref = messagesRef.current.find(m => m.id === row.reply_to_id)
            if (ref) replyTo = { id: ref.id, authorName: ref.isMine ? 'You' : ref.authorName, excerpt: messageExcerpt(ref) }
          }

          const incoming = toCM({
            id: row.id, senderId: row.sender_id, content: row.content, createdAt: row.created_at,
            isOwn: false, type: row.message_type, attachment: row.attachment ?? null,
            location: row.location ?? null, replyTo, reactions: [],
          })
          setMessages(prev => (prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]))
        },
      )
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'direct_message_reactions' },
        (payload: any) => {
          if (cancelled) return
          const mid = payload.new?.message_id ?? payload.old?.message_id
          if (mid && messagesRef.current.some(m => m.id === mid)) refreshReactions(mid)
        },
      )
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [conversationId, currentUserId, toCM, refreshReactions])

  // ── Send text / location (via API; own message returned) ──────────────────────

  const postMessage = useCallback(async (
    body: any, optimistic: CircleChatMessage,
  ) => {
    setMessages(prev => [...prev, optimistic])
    try {
      const res = await fetch(`/api/chats/${conversationId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) {
        const { message } = await res.json()
        setMessages(prev => prev.map(m => (m.id === optimistic.id ? toCM(message) : m)))
      } else {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    }
  }, [conversationId, toCM])

  const baseOptimistic = (over: Partial<CircleChatMessage>): CircleChatMessage => ({
    id: `opt-${Date.now()}`, circleId: conversationId, type: 'text', content: null,
    authorId: currentUserId, authorName: 'You', authorAvatarUrl: null, authorRole: 'member',
    createdAt: new Date().toISOString(), isMine: true,
    attachment: null, location: null, poll: null, replyTo: null,
    isPinned: false, isAnnouncement: false, reactions: [], pending: true, ...over,
  })

  const sendText = useCallback((content: string, replyToId?: string | null) => {
    const text = content.trim()
    if (!text) return
    const replyTo = replyToId ? messagesRef.current.find(m => m.id === replyToId) : null
    return postMessage(
      { type: 'text', content: text, replyToId: replyToId ?? null },
      baseOptimistic({ type: 'text', content: text, replyTo: replyTo ? { id: replyTo.id, authorName: replyTo.isMine ? 'You' : replyTo.authorName, excerpt: messageExcerpt(replyTo) } : null }),
    )
  }, [postMessage]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendLocation = useCallback((loc: ChatLocation) => {
    return postMessage(
      { type: 'location', location: loc },
      baseOptimistic({ type: 'location', location: loc }),
    )
  }, [postMessage]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Upload attachment (multipart; own message returned) ───────────────────────

  const uploadAttachment = useCallback(async (
    file: File, kind: 'image' | 'document', caption?: string, replyToId?: string | null,
  ): Promise<boolean> => {
    const previewUrl = kind === 'image' ? URL.createObjectURL(file) : undefined
    const optimistic = baseOptimistic({
      type: kind, content: caption?.trim() || null,
      attachment: { kind, url: previewUrl ?? '', publicId: '', name: file.name, mimeType: file.type, size: file.size, thumbnailUrl: previewUrl },
    })
    setMessages(prev => [...prev, optimistic])

    const form = new FormData()
    form.append('file', file)
    form.append('kind', kind)
    if (caption?.trim()) form.append('caption', caption.trim())
    if (replyToId) form.append('replyToId', replyToId)

    try {
      const res = await fetch(`/api/chats/${conversationId}/attachments`, { method: 'POST', body: form })
      if (!res.ok) {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        return false
      }
      const { message } = await res.json()
      setMessages(prev => prev.map(m => (m.id === optimistic.id ? toCM(message) : m)))
      return true
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      return false
    }
  }, [conversationId, toCM]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reactions (client insert/delete) ──────────────────────────────────────────

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    const supabase = supabaseRef.current
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
      const { error } = await supabase.from('direct_message_reactions')
        .insert({ message_id: messageId, user_id: currentUserId, emoji } as any)
      if (error) { console.error('dm addReaction error:', error); refreshReactions(messageId) }
    } else {
      const { error } = await supabase.from('direct_message_reactions')
        .delete().eq('message_id', messageId).eq('user_id', currentUserId).eq('emoji', emoji)
      if (error) { console.error('dm removeReaction error:', error); refreshReactions(messageId) }
    }
  }, [currentUserId, refreshReactions])

  return {
    messages, otherUser, isLoading, loadError,
    sendText, sendLocation, uploadAttachment, toggleReaction, reload: load,
  }
}
