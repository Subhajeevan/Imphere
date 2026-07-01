import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/circles/[id]/announcements
 * Leader-only (principal / steward). Posts a highlighted announcement message.
 * Enforced server-side with the admin client so the leader gate can't be
 * bypassed from the browser.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: circleId } = await params
    const content = (await request.json())?.content?.trim()

    if (!content || content.length > 2000) {
      return NextResponse.json({ error: 'Announcement must be 1–2000 characters' }, { status: 422 })
    }

    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: membership } = await supabase
      .from('impact_circle_members')
      .select('role')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership || !['principal', 'steward'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only circle leaders can post announcements' }, { status: 403 })
    }

    const admin = await createAdminClient() as any
    const { data: message, error } = await admin
      .from('circle_messages')
      .insert({
        circle_id:       circleId,
        author_id:       user.id,
        content,
        message_type:    'announcement',
        is_announcement: true,
      })
      .select('id')
      .single()

    if (error || !message) {
      console.error('announcement insert error:', error)
      return NextResponse.json({ error: 'Failed to post announcement' }, { status: 500 })
    }

    return NextResponse.json({ messageId: message.id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/circles/[id]/announcements error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
