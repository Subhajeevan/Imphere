import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type {
  CircleChatMessage, ReactionGroup, ReplyPreview, ChatPoll, MessageType,
} from '@/types/circle-chat'
import { messageExcerpt } from '@/types/circle-chat'

/**
 * GET /api/circles/[id]/thread
 * Enriched message history for the full-screen circle chat: replies, reactions,
 * attachments, locations and polls all resolved in one call.
 *
 * The legacy GET /api/circles/[id]/messages is intentionally left untouched so
 * the existing ChatTab keeps working.
 *
 * Query params:
 *   limit  – default 40, max 100
 *   before – ISO timestamp cursor for older messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: circleId } = await params
    const { searchParams } = new URL(request.url)
    const limit  = Math.min(parseInt(searchParams.get('limit') || '40'), 100)
    const before = searchParams.get('before') || ''

    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Membership gate
    const { data: membership } = await supabase
      .from('impact_circle_members')
      .select('role')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this circle' }, { status: 403 })
    }

    const isLeader = membership.role === 'principal' || membership.role === 'steward'

    // 1. Page of messages (newest first, reversed for display)
    let query = supabase
      .from('circle_messages')
      .select(`
        id, circle_id, author_id, content, created_at,
        message_type, reply_to_id, attachment, location,
        is_pinned, pinned_at, pinned_by, is_announcement,
        author:profiles!circle_messages_author_id_fkey ( display_name, avatar_url )
      `)
      .eq('circle_id', circleId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) query = query.lt('created_at', before)

    const { data: rows, error } = await query
    if (error) {
      console.error('GET thread error:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    const messages = (rows ?? []).slice().reverse()
    const messageIds = messages.map((m: any) => m.id)

    // 2. Author roles (bulk)
    const authorIds = [...new Set(messages.map((m: any) => m.author_id))]
    const { data: memberRows } = authorIds.length
      ? await supabase
          .from('impact_circle_members')
          .select('user_id, role')
          .eq('circle_id', circleId)
          .in('user_id', authorIds)
      : { data: [] }
    const roleMap = new Map((memberRows ?? []).map((m: any) => [m.user_id, m.role]))

    // 3. Reactions (bulk) → grouped per message
    const reactionsByMessage = new Map<string, ReactionGroup[]>()
    if (messageIds.length) {
      const { data: reactionRows } = await supabase
        .from('circle_message_reactions')
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
        reactionsByMessage.set(
          mid,
          [...byEmoji.entries()].map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine })),
        )
      }
    }

    // 4. Reply previews (batch fetch referenced messages)
    const replyIds = [...new Set(messages.map((m: any) => m.reply_to_id).filter(Boolean))]
    const replyMap = new Map<string, ReplyPreview>()
    if (replyIds.length) {
      const { data: replyRows } = await supabase
        .from('circle_messages')
        .select(`
          id, content, message_type, attachment,
          author:profiles!circle_messages_author_id_fkey ( display_name )
        `)
        .in('id', replyIds)
      for (const r of replyRows ?? []) {
        replyMap.set(r.id, {
          id: r.id,
          authorName: r.author?.display_name ?? 'Unknown',
          excerpt: messageExcerpt({ type: r.message_type, content: r.content, attachment: r.attachment }),
        })
      }
    }

    // 5. Polls + votes for poll messages
    const pollByMessage = new Map<string, ChatPoll>()
    const pollMessageIds = messages.filter((m: any) => m.message_type === 'poll').map((m: any) => m.id)
    if (pollMessageIds.length) {
      const { data: pollRows } = await supabase
        .from('circle_polls')
        .select('id, message_id, question, options, allow_multiple, closes_at')
        .in('message_id', pollMessageIds)

      const pollIds = (pollRows ?? []).map((p: any) => p.id)
      const { data: voteRows } = pollIds.length
        ? await supabase
            .from('circle_poll_votes')
            .select('poll_id, user_id, option_id')
            .in('poll_id', pollIds)
        : { data: [] }

      for (const p of pollRows ?? []) {
        const votes = (voteRows ?? []).filter((v: any) => v.poll_id === p.id)
        const tallies: Record<string, number> = {}
        const myVotes: string[] = []
        for (const v of votes) {
          tallies[v.option_id] = (tallies[v.option_id] ?? 0) + 1
          if (v.user_id === user.id) myVotes.push(v.option_id)
        }
        pollByMessage.set(p.message_id, {
          id: p.id,
          question: p.question,
          options: p.options ?? [],
          allowMultiple: p.allow_multiple,
          closesAt: p.closes_at,
          tallies,
          totalVotes: votes.length,
          myVotes,
        })
      }
    }

    // 6. Assemble
    const result: CircleChatMessage[] = messages.map((m: any) => ({
      id:              m.id,
      circleId:        m.circle_id,
      type:            (m.message_type ?? 'text') as MessageType,
      content:         m.content,
      authorId:        m.author_id,
      authorName:      m.author?.display_name ?? 'Unknown',
      authorAvatarUrl: m.author?.avatar_url ?? null,
      authorRole:      (roleMap.get(m.author_id) ?? 'member') as CircleChatMessage['authorRole'],
      createdAt:       m.created_at,
      isMine:          m.author_id === user.id,
      attachment:      m.attachment ?? null,
      location:        m.location ?? null,
      poll:            pollByMessage.get(m.id) ?? null,
      replyTo:         m.reply_to_id ? replyMap.get(m.reply_to_id) ?? null : null,
      isPinned:        !!m.is_pinned,
      isAnnouncement:  !!m.is_announcement,
      reactions:       reactionsByMessage.get(m.id) ?? [],
    }))

    return NextResponse.json({
      messages:      result,
      currentUserId: user.id,
      isLeader,
    })
  } catch (err) {
    console.error('GET /api/circles/[id]/thread unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
