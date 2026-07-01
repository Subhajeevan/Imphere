'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Search, FileText, MapPin, ImageIcon, Download, ExternalLink, Loader2 } from 'lucide-react'
import type { SharedFile } from '@/app/api/circles/[id]/files/route'

type Filter = 'all' | 'image' | 'document' | 'location'

function fileSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Force-download a Cloudinary asset via the fl_attachment delivery flag. */
function downloadUrl(file: SharedFile): string {
  if (!file.url) return '#'
  if (file.kind === 'location') return file.url
  return file.url.replace('/upload/', '/upload/fl_attachment/')
}

/**
 * "Shared Files" — every image, document and location shared in a circle.
 * Lives inside Circle Info. Searchable by file or sender name, downloadable.
 */
export function SharedFilesPanel({ circleId }: { circleId: string }) {
  const [files, setFiles]     = useState<SharedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery]     = useState('')
  const [filter, setFilter]   = useState<Filter>('all')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/circles/${circleId}/files`)
        if (!cancelled && res.ok) {
          const d = await res.json()
          setFiles(d.files ?? [])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [circleId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return files.filter(f =>
      (filter === 'all' || f.kind === filter) &&
      (!q || f.name.toLowerCase().includes(q) || f.senderName.toLowerCase().includes(q)),
    )
  }, [files, query, filter])

  const counts = useMemo(() => ({
    all:      files.length,
    image:    files.filter(f => f.kind === 'image').length,
    document: files.filter(f => f.kind === 'document').length,
    location: files.filter(f => f.kind === 'location').length,
  }), [files])

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search files or people…"
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-muted text-sm focus:outline-none"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'image', 'document', 'location'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors',
              filter === f ? 'bg-gold text-black' : 'bg-muted text-muted-foreground hover:bg-muted/70',
            )}
          >
            {f === 'all' ? 'All' : f === 'image' ? 'Photos' : f === 'document' ? 'Documents' : 'Locations'}
            <span className="ml-1 opacity-70">{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No shared files yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(file => (
            <div key={file.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              {/* Thumb / icon */}
              {file.kind === 'image' && file.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={file.url} alt={file.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                  {file.kind === 'document' ? <FileText className="w-5 h-5 text-gold" />
                    : file.kind === 'location' ? <MapPin className="w-5 h-5 text-gold" />
                    : <ImageIcon className="w-5 h-5 text-gold" />}
                </div>
              )}

              {/* Meta */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {file.senderName} · {fmtDate(file.createdAt)}{file.size ? ` · ${fileSize(file.size)}` : ''}
                </p>
              </div>

              {/* Actions */}
              {file.url && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={file.url} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-gold hover:bg-muted transition-colors"
                    aria-label="Open"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  {file.kind !== 'location' && (
                    <a
                      href={downloadUrl(file)} target="_blank" rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-gold hover:bg-muted transition-colors"
                      aria-label="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
