import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { messageExcerpt } from '@/types/circle-chat'
import type { ReactionGroup, ReplyPreview } from '@/types/circle-chat'

// GET /api/chats/[id] — enriched DM history (reply, reactions, attachment, location)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params

    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await createAdminClient() as any

    // Verify participation
    const { data: participation } = await admin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single()
    if (!participation) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Other participant's profile
    const { data: otherParticipant } = await admin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', user.id)
      .single()

    const { data: otherProfile } = await admin
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', otherParticipant?.user_id)
      .single()

    // Messages (last 60, oldest first)
    const { data: rows, error: msgErr } = await admin
      .from('direct_messages')
      .select('id, sender_id, content, created_at, message_type, reply_to_id, attachment, location')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(60)
    if (msgErr) return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })

    const messages = (rows ?? []).slice().reverse()
    const messageIds = messages.map((m: any) => m.id)

    const nameFor = (senderId: string) =>
      senderId === user.id ? 'You' : (otherProfile?.display_name ?? 'Unknown')

    // Reactions grouped per message
    const reactionsByMessage = new Map<string, ReactionGroup[]>()
    if (messageIds.length) {
      const { data: reactionRows } = await admin
        .from('direct_message_reactions')
        .select('message_id, user_id, emoji')
        .in('message_id', messageIds)

      const grouped = new Map<string, Map<string, { count: number; mine: boolean }>>()
      for (const r of reactionRows ?? []) {
        if (!grouped.has(r.message_id)) grouped.set(r.message_id, new Map())
        const byEmoji = grouped.get(r.message_id)!
        const cur = byEmoji.get(r.emoji) ?? { count: 0, mine: false }
        cur.count += 1
        if (r.user_id === user.id) cur.mine = true
        byEmoji.set(r.emoji, cur)
      }
      for (const [mid, byEmoji] of grouped) {
        reactionsByMessage.set(mid,
          [...byEmoji.entries()].map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine })))
      }
    }

    // Reply previews
    const replyIds = [...new Set(messages.map((m: any) => m.reply_to_id).filter(Boolean))]
    const replyMap = new Map<string, ReplyPreview>()
    if (replyIds.length) {
      const { data: replyRows } = await admin
        .from('direct_messages')
        .select('id, sender_id, content, message_type, attachment')
        .in('id', replyIds)
      for (const r of replyRows ?? []) {
        replyMap.set(r.id, {
          id: r.id,
          authorName: nameFor(r.sender_id),
          excerpt: messageExcerpt({ type: r.message_type, content: r.content, attachment: r.attachment }),
        })
      }
    }

    // Mark as read
    await admin
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)

    return NextResponse.json({
      messages: messages.map((m: any) => ({
        id:        m.id,
        senderId:  m.sender_id,
        content:   m.content,
        createdAt: m.created_at,
        isOwn:     m.sender_id === user.id,
        type:      m.message_type ?? 'text',
        attachment: m.attachment ?? null,
        location:   m.location ?? null,
        replyTo:    m.reply_to_id ? replyMap.get(m.reply_to_id) ?? null : null,
        reactions:  reactionsByMessage.get(m.id) ?? [],
      })),
      otherUser: {
        id:          otherProfile?.id ?? otherParticipant?.user_id,
        displayName: otherProfile?.display_name ?? 'Unknown',
        avatarUrl:   otherProfile?.avatar_url ?? null,
      },
      currentUserId: user.id,
    })
  } catch (err) {
    console.error('GET /api/chats/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
