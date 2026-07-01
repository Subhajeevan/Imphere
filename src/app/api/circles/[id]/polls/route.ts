import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/circles/[id]/polls
 * Create a poll: inserts a `circle_messages` row (type 'poll') and the linked
 * `circle_polls` row atomically with the admin client. Any circle member may
 * create a poll. Realtime broadcasts the new message; clients fetch the poll.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: circleId } = await params
    const body = await request.json()

    const question = (body?.question ?? '').trim()
    const allowMultiple = !!body?.allowMultiple
    const rawOptions: string[] = Array.isArray(body?.options) ? body.options : []
    const options = rawOptions.map((t) => String(t).trim()).filter(Boolean)

    if (!question || question.length > 300) {
      return NextResponse.json({ error: 'Question must be 1–300 characters' }, { status: 422 })
    }
    if (options.length < 2 || options.length > 6) {
      return NextResponse.json({ error: 'Provide between 2 and 6 options' }, { status: 422 })
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
    if (!membership) return NextResponse.json({ error: 'Not a member of this circle' }, { status: 403 })

    const admin = await createAdminClient() as any

    // 1. The poll's host message
    const { data: message, error: msgErr } = await admin
      .from('circle_messages')
      .insert({ circle_id: circleId, author_id: user.id, content: null, message_type: 'poll' })
      .select('id')
      .single()
    if (msgErr || !message) {
      console.error('poll message insert error:', msgErr)
      return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 })
    }

    // 2. The poll itself
    const optionRows = options.map((text, i) => ({ id: `opt-${i}`, text }))
    const { data: poll, error: pollErr } = await admin
      .from('circle_polls')
      .insert({
        message_id:     message.id,
        question,
        options:        optionRows,
        allow_multiple: allowMultiple,
      })
      .select('id')
      .single()

    if (pollErr || !poll) {
      console.error('poll insert error:', pollErr)
      await admin.from('circle_messages').delete().eq('id', message.id) // roll back orphan
      return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 })
    }

    return NextResponse.json({ messageId: message.id, pollId: poll.id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/circles/[id]/polls error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
