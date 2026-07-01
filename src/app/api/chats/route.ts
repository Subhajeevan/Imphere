import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/chats — list all conversations for current user
export async function GET() {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await createAdminClient() as any

    // All conversations this user participates in
    const { data: participations, error: pErr } = await admin
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', user.id)

    if (pErr || !participations?.length) {
      return NextResponse.json({ conversations: [] })
    }

    const convIds = participations.map((p: any) => p.conversation_id)

    // Conversations metadata
    const { data: convs } = await admin
      .from('conversations')
      .select('id, last_message, last_message_at, last_sender_id')
      .in('id', convIds)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (!convs?.length) return NextResponse.json({ conversations: [] })

    // Other participants' user IDs
    const { data: allParticipants } = await admin
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', convIds)
      .neq('user_id', user.id)

    const otherUserIds = [...new Set((allParticipants ?? []).map((p: any) => p.user_id))]

    // Fetch their profiles
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', otherUserIds)

    const profileMap: Record<string, any> = {}
    for (const p of profiles ?? []) profileMap[p.id] = p

    const participantMap: Record<string, string> = {}
    for (const p of allParticipants ?? []) participantMap[p.conversation_id] = p.user_id

    const readMap: Record<string, string> = {}
    for (const p of participations) readMap[p.conversation_id] = p.last_read_at

    // Unread counts per conversation
    const unreadResults = await Promise.all(
      convIds.map(async (cid: string) => {
        const { count } = await admin
          .from('direct_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', cid)
          .neq('sender_id', user.id)
          .gt('created_at', readMap[cid] ?? '1970-01-01')
        return { cid, count: count ?? 0 }
      })
    )
    const unreadMap: Record<string, number> = {}
    for (const { cid, count } of unreadResults) unreadMap[cid] = count

    const conversations = convs.map((c: any) => {
      const otherUserId = participantMap[c.id]
      const profile     = profileMap[otherUserId]
      return {
        id:            c.id,
        lastMessage:   c.last_message ?? null,
        lastMessageAt: c.last_message_at ?? null,
        unreadCount:   unreadMap[c.id] ?? 0,
        otherUser: {
          id:          otherUserId,
          displayName: profile?.display_name ?? 'Unknown',
          avatarUrl:   profile?.avatar_url   ?? null,
        },
      }
    })

    return NextResponse.json({ conversations })
  } catch (err) {
    console.error('GET /api/chats error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/chats — find or create a 1-on-1 conversation
export async function POST(req: NextRequest) {
  try {
    const { otherUserId } = await req.json()
    if (!otherUserId) return NextResponse.json({ error: 'otherUserId required' }, { status: 400 })

    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (otherUserId === user.id) return NextResponse.json({ error: 'Cannot chat with yourself' }, { status: 400 })

    const admin = await createAdminClient() as any

    // Confirm the target user actually exists as a profile (FK target).
    const { data: otherProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('id', otherUserId)
      .single()

    if (!otherProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find existing 1-on-1 conversation between the two users
    const { data: myConvs } = await admin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    const myConvIds = (myConvs ?? []).map((p: any) => p.conversation_id)

    if (myConvIds.length > 0) {
      const { data: shared } = await admin
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', otherUserId)
        .in('conversation_id', myConvIds)

      if (shared?.length) {
        return NextResponse.json({ conversationId: shared[0].conversation_id })
      }
    }

    // Create new conversation. Insert an explicit value rather than `{}`
    // so PostgREST always has a column to write (avoids empty-body edge cases).
    const { data: newConv, error: convErr } = await admin
      .from('conversations')
      .insert({ created_at: new Date().toISOString() })
      .select('id')
      .single()

    if (convErr || !newConv) {
      console.error('POST /api/chats: conversation insert failed:', convErr)
      return NextResponse.json(
        { error: convErr?.message ?? 'Failed to create conversation' },
        { status: 500 }
      )
    }

    // Add both participants. This insert MUST succeed — otherwise the
    // conversation exists but nobody can load it (GET would 403).
    const { error: partErr } = await admin
      .from('conversation_participants')
      .insert([
        { conversation_id: newConv.id, user_id: user.id },
        { conversation_id: newConv.id, user_id: otherUserId },
      ])

    if (partErr) {
      console.error('POST /api/chats: participants insert failed:', partErr)
      // Roll back the orphaned conversation so retries stay clean.
      await admin.from('conversations').delete().eq('id', newConv.id)
      return NextResponse.json(
        { error: partErr.message ?? 'Failed to add participants' },
        { status: 500 }
      )
    }

    return NextResponse.json({ conversationId: newConv.id })
  } catch (err) {
    console.error('POST /api/chats error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/chats — search users for new conversations
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const q = body.q ?? ''

    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await createAdminClient() as any
    const { data } = await admin
      .from('profiles')
      .select('id, display_name, avatar_url, badge')
      .ilike('display_name', `%${q}%`)
      .neq('id', user.id)
      .limit(15)

    return NextResponse.json({
      users: (data ?? []).map((p: any) => ({
        id:          p.id,
        displayName: p.display_name,
        avatarUrl:   p.avatar_url ?? null,
        badge:       p.badge ?? 'Citizen',
      })),
    })
  } catch (err) {
    console.error('PATCH /api/chats error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
