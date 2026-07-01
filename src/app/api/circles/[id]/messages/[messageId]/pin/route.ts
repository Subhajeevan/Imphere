import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/circles/[id]/messages/[messageId]/pin
 * Leader-only. Pins or unpins a message. Body: { pinned: boolean }.
 * The UPDATE is broadcast by Realtime so every member's banner stays in sync.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id: circleId, messageId } = await params
    const pinned = !!(await request.json())?.pinned

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
      return NextResponse.json({ error: 'Only circle leaders can pin messages' }, { status: 403 })
    }

    const admin = await createAdminClient() as any
    const { error } = await admin
      .from('circle_messages')
      .update({
        is_pinned: pinned,
        pinned_at: pinned ? new Date().toISOString() : null,
        pinned_by: pinned ? user.id : null,
      })
      .eq('id', messageId)
      .eq('circle_id', circleId)

    if (error) {
      console.error('pin update error:', error)
      return NextResponse.json({ error: 'Failed to update pin' }, { status: 500 })
    }

    return NextResponse.json({ pinned })
  } catch (err) {
    console.error('POST pin error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
