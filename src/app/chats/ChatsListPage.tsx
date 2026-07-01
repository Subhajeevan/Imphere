'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { cn } from '@/lib/utils'
import { Search, PenSquare, X, User, MessageCircle, Loader2 } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  otherUser: { id: string; displayName: string; avatarUrl: string | null }
}

interface UserResult {
  id: string
  displayName: string
  avatarUrl: string | null
  badge: string
}

interface CurrentUser {
  id: string
  displayName: string
  avatarUrl: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d       = new Date(iso)
  const now     = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7)   return d.toLocaleDateString('en-IN', { weekday: 'short' })
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function Avatar({ url, name, size = 12 }: { url: string | null; name: string; size?: number }) {
  return url ? (
    <img
      src={url} alt={name}
      style={{ width: size * 4, height: size * 4, borderRadius: '50%', flexShrink: 0 }}
      className="object-cover"
    />
  ) : (
    <div
      style={{ width: size * 4, height: size * 4, borderRadius: '50%', flexShrink: 0 }}
      className="bg-gold/10 flex items-center justify-center"
    >
      <User className="w-5 h-5 text-gold" />
    </div>
  )
}

// ── New Chat Sheet ────────────────────────────────────────────────────────────

function NewChatSheet({
  onClose,
  onSelect,
}: {
  onClose: () => void
  // Resolves to an error message on failure, or null on success (navigating away).
  onSelect: (userId: string) => Promise<string | null>
}) {
  const [query,      setQuery]      = useState('')
  const [results,    setResults]    = useState<UserResult[]>([])
  const [searching,  setSearching]  = useState(false)
  const [selecting,  setSelecting]  = useState<string | null>(null) // userId being opened
  const [error,      setError]      = useState<string | null>(null)
  const [visible,    setVisible]    = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 260)
  }

  // Debounced user search
  useEffect(() => {
    clearTimeout(timerRef.current)
    if (query.length < 1) { setResults([]); return }
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch('/api/chats', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ q: query }),
        })
        if (!res.ok) return
        const d = await res.json()
        setResults(d.users ?? [])
      } finally {
        setSearching(false)
      }
    }, 350)
  }, [query])

  const handleSelect = async (userId: string) => {
    if (selecting) return               // prevent double-tap
    setSelecting(userId)
    setError(null)
    try {
      const err = await onSelect(userId) // wait for conversation create + navigation
      if (err) setError(err)             // surface the real failure to the user
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSelecting(null)
    }
    // handleClose is intentionally NOT called here:
    // if onSelect navigates away the sheet is already gone;
    // if it fails the user sees the error above and can retry.
  }

  return (
    <>
      <div
        className={cn('fixed inset-0 z-[80] bg-black/40 transition-opacity duration-300', visible ? 'opacity-100' : 'opacity-0')}
        onClick={selecting ? undefined : handleClose}
      />
      <div className={cn(
        'fixed left-0 right-0 bottom-0 z-[90] bg-white rounded-t-3xl shadow-2xl',
        'transition-transform duration-300 ease-in-out',
        visible ? 'translate-y-0' : 'translate-y-full',
      )}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="flex items-center justify-between px-5 pt-2 pb-3">
          <h3 className="text-base font-serif font-bold text-foreground">New Message</h3>
          <button
            onClick={handleClose}
            disabled={!!selecting}
            className="p-1.5 rounded-full hover:bg-muted transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={e => { setQuery(e.target.value); setError(null) }}
              placeholder="Search people…"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-muted text-sm placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="mx-4 mb-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <div className="overflow-y-auto max-h-64 px-3 pb-10">
          {searching && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!searching && results.length === 0 && query.length > 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">No users found</p>
          )}
          {!searching && query.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">Type a name to find someone</p>
          )}
          {!searching && results.map(u => (
            <button
              key={u.id}
              onClick={() => handleSelect(u.id)}
              disabled={!!selecting}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-muted transition-colors text-left disabled:opacity-60"
            >
              <Avatar url={u.avatarUrl} name={u.displayName} size={10} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{u.displayName}</p>
                <p className="text-xs text-muted-foreground">{u.badge}</p>
              </div>
              {selecting === u.id && (
                <Loader2 className="w-4 h-4 animate-spin text-gold flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ChatsListPage({ currentUser }: { currentUser: CurrentUser }) {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading,       setLoading]       = useState(true)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [composing,     setComposing]     = useState(false)

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chats')
      if (res.ok) {
        const d = await res.json()
        setConversations(d.conversations ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  // Resolves to an error message on failure, or null on success (navigating away).
  const handleStartChat = async (otherUserId: string): Promise<string | null> => {
    const res  = await fetch('/api/chats', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ otherUserId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return data?.error ?? 'Could not start the conversation.'
    }
    if (!data?.conversationId) {
      return 'Could not start the conversation.'
    }
    router.push(`/chats/${data.conversationId}`)
    return null
  }

  const filtered = searchQuery
    ? conversations.filter(c =>
        c.otherUser.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations

  return (
    <AppLayout user={{
      displayName: currentUser.displayName,
      avatarUrl:   currentUser.avatarUrl ?? undefined,
      standing:    0,
      badge:       'Citizen',
    }}>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="sticky top-14 lg:top-0 z-40 bg-white border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <h1 className="text-xl font-serif font-bold text-foreground">Messages</h1>
            <button
              onClick={() => setComposing(true)}
              className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors"
              aria-label="New message"
            >
              <PenSquare className="w-5 h-5 text-foreground" />
            </button>
          </div>

          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search messages"
                className="w-full pl-10 pr-4 py-2 rounded-2xl bg-muted text-sm placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-9 h-9 text-gold" />
            </div>
            <h2 className="text-lg font-serif font-bold text-foreground">No messages yet</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-5">
              Start a conversation with someone in your community.
            </p>
            <button
              onClick={() => setComposing(true)}
              className="px-6 py-2.5 rounded-2xl bg-gold text-black text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Send a message
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(conv => (
              <button
                key={conv.id}
                onClick={() => router.push(`/chats/${conv.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left"
              >
                <div className="relative flex-shrink-0">
                  <Avatar url={conv.otherUser.avatarUrl} name={conv.otherUser.displayName} size={12} />
                  {conv.unreadCount > 0 && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gold rounded-full border-2 border-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={cn('text-sm truncate', conv.unreadCount > 0 ? 'font-bold text-foreground' : 'font-medium text-foreground')}>
                      {conv.otherUser.displayName}
                    </p>
                    <span className="text-[11px] text-muted-foreground ml-2 flex-shrink-0">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={cn('text-sm truncate max-w-[200px]', conv.unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                      {conv.lastMessage ?? 'Start chatting'}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 flex-shrink-0 min-w-[20px] h-5 bg-gold text-black text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {composing && (
        <NewChatSheet
          onClose={() => setComposing(false)}
          onSelect={handleStartChat}
        />
      )}
    </AppLayout>
  )
}
