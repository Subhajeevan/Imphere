'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { cn } from '@/lib/utils'
import { ArrowLeft, Search, Info, ChevronUp, ChevronDown, Pin, Loader2 } from 'lucide-react'
import { useCircleThread } from '@/hooks/useCircleThread'
import type { CircleChatMessage, PendingReply } from '@/types/circle-chat'
import { messageExcerpt } from '@/types/circle-chat'
import { MessageBubble } from './MessageBubble'
import { MessageInputBar } from './MessageInputBar'

interface NavUser {
  displayName: string
  avatarUrl?: string
  standing: number
  badge: string
}

function dateSeparator(iso: string) {
  const d = new Date(iso), now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}
function sameDay(a: string, b: string) {
  const x = new Date(a), y = new Date(b)
  return x.toDateString() === y.toDateString()
}

export function CircleChatThread({
  circleId, circleName, user,
}: {
  circleId: string
  circleName: string
  user: NavUser
}) {
  const router = useRouter()
  const {
    messages, isLoading, isLeader,
    sendText, toggleReaction, sendLocation, uploadAttachment, createPoll, sendAnnouncement, togglePin, votePoll,
  } = useCircleThread(circleId)

  const [reply,      setReply]      = useState<PendingReply | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query,      setQuery]      = useState('')
  const [matchIdx,   setMatchIdx]   = useState(0)
  const [flashId,    setFlashId]    = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── Auto-scroll to bottom on load / new message (not while searching) ─────────
  useEffect(() => {
    if (!isLoading && !searchOpen) bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [isLoading, searchOpen])
  useEffect(() => {
    if (!searchOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, searchOpen])

  // ── Jump + flash a message ────────────────────────────────────────────────────
  const jumpTo = useCallback((id: string) => {
    const el = document.getElementById(`msg-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setFlashId(id)
      setTimeout(() => setFlashId(null), 1600)
    }
  }, [])

  // ── Search matches (content, author, file name) ───────────────────────────────
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [] as string[]
    return messages
      .filter(m =>
        (m.content?.toLowerCase().includes(q)) ||
        m.authorName.toLowerCase().includes(q) ||
        (m.attachment?.name?.toLowerCase().includes(q)),
      )
      .map(m => m.id)
  }, [query, messages])

  useEffect(() => { setMatchIdx(0) }, [query])
  useEffect(() => {
    if (matches.length && matches[matchIdx]) jumpTo(matches[matchIdx])
  }, [matchIdx, matches, jumpTo])

  const stepMatch = (dir: 1 | -1) => {
    if (!matches.length) return
    setMatchIdx(i => (i + dir + matches.length) % matches.length)
  }

  // ── Pinned banner (topmost pinned message) ────────────────────────────────────
  const pinned = useMemo(() => messages.find(m => m.isPinned) ?? null, [messages])

  // ── Reply ─────────────────────────────────────────────────────────────────────
  const startReply = (m: CircleChatMessage) => {
    setReply({ id: m.id, authorName: m.isMine ? 'yourself' : m.authorName, excerpt: messageExcerpt(m) })
  }
  const handleSend = (text: string) => {
    sendText(text, reply?.id ?? null)
    setReply(null)
  }

  // Live location via the browser Geolocation API
  const handleShareLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Location sharing is not supported on this device.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => sendLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        source: 'live',
        label: 'Live location',
      }),
      () => alert('Could not get your location. Please allow location access and try again.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [sendLocation])

  const closeSearch = () => { setSearchOpen(false); setQuery('') }

  return (
    <AppLayout user={user} fullBleed>
      <div className="flex flex-col h-full bg-white">

        {/* Header */}
        <div className="flex items-center gap-2 px-3 h-14 border-b border-border bg-white flex-shrink-0">
          {searchOpen ? (
            <>
              <button onClick={closeSearch} className="p-2 -ml-1 rounded-full hover:bg-muted" aria-label="Close search">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search messages, files, people…"
                className="flex-1 bg-muted rounded-2xl px-3 py-2 text-sm focus:outline-none"
              />
              {query.trim() && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="tabular-nums">{matches.length ? matchIdx + 1 : 0}/{matches.length}</span>
                  <button onClick={() => stepMatch(-1)} className="p-1 rounded-full hover:bg-muted disabled:opacity-40" disabled={!matches.length}>
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => stepMatch(1)} className="p-1 rounded-full hover:bg-muted disabled:opacity-40" disabled={!matches.length}>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <button onClick={() => router.push(`/community/${circleId}`)} className="p-2 -ml-1 rounded-full hover:bg-muted" aria-label="Back">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <div className="w-9 h-9 rounded-full bg-gold/15 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-gold">{circleName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{circleName}</p>
                <p className="text-[11px] text-muted-foreground">Circle chat</p>
              </div>
              <button onClick={() => setSearchOpen(true)} className="p-2 rounded-full hover:bg-muted" aria-label="Search">
                <Search className="w-5 h-5 text-foreground" />
              </button>
              <button onClick={() => router.push(`/community/${circleId}`)} className="p-2 rounded-full hover:bg-muted" aria-label="Circle info">
                <Info className="w-5 h-5 text-foreground" />
              </button>
            </>
          )}
        </div>

        {/* Pinned banner */}
        {pinned && !searchOpen && (
          <button
            onClick={() => jumpTo(pinned.id)}
            className="flex items-center gap-2 px-4 py-2 bg-gold/10 border-b border-gold/20 text-left"
          >
            <Pin className="w-4 h-4 text-gold flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gold">Pinned</p>
              <p className="text-xs text-foreground truncate">{messageExcerpt(pinned)}</p>
            </div>
          </button>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mb-3">
                <span className="text-2xl">💬</span>
              </div>
              <p className="text-sm font-semibold text-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">Be the first to say something.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((m, i) => {
                const showDate = i === 0 || !sameDay(messages[i - 1].createdAt, m.createdAt)
                return (
                  <div key={m.id}>
                    {showDate && (
                      <div className="flex justify-center my-3">
                        <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                          {dateSeparator(m.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className={cn('rounded-3xl transition-shadow', flashId === m.id && 'ring-2 ring-gold ring-offset-2 ring-offset-white')}>
                      <MessageBubble
                        message={m}
                        highlight={searchOpen ? query : ''}
                        isLeader={isLeader}
                        onReact={(emoji) => toggleReaction(m.id, emoji)}
                        onReply={() => startReply(m)}
                        onJumpTo={jumpTo}
                        onVote={(optionId) => votePoll(m.id, optionId)}
                        onTogglePin={(pinned) => togglePin(m.id, pinned)}
                      />
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <MessageInputBar
          onSend={handleSend}
          reply={reply}
          onCancelReply={() => setReply(null)}
          isLeader={isLeader}
          actions={{
            onSendAttachment: (file, kind, caption) => { uploadAttachment(file, kind, caption, reply?.id ?? null); setReply(null) },
            onShareLocation:    handleShareLocation,
            onCreatePoll:       createPoll,
            onSendAnnouncement: isLeader ? sendAnnouncement : undefined,
          }}
        />
      </div>
    </AppLayout>
  )
}
