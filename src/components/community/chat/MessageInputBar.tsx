'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Plus, Smile, Mic, Send, X, Camera, FileText, MapPin, BarChart3, Megaphone,
} from 'lucide-react'
import type { PendingReply } from '@/types/circle-chat'
import { EmojiKeyboard } from './EmojiKeyboard'
import { PollComposer } from './PollComposer'
import { AnnouncementComposer } from './AnnouncementComposer'
import { AttachmentPreview } from './AttachmentPreview'

const MAX_IMAGE_BYTES = 8  * 1024 * 1024
const MAX_DOC_BYTES   = 15 * 1024 * 1024

export interface ComposerActions {
  /** Upload a picked photo/document (parent attaches reply + sends) */
  onSendAttachment?: (file: File, kind: 'image' | 'document', caption: string) => void
  /** Live geolocation handled by the parent */
  onShareLocation?: () => void
  onCreatePoll?: (question: string, options: string[], allowMultiple: boolean) => Promise<boolean>
  /** Leaders only */
  onSendAnnouncement?: (content: string) => Promise<boolean>
}

const DOC_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,' +
  'application/pdf,application/msword,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,' +
  'application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
  'text/plain,application/zip,application/x-zip-compressed'

/**
 * Composer bar: reply preview, attachment sheet (photo/doc/location/poll/
 * announcement), emoji keyboard, voice placeholder and send. Every action is
 * optional so phases can light them up without touching the call site.
 */
export function MessageInputBar({
  onSend, reply, onCancelReply, isLeader = false, actions,
}: {
  onSend: (text: string) => void
  reply?: PendingReply | null
  onCancelReply: () => void
  isLeader?: boolean
  actions?: ComposerActions
}) {
  const [text, setText]           = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pollOpen, setPollOpen]   = useState(false)
  const [annOpen, setAnnOpen]     = useState(false)
  const [pending, setPending]     = useState<{ file: File; kind: 'image' | 'document' } | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const docRef   = useRef<HTMLInputElement>(null)

  useEffect(() => { if (reply) inputRef.current?.focus() }, [reply])

  const handlePicked = (kind: 'image' | 'document') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    const limit = kind === 'image' ? MAX_IMAGE_BYTES : MAX_DOC_BYTES
    if (file.size > limit) {
      setFileError(`${kind === 'image' ? 'Image' : 'File'} is too large (max ${kind === 'image' ? '8' : '15'} MB).`)
      setTimeout(() => setFileError(null), 3500)
      return
    }
    setPending({ file, kind })
  }

  const submit = () => {
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
    setEmojiOpen(false)
    requestAnimationFrame(() => { if (inputRef.current) inputRef.current.style.height = '42px' })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  const insertEmoji = (emoji: string) => { setText(prev => prev + emoji); inputRef.current?.focus() }

  return (
    <div className="flex-shrink-0 bg-white border-t border-border">
      {/* Reply preview */}
      {reply && (
        <div className="flex items-center gap-2 px-4 pt-2">
          <div className="flex-1 min-w-0 border-l-2 border-gold pl-2 py-1">
            <p className="text-xs font-semibold text-gold">Replying to {reply.authorName}</p>
            <p className="text-xs text-muted-foreground truncate">{reply.excerpt}</p>
          </div>
          <button onClick={onCancelReply} className="p-1 rounded-full hover:bg-muted" aria-label="Cancel reply">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {fileError && (
        <div className="mx-4 mt-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs text-red-600">{fileError}</p>
        </div>
      )}

      {/* Attachment sheet */}
      {sheetOpen && (
        <AttachmentSheet
          isLeader={isLeader}
          canAttach={!!actions?.onSendAttachment}
          hasLocation={!!actions?.onShareLocation}
          hasPoll={!!actions?.onCreatePoll}
          hasAnnouncement={!!actions?.onSendAnnouncement}
          onClose={() => setSheetOpen(false)}
          onPickPhoto={() => { setSheetOpen(false); photoRef.current?.click() }}
          onPickDocument={() => { setSheetOpen(false); docRef.current?.click() }}
          onShareLocation={() => { setSheetOpen(false); actions?.onShareLocation?.() }}
          onOpenPoll={() => { setSheetOpen(false); setPollOpen(true) }}
          onOpenAnnouncement={() => { setSheetOpen(false); setAnnOpen(true) }}
        />
      )}

      {/* Hidden file inputs */}
      <input ref={photoRef} type="file" accept="image/*" hidden onChange={handlePicked('image')} />
      <input ref={docRef} type="file" accept={DOC_ACCEPT} hidden onChange={handlePicked('document')} />

      <div className="flex items-end gap-1.5 px-3 py-2">
        {/* Attachment */}
        <button
          onClick={() => { setSheetOpen(v => !v); setEmojiOpen(false) }}
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
            sheetOpen ? 'bg-gold text-white' : 'text-muted-foreground hover:bg-muted',
          )}
          aria-label="Add attachment"
        >
          <Plus className={cn('w-5 h-5 transition-transform', sheetOpen && 'rotate-45')} />
        </button>

        {/* Emoji */}
        <button
          onClick={() => { setEmojiOpen(v => !v); setSheetOpen(false) }}
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
            emojiOpen ? 'text-gold bg-gold/10' : 'text-muted-foreground hover:bg-muted',
          )}
          aria-label="Emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Text input */}
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => {
            setText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          rows={1}
          className="flex-1 resize-none rounded-3xl bg-muted px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none min-h-[42px] max-h-[120px]"
          style={{ height: '42px' }}
        />

        {/* Voice placeholder (future) or Send */}
        {text.trim() ? (
          <button
            onClick={submit}
            className="w-10 h-10 rounded-full bg-gold text-white flex items-center justify-center flex-shrink-0 hover:bg-gold-dark transition-colors"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        ) : (
          <button
            disabled
            title="Voice messages coming soon"
            className="w-10 h-10 rounded-full bg-muted text-muted-foreground/60 flex items-center justify-center flex-shrink-0 cursor-not-allowed"
            aria-label="Voice message (coming soon)"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}
      </div>

      <EmojiKeyboard open={emojiOpen} onPick={insertEmoji} />

      {pollOpen && actions?.onCreatePoll && (
        <PollComposer onClose={() => setPollOpen(false)} onCreate={actions.onCreatePoll} />
      )}
      {annOpen && actions?.onSendAnnouncement && (
        <AnnouncementComposer onClose={() => setAnnOpen(false)} onPost={actions.onSendAnnouncement} />
      )}
      {pending && (
        <AttachmentPreview
          file={pending.file}
          kind={pending.kind}
          onCancel={() => setPending(null)}
          onConfirm={(caption) => { actions?.onSendAttachment?.(pending.file, pending.kind, caption); setPending(null) }}
        />
      )}
    </div>
  )
}

// ── Attachment options sheet ───────────────────────────────────────────────────

function AttachmentSheet({
  isLeader, canAttach, hasLocation, hasPoll, hasAnnouncement,
  onClose, onPickPhoto, onPickDocument, onShareLocation, onOpenPoll, onOpenAnnouncement,
}: {
  isLeader: boolean
  canAttach: boolean
  hasLocation: boolean
  hasPoll: boolean
  hasAnnouncement: boolean
  onClose: () => void
  onPickPhoto: () => void
  onPickDocument: () => void
  onShareLocation: () => void
  onOpenPoll: () => void
  onOpenAnnouncement: () => void
}) {
  const options: Array<{ key: string; icon: any; label: string; hint: string; fn?: () => void }> = [
    { key: 'photo',    icon: Camera,    label: 'Photo',    hint: 'Camera or gallery',   fn: canAttach ? onPickPhoto : undefined },
    { key: 'document', icon: FileText,  label: 'Document', hint: 'PDF, DOCX, XLSX…',    fn: canAttach ? onPickDocument : undefined },
    { key: 'location', icon: MapPin,    label: 'Location', hint: 'Share live location', fn: hasLocation ? onShareLocation : undefined },
    { key: 'poll',     icon: BarChart3, label: 'Poll',     hint: 'Ask the circle',      fn: hasPoll ? onOpenPoll : undefined },
  ]
  if (isLeader) {
    options.push({ key: 'announcement', icon: Megaphone, label: 'Announce', hint: 'Leaders only', fn: hasAnnouncement ? onOpenAnnouncement : undefined })
  }

  return (
    <div className={cn('grid gap-2 px-3 pt-3 pb-1', isLeader ? 'grid-cols-5' : 'grid-cols-4')}>
      {options.map(opt => {
        const enabled = !!opt.fn
        return (
          <button
            key={opt.key}
            disabled={!enabled}
            onClick={() => { opt.fn?.(); if (opt.key !== 'poll' && opt.key !== 'announcement') onClose() }}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-muted/30 px-1 py-3 transition-colors',
              enabled ? 'hover:bg-gold/5 hover:border-gold/30' : 'opacity-60 cursor-not-allowed',
            )}
          >
            <div className="w-9 h-9 rounded-2xl bg-gold/10 flex items-center justify-center">
              <opt.icon className="w-5 h-5 text-gold" />
            </div>
            <span className="text-[11px] font-medium text-foreground">{opt.label}</span>
            <span className="text-[9px] text-muted-foreground leading-tight text-center">
              {enabled ? opt.hint : 'Soon'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
