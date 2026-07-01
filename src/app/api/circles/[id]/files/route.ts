import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ChatAttachment, ChatLocation } from '@/types/circle-chat'

export interface SharedFile {
  id: string
  kind: 'image' | 'document' | 'location'
  name: string
  url: string | null
  mimeType: string | null
  size: number | null
  createdAt: string
  senderName: string
  location: ChatLocation | null
}

/**
 * GET /api/circles/[id]/files
 * All shared images, documents and locations in a circle (newest first).
 * Optional ?q= filters by file name or sender name.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: circleId } = await params
    const q = (new URL(request.url).searchParams.get('q') || '').trim().toLowerCase()

    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: membership } = await supabase
      .from('impact_circle_members')
      .select('role')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership) return NextResponse.json({ error: 'Not a member of this circle' }, { status: 403 })

    const { data: rows, error } = await supabase
      .from('circle_messages')
      .select(`
        id, content, message_type, attachment, location, created_at,
        author:profiles!circle_messages_author_id_fkey ( display_name )
      `)
      .eq('circle_id', circleId)
      .in('message_type', ['image', 'document', 'location'])
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('GET files error:', error)
      return NextResponse.json({ error: 'Failed to load files' }, { status: 500 })
    }

    let files: SharedFile[] = (rows ?? []).map((r: any) => {
      const att: ChatAttachment | null = r.attachment ?? null
      const loc: ChatLocation | null   = r.location ?? null
      const senderName = r.author?.display_name ?? 'Unknown'

      if (r.message_type === 'location') {
        return {
          id: r.id, kind: 'location' as const,
          name: loc?.label ?? loc?.address ?? 'Shared location',
          url: loc ? `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}` : null,
          mimeType: null, size: null,
          createdAt: r.created_at, senderName, location: loc,
        }
      }
      return {
        id: r.id, kind: r.message_type as 'image' | 'document',
        name: att?.name ?? 'File',
        url: att?.url ?? null,
        mimeType: att?.mimeType ?? null,
        size: att?.size ?? null,
        createdAt: r.created_at, senderName, location: null,
      }
    })

    if (q) {
      files = files.filter(f =>
        f.name.toLowerCase().includes(q) || f.senderName.toLowerCase().includes(q),
      )
    }

    return NextResponse.json({ files })
  } catch (err) {
    console.error('GET /api/circles/[id]/files error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
