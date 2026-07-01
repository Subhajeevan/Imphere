'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { cn } from '@/lib/utils'
import { ArrowLeft, Search, ChevronUp, ChevronDown, User, Loader2 } from 'lucide-react'
import { useDirectThread } from '@/hooks/useDirectThread'
import type { CircleChatMessage, PendingReply } from '@/types/circle-chat'
import { messageExcerpt } from '@/types/circle-chat'
import { MessageBubble } from '@/components/community/chat/MessageBubble'
import { MessageInputBar } from '@/components/community/chat/MessageInputBar'

interface CurrentUser {
  displayName: string
  avatarUrl: string | null
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
  return new Date(a).toDateString() === new Date(b).toDateString()
}

export default function ChatThreadPage({
  conversationId, currentUserId, currentUser,
}: {
  conversationId: string
  currentUserId: string
  currentUser: CurrentUser
}) {
  const router = useRouter()
  const {
    messages, otherUser, isLoading, loadError,
    sendText, sendLocation, uploadAttachment, toggleReaction, reload,
  } = useDirectThread(conversationId, currentUserId)

  const [reply,      setReply]      = useState<PendingReply | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query,      setQuery]      = useState('')
  const [matchIdx,   setMatchIdx]   = useState(0)
  const [flashId,    setFlashId]    = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (!isLoading && !searchOpen) bottomRef.current?.scrollIntoView({ behavior: 'instant' }) }, [isLoading, searchOpen])
  useEffect(() => { if (!searchOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length, searchOpen])

  const jumpTo = useCallback((id: string) => {
    const el = document.getElementById(`msg-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setFlashId(id)
      setTimeout(() => setFlashId(null), 1600)
    }
  }, [])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [] as string[]
    return messages
      .filter(m => m.content?.toLowerCase().includes(q) || m.attachment?.name?.toLowerCase().includes(q))
      .map(m => m.id)
  }, [query, messages])

  useEffect(() => { setMatchIdx(0) }, [query])
  useEffect(() => { if (matches.length && matches[matchIdx]) jumpTo(matches[matchIdx]) }, [matchIdx, matches, jumpTo])
  const stepMatch = (dir: 1 | -1) => { if (matches.length) setMatchIdx(i => (i + dir + matches.length) % matches.length) }

  const startReply = (m: CircleChatMessage) =>
    setReply({ id: m.id, authorName: m.isMine ? 'yourself' : m.authorName, excerpt: messageExcerpt(m) })

  const handleSend = (text: string) => { sendText(text, reply?.id ?? null); setReply(null) }

  const handleShareLocation = useCallback(() => {
    if (!navigator.geolocation) { alert('Location sharing is not supported on this device.'); return }
    navigator.geolocation.getCurrentPosition(
      pos => sendLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'live', label: 'Live location' }),
      () => alert('Could not get your location. Please allow location access and try again.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [sendLocation])

  const closeSearch = () => { setSearchOpen(false); setQuery('') }

  return (
    <AppLayout user={{ ...currentUser, avatarUrl: currentUser.avatarUrl ?? undefined }} fullBleed>
      <div className="flex flex-col h-full bg-white">

        {/* Header */}
        <div className="flex items-center gap-2 px-3 h-14 border-b border-border bg-white flex-shrink-0">
          {searchOpen ? (
            <>
              <button onClick={closeSearch} className="p-2 -ml-1 rounded-full hover:bg-muted" aria-label="Close search">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <input
                autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search this chat…"
                className="flex-1 bg-muted rounded-2xl px-3 py-2 text-sm focus:outline-none"
              />
              {query.trim() && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="tabular-nums">{matches.length ? matchIdx + 1 : 0}/{matches.length}</span>
                  <button onClick={() => stepMatch(-1)} disabled={!matches.length} className="p-1 rounded-full hover:bg-muted disabled:opacity-40"><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={() => stepMatch(1)} disabled={!matches.length} className="p-1 rounded-full hover:bg-muted disabled:opacity-40"><ChevronDown className="w-4 h-4" /></button>
                </div>
              )}
            </>
          ) : (
            <>
              <button onClick={() => router.push('/chats')} className="p-2 -ml-1 rounded-full hover:bg-muted" aria-label="Back">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              {otherUser?.avatarUrl ? (
                <img src={otherUser.avatarUrl} alt={otherUser.displayName} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gold" />
                </div>
              )}
              <p className="flex-1 min-w-0 text-sm font-semibold text-foreground truncate">
                {otherUser?.displayName ?? '…'}
              </p>
              <button onClick={() => setSearchOpen(true)} className="p-2 rounded-full hover:bg-muted" aria-label="Search">
                <Search className="w-5 h-5 text-foreground" />
              </button>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loadError ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <p className="text-sm text-muted-foreground">Could not load this conversation.</p>
              <button onClick={reload} className="text-sm text-gold font-semibold hover:underline">Try again</button>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              {otherUser?.avatarUrl ? (
                <img src={otherUser.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center"><User className="w-7 h-7 text-gold" /></div>
              )}
              <p className="mt-3 text-sm font-semibold text-foreground">{otherUser?.displayName}</p>
              <p className="text-xs text-muted-foreground mt-1">Say hello 👋</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((m, i) => {
                const showDate = i === 0 || !sameDay(messages[i - 1].createdAt, m.createdAt)
                return (
                  <div key={m.id}>
                    {showDate && (
                      <div className="flex justify-center my-3">
                        <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full">{dateSeparator(m.createdAt)}</span>
                      </div>
                    )}
                    <div className={cn('rounded-3xl transition-shadow', flashId === m.id && 'ring-2 ring-gold ring-offset-2 ring-offset-white')}>
                      <MessageBubble
                        message={m}
                        showAuthor={false}
                        highlight={searchOpen ? query : ''}
                        onReact={(emoji) => toggleReaction(m.id, emoji)}
                        onReply={() => startReply(m)}
                        onJumpTo={jumpTo}
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
          actions={{
            onSendAttachment: (file, kind, caption) => { uploadAttachment(file, kind, caption, reply?.id ?? null); setReply(null) },
            onShareLocation:  handleShareLocation,
          }}
        />
      </div>
    </AppLayout>
  )
}
