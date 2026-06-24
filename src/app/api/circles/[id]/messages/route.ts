import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { USE_MOCK_DATA } from '@/lib/use-mock-data'
import { mockData, mockCircleMessages, USER_IDS } from '@/lib/mock-data'

// Presentation shape that ChatTab + useCircleChat consume
export interface CircleMessageResponse {
  id: string
  circle_id: string
  author_id: string
  author_display_name: string
  author_avatar_url: string | null
  author_badge: string
  author_role: string
  content: string
  created_at: string
  is_mine: boolean
}


/**
 * GET /api/circles/[id]/messages
 * Paginated message history. Newest first (UI reverses for display).
 *
 * Query params:
 *   limit  – default 30, max 100
 *   before – ISO timestamp cursor for loading older messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit  = Math.min(parseInt(searchParams.get('limit') || '30'), 100)
    const before = searchParams.get('before') || ''

    if (USE_MOCK_DATA) {
      const isMember = mockData.impactCircleMembers.some(
        m => m.circle_id === id && m.user_id === USER_IDS.arjun
      )
      if (!isMember) return NextResponse.json({ error: 'Not a member of this circle' }, { status: 403 })

      const memberships = mockData.impactCircleMembers.filter(m => m.circle_id === id)
      const roleMap = new Map(memberships.map(m => [m.user_id, m.role ?? 'member']))

      let msgs = mockCircleMessages.filter(m => m.circle_id === id)

      if (before) {
        msgs = msgs.filter(m => m.created_at < before)
      }

      // Sort newest first, then slice
      msgs = [...msgs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit)

      const result: CircleMessageResponse[] = msgs.map(msg => {
        const author = mockData.profiles.find(p => p.id === msg.author_id)
        return {
          id:                  msg.id,
          circle_id:           msg.circle_id,
          author_id:           msg.author_id,
          author_display_name: author?.display_name ?? 'Unknown',
          author_avatar_url:   author?.avatar_url ?? null,
          author_badge:        author?.badge ?? 'Citizen',
          author_role:         roleMap.get(msg.author_id) ?? 'member',
          content:             msg.content,
          created_at:          msg.created_at,
          is_mine:             msg.author_id === USER_IDS.arjun,
        }
      })

      return NextResponse.json({ messages: result })
    }

    // ── Real Supabase path ──────────────────────────────────────────────────
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Membership gate (RLS also enforces this, but we return a clear error)
    const { data: membership } = await supabase
      .from('impact_circle_members')
      .select('role')
      .eq('circle_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this circle' }, { status: 403 })
    }

    let query = supabase
      .from('circle_messages')
      .select(`
        id, circle_id, author_id, content, created_at,
        author:profiles!circle_messages_author_id_fkey (
          display_name, avatar_url, badge
        )
      `)
      .eq('circle_id', id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) query = query.lt('created_at', before)

    const { data: messages, error } = await query
    if (error) {
      console.error('GET /api/circles/[id]/messages error:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Fetch roles for authors in bulk
    const authorIds  = [...new Set((messages ?? []).map((m: any) => m.author_id))]
    const { data: memberships } = await supabase
      .from('impact_circle_members')
      .select('user_id, role')
      .eq('circle_id', id)
      .in('user_id', authorIds)

    const roleMap = new Map((memberships ?? []).map((m: any) => [m.user_id, m.role]))

    const result: CircleMessageResponse[] = (messages ?? []).map((msg: any) => ({
      id:                  msg.id,
      circle_id:           msg.circle_id,
      author_id:           msg.author_id,
      author_display_name: msg.author?.display_name ?? 'Unknown',
      author_avatar_url:   msg.author?.avatar_url ?? null,
      author_badge:        msg.author?.badge ?? 'Citizen',
      author_role:         roleMap.get(msg.author_id) ?? 'member',
      content:             msg.content,
      created_at:          msg.created_at,
      is_mine:             msg.author_id === user.id,
    }))

    return NextResponse.json({ messages: result })
  } catch (err) {
    console.error('GET /api/circles/[id]/messages unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/circles/[id]/messages
 * Send a message to a circle. Author must be a member.
 * In production, prefer direct Supabase client insert for Realtime to work.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const content = body?.content?.trim()

    if (!content || content.length < 1 || content.length > 1000) {
      return NextResponse.json({ error: 'Message must be 1–1000 characters' }, { status: 422 })
    }

    if (USE_MOCK_DATA) {
      const currentUser = mockData.profiles.find(p => p.id === USER_IDS.arjun)
      const newMsg: CircleMessageResponse = {
        id:                  `msg-${Date.now()}`,
        circle_id:           id,
        author_id:           USER_IDS.arjun,
        author_display_name: currentUser?.display_name ?? 'You',
        author_avatar_url:   currentUser?.avatar_url ?? null,
        author_badge:        currentUser?.badge ?? 'Citizen',
        author_role:         'principal',
        content,
        created_at:          new Date().toISOString(),
        is_mine:             true,
      }
      return NextResponse.json({ message: newMsg }, { status: 201 })
    }

    // ── Real Supabase path ──────────────────────────────────────────────────
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: membership } = await supabase
      .from('impact_circle_members')
      .select('role')
      .eq('circle_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this circle' }, { status: 403 })
    }

    const { data: message, error } = await supabase
      .from('circle_messages')
      .insert({ circle_id: id, author_id: user.id, content })
      .select(`
        id, circle_id, author_id, content, created_at,
        author:profiles!circle_messages_author_id_fkey (
          display_name, avatar_url, badge
        )
      `)
      .single()

    if (error) {
      console.error('POST /api/circles/[id]/messages error:', error)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    const result: CircleMessageResponse = {
      id:                  message.id,
      circle_id:           message.circle_id,
      author_id:           message.author_id,
      author_display_name: message.author?.display_name ?? 'Unknown',
      author_avatar_url:   message.author?.avatar_url ?? null,
      author_badge:        message.author?.badge ?? 'Citizen',
      author_role:         membership.role ?? 'member',
      content:             message.content,
      created_at:          message.created_at,
      is_mine:             true,
    }

    return NextResponse.json({ message: result }, { status: 201 })
  } catch (err) {
    console.error('POST /api/circles/[id]/messages unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
