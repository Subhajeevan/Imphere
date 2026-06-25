'use client'

import { KeyboardEvent, useEffect, useRef, useState } from 'react'
import { Send, MessageSquare, Users, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatMessage, RosterMember } from '@/hooks/useCircleChat'

interface ChatTabProps {
  circleName: string
  roster: RosterMember[]
  messages: ChatMessage[]
  isLoading: boolean
  onSendMessage: (message: string) => void
}

export function ChatTab({ circleName, roster, messages, isLoading, onSendMessage }: ChatTabProps) {
  const [message, setMessage] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = () => {
    if (!message.trim()) return
    onSendMessage(message)
    setMessage('')
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Circle chat</p>
            <h2 className="text-xl font-semibold text-foreground">{circleName}</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-muted/80 px-3 py-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-gold" />
            Active discussion
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          This chat is mock-backed and ready to swap for Firestore realtime listeners later.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.6fr]">
        <div className="rounded-3xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              <span>Messages</span>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {messages.length} messages
            </span>
          </div>

          <div
            ref={scrollRef}
            className="min-h-[360px] max-h-[520px] space-y-3 overflow-y-auto rounded-3xl border border-border/70 bg-background p-4"
          >
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-16 rounded-3xl bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : (
              messages.map((messageItem) => (
                <div
                  key={messageItem.id}
                  className={cn(
                    'flex flex-col gap-2 rounded-3xl p-3 shadow-sm',
                    messageItem.isMine
                      ? 'items-end bg-gold/10 text-foreground'
                      : 'items-start bg-muted/80 text-foreground'
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{messageItem.author}</span>
                    <span className="rounded-full bg-muted px-2 py-1">{messageItem.authorRank}</span>
                    <span>{messageItem.timestamp}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6">{messageItem.content}</p>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a message..."
              className="min-h-[70px] w-full resize-none rounded-3xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-3xl bg-gold px-5 py-3 text-sm font-semibold text-black transition hover:bg-gold-dark"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>

        <aside className="rounded-3xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="w-4 h-4" />
            Active roster
          </div>

          <div className="space-y-3">
            {roster.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 rounded-3xl border border-border/70 bg-background px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{member.displayName}</p>
                  <p className="text-xs text-muted-foreground">{member.rank}</p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    member.isActive
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {member.isActive ? '⚡ Active' : '💤 Inactive'}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
