'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { X, Send, FileText, Loader2 } from 'lucide-react'

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Confirmation modal shown after a file is picked — preview + optional caption
 * before the upload is sent.
 */
export function AttachmentPreview({
  file, kind, onCancel, onConfirm,
}: {
  file: File
  kind: 'image' | 'document'
  onCancel: () => void
  onConfirm: (caption: string) => void
}) {
  const [caption, setCaption]   = useState('')
  const [sending, setSending]   = useState(false)
  const [visible, setVisible]   = useState(false)
  const previewUrl = useMemo(() => (kind === 'image' ? URL.createObjectURL(file) : null), [file, kind])

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const close = () => { setVisible(false); setTimeout(onCancel, 220) }

  const send = () => {
    if (sending) return
    setSending(true)
    onConfirm(caption.trim())
    // Parent uploads optimistically; close immediately for a snappy feel.
    setVisible(false)
    setTimeout(onCancel, 200)
  }

  return (
    <>
      <div
        className={cn('fixed inset-0 z-[90] bg-black/70 transition-opacity duration-200', visible ? 'opacity-100' : 'opacity-0')}
        onClick={close}
      />
      <div className="fixed inset-0 z-[95] flex flex-col items-center justify-center p-4 pointer-events-none">
        <div className={cn(
          'pointer-events-auto w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden',
          'transition-all duration-200',
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-12 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Send {kind === 'image' ? 'photo' : 'file'}</span>
            <button onClick={close} className="p-1.5 rounded-full hover:bg-muted"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>

          {/* Preview */}
          <div className="p-4">
            {kind === 'image' && previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={file.name} className="w-full max-h-[50vh] object-contain rounded-2xl bg-muted" />
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-4">
                <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-gold" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{fileSize(file.size)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Caption + send */}
          <div className="flex items-end gap-2 px-4 pb-4">
            <input
              autoFocus
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Add a caption…"
              className="flex-1 rounded-3xl bg-muted px-4 py-2.5 text-sm focus:outline-none"
              onKeyDown={e => { if (e.key === 'Enter') send() }}
            />
            <button
              onClick={send}
              disabled={sending}
              className="w-10 h-10 rounded-full bg-gold text-white flex items-center justify-center flex-shrink-0 hover:bg-gold-dark transition-colors disabled:opacity-60"
              aria-label="Send"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
