'use client'

import { useState, Fragment } from 'react'
import { cn } from '@/lib/utils'
import {
  Reply, SmilePlus, Megaphone, MapPin, FileText, ExternalLink, Pin, PinOff,
} from 'lucide-react'
import type { CircleChatMessage } from '@/types/circle-chat'
import { googleMapsUrl, roleLabel } from '@/types/circle-chat'
import { ReactionPicker } from './ReactionPicker'
import { ReactionBar } from './ReactionBar'
import { PollCard } from './PollCard'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

/** Wrap occurrences of `highlight` within `text` in <mark>. */
function Highlighted({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>
  const q = highlight.trim()
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase()
          ? <mark key={i} className="bg-gold/40 text-foreground rounded px-0.5">{part}</mark>
          : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  )
}

export function MessageBubble({
  message, highlight = '', isLeader = false, showAuthor = true, onReact, onReply, onJumpTo, onVote, onTogglePin,
}: {
  message: CircleChatMessage
  highlight?: string
  isLeader?: boolean
  /** Hide the author name line above other people's bubbles (used in 1-on-1 DMs). */
  showAuthor?: boolean
  onReact: (emoji: string) => void
  onReply: () => void
  onJumpTo: (messageId: string) => void
  onVote?: (optionId: string) => void
  onTogglePin?: (pinned: boolean) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const mine = message.isMine

  // ── Announcement — highlighted card, cannot be replied to ───────────────────
  if (message.type === 'announcement' || message.isAnnouncement) {
    return (
      <div className="my-3">
        <div className="rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="w-4 h-4 text-gold" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gold">Announcement</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{formatTime(message.createdAt)}</span>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            <Highlighted text={message.content ?? ''} highlight={highlight} />
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">— {message.authorName}</p>
        </div>
        <ReactionBar reactions={message.reactions} onToggle={onReact} align="start" />
      </div>
    )
  }

  // ── System message — centered subtle pill ───────────────────────────────────
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div
      id={`msg-${message.id}`}
      className={cn('group relative flex flex-col scroll-mt-24', mine ? 'items-end' : 'items-start')}
    >
      {/* Author line (others only) */}
      {!mine && showAuthor && (
        <div className="flex items-center gap-1.5 mb-0.5 px-1">
          <span className="text-xs font-semibold text-foreground">{message.authorName}</span>
          {message.authorRole !== 'member' && (
            <span className="text-[9px] uppercase tracking-wide text-gold font-medium">{roleLabel(message.authorRole)}</span>
          )}
        </div>
      )}

      <div className={cn('relative max-w-[78%] flex items-end gap-1', mine ? 'flex-row-reverse' : 'flex-row')}>
        {/* Bubble */}
        <div
          className={cn(
            'relative rounded-3xl px-3.5 py-2.5 shadow-sm',
            mine
              ? 'bg-gold text-black rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md',
            message.pending && 'opacity-70',
          )}
        >
          {/* Reply preview */}
          {message.replyTo && (
            <button
              onClick={() => onJumpTo(message.replyTo!.id)}
              className={cn(
                'mb-1.5 w-full text-left rounded-xl border-l-2 pl-2 pr-2 py-1 text-xs',
                mine ? 'border-black/40 bg-black/5' : 'border-gold bg-white/60',
              )}
            >
              <span className="block font-semibold truncate">{message.replyTo.authorName}</span>
              <span className="block opacity-80 truncate">{message.replyTo.excerpt}</span>
            </button>
          )}

          {/* Location card */}
          {message.type === 'location' && message.location && (
            <a
              href={googleMapsUrl(message.location)}
              target="_blank"
              rel="noopener noreferrer"
              className="block mb-1 overflow-hidden rounded-2xl border border-border bg-white"
            >
              <div className="flex items-center gap-2 p-2.5">
                <div className="w-9 h-9 rounded-xl bg-gold/15 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-gold" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {message.location.label ?? (message.location.source === 'live' ? 'Live location' : 'Pinned location')}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {message.location.address ?? `${message.location.lat.toFixed(5)}, ${message.location.lng.toFixed(5)}`}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
              </div>
            </a>
          )}

          {/* Image attachment */}
          {message.type === 'image' && message.attachment && (
            <a href={message.attachment.url} target="_blank" rel="noopener noreferrer" className="block mb-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.attachment.thumbnailUrl ?? message.attachment.url}
                alt={message.attachment.name}
                className="rounded-2xl max-h-64 w-auto object-cover"
              />
            </a>
          )}

          {/* Document attachment */}
          {message.type === 'document' && message.attachment && (
            <a
              href={message.attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 mb-1 rounded-2xl border border-border bg-white p-2.5"
            >
              <div className="w-9 h-9 rounded-xl bg-gold/15 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-gold" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{message.attachment.name}</p>
                <p className="text-xs text-muted-foreground">{(message.attachment.size / 1024).toFixed(0)} KB</p>
              </div>
            </a>
          )}

          {/* Poll */}
          {message.type === 'poll' && message.poll && (
            <PollCard poll={message.poll} mine={mine} onVote={(o) => onVote?.(o)} />
          )}

          {/* Text content */}
          {message.content && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">
              <Highlighted text={message.content} highlight={highlight} />
            </p>
          )}

          <span className={cn('block text-[10px] mt-0.5', mine ? 'text-black/50 text-right' : 'text-muted-foreground')}>
            {formatTime(message.createdAt)}
          </span>

          {/* Quick reaction picker */}
          <ReactionPicker
            open={pickerOpen}
            onPick={onReact}
            onClose={() => setPickerOpen(false)}
            align={mine ? 'right' : 'left'}
          />
        </div>

        {/* Hover actions */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={() => setPickerOpen(v => !v)}
            className="w-7 h-7 rounded-full bg-white border border-border flex items-center justify-center text-muted-foreground hover:text-gold hover:border-gold/40 transition-colors"
            aria-label="React"
          >
            <SmilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onReply}
            className="w-7 h-7 rounded-full bg-white border border-border flex items-center justify-center text-muted-foreground hover:text-gold hover:border-gold/40 transition-colors"
            aria-label="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
          {isLeader && onTogglePin && (
            <button
              onClick={() => onTogglePin(!message.isPinned)}
              className={cn(
                'w-7 h-7 rounded-full bg-white border flex items-center justify-center transition-colors',
                message.isPinned
                  ? 'border-gold/40 text-gold'
                  : 'border-border text-muted-foreground hover:text-gold hover:border-gold/40',
              )}
              aria-label={message.isPinned ? 'Unpin' : 'Pin'}
            >
              {message.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      <ReactionBar reactions={message.reactions} onToggle={onReact} align={mine ? 'end' : 'start'} />
    </div>
  )
}
