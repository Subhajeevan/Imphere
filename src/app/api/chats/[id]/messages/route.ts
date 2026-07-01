import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// POST /api/chats/[id]/messages — send a text or location message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params
    const body = await req.json()

    const type: 'text' | 'location' = body?.type === 'location' ? 'location' : 'text'
    const content   = typeof body?.content === 'string' ? body.content.trim() : ''
    const replyToId = body?.replyToId ?? null
    const location  = body?.location ?? null

    if (type === 'text') {
      if (!content) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
      if (content.length > 2000) return NextResponse.json({ error: 'Message too long' }, { status: 400 })
    }
    if (type === 'location' && (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number')) {
      return NextResponse.json({ error: 'Invalid location' }, { status: 400 })
    }

    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await createAdminClient() as any

    const { data: participation } = await admin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single()
    if (!participation) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const now = new Date().toISOString()

    const { data: message, error: msgErr } = await admin
      .from('direct_messages')
      .insert({
        conversation_id: conversationId,
        sender_id:       user.id,
        content:         type === 'text' ? content : null,
        message_type:    type,
        reply_to_id:     replyToId,
        location:        type === 'location' ? location : null,
        created_at:      now,
      })
      .select('id, sender_id, content, created_at, message_type, reply_to_id, location')
      .single()

    if (msgErr || !message) {
      console.error('DM insert error:', msgErr)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Update conversation preview
    const preview = type === 'location' ? '📍 Location' : content.slice(0, 100)
    await admin
      .from('conversations')
      .update({ last_message: preview, last_message_at: now, last_sender_id: user.id })
      .eq('id', conversationId)

    await admin
      .from('conversation_participants')
      .update({ last_read_at: now })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)

    return NextResponse.json({
      message: {
        id:        message.id,
        senderId:  message.sender_id,
        content:   message.content,
        createdAt: message.created_at,
        isOwn:     true,
        type:      message.message_type ?? 'text',
        location:  message.location ?? null,
        attachment: null,
        replyTo:   null,
        reactions: [],
      },
    })
  } catch (err) {
    console.error('POST /api/chats/[id]/messages error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
